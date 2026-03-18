#!/usr/bin/env python3
"""Build clean Parquet datasets from raw BTS summary-table workbooks.

Reads the XLSX files in data/raw/bts/ and produces:
  - airline_ytd_current.parquet       (Table 1A: year-to-date airline stats 1995-present)
  - airline_monthly_history.parquet   (Table 2A: monthly ranking since 1995)
  - airport_arrival_current_month.parquet   (Table 3)
  - airport_arrival_ytd_current.parquet     (Table 4 snapshot)
  - airport_arrival_annual_history.parquet  (Table 4 annual, 2004-2024)
  - airport_departure_current_month.parquet  (Table 5)
  - airport_departure_ytd_current.parquet    (Table 6 snapshot)
  - airport_departure_annual_history.parquet (Table 6 annual, 2004-2024)
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

import pandas as pd
from rich.console import Console
from rich.table import Table as RichTable

console = Console()

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "data" / "raw" / "bts"
OUT_DIR = ROOT / "data" / "processed"


def _find_workbook(pattern: str) -> Path:
    matches = list(RAW_DIR.glob(pattern))
    if not matches:
        raise FileNotFoundError(f"No workbook matching {pattern!r} in {RAW_DIR}")
    return matches[0]


def _parse_airport_name(raw: str) -> tuple[str, str]:
    """Extract city/airport name and IATA code from strings like 'Denver, CO (DEN)'."""
    m = re.search(r"\(([A-Z]{3})\)\s*$", str(raw))
    code = m.group(1) if m else ""
    name = re.sub(r"\s*\([A-Z]{3}\)\s*$", "", str(raw)).strip()
    return name, code


def _clean_airport_ranking(df_raw: pd.DataFrame, period_label: str) -> pd.DataFrame:
    """Parse a BTS airport ranking sheet (6 columns: Rank, Airport, %, Rank, Airport, %).

    Returns the right-hand (current period) side with clean columns.
    Anchors on the header row containing "Rank" rather than probing data rows,
    which avoids silently dropping rows when BTS has malformed rank values
    (e.g. a backtick instead of "1" in the 2012 departure sheet).
    """
    df = df_raw.copy()

    # Find the header row by looking for "Rank" in column 0
    header_idx = None
    for i in range(min(15, len(df))):
        val = str(df.iloc[i, 0]).strip()
        if val == "Rank":
            header_idx = i
            break

    if header_idx is None:
        raise ValueError("Could not find header row with 'Rank' in column 0")

    data_start = header_idx + 1
    df = df.iloc[data_start:].reset_index(drop=True)

    def _extract_side(df: pd.DataFrame, rank_col: int, airport_col: int, pct_col: int) -> list[dict]:
        """Extract airport rows from one side (left or right) of the ranking table."""
        rows = []
        for _, r in df.iterrows():
            airport_val = r.iloc[airport_col]
            pct_val = r.iloc[pct_col]
            if pd.isna(airport_val) or pd.isna(pct_val):
                continue
            # Stop at SOURCE/NOTES rows
            airport_str = str(airport_val).strip()
            if airport_str.upper().startswith(("SOURCE", "NOTES")):
                break
            # Must contain an IATA code to be a valid airport row
            name, code = _parse_airport_name(airport_str)
            if not code:
                continue
            # Coerce rank: handle malformed values (backticks, etc.)
            rank_raw = r.iloc[rank_col]
            rank_num = pd.to_numeric(rank_raw, errors="coerce")
            rank_int = int(rank_num) if pd.notna(rank_num) else len(rows) + 1
            rows.append(
                {
                    "rank": rank_int,
                    "airport_name": name,
                    "airport_code": code,
                    "on_time_pct": float(pct_val),
                }
            )
        return rows

    # Right side = current period, left side = prior period
    current_rows = _extract_side(df, 3, 4, 5)
    prior_rows = _extract_side(df, 0, 1, 2)

    # Add period label to current rows
    for row in current_rows:
        row["period"] = period_label

    # Warn if counts diverge (may indicate parsing issue)
    if prior_rows and current_rows and len(current_rows) != len(prior_rows):
        console.print(
            f"[yellow]Warning:[/yellow] {period_label}: current side has {len(current_rows)} rows, "
            f"prior side has {len(prior_rows)} rows"
        )

    return pd.DataFrame(current_rows), pd.DataFrame(prior_rows)


def build_airline_ytd() -> pd.DataFrame:
    """Table 1A → airline_ytd_current.parquet"""
    wb = _find_workbook("Table 1A*")
    df = pd.read_excel(wb, header=None)

    # Find the header row (contains "Year" in column 0)
    header_idx = None
    for i in range(min(10, len(df))):
        if str(df.iloc[i, 0]).strip() == "Year":
            header_idx = i
            break
    if header_idx is None:
        raise ValueError("Could not find header row in Table 1A")

    cols = [str(c).strip() for c in df.iloc[header_idx]]
    df = df.iloc[header_idx + 1 :].reset_index(drop=True)
    df.columns = cols

    # Drop trailing NaN/source/notes rows — keep only numeric year values
    df = df.dropna(subset=["Year"]).copy()
    df = df[df["Year"].apply(lambda v: str(v).strip().isdigit())].copy()

    df["Year"] = df["Year"].astype(int)
    for col in df.columns[1:]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # Normalize column names
    df.columns = [
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
    ]

    return df


def build_airline_monthly() -> pd.DataFrame:
    """Table 2A → airline_monthly_history.parquet"""
    wb = _find_workbook("Table 2A*")
    df = pd.read_excel(wb, header=None)

    # Find header row (contains "Rank")
    header_idx = None
    for i in range(min(10, len(df))):
        if str(df.iloc[i, 0]).strip() == "Rank":
            header_idx = i
            break
    if header_idx is None:
        raise ValueError("Could not find header row in Table 2A")

    df = df.iloc[header_idx + 1 :].reset_index(drop=True)
    df.columns = [
        "rank",
        "year",
        "month",
        "pct_on_time_arrivals",
        "pct_late_arrivals",
        "pct_cancelled",
        "pct_diverted",
        "pct_on_time_departures",
        "scheduled_flights",
    ]

    # Drop trailing NaN/source rows
    df = df.dropna(subset=["rank"]).copy()
    df = df[~df["rank"].astype(str).str.contains("SOURCE", case=False, na=False)]

    df["rank"] = df["rank"].astype(int)
    df["year"] = df["year"].astype(int)
    df["month"] = df["month"].astype(int)
    df["scheduled_flights"] = df["scheduled_flights"].astype(int)
    for col in ["pct_on_time_arrivals", "pct_late_arrivals", "pct_cancelled", "pct_diverted", "pct_on_time_departures"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    return df


def build_airport_snapshot(table_pattern: str, direction: str, period_type: str) -> pd.DataFrame:
    """Tables 3, 4-snapshot, 5, 6-snapshot → airport snapshot parquets."""
    wb = _find_workbook(table_pattern)
    df = pd.read_excel(wb, header=None)
    current_df, _prior_df = _clean_airport_ranking(df, f"{direction}_{period_type}")
    current_df["direction"] = direction
    current_df["period_type"] = period_type
    return current_df


def build_airport_annual_history(table_pattern: str, direction: str) -> pd.DataFrame:
    """Tables 4-annual, 6-annual → annual airport history parquets."""
    wb = _find_workbook(table_pattern)
    xls = pd.ExcelFile(wb)

    all_rows = []
    for sheet_name in xls.sheet_names:
        try:
            year = int(sheet_name)
        except ValueError:
            continue

        df = xls.parse(sheet_name, header=None)
        current_df, _prior_df = _clean_airport_ranking(df, str(year))
        current_df["year"] = year
        current_df["direction"] = direction
        all_rows.append(current_df)

    if not all_rows:
        raise ValueError(f"No year sheets found in {wb.name}")

    result = pd.concat(all_rows, ignore_index=True)
    result = result.sort_values(["year", "rank"]).reset_index(drop=True)
    return result


JSON_DIR = ROOT / "apps" / "web" / "public" / "data"


def export_json() -> None:
    """Export all Parquet datasets as JSON for static frontend consumption."""
    JSON_DIR.mkdir(parents=True, exist_ok=True)
    for pq_file in sorted(OUT_DIR.glob("*.parquet")):
        df = pd.read_parquet(pq_file)
        json_path = JSON_DIR / pq_file.with_suffix(".json").name
        df.to_json(json_path, orient="records", indent=2)
        console.print(f"[green]Exported JSON[/green] {json_path.name} ({len(df)} rows)")


def main(json_only: bool = False) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    if json_only:
        console.print("[cyan]Skipping Parquet rebuild; exporting JSON from existing Parquet files.[/cyan]")
        export_json()
        console.print(f"[bold green]JSON exported to[/bold green] {JSON_DIR}")
        return

    results = []

    # 1. Airline YTD
    console.print("[cyan]Building[/cyan] airline_ytd_current.parquet")
    df = build_airline_ytd()
    df.to_parquet(OUT_DIR / "airline_ytd_current.parquet", index=False)
    results.append(("airline_ytd_current.parquet", len(df), list(df.columns)))

    # 2. Airline monthly history
    console.print("[cyan]Building[/cyan] airline_monthly_history.parquet")
    df = build_airline_monthly()
    df.to_parquet(OUT_DIR / "airline_monthly_history.parquet", index=False)
    results.append(("airline_monthly_history.parquet", len(df), list(df.columns)))

    # 3. Airport arrival current month (Table 3)
    console.print("[cyan]Building[/cyan] airport_arrival_current_month.parquet")
    df = build_airport_snapshot("Table 3*", "arrival", "monthly")
    df.to_parquet(OUT_DIR / "airport_arrival_current_month.parquet", index=False)
    results.append(("airport_arrival_current_month.parquet", len(df), list(df.columns)))

    # 4. Airport arrival YTD (Table 4 - snapshot)
    console.print("[cyan]Building[/cyan] airport_arrival_ytd_current.parquet")
    df = build_airport_snapshot("Table 4 - *", "arrival", "ytd")
    df.to_parquet(OUT_DIR / "airport_arrival_ytd_current.parquet", index=False)
    results.append(("airport_arrival_ytd_current.parquet", len(df), list(df.columns)))

    # 5. Airport arrival annual history (Table 4 - annual)
    console.print("[cyan]Building[/cyan] airport_arrival_annual_history.parquet")
    df = build_airport_annual_history("Table 4 Ranking*", "arrival")
    df.to_parquet(OUT_DIR / "airport_arrival_annual_history.parquet", index=False)
    results.append(("airport_arrival_annual_history.parquet", len(df), list(df.columns)))

    # 6. Airport departure current month (Table 5)
    console.print("[cyan]Building[/cyan] airport_departure_current_month.parquet")
    df = build_airport_snapshot("Table 5*", "departure", "monthly")
    df.to_parquet(OUT_DIR / "airport_departure_current_month.parquet", index=False)
    results.append(("airport_departure_current_month.parquet", len(df), list(df.columns)))

    # 7. Airport departure YTD (Table 6 -)
    console.print("[cyan]Building[/cyan] airport_departure_ytd_current.parquet")
    df = build_airport_snapshot("Table 6 - *", "departure", "ytd")
    df.to_parquet(OUT_DIR / "airport_departure_ytd_current.parquet", index=False)
    results.append(("airport_departure_ytd_current.parquet", len(df), list(df.columns)))

    # 8. Airport departure annual history (Table 6 Ranking)
    console.print("[cyan]Building[/cyan] airport_departure_annual_history.parquet")
    df = build_airport_annual_history("Table 6 Ranking*", "departure")
    df.to_parquet(OUT_DIR / "airport_departure_annual_history.parquet", index=False)
    results.append(("airport_departure_annual_history.parquet", len(df), list(df.columns)))

    # Summary
    table = RichTable(title="Curated datasets")
    table.add_column("File")
    table.add_column("Rows", justify="right")
    table.add_column("Columns")
    for name, rows, cols in results:
        table.add_row(name, str(rows), ", ".join(cols))
    console.print(table)
    console.print(f"[bold green]All datasets written to[/bold green] {OUT_DIR}")

    # 9. Export all Parquet → JSON for frontend
    console.print("\n[cyan]Exporting JSON for frontend...[/cyan]")
    export_json()
    console.print(f"[bold green]JSON exported to[/bold green] {JSON_DIR}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--json-only",
        action="store_true",
        help="Skip Parquet rebuilding and regenerate JSON from existing Parquet files only.",
    )
    args = parser.parse_args()
    main(json_only=args.json_only)
