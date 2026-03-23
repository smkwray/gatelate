"""Integration tests for analysis-only JSON dataset structure."""
from __future__ import annotations

import json

import pytest

from scripts.validate_data import EXPECTED_ANALYSIS_SCHEMAS

pytestmark = pytest.mark.integration


@pytest.mark.parametrize("json_name", sorted(EXPECTED_ANALYSIS_SCHEMAS))
def test_analysis_json_schema_matches_expected(json_name: str, json_dir) -> None:
    """Each analysis JSON should have the expected column order and names."""
    path = json_dir / json_name
    if not path.exists():
        pytest.skip(f"Analysis JSON not found: {json_name}")

    records = json.loads(path.read_text())
    assert len(records) > 0, f"{json_name} is empty"
    assert list(records[0].keys()) == EXPECTED_ANALYSIS_SCHEMAS[json_name]


@pytest.mark.parametrize("json_name", sorted(EXPECTED_ANALYSIS_SCHEMAS))
def test_analysis_json_has_no_null_values(json_name: str, json_dir) -> None:
    """Analysis JSON records should not contain null values."""
    path = json_dir / json_name
    if not path.exists():
        pytest.skip(f"Analysis JSON not found: {json_name}")

    records = json.loads(path.read_text())
    for i, record in enumerate(records):
        nulls = [k for k, v in record.items() if v is None]
        assert not nulls, f"Row {i} in {json_name} has null fields: {nulls}"
