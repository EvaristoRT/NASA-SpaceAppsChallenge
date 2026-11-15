"""Estimate interval in the series and the three CSV downloads: monthly series, hexagons of a month and individual hotspots."""
import datetime as dt
import io

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import pytest
from fastapi.testclient import TestClient

from test_delivery import POLY, _write_delivery

HOTSPOT_COLUMNS = ["acq_date", "acq_time", "latitude", "longitude", "satellite", "source", "frp", "confidence_level", "daynight", "h3_r6"]


def _hotspots(folder, rows):
    """rows: (date, lat, lon, source). One Hive partition per year, like the delivery."""
    by_year = {}
    for d, lat, lon, source in rows:
        by_year.setdefault(d.year, []).append((d, lat, lon, source))
    for year, items in by_year.items():
        part = folder / f"year={year}"
        part.mkdir(parents=True, exist_ok=True)
        table = pa.table({
            "h3_r6": ["86b2c0007ffffff"] * len(items),
            "acq_date": pa.array([i[0] for i in items], type=pa.date32()),
            "acq_time": ["1803"] * len(items),
            "latitude": [i[1] for i in items],
            "longitude": [i[2] for i in items],
            "sensor": ["VIIRS"] * len(items),
            "satellite": ["NOAA-20"] * len(items),
            "source": [i[3] for i in items],
            "frp": [3.5] * len(items),
            "confidence_level": ["nominal"] * len(items),
            "daynight": ["D"] * len(items),
            "type": [0] * len(items),
        })
        pq.write_table(table, part / "data_0.parquet")


def _build(tmp_path, with_hotspots=True):
    _write_delivery(tmp_path)
    monthly = pd.read_parquet(tmp_path / "monthly.parquet")
    monthly["value_ci_lower"] = 8.0
    monthly["value_ci_upper"] = 13.0
    monthly["frp_mw"] = 5.0
    monthly["is_nrt"] = monthly["m"] == 263  # 2021-12 is preliminary
    monthly.to_parquet(tmp_path / "monthly.parquet")
    if with_hotspots:
        _hotspots(tmp_path / "hotspots", [
            (dt.date(2019, 3, 10), -34.5, -69.5, "archive"),   # inside, March 2019
            (dt.date(2019, 3, 20), -34.7, -69.2, "nrt"),       # inside, March 2019
            (dt.date(2019, 3, 15), -30.0, -60.0, "archive"),   # outside the polygon
            (dt.date(2019, 4, 2), -34.5, -69.5, "archive"),    # inside, April
            (dt.date(2020, 1, 15), -34.5, -69.5, "archive"),   # inside, other year partition
        ])


@pytest.fixture()
def client(tmp_path, monkeypatch):
    _build(tmp_path)
    import main
    monkeypatch.setattr(main, "DATA_DIR", tmp_path)
    monkeypatch.setattr(main, "_store", None)
    monkeypatch.delenv("HOTSPOTS_DIR", raising=False)
    return TestClient(main.app)


def _csv(response):
    return pd.read_csv(io.StringIO(response.text))


def test_series_exposes_interval_frp_and_preliminary_flag(client):
    series = {p["month"]: p for p in client.post("/api/search", json={"geojson": POLY}).json()["series"]}
    assert series["2019-06"]["count_ci_lower"] == 8.0 and series["2019-06"]["count_ci_upper"] == 13.0
    assert series["2019-06"]["frp_mw"] == 5.0 and series["2019-06"]["is_nrt"] is False
    assert series["2021-12"]["is_nrt"] is True


def test_monthly_csv_has_one_row_per_month_with_the_interval(client):
    r = client.post("/api/export.csv?level=monthly", json={"geojson": POLY, "start": "2019-01", "end": "2019-12"})
    assert r.status_code == 200
    df = _csv(r)
    assert len(df) == 12 and list(df["month"])[0] == "2019-01"
    assert {"harmonized_burn_days", "ci95_lower", "ci95_upper", "source", "is_preliminary"} <= set(df.columns)
    assert 'filename="ignissync_monthly_2019-01_2019-12.csv"' in r.headers["content-disposition"]


def test_cells_csv_of_one_month_is_named_after_it(client):
    r = client.post("/api/export.csv?level=cells", json={"geojson": POLY, "start": "2019-03", "end": "2019-03"})
    assert r.status_code == 200 and "ignissync_cells_2019-03.csv" in r.headers["content-disposition"]
    assert len(_csv(r)) == 1


def test_hotspots_csv_filters_by_polygon_and_dates_and_drops_internal_columns(client):
    r = client.post("/api/export.csv?level=hotspots", json={"geojson": POLY, "start": "2019-03", "end": "2019-03"})
    assert r.status_code == 200
    df = _csv(r)
    assert list(df.columns) == HOTSPOT_COLUMNS and "sensor" not in df.columns and "type" not in df.columns
    assert list(df["acq_date"]) == ["2019-03-10", "2019-03-20"]  # not the outside point, not April, not 2020
    assert list(df["source"]) == ["archive", "nrt"]
    wide = client.post("/api/export.csv?level=hotspots", json={"geojson": POLY, "start": "2019-03", "end": "2020-01"})
    assert len(_csv(wide)) == 4  # March and April 2019 plus January 2020, across two year partitions
    assert "ignissync_hotspots_2019-03.csv" in r.headers["content-disposition"]


def test_hotspots_csv_refuses_too_many_rows(client, monkeypatch):
    import main
    monkeypatch.setattr(main, "HOTSPOTS_MAX_ROWS", 1)
    r = client.post("/api/export.csv?level=hotspots", json={"geojson": POLY, "start": "2019-03", "end": "2019-03"})
    assert r.status_code == 413


def test_hotspots_csv_needs_a_bounded_range(client):
    assert client.post("/api/export.csv?level=hotspots", json={"geojson": POLY}).status_code == 422
    assert client.post("/api/export.csv?level=hotspots", json={"geojson": POLY, "start": "2010-01", "end": "2019-12"}).status_code == 422
    assert client.post("/api/export.csv?level=hotspots", json={"geojson": {"type": "Point", "coordinates": [0, 0]}, "start": "2019-03", "end": "2019-03"}).status_code == 422


def test_hotspots_not_available_on_a_server_without_them(tmp_path, monkeypatch):
    _build(tmp_path, with_hotspots=False)
    import main
    monkeypatch.setattr(main, "DATA_DIR", tmp_path)
    monkeypatch.setattr(main, "_store", None)
    monkeypatch.delenv("HOTSPOTS_DIR", raising=False)
    c = TestClient(main.app)
    assert c.get("/api/meta").json()["hotspots_available"] is False
    assert c.post("/api/export.csv?level=hotspots", json={"geojson": POLY, "start": "2019-03", "end": "2019-03"}).status_code == 503


def test_meta_reports_hotspots_when_present(client):
    assert client.get("/api/meta").json()["hotspots_available"] is True
