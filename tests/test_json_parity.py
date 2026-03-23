"""Parity tests between processed Parquet datasets and frontend JSON exports."""
from __future__ import annotations

import json
from numbers import Real

import pandas as pd
import pytest

from scripts.validate_data import EXPECTED_SCHEMAS

pytestmark = pytest.mark.integration


def _assert_record_match(expected: dict[str, object], actual: dict[str, object]) -> None:
    """Compare two JSON-style records field by field with float tolerance."""
    for column, expected_value in expected.items():
        actual_value = actual[column]
        if isinstance(expected_value, Real) and not isinstance(expected_value, bool):
            assert actual_value == pytest.approx(expected_value, abs=1e-6), column
        else:
            assert actual_value == expected_value, column


@pytest.mark.parametrize("parquet_name", sorted(EXPECTED_SCHEMAS))
def test_parquet_and_json_exports_match(parquet_name: str, processed_dir, json_dir) -> None:
    """Each exported JSON file should match its Parquet source row-for-row at the edges."""
    parquet_path = processed_dir / parquet_name
    json_path = json_dir / parquet_name.replace(".parquet", ".json")

    if not json_path.exists():
        pytest.skip(f"No JSON counterpart for {parquet_name}")

    parquet_df = pd.read_parquet(parquet_path).reset_index(drop=True)
    json_records = json.loads(json_path.read_text())

    assert len(parquet_df) == len(json_records)
    assert list(parquet_df.columns) == list(json_records[0].keys())

    _assert_record_match(parquet_df.iloc[0].to_dict(), json_records[0])
    _assert_record_match(parquet_df.iloc[-1].to_dict(), json_records[-1])
