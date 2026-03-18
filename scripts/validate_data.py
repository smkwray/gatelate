#!/usr/bin/env python3
"""Validate curated gatelate datasets and print a rich pass/fail report."""
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

EXPECTED_SCHEMAS: dict[str, list[str]] = {
    "airline_ytd_current.parquet": [
        "year",
        "operations",
        "late_arrivals",
        "late_departures",
        "cancelled",
        "diverted",
        "pct_on_time_arrivals",
        "pct_late_arrivals",
        "pct_late_departures",
        "pct_cancelled",
        "pct_diverted",
    ],
    "airline_monthly_history.parquet": [
        "rank",
        "year",
        "month",
        "pct_on_time_arrivals",
        "pct_late_arrivals",
        "pct_cancelled",
        "pct_diverted",
        "pct_on_time_departures",
        "scheduled_flights",
    ],
    "carrier_monthly.parquet": [
        "carrier",
        "carrier_name",
        "year",
        "month",
        "flights",
        "on_time_pct",
        "late_pct",
        "cancelled_pct",
        "diverted_pct",
    ],
    "airport_arrival_current_month.parquet": [
        "rank",
        "airport_name",
        "airport_code",
        "on_time_pct",
        "period",
        "direction",
        "period_type",
    ],
    "airport_arrival_ytd_current.parquet": [
        "rank",
        "airport_name",
        "airport_code",
        "on_time_pct",
        "period",
        "direction",
        "period_type",
    ],
    "airport_arrival_annual_history.parquet": [
        "rank",
        "airport_name",
        "airport_code",
        "on_time_pct",
        "period",
        "year",
        "direction",
    ],
    "airport_departure_current_month.parquet": [
        "rank",
        "airport_name",
        "airport_code",
        "on_time_pct",
        "period",
        "direction",
        "period_type",
    ],
    "airport_departure_ytd_current.parquet": [
        "rank",
        "airport_name",
        "airport_code",
        "on_time_pct",
        "period",
        "direction",
        "period_type",
    ],
    "airport_departure_annual_history.parquet": [
        "rank",
        "airport_name",
        "airport_code",
        "on_time_pct",
        "period",
        "year",
        "direction",
    ],
}


def load_processed_frames(processed_dir: Path = PROCESSED_DIR) -> dict[str, pd.DataFrame]:
    """Load the expected curated Parquet datasets keyed by file name."""
    missing = [name for name in EXPECTED_SCHEMAS if not (processed_dir / name).exists()]
    if missing:
        raise FileNotFoundError(f"Missing expected Parquet files: {', '.join(missing)}")
    return {name: pd.read_parquet(processed_dir / name) for name in sorted(EXPECTED_SCHEMAS)}


def check_percentage_sum(
    df: pd.DataFrame,
    columns: list[str],
    *,
    lower: float = 99.9,
    upper: float = 100.1,
) -> pd.DataFrame:
    """Return rows whose percentage columns do not sum to the expected band."""
    sums = df[columns].sum(axis=1)
    mask = ~sums.between(lower, upper, inclusive="both")
    failures = df.loc[mask, columns].copy()
    failures["pct_sum"] = sums.loc[mask].round(4)
    return failures


def check_no_nulls(frames: dict[str, pd.DataFrame]) -> dict[str, dict[str, int]]:
    """Return a mapping of files and columns with null values."""
    issues: dict[str, dict[str, int]] = {}
    for name, df in frames.items():
        null_counts = df.isna().sum()
        failing = {column: int(count) for column, count in null_counts.items() if int(count) > 0}
        if failing:
            issues[name] = failing
    return issues


def check_schema(frames: dict[str, pd.DataFrame]) -> dict[str, dict[str, list[str]]]:
    """Return files whose columns differ from the expected schema."""
    issues: dict[str, dict[str, list[str]]] = {}
    for name, expected_columns in EXPECTED_SCHEMAS.items():
        actual_columns = list(frames[name].columns)
        if actual_columns != expected_columns:
            issues[name] = {"expected": expected_columns, "actual": actual_columns}
    return issues


def check_carrier_continuity(df: pd.DataFrame) -> dict[str, list[str]]:
    """Return missing months per carrier across the dataset's overall date span."""
    start = pd.Period(year=int(df["year"].min()), month=int(df.loc[df["year"] == df["year"].min(), "month"].min()), freq="M")
    end = pd.Period(year=int(df["year"].max()), month=int(df.loc[df["year"] == df["year"].max(), "month"].max()), freq="M")
    expected_periods = pd.period_range(start=start, end=end, freq="M")
    gaps: dict[str, list[str]] = {}

    for carrier, carrier_df in df.groupby("carrier"):
        seen = set(
            pd.to_datetime(
                {
                    "year": carrier_df["year"].astype(int),
                    "month": carrier_df["month"].astype(int),
                    "day": 1,
                }
            ).dt.to_period("M")
        )
        missing = [period.strftime("%Y-%m") for period in expected_periods if period not in seen]
        if missing:
            gaps[str(carrier)] = missing

    return gaps


def airport_row_counts(df: pd.DataFrame) -> pd.Series:
    """Return airport annual history row counts keyed by year."""
    return df.groupby("year").size().sort_index()


def airport_row_count_issues(df: pd.DataFrame, *, min_rows: int = 25, max_rows: int = 35) -> pd.Series:
    """Return out-of-band airport annual row counts."""
    counts = airport_row_counts(df)
    return counts[(counts < min_rows) | (counts > max_rows)]


def _render_dataframe(title: str, df: pd.DataFrame) -> None:
    """Render a DataFrame with Rich."""
    table = Table(title=title)
    for column in df.columns:
        table.add_column(str(column))
    for _, row in df.iterrows():
        table.add_row(*[str(value) for value in row.tolist()])
    console.print(table)


def _render_dict_table(title: str, rows: list[tuple[str, str]]) -> None:
    """Render two-column text rows with Rich."""
    table = Table(title=title)
    table.add_column("Item")
    table.add_column("Details")
    for item, details in rows:
        table.add_row(item, details)
    console.print(table)


def main() -> int:
    """Run all validation checks and return a POSIX exit status."""
    console.print("[bold cyan]Validating curated datasets[/bold cyan]")

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("{task.completed}/{task.total}"),
        console=console,
        transient=True,
    ) as progress:
        task = progress.add_task("Loading Parquet files", total=len(EXPECTED_SCHEMAS))
        frames: dict[str, pd.DataFrame] = {}
        for name in sorted(EXPECTED_SCHEMAS):
            frames[name] = pd.read_parquet(PROCESSED_DIR / name)
            progress.advance(task)

    hard_failures = 0
    summary_rows: list[tuple[str, str, str]] = []

    carrier_failures = check_percentage_sum(
        frames["carrier_monthly.parquet"],
        ["on_time_pct", "late_pct", "cancelled_pct", "diverted_pct"],
    )
    if carrier_failures.empty:
        summary_rows.append(("[green]PASS[/green]", "Carrier percentage sums", "All carrier rows sum to ~100%."))
    else:
        hard_failures += 1
        summary_rows.append(("[red]FAIL[/red]", "Carrier percentage sums", f"{len(carrier_failures)} failing rows."))
        _render_dataframe("Carrier percentage sum failures", carrier_failures.reset_index(drop=True))

    ytd_failures = check_percentage_sum(
        frames["airline_ytd_current.parquet"],
        ["pct_on_time_arrivals", "pct_late_arrivals", "pct_cancelled", "pct_diverted"],
    )
    if ytd_failures.empty:
        summary_rows.append(("[green]PASS[/green]", "Airline YTD percentage sums", "All annual rows sum to ~100%."))
    else:
        hard_failures += 1
        summary_rows.append(("[red]FAIL[/red]", "Airline YTD percentage sums", f"{len(ytd_failures)} failing rows."))
        _render_dataframe("Airline YTD percentage sum failures", ytd_failures.reset_index(drop=True))

    null_issues = check_no_nulls(frames)
    if not null_issues:
        summary_rows.append(("[green]PASS[/green]", "Null checks", "No null or NaN values across all Parquets."))
    else:
        hard_failures += 1
        summary_rows.append(("[red]FAIL[/red]", "Null checks", f"Nulls found in {len(null_issues)} files."))
        _render_dict_table(
            "Null value issues",
            [(name, ", ".join(f"{column}={count}" for column, count in issues.items())) for name, issues in sorted(null_issues.items())],
        )

    schema_issues = check_schema(frames)
    if not schema_issues:
        summary_rows.append(("[green]PASS[/green]", "Schema validation", "All file schemas match expectations."))
    else:
        hard_failures += 1
        summary_rows.append(("[red]FAIL[/red]", "Schema validation", f"Mismatches found in {len(schema_issues)} files."))
        schema_rows = []
        for name, issue in sorted(schema_issues.items()):
            schema_rows.append((name, f"expected={issue['expected']} actual={issue['actual']}"))
        _render_dict_table("Schema mismatches", schema_rows)

    for airport_file in [
        "airport_arrival_annual_history.parquet",
        "airport_departure_annual_history.parquet",
    ]:
        counts = airport_row_counts(frames[airport_file]).rename("rows")
        _render_dataframe(
            f"{airport_file} year counts",
            counts.reset_index().rename(columns={"index": "year"}),
        )
        issues = airport_row_count_issues(frames[airport_file])
        if issues.empty:
            summary_rows.append(("[green]PASS[/green]", f"{airport_file} row counts", "All years are within the 25-35 range."))
        else:
            hard_failures += 1
            summary_rows.append(("[red]FAIL[/red]", f"{airport_file} row counts", f"Out-of-range years: {', '.join(str(year) for year in issues.index.tolist())}."))

    continuity_gaps = check_carrier_continuity(frames["carrier_monthly.parquet"])
    if continuity_gaps:
        summary_rows.append(("[yellow]INFO[/yellow]", "Carrier continuity", f"{len(continuity_gaps)} carriers have month gaps; informational only."))
        _render_dict_table(
            "Carrier continuity gaps",
            [(carrier, ", ".join(months)) for carrier, months in sorted(continuity_gaps.items())],
        )
    else:
        summary_rows.append(("[green]PASS[/green]", "Carrier continuity", "Every carrier appears in every month of the observed range."))

    summary = Table(title="Validation summary")
    summary.add_column("Status")
    summary.add_column("Check")
    summary.add_column("Details")
    for status, check_name, details in summary_rows:
        summary.add_row(status, check_name, details)
    console.print(summary)

    if hard_failures:
        console.print(f"[bold red]Validation failed[/bold red] with {hard_failures} hard-fail check(s).")
        return 1

    console.print("[bold green]Validation passed[/bold green] with no hard failures.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
