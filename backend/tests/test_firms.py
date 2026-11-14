"""Smoke test of the real-data path with tiny hand-made FIRMS-shaped CSVs."""
import pandas as pd

from ignis import firms
from ignis.harmonize import month_index


def test_firms_build_dedupes_cell_days(tmp_path):
    # two VIIRS points inside the same ~0.7 km2 cell on the same day count as ONE burning cell-day
    pd.DataFrame({"latitude": [19.2000, 19.2001, 19.5], "longitude": [-96.9, -96.9, -96.5],
                  "acq_date": ["2020-04-10"] * 3, "satellite": ["Terra", "Aqua", "Aqua"],
                  "confidence": [80, 90, 10], "type": [0, 0, 0]}).to_csv(tmp_path / "modis.csv", index=False)
    pd.DataFrame({"latitude": [19.2000, 19.2001, 19.2000], "longitude": [-96.9, -96.9, -96.9],
                  "acq_date": ["2020-04-10", "2020-04-10", "2020-04-11"], "satellite": ["N", "N", "N"],
                  "confidence": ["n", "h", "l"], "type": [0, 0, 0]}).to_csv(tmp_path / "viirs.csv", index=False)
    cells, monthly, meta = firms.build(tmp_path)
    m = month_index(2020, 4)
    row = monthly[monthly["m"] == m]
    assert len(cells) == 1  # low-confidence MODIS point (conf 10) and low VIIRS point are dropped
    assert int(row["modis_ta"].iloc[0]) == 1 and int(row["modis_t"].iloc[0]) == 1 and int(row["viirs"].iloc[0]) == 1
