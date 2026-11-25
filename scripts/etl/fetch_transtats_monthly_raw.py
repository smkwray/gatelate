#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

from rich.console import Console
import typer

console = Console()
app = typer.Typer(add_completion=False)

ROOT = Path(__file__).resolve().parents[2]


@app.command()
def main() -> None:
    # Not implemented yet. Planned approach:
    # 1. Use the official TranStats Reporting Carrier On-Time Performance download page.
    # 2. Limit scope to the last 12 months.
    # 3. Select only the fields needed for airport-month and optional route views.
    # 4. Aggregate immediately after download and discard bulky raw extracts if they are not needed.
    # 5. Keep this pipeline separate from the summary-table pipeline.
    console.print("[yellow]Phase-two placeholder[/yellow]")
    console.print(
        "This script is intentionally not wired into the default pipeline path.\n"
        "Optional raw TranStats expansion is not implemented yet.\n"
    )
    console.print(
        "Candidate source pages are documented in `config/source_pages.json` under `optional_phase_two`."
    )


if __name__ == "__main__":
    app()
