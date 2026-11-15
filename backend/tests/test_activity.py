"""/api/activity: the hexagons of one month. The key guarantee is that they add up to the calendar cell of that month."""
import h3
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from test_delivery import POLY, _write_delivery


@pytest.fixture()
def client(tmp_path, monkeypatch):
    _write_delivery(tmp_path)
    # a second cell with fire only in some months, so the hexagon count changes from month to month
    # (real H3 ids, so the hexagon polygons land where the cell centres are)
    spots = [(-34.5, -69.5), (-34.8, -69.3)]
    pd.DataFrame({"cell_id": [0, 1], "h3": [h3.latlng_to_cell(la, lo, 6) for la, lo in spots],
                  "lat": [s[0] for s in spots], "lon": [s[1] for s in spots]}).to_parquet(tmp_path / "cells.parquet")
    monthly = pd.read_parquet(tmp_path / "monthly.parquet")
    extra = monthly[monthly["m"].between(230, 233)].assign(cell_id=1, value=2.5)
    pd.concat([monthly, extra]).sort_values(["cell_id", "m"]).to_parquet(tmp_path / "monthly.parquet")
    import main
    monkeypatch.setattr(main, "DATA_DIR", tmp_path)
    monkeypatch.setattr(main, "_store", None)
    main._activity_cache.clear()
    return TestClient(main.app)


def test_hexagons_add_up_to_the_calendar_month(client):
    series = {p["month"]: p["count"] for p in client.post("/api/search", json={"geojson": POLY}).json()["series"]}
    for month, cells in (("2019-01", 1), ("2019-06", 2)):  # month index 228 = 2019-01; the second cell burns in 2019-03 .. 2019-06
        j = client.post("/api/activity", json={"geojson": POLY, "month": month}).json()
        assert j["n_cells"] == len(j["features"]) == cells
        assert j["total"] == pytest.approx(series[month], abs=0.1)
        assert sum(f["properties"]["v"] for f in j["features"]) == pytest.approx(series[month], abs=0.1)
    assert j["source"] == "NOAA-20" and j["is_nrt"] is False


def test_hexagon_is_a_closed_lonlat_polygon(client):
    f = client.post("/api/activity", json={"geojson": POLY, "month": "2019-01"}).json()["features"][0]
    ring = f["geometry"]["coordinates"][0]
    assert len(ring) == 7 and ring[0] == ring[-1]
    assert all(-70.5 < lon < -68.5 and -35.5 < lat < -33.5 for lon, lat in ring)


def test_partial_and_out_of_range_months_are_refused(client):
    for month in ("2022-01", "2035-01"):  # month in progress; after the delivery
        r = client.post("/api/activity", json={"geojson": POLY, "month": month})
        assert r.status_code == 422, month
    assert client.post("/api/activity", json={"geojson": POLY, "month": "2019/01"}).status_code == 422


def test_bad_geometry_and_repeated_clicks(client):
    assert client.post("/api/activity", json={"geojson": {"type": "Point", "coordinates": [0, 0]}, "month": "2019-01"}).status_code == 422
    a = client.post("/api/activity", json={"geojson": POLY, "month": "2019-01"}).json()
    b = client.post("/api/activity", json={"geojson": POLY, "month": "2019-01"}).json()  # served from the cache
    assert a == b
