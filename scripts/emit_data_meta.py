#!/usr/bin/env python3
"""Emit data_meta.json with report period metadata for the frontend."""
from __future__ import annotations

import calendar
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from rich.console import Console

console = Console()

ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIR = ROOT / "data" / "processed"
JSON_DIR = ROOT / "apps" / "web" / "public" / "data"

SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def main() -> int:
    carrier = pd.read_parquet(PROCESSED_DIR / "carrier_monthly.parquet")
    airport_annual = pd.read_parquet(PROCESSED_DIR / "airport_arrival_annual_history.parquet")

    if carrier.empty or airport_annual.empty:
        console.print("[red]Error:[/red] carrier_monthly or airport_arrival_annual_history is empty")
        return 1

    max_year = int(carrier["year"].max())
    max_month = int(carrier.loc[carrier["year"] == max_year, "month"].max())
    min_year = int(carrier["year"].min())
    min_month = int(carrier.loc[carrier["year"] == min_year, "month"].min())
    annual_start = int(airport_annual["year"].min())

    month_label = f"{calendar.month_name[max_month]} {max_year}"
    month_short = f"{SHORT_MONTHS[max_month - 1]} {max_year}"
    start_short = f"{SHORT_MONTHS[min_month - 1]} {min_year}"

    meta = {
        "report_year": max_year,
        "report_month": max_month,
        "report_month_label": month_label,
        "report_month_short": month_short,
        "report_ytd_label": f"YTD {month_label}",
        "transtats_range_label": f"{start_short}\u2013{month_short}",
        "bts_airport_annual_start": annual_start,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    JSON_DIR.mkdir(parents=True, exist_ok=True)
    out_path = JSON_DIR / "data_meta.json"
    out_path.write_text(json.dumps(meta, indent=2) + "\n")
    console.print(f"[green]\u2713[/green] Wrote {out_path.relative_to(ROOT)}")
    for k, v in meta.items():
        console.print(f"  {k}: {v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
