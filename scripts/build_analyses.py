#!/usr/bin/env python3
"""Build additional JSON-only analytical datasets for future frontend use."""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
from rich.console import Console
from rich.progress import BarColumn, Progress, SpinnerColumn, TextColumn
from rich.table import Table

console = Console()

ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIR = ROOT / "data" / "processed"
RAW_TRANSTATS = ROOT / "data" / "raw" / "transtats" / "Airline_Delay_Cause.csv"
JSON_DIR = ROOT / "apps" / "web" / "public" / "data"

DELAY_CAUSE_COLUMNS = [
    "carrier_delay",
    "weather_delay",
    "nas_delay",
    "security_delay",
    "late_aircraft_delay",
]


def load_inputs() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Load the curated carrier monthly data and the raw TranStats CSV."""
    carrier_monthly = pd.read_parquet(PROCESSED_DIR / "carrier_monthly.parquet")
    raw = pd.read_csv(
        RAW_TRANSTATS,
        usecols=[
            "year",
            "month",
            "carrier",
            "carrier_name",
            "airport",
            "airport_name",
            "arr_flights",
            "arr_del15",
            "arr_cancelled",
            "arr_diverted",
            *DELAY_CAUSE_COLUMNS,
        ],
    )
    return carrier_monthly, raw


def build_carrier_seasonal(carrier_monthly: pd.DataFrame) -> pd.DataFrame:
    """Average each carrier's on-time rate by calendar month."""
    seasonal = (
        carrier_monthly.groupby(["carrier", "carrier_name", "month"], as_index=False)
        .agg(avg_on_time_pct=("on_time_pct", "mean"), sample_months=("on_time_pct", "size"))
        .sort_values(["carrier", "month"])
        .reset_index(drop=True)
    )
    seasonal["avg_on_time_pct"] = seasonal["avg_on_time_pct"].round(2)
    seasonal["sample_months"] = seasonal["sample_months"].astype(int)
    return seasonal


def build_carrier_delay_causes(raw: pd.DataFrame) -> pd.DataFrame:
    """Aggregate delay minutes by cause for each carrier."""
    grouped = (
        raw.groupby(["carrier", "carrier_name"], as_index=False)[DELAY_CAUSE_COLUMNS]
        .sum()
        .sort_values(["carrier"])
        .reset_index(drop=True)
    )
    grouped["total_delay_min"] = grouped[DELAY_CAUSE_COLUMNS].sum(axis=1)
    total = grouped["total_delay_min"].replace({0: pd.NA})

    for column in DELAY_CAUSE_COLUMNS:
        pct_name = f"{column}_pct"
        grouped[pct_name] = (grouped[column] / total * 100).fillna(0).round(2)

    grouped["controllable_delay_pct"] = (
        (grouped["carrier_delay"] + grouped["late_aircraft_delay"]) / total * 100
    ).fillna(0).round(2)
    grouped["total_delay_min"] = grouped["total_delay_min"].round(0).astype(int)

    result = grouped[
        [
            "carrier",
            "carrier_name",
            "total_delay_min",
            "carrier_delay_pct",
            "weather_delay_pct",
            "nas_delay_pct",
            "security_delay_pct",
            "late_aircraft_delay_pct",
            "controllable_delay_pct",
        ]
    ].sort_values(["controllable_delay_pct", "carrier"], ascending=[False, True])
    return result.reset_index(drop=True)


def build_carrier_size_reliability(carrier_monthly: pd.DataFrame) -> pd.DataFrame:
    """Select the latest-month carrier size versus reliability points."""
    latest_year = int(carrier_monthly["year"].max())
    latest_month = int(carrier_monthly.loc[carrier_monthly["year"] == latest_year, "month"].max())
    latest = carrier_monthly[
        (carrier_monthly["year"] == latest_year) & (carrier_monthly["month"] == latest_month)
    ][["carrier", "carrier_name", "flights", "on_time_pct"]].copy()
    return latest.sort_values(["flights", "carrier"], ascending=[False, True]).reset_index(drop=True)


def build_airport_carrier_matrix(raw: pd.DataFrame) -> pd.DataFrame:
    """Build the latest-month airport-by-carrier reliability matrix."""
    latest_year = int(raw["year"].max())
    latest_month = int(raw.loc[raw["year"] == latest_year, "month"].max())
    latest = raw[(raw["year"] == latest_year) & (raw["month"] == latest_month)]
    grouped = (
        latest.groupby(["airport", "airport_name", "carrier", "carrier_name"], as_index=False)
        .agg(
            arr_flights=("arr_flights", "sum"),
            arr_del15=("arr_del15", "sum"),
            arr_cancelled=("arr_cancelled", "sum"),
            arr_diverted=("arr_diverted", "sum"),
        )
        .reset_index(drop=True)
    )
    total_ops = grouped["arr_flights"] + grouped["arr_cancelled"] + grouped["arr_diverted"]
    grouped["on_time_pct"] = ((grouped["arr_flights"] - grouped["arr_del15"]) / total_ops * 100).round(2)
    grouped = grouped[grouped["arr_flights"] >= 100].copy()
    result = grouped.rename(columns={"arr_flights": "flights"})[
        ["airport", "airport_name", "carrier", "carrier_name", "flights", "on_time_pct"]
    ]
    result["flights"] = result["flights"].round(0).astype(int)
    return result.sort_values(["airport", "carrier"]).reset_index(drop=True)


def write_json(df: pd.DataFrame, filename: str) -> Path:
    """Write a DataFrame to the public data directory as records-oriented JSON."""
    JSON_DIR.mkdir(parents=True, exist_ok=True)
    output_path = JSON_DIR / filename
    df.to_json(output_path, orient="records", indent=2)
    return output_path


def main() -> int:
    """Build and write all analysis datasets."""
    console.print("[bold cyan]Building analytical JSON datasets[/bold cyan]")
    carrier_monthly, raw = load_inputs()

    outputs: list[tuple[str, int]] = []
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("{task.completed}/{task.total}"),
        console=console,
        transient=True,
    ) as progress:
        task = progress.add_task("Generating datasets", total=4)

        seasonal = build_carrier_seasonal(carrier_monthly)
        write_json(seasonal, "carrier_seasonal.json")
        outputs.append(("carrier_seasonal.json", len(seasonal)))
        progress.advance(task)

        delay_causes = build_carrier_delay_causes(raw)
        write_json(delay_causes, "carrier_delay_causes.json")
        outputs.append(("carrier_delay_causes.json", len(delay_causes)))
        progress.advance(task)

        size_reliability = build_carrier_size_reliability(carrier_monthly)
        write_json(size_reliability, "carrier_size_reliability.json")
        outputs.append(("carrier_size_reliability.json", len(size_reliability)))
        progress.advance(task)

        airport_matrix = build_airport_carrier_matrix(raw)
        write_json(airport_matrix, "airport_carrier_matrix.json")
        outputs.append(("airport_carrier_matrix.json", len(airport_matrix)))
        progress.advance(task)

    table = Table(title="Analytical datasets")
    table.add_column("File")
    table.add_column("Rows", justify="right")
    for filename, rows in outputs:
        table.add_row(filename, str(rows))
    console.print(table)
    return 0


if __name__ == "__main__":
    sys.exit(main())
