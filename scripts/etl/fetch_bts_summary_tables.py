#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import httpx
from bs4 import BeautifulSoup
from rich.console import Console
from rich.table import Table
import typer

console = Console()
app = typer.Typer(add_completion=False)

ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT / "config" / "source_pages.json"
RAW_DIR = ROOT / "data" / "raw" / "bts"


def load_config() -> dict[str, Any]:
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def resolve_xlsx_url(client: httpx.Client, page_url: str) -> str:
    response = client.get(page_url, timeout=90.0)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    for anchor in soup.find_all("a", href=True):
        href = anchor["href"]
        if href.lower().endswith(".xlsx"):
            if href.startswith("http"):
                return href
            return httpx.URL(page_url).join(href).unicode_string()

    raise RuntimeError(f"Could not find an XLSX link on {page_url}")


def download_file(client: httpx.Client, url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with client.stream("GET", url, timeout=120.0) as response:
        response.raise_for_status()
        with destination.open("wb") as fh:
            for chunk in response.iter_bytes():
                fh.write(chunk)


@app.command()
def main(force: bool = typer.Option(False, help="Re-download existing files.")) -> None:
    config = load_config()
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, Any] = {"workbooks": []}

    with httpx.Client(
        follow_redirects=True,
        headers={"User-Agent": "flight-reliability-explorer/0.1 (+https://github.com/)"},
    ) as client:
        for key, entry in config["page_urls"].items():
            page_url = entry["page_url"]
            console.print(f"[cyan]Resolving workbook[/cyan] {key}")
            resolved_xlsx = resolve_xlsx_url(client, page_url)
            filename = Path(httpx.URL(resolved_xlsx).path).name
            destination = RAW_DIR / filename

            if force and destination.exists():
                destination.unlink()

            if not destination.exists():
                console.print(f"[cyan]Downloading[/cyan] {filename}")
                download_file(client, resolved_xlsx, destination)
            else:
                console.print(f"[green]Using cached file[/green] {filename}")

            manifest["workbooks"].append(
                {
                    "key": key,
                    "source_page": page_url,
                    "resolved_xlsx": resolved_xlsx,
                    "filename": filename,
                    "bytes": destination.stat().st_size,
                }
            )

    manifest_path = RAW_DIR / "download_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    table = Table(title="Downloaded BTS workbooks")
    table.add_column("Key")
    table.add_column("Filename")
    table.add_column("Bytes", justify="right")
    for workbook in manifest["workbooks"]:
        table.add_row(workbook["key"], workbook["filename"], f'{workbook["bytes"]:,}')
    console.print(table)
    console.print(f"[bold green]Wrote manifest:[/bold green] {manifest_path}")


if __name__ == "__main__":
    app()
