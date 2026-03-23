"""Integration tests for curated dataset validation rules."""
from __future__ import annotations

import pytest

from scripts import validate_data

pytestmark = pytest.mark.integration


def test_carrier_monthly_percentage_sums_within_tolerance(processed_frames: dict[str, object]) -> None:
    """Carrier monthly percentage components should sum to roughly 100%."""
    failures = validate_data.check_percentage_sum(
        processed_frames["carrier_monthly.parquet"],
        ["on_time_pct", "late_pct", "cancelled_pct", "diverted_pct"],
    )
    assert failures.empty, failures.to_string(index=False)


def test_airline_ytd_percentage_sums_within_tolerance(processed_frames: dict[str, object]) -> None:
    """Airline YTD percentage components should sum to roughly 100%."""
    failures = validate_data.check_percentage_sum(
        processed_frames["airline_ytd_current.parquet"],
        ["pct_on_time_arrivals", "pct_late_arrivals", "pct_cancelled", "pct_diverted"],
    )
    assert failures.empty, failures.to_string(index=False)


def test_no_nulls_across_all_processed_parquets(processed_frames: dict[str, object]) -> None:
    """Processed datasets should not contain null values."""
    issues = validate_data.check_no_nulls(processed_frames)
    assert not issues, issues


def test_processed_parquet_schemas_match_expected(processed_frames: dict[str, object]) -> None:
    """Processed datasets should expose the expected frontend-facing schemas."""
    issues = validate_data.check_schema(processed_frames)
    assert not issues, issues


def test_airport_annual_row_counts_stay_in_expected_band(processed_frames: dict[str, object]) -> None:
    """Airport annual history should stay within the expected BTS airport-count range."""
    for name in [
        "airport_arrival_annual_history.parquet",
        "airport_departure_annual_history.parquet",
    ]:
        issues = validate_data.airport_row_count_issues(processed_frames[name])
        assert issues.empty, f"{name} out-of-range years: {issues.to_dict()}"
