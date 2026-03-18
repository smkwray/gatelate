#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import pandas as pd
from rich.console import Console

console = Console()

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "data" / "raw" / "bts"
INTERMEDIATE_DIR = ROOT / "data" / "intermediate" / "workbooks"
PROCESSED_DIR = ROOT / "data" / "processed"


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def main() -> None:
    INTERMEDIATE_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    manifest: list[dict[str, Any]] = []

    for workbook in sorted(RAW_DIR.glob("*.xlsx")):
        workbook_slug = slugify(workbook.stem)
        target_dir = INTERMEDIATE_DIR / workbook_slug
        target_dir.mkdir(parents=True, exist_ok=True)

        xls = pd.ExcelFile(workbook)
        workbook_record: dict[str, Any] = {
            "workbook": workbook.name,
            "target_dir": str(target_dir.relative_to(ROOT)),
            "sheets": [],
        }

        for sheet_name in xls.sheet_names:
            safe_sheet = slugify(sheet_name) or "sheet"
            output_csv = target_dir / f"{safe_sheet}.csv"
            try:
                frame = xls.parse(sheet_name, header=None)
                frame.to_csv(output_csv, index=False)
                workbook_record["sheets"].append(
                    {
                        "sheet_name": sheet_name,
                        "csv": str(output_csv.relative_to(ROOT)),
                        "rows": int(frame.shape[0]),
                        "columns": int(frame.shape[1]),
                    }
                )
                console.print(f"[green]Exported[/green] {workbook.name} :: {sheet_name}")
            except Exception as exc:  # noqa: BLE001
                workbook_record["sheets"].append(
                    {
                        "sheet_name": sheet_name,
                        "error": str(exc),
                    }
                )

        manifest.append(workbook_record)

    manifest_path = PROCESSED_DIR / "curated_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    console.print(f"[bold green]Wrote manifest:[/bold green] {manifest_path}")
    console.print(
        "[yellow]Note:[/yellow] This seed exports workbook sheets and manifests."
    )


if __name__ == "__main__":
    main()
