"""Polygon helpers in pure numpy (no shapely in production)."""
from __future__ import annotations

import numpy as np


def extract_rings(gj: dict) -> list[np.ndarray]:
    """All linear rings (outer + holes) of every polygon found in a GeoJSON object."""
    t = gj.get("type")
    if t == "FeatureCollection":
        return [r for f in gj.get("features", []) for r in extract_rings(f)]
    if t == "Feature":
        return extract_rings(gj.get("geometry") or {})
    if t == "Polygon":
        polys = [gj["coordinates"]]
    elif t == "MultiPolygon":
        polys = gj["coordinates"]
    else:
        raise ValueError(f"Unsupported GeoJSON type: {t!r}; draw a Polygon")
    rings = []
    for poly in polys:
        for ring in poly:
            a = np.asarray(ring, dtype="float64")[:, :2]
            if len(a) < 4:
                raise ValueError("Polygon ring needs at least 4 positions")
            if np.abs(a[:, 0]).max() > 180 or np.abs(a[:, 1]).max() > 90:
                raise ValueError("Coordinates must be WGS84 [lon, lat]")
            rings.append(a)
    if not rings:
        raise ValueError("No polygon found")
    return rings


def bbox(rings) -> tuple[float, float, float, float]:
    a = np.vstack(rings)
    return float(a[:, 0].min()), float(a[:, 1].min()), float(a[:, 0].max()), float(a[:, 1].max())


def points_in_rings(lon: np.ndarray, lat: np.ndarray, rings) -> np.ndarray:
    """Even-odd rule over all rings, so holes work."""
    inside = np.zeros(lon.shape, dtype=bool)
    for ring in rings:
        x1, y1 = ring[:-1, 0], ring[:-1, 1]
        x2, y2 = ring[1:, 0], ring[1:, 1]
        for a, b, c, d in zip(x1, y1, x2, y2):
            if b == d:
                continue
            cond = ((b > lat) != (d > lat)) & (lon < (c - a) * (lat - b) / (d - b) + a)
            inside ^= cond
    return inside


def area_km2(rings) -> float:
    """Planar area on a local equirectangular projection; fine for AOI-sized polygons.
    Holes are counted as area (upper bound) since ring roles are not tracked."""
    total = 0.0
    lat0 = np.deg2rad(np.vstack(rings)[:, 1].mean())
    for r in rings:
        x = np.deg2rad(r[:, 0]) * 6371.0088 * np.cos(lat0)
        y = np.deg2rad(r[:, 1]) * 6371.0088
        a = 0.5 * abs(np.dot(x[:-1], y[1:]) - np.dot(x[1:], y[:-1]))
        total += a
    return float(total)
