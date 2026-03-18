#!/usr/bin/env python3
"""Compare TranStats carrier aggregates against BTS summary-table monthly totals."""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
from rich.console import Console
from rich.table import Table

console = Console()

ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIR = ROOT / "data" / "processed"


def load_sources() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Load the carrier and BTS monthly datasets used for reconciliation."""
    carrier_monthly = pd.read_parquet(PROCESSED_DIR / "carrier_monthly.parquet")
    airline_monthly = pd.read_parquet(PROCESSED_DIR / "airline_monthly_history.parquet")
    return carrier_monthly, airline_monthly


def build_monthly_comparison(carrier_monthly: pd.DataFrame, airline_monthly: pd.DataFrame) -> pd.DataFrame:
    """Return month-level comparisons for overlapping periods."""
    carrier_totals = (
        carrier_monthly.groupby(["year", "month"], as_index=False)
        .apply(
            lambda group: pd.Series(
                {
                    "transtats_flights": float(group["flights"].sum()),
                    "transtats_weighted_on_time_pct": (group["on_time_pct"] * group["flights"]).sum() / group["flights"].sum(),
                }
            )
        )
        .reset_index(drop=True)
    )
    bts_totals = airline_monthly[
        ["year", "month", "scheduled_flights", "pct_on_time_arrivals"]
    ].rename(
        columns={
            "scheduled_flights": "bts_scheduled_flights",
            "pct_on_time_arrivals": "bts_on_time_pct",
        }
    )

    comparison = carrier_totals.merge(bts_totals, on=["year", "month"], how="inner")
    if comparison.empty:
        raise ValueError("No overlapping year-months found between carrier and airline monthly datasets.")

    comparison["flight_diff"] = comparison["transtats_flights"] - comparison["bts_scheduled_flights"]
    comparison["abs_flight_diff"] = comparison["flight_diff"].abs()
    comparison["flight_diff_pct"] = comparison["abs_flight_diff"] / comparison["bts_scheduled_flights"] * 100
    comparison["on_time_diff_points"] = comparison["transtats_weighted_on_time_pct"] - comparison["bts_on_time_pct"]
    comparison["abs_on_time_diff_points"] = comparison["on_time_diff_points"].abs()
    comparison["flag_gt_5pct"] = comparison["flight_diff_pct"] > 5
    return comparison.sort_values(["year", "month"]).reset_index(drop=True)


def render_comparison_table(comparison: pd.DataFrame) -> None:
    """Render the month-by-month reconciliation table."""
    table = Table(title="TranStats vs BTS monthly reconciliation")
    table.add_column("Month")
    table.add_column("TranStats Flights", justify="right")
    table.add_column("BTS Flights", justify="right")
    table.add_column("Abs Diff", justify="right")
    table.add_column("Diff %", justify="right")
    table.add_column("TranStats On-Time %", justify="right")
    table.add_column("BTS On-Time %", justify="right")
    table.add_column("Diff (pts)", justify="right")
    table.add_column("Flag")

    for row in comparison.itertuples(index=False):
        flag = "[red]GT 5%[/red]" if row.flag_gt_5pct else "[green]OK[/green]"
        diff_style = f"[red]{row.flight_diff_pct:.2f}%[/red]" if row.flag_gt_5pct else f"{row.flight_diff_pct:.2f}%"
        table.add_row(
            f"{int(row.year)}-{int(row.month):02d}",
            f"{int(round(row.transtats_flights)):,}",
            f"{int(round(row.bts_scheduled_flights)):,}",
            f"{int(round(row.abs_flight_diff)):,}",
            diff_style,
            f"{row.transtats_weighted_on_time_pct:.2f}",
            f"{row.bts_on_time_pct:.2f}",
            f"{row.on_time_diff_points:+.2f}",
            flag,
        )
    console.print(table)


def render_summary(comparison: pd.DataFrame) -> None:
    """Render a compact explanation of what the reconciliation shows."""
    flagged = comparison[comparison["flag_gt_5pct"]]
    summary = Table(title="Reconciliation summary")
    summary.add_column("Metric")
    summary.add_column("Value")
    summary.add_row("Overlapping months", str(len(comparison)))
    summary.add_row("Date range", f"{int(comparison.iloc[0]['year'])}-{int(comparison.iloc[0]['month']):02d} to {int(comparison.iloc[-1]['year'])}-{int(comparison.iloc[-1]['month']):02d}")
    summary.add_row("Average flight diff %", f"{comparison['flight_diff_pct'].mean():.2f}%")
    summary.add_row("Median flight diff %", f"{comparison['flight_diff_pct'].median():.2f}%")
    summary.add_row("Max flight diff %", f"{comparison['flight_diff_pct'].max():.2f}%")
    summary.add_row("Average on-time diff", f"{comparison['on_time_diff_points'].mean():+.2f} pts")
    summary.add_row("Max abs on-time diff", f"{comparison['abs_on_time_diff_points'].max():.2f} pts")
    summary.add_row("Months flagged > 5%", str(len(flagged)))
    console.print(summary)

    if flagged.empty:
        console.print(
            "[green]All overlapping months are within the 5% flight-count tolerance.[/green]"
        )
    else:
        console.print(
            "[yellow]Flagged months do not necessarily indicate bad data.[/yellow] "
            "BTS monthly totals are scheduled flights, while the TranStats carrier rollup is based on "
            "arrived flights plus cancellations and diversions, so structural differences are expected."
        )


def main() -> int:
    """Run the source reconciliation report."""
    carrier_monthly, airline_monthly = load_sources()
    comparison = build_monthly_comparison(carrier_monthly, airline_monthly)
    render_comparison_table(comparison)
    render_summary(comparison)
    return 0


if __name__ == "__main__":
    sys.exit(main())
