"""The backend serving a pipeline delivery (option B of pipeline/PLAN_INTEGRACION_WEB.md): source labels from
months.parquet, baseline end taken from info.json and the month in progress left out of latest_*."""
import json
import os
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
os.environ.setdefault("DATA_DIR", str(ROOT / "data" / "processed"))

POLY = {"type": "Polygon", "coordinates": [[[-70.0, -35.0], [-69.0, -35.0], [-69.0, -34.0], [-70.0, -34.0], [-70.0, -35.0]]]}


def _write_delivery(folder: Path):
    n_months = 12 * 22 + 1  # 2000-01 .. 2022-01; the last one is still in progress
    m = np.arange(n_months)
    pd.DataFrame({"cell_id": [0], "h3": ["86b2c0007ffffff"], "lat": [-34.5], "lon": [-69.5]}).to_parquet(folder / "cells.parquet")
    pd.DataFrame({"cell_id": 0, "m": m, "value": 10.0, "modis_ta": 1, "modis_t": 1, "viirs": 1}).to_parquet(folder / "monthly.parquet")
    pd.DataFrame({
        "m": m,
        "viirs_sats": (m >= 216).astype(int),
        "terra_only": m < 30,
        "modis_full": m >= 30,
        "source": np.where(m >= 216, "NOAA-20", np.where(m < 30, "Terra", "MODIS")),
        "days_in_month": 30,
        "days_observed": np.where(m == n_months - 1, 14, 30),
        "is_partial": m == n_months - 1,
    }).to_parquet(folder / "months.parquet")
    (folder / "info.json").write_text(json.dumps({
        "synthetic": False, "baseline_years": [2003, 2020], "last_complete_month": "2021-12", "partial_month": "2022-01",
    }), encoding="utf-8")


def test_delivery_labels_baseline_and_partial_month(tmp_path, monkeypatch):
    _write_delivery(tmp_path)
    import main
    monkeypatch.setattr(main, "DATA_DIR", tmp_path)
    monkeypatch.setattr(main, "_store", None)
    c = TestClient(main.app)

    j = c.post("/api/search", json={"geojson": POLY}).json()
    by_month = {p["month"]: p for p in j["series"]}
    assert j["synthetic"] is False
    assert by_month["2001-01"]["source"] == "Terra (escalado)"
    assert by_month["2010-01"]["source"] == "MODIS (escalado)"
    assert by_month["2019-01"]["source"] == "NOAA-20"
    assert j["baseline"]["end_year"] == 2020  # from info.json, not "last complete year" (2021)
    assert j["kpis"]["latest_month"] == "2021-12"  # the partial 2022-01 is not the latest month
    assert by_month["2022-01"]["is_partial"] is True and by_month["2021-12"]["is_partial"] is False
