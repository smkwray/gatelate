"""Shared pytest fixtures for the gatelate data and parser test suite."""
from __future__ import annotations

from pathlib import Path

import pandas as pd
import pytest


REPO_ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIR = REPO_ROOT / "data" / "processed"
JSON_DIR = REPO_ROOT / "apps" / "web" / "public" / "data"


def _iata_code(prefix: str, index: int) -> str:
    """Generate a deterministic three-letter IATA-like code for fixtures."""
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    first = prefix
    second = alphabet[((index - 1) // 26) % 26]
    third = alphabet[(index - 1) % 26]
    return f"{first}{second}{third}"


@pytest.fixture(scope="session")
def repo_root() -> Path:
    """Return the repository root."""
    return REPO_ROOT


@pytest.fixture(scope="session")
def processed_dir() -> Path:
    """Return the processed data directory."""
    return PROCESSED_DIR


@pytest.fixture(scope="session")
def json_dir() -> Path:
    """Return the frontend public JSON directory."""
    return JSON_DIR


@pytest.fixture(scope="session")
def processed_frames() -> dict[str, pd.DataFrame]:
    """Load the expected processed Parquet datasets once per test session."""
    from scripts.validate_data import load_processed_frames

    try:
        return load_processed_frames()
    except FileNotFoundError as exc:
        pytest.skip(f"Processed data not available: {exc}")


@pytest.fixture
def make_airport_sheet():
    """Build synthetic BTS airport ranking sheets for parser edge-case tests."""

    def _build(
        *,
        left_count: int,
        right_count: int,
        malformed_right_first_rank: bool = False,
        include_trailing_rows: bool = False,
    ) -> pd.DataFrame:
        rows: list[list[object]] = [
            ["Metadata", None, None, None, None, None],
            ["Rank", "Airport", "Percent", "Rank", "Airport", "Percent"],
        ]
        max_rows = max(left_count, right_count)
        for index in range(1, max_rows + 1):
            if index <= left_count:
                left = [index, f"Left Airport {index:02d} ({_iata_code('L', index)})", round(90 - index * 0.2, 2)]
            else:
                left = [None, None, None]

            if index <= right_count:
                right_rank = "`" if malformed_right_first_rank and index == 1 else index
                right = [right_rank, f"Right Airport {index:02d} ({_iata_code('R', index)})", round(91 - index * 0.2, 2)]
            else:
                right = [None, None, None]

            rows.append([*left, *right])

        if include_trailing_rows:
            rows.append([None, "SOURCE: Bureau of Transportation Statistics", None, None, "SOURCE: Bureau of Transportation Statistics", None])
            rows.append([None, "NOTES: Sample notes", None, None, "NOTES: Sample notes", None])

        return pd.DataFrame(rows)

    return _build
