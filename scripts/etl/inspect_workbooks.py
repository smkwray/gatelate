#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd
from rich.console import Console
from rich.table import Table

console = Console()

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "data" / "raw" / "bts"
REPORT_PATH = ROOT / "data" / "intermediate" / "workbook_inspection.json"


def inspect_workbook(path: Path) -> dict[str, Any]:
    xls = pd.ExcelFile(path)
    sheets = []
    for sheet_name in xls.sheet_names:
        try:
            frame = xls.parse(sheet_name, header=None)
            sheets.append(
                {
                    "sheet_name": sheet_name,
                    "rows": int(frame.shape[0]),
                    "columns": int(frame.shape[1]),
                }
            )
        except Exception as exc:  # noqa: BLE001
            sheets.append({"sheet_name": sheet_name, "error": str(exc)})
    return {
        "filename": path.name,
        "relative_path": str(path.relative_to(ROOT)),
        "sheets": sheets,
    }


def main() -> None:
    reports: list[dict[str, Any]] = []
    for workbook in sorted(RAW_DIR.glob("*.xlsx")):
        try:
            reports.append(inspect_workbook(workbook))
        except Exception as exc:  # noqa: BLE001
            reports.append(
                {
                    "filename": workbook.name,
                    "relative_path": str(workbook.relative_to(ROOT)),
                    "error": str(exc),
                }
            )

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(reports, indent=2), encoding="utf-8")

    table = Table(title="Workbook inspection")
    table.add_column("Workbook")
    table.add_column("Sheets")
    table.add_column("Status")
    for report in reports:
        status = "ok" if "error" not in report else f'error: {report["error"]}'
        table.add_row(report["filename"], str(len(report.get("sheets", []))), status)
    console.print(table)
    console.print(f"[bold green]Wrote report:[/bold green] {REPORT_PATH}")


if __name__ == "__main__":
    main()
