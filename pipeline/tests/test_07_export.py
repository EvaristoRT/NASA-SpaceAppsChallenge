"""Prueba de contrato para la entrega del paso 07."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import h3
import pandas as pd


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "07_export.py"
SPEC = importlib.util.spec_from_file_location("step07", SCRIPT)
step07 = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(step07)


def test_exports_delivery_and_backend_format(tmp_path, monkeypatch):
    data = tmp_path / "data"
    region = "argentina_chile"
    gold_dir = data / "gold" / f"region={region}"
    silver_root = data / "silver" / f"region={region}"
    models = data / "models"
    gold_dir.mkdir(parents=True)
    silver_root.mkdir(parents=True)
    models.mkdir()

    h8 = h3.latlng_to_cell(-34.6, -58.4, 8)
    h6 = h3.cell_to_parent(h8, 6)
    h3_r8, h3_r6, h3_r3 = map(h3.str_to_int, (h8, h6, h3.cell_to_parent(h8, 3)))
    dates = ["2003-01-02", "2004-01-02", "2026-01-02"]
    counts = [4.0, 6.0, 10.0]
    gold = pd.DataFrame({
        "h3_index": [h6] * 3,
        "date": pd.to_datetime(dates),
        "year": [2003, 2004, 2026],
        "month": [1, 1, 1],
        "dekad": [1, 1, 1],
        "modis_raw_count": [1, 1, 0],
        "viirs_raw_count": [0, 0, 1],
        "harmonized_count": counts,
        "harmonized_ci_lower": counts,
        "harmonized_ci_upper": counts,
        "harmonized_frp_mw": [40.0, 60.0, 100.0],
        "primary_source": ["MODIS", "MODIS", "NOAA-20"],
        "is_nrt": [False, False, True],
        "fire_regime": ["wildfire"] * 3,
    })
    gold.to_parquet(gold_dir / "harmonized.parquet", index=False)

    silver = pd.DataFrame({
        "sensor": ["MODIS", "MODIS", "VIIRS"],
        "satellite": ["Terra", "Aqua", "NOAA-20"],
        "source": ["archive", "archive", "nrt"],
        "acq_date": pd.to_datetime(dates).date,
        "acq_time": ["1200", "1200", "1200"],
        "latitude": [-34.6] * 3,
        "longitude": [-58.4] * 3,
        "frp": [10.0, 10.0, 10.0],
        "confidence_level": ["high"] * 3,
        "daynight": ["D"] * 3,
        "type": [0, 0, None],
        "h3_r8": [h3_r8] * 3,
        "h3_r6": [h3_r6] * 3,
        "h3_r5": [h3.str_to_int(h3.cell_to_parent(h8, 5))] * 3,
        "h3_r3": [h3_r3] * 3,
    })
    for year, frame in silver.assign(year=pd.to_datetime(silver["acq_date"]).dt.year).groupby("year"):
        out = silver_root / f"year={year}"
        out.mkdir()
        frame.drop(columns="year").to_parquet(out / "silver.parquet", index=False)
    (models / "metrics.json").write_text(json.dumps({"region": region, "referencia": "NOAA-20"}), encoding="utf-8")

    monkeypatch.setattr("sys.argv", ["07_export.py", "--data-dir", str(data)])
    assert step07.main() == 0

    delivery = data / "gold" / "entrega"
    harmonized = pd.read_parquet(delivery / "harmonized.parquet")
    row_2026 = harmonized[harmonized["year"] == 2026].iloc[0]
    assert row_2026["median_same_month"] == 5.0
    assert row_2026["anomaly_pct"] == 100.0
    assert (delivery / "LEEME_ENTREGA.md").exists()

    cells = pd.read_parquet(delivery / "cells.parquet")
    monthly = pd.read_parquet(delivery / "monthly.parquet")
    months = pd.read_parquet(delivery / "months.parquet")
    info = json.loads((delivery / "info.json").read_text(encoding="utf-8"))
    assert list(cells["cell_id"]) == [0]
    assert set(monthly.columns) >= {"cell_id", "m", "value", "modis_ta", "modis_t", "viirs", "src"}
    assert months.loc[months["m"] == 312, "source"].iloc[0] == "NOAA-20"
    assert info["synthetic"] is False and info["cutoff_date"] == "2026-01-02"
    assert len(list((delivery / "hotspots").glob("year=*/*.parquet"))) == 3

    backend = Path(__file__).resolve().parents[2] / "backend"
    monkeypatch.syspath_prepend(str(backend))
    from ignis.store import DataStore

    store = DataStore(delivery)
    assert store.m_min == 10 and store.m_max == 312
