#!/usr/bin/env python3
"""Aggregate TranStats carrier-level delay cause data into carrier_monthly.parquet.

Reads data/raw/transtats/Airline_Delay_Cause.csv (carrier × airport × month)
and aggregates by carrier × year × month to produce:
  - carrier_monthly.parquet
  - carrier_monthly.json (for frontend)
"""
from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd
from rich.console import Console
from rich.table import Table as RichTable

console = Console()

ROOT = Path(__file__).resolve().parents[2]
RAW_CSV = ROOT / "data" / "raw" / "transtats" / "Airline_Delay_Cause.csv"
OUT_DIR = ROOT / "data" / "processed"
JSON_DIR = ROOT / "apps" / "web" / "public" / "data"


def build_carrier_monthly() -> pd.DataFrame:
    """Aggregate carrier × airport × month → carrier × month."""
    df = pd.read_csv(RAW_CSV)

    # Aggregate across airports for each carrier-month
    agg = (
        df.groupby(["year", "month", "carrier", "carrier_name"])
        .agg(
            arr_flights=("arr_flights", "sum"),
            arr_del15=("arr_del15", "sum"),
            arr_cancelled=("arr_cancelled", "sum"),
            arr_diverted=("arr_diverted", "sum"),
        )
        .reset_index()
    )

    # Compute percentages
    # total_ops = arrived flights + cancelled + diverted
    agg["flights"] = agg["arr_flights"] + agg["arr_cancelled"] + agg["arr_diverted"]
    on_time = agg["arr_flights"] - agg["arr_del15"]
    agg["on_time_pct"] = (on_time / agg["flights"] * 100).round(2)
    agg["late_pct"] = (agg["arr_del15"] / agg["flights"] * 100).round(2)
    agg["cancelled_pct"] = (agg["arr_cancelled"] / agg["flights"] * 100).round(2)
    agg["diverted_pct"] = (agg["arr_diverted"] / agg["flights"] * 100).round(2)

    # Clean up: rename carrier columns, keep relevant fields
    result = agg[
        [
            "carrier",
            "carrier_name",
            "year",
            "month",
            "flights",
            "on_time_pct",
            "late_pct",
            "cancelled_pct",
            "diverted_pct",
        ]
    ].copy()

    result["flights"] = result["flights"].astype(int)
    result = result.sort_values(["year", "month", "carrier"]).reset_index(drop=True)

    return result


def export_json_from_existing_parquet() -> pd.DataFrame:
    """Regenerate carrier JSON from the existing Parquet dataset."""
    parquet_path = OUT_DIR / "carrier_monthly.parquet"
    df = pd.read_parquet(parquet_path)
    df.to_json(JSON_DIR / "carrier_monthly.json", orient="records", indent=2)
    return df


def main(json_only: bool = False) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    JSON_DIR.mkdir(parents=True, exist_ok=True)

    if json_only:
        console.print("[cyan]Skipping Parquet rebuild; exporting JSON from existing carrier_monthly.parquet.[/cyan]")
        df = export_json_from_existing_parquet()
        console.print(f"[bold green]Written:[/bold green] {JSON_DIR / 'carrier_monthly.json'}")
        console.print(f"[bold]Rows:[/bold] {len(df)}")
        return

    console.print("[cyan]Building[/cyan] carrier_monthly.parquet")
    df = build_carrier_monthly()
    df.to_parquet(OUT_DIR / "carrier_monthly.parquet", index=False)
    df.to_json(JSON_DIR / "carrier_monthly.json", orient="records", indent=2)

    # Summary
    table = RichTable(title="Carrier monthly dataset")
    table.add_column("Metric", justify="right")
    table.add_column("Value")
    table.add_row("Rows", str(len(df)))
    table.add_row("Carriers", str(df["carrier"].nunique()))
    table.add_row("Date range", f"{df['year'].min()}-{df['month'].iloc[0]:02d} to {df['year'].max()}-{df['month'].iloc[-1]:02d}")
    table.add_row("Columns", ", ".join(df.columns))
    console.print(table)

    # Show latest month top 5
    latest = df[(df["year"] == df["year"].max()) & (df["month"] == df.loc[df["year"] == df["year"].max(), "month"].max())]
    top5 = latest.sort_values("on_time_pct", ascending=False).head(5)
    console.print("\n[bold]Top 5 carriers (latest month):[/bold]")
    for _, row in top5.iterrows():
        console.print(f"  {row['carrier']} ({row['carrier_name']}): {row['on_time_pct']}% on-time, {row['flights']:,} flights")

    console.print(f"\n[bold green]Written:[/bold green] {OUT_DIR / 'carrier_monthly.parquet'}")
    console.print(f"[bold green]Written:[/bold green] {JSON_DIR / 'carrier_monthly.json'}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--json-only",
        action="store_true",
        help="Skip Parquet rebuilding and regenerate JSON from existing Parquet files only.",
    )
    args = parser.parse_args()
    main(json_only=args.json_only)
