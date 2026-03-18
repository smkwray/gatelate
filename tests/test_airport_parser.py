"""Unit tests for BTS airport ranking sheet parsing edge cases."""
from __future__ import annotations

from scripts.etl.curate_v1_datasets import _clean_airport_ranking


def test_clean_airport_ranking_handles_malformed_2012_rank(make_airport_sheet) -> None:
    """A malformed backtick rank should still yield a rank-1 airport on the current side."""
    df = make_airport_sheet(left_count=29, right_count=29, malformed_right_first_rank=True)
    current, prior = _clean_airport_ranking(df, "2012")

    assert len(current) == 29
    assert len(prior) == 29
    assert int(current.iloc[0]["rank"]) == 1
    assert current.iloc[0]["airport_name"] == "Right Airport 01"
    assert 1 in current["rank"].tolist()


def test_clean_airport_ranking_handles_variable_airport_counts(make_airport_sheet) -> None:
    """The parser should keep both sides even when annual sheets have different airport counts."""
    df = make_airport_sheet(left_count=29, right_count=31)
    current, prior = _clean_airport_ranking(df, "2024")

    assert len(current) == 31
    assert len(prior) == 29
    assert int(current["rank"].max()) == 31
    assert int(prior["rank"].max()) == 29


def test_clean_airport_ranking_excludes_source_and_notes_rows(make_airport_sheet) -> None:
    """Trailing SOURCE and NOTES rows should not appear in the parsed output."""
    df = make_airport_sheet(left_count=3, right_count=3, include_trailing_rows=True)
    current, prior = _clean_airport_ranking(df, "2024")

    assert len(current) == 3
    assert len(prior) == 3
    assert not current["airport_name"].str.startswith(("SOURCE", "NOTES")).any()
    assert not prior["airport_name"].str.startswith(("SOURCE", "NOTES")).any()


def test_clean_airport_ranking_standard_case_returns_expected_shape(make_airport_sheet) -> None:
    """A clean 29-airport sheet should parse into the expected current/prior schemas."""
    df = make_airport_sheet(left_count=29, right_count=29)
    current, prior = _clean_airport_ranking(df, "arrival_monthly")

    assert len(current) == 29
    assert len(prior) == 29
    assert list(current.columns) == ["rank", "airport_name", "airport_code", "on_time_pct", "period"]
    assert list(prior.columns) == ["rank", "airport_name", "airport_code", "on_time_pct"]
    assert current["period"].eq("arrival_monthly").all()
