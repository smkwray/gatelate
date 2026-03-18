"""Unit tests for TranStats carrier-month aggregation logic."""
from __future__ import annotations

import pandas as pd
import pytest

from scripts.etl import curate_carrier_data


def test_build_carrier_monthly_aggregates_two_carriers(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    """Carrier aggregation should collapse airport rows into one row per carrier-month."""
    source = pd.DataFrame(
        [
            {
                "year": 2025,
                "month": 11,
                "carrier": "AA",
                "carrier_name": "Alpha Air",
                "airport": "AAA",
                "airport_name": "Airport A",
                "arr_flights": 100,
                "arr_del15": 20,
                "arr_cancelled": 5,
                "arr_diverted": 1,
            },
            {
                "year": 2025,
                "month": 11,
                "carrier": "AA",
                "carrier_name": "Alpha Air",
                "airport": "BBB",
                "airport_name": "Airport B",
                "arr_flights": 50,
                "arr_del15": 5,
                "arr_cancelled": 0,
                "arr_diverted": 0,
            },
            {
                "year": 2025,
                "month": 11,
                "carrier": "BB",
                "carrier_name": "Bravo Blue",
                "airport": "AAA",
                "airport_name": "Airport A",
                "arr_flights": 80,
                "arr_del15": 8,
                "arr_cancelled": 2,
                "arr_diverted": 0,
            },
            {
                "year": 2025,
                "month": 11,
                "carrier": "BB",
                "carrier_name": "Bravo Blue",
                "airport": "CCC",
                "airport_name": "Airport C",
                "arr_flights": 40,
                "arr_del15": 4,
                "arr_cancelled": 1,
                "arr_diverted": 1,
            },
        ]
    )
    csv_path = tmp_path / "Airline_Delay_Cause.csv"
    source.to_csv(csv_path, index=False)

    monkeypatch.setattr(curate_carrier_data, "RAW_CSV", csv_path)

    result = curate_carrier_data.build_carrier_monthly()

    assert len(result) == 2
    assert result["carrier"].tolist() == ["AA", "BB"]

    aa = result[result["carrier"] == "AA"].iloc[0]
    assert aa["carrier_name"] == "Alpha Air"
    assert int(aa["flights"]) == 156
    assert aa["on_time_pct"] == pytest.approx(80.13, abs=0.01)
    assert aa["late_pct"] == pytest.approx(16.03, abs=0.01)
    assert aa["cancelled_pct"] == pytest.approx(3.21, abs=0.01)
    assert aa["diverted_pct"] == pytest.approx(0.64, abs=0.01)

    bb = result[result["carrier"] == "BB"].iloc[0]
    assert bb["carrier_name"] == "Bravo Blue"
    assert int(bb["flights"]) == 124
    assert bb["on_time_pct"] == pytest.approx(87.10, abs=0.01)
    assert bb["late_pct"] == pytest.approx(9.68, abs=0.01)
    assert bb["cancelled_pct"] == pytest.approx(2.42, abs=0.01)
    assert bb["diverted_pct"] == pytest.approx(0.81, abs=0.01)
