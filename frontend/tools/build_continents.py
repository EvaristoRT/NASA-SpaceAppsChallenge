"""Fix the continent outlines of worldZonesGeoJSON.json.

Problems in the original data (src/data/worldZonesGeoJSON.json, as delivered):
  1. Each continent was its countries' polygons concatenated, not dissolved, so the outline layer drew every national border.
  2. Europe contained all of Russia (Siberia, Chukotka across the antimeridian) and French Guiana; Asia stopped at 55 N.

What this script does (input is always the untouched original, so it can be re-run):
  - moves French Guiana to South America;
  - splits Russia at 60 E (approximate Urals): west part stays in Europe, east part goes to Asia;
  - dissolves each continent into one outline, closing the tiny gaps between neighbouring countries (morphological closing);
  - leaves Antarctica and every non-continent feature untouched (the runtime outline builder in src/utils/outlines.js
    drops the edges that lie on the antimeridian or the pole).
Country metadata (`continent` field) is NOT changed, so the explorer filters behave exactly as before.

Needs Shapely (offline tool only, not an app dependency):  pip install shapely
Usage:  python tools/build_continents.py
"""
import json
import sys
from pathlib import Path

from shapely.geometry import MultiPolygon, Polygon, box, mapping, shape
from shapely.ops import unary_union
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "worldZonesGeoJSON.original.json"
DST = ROOT / "src" / "data" / "worldZonesGeoJSON.json"

URALS_LON = 60.0  # visual approximation of the Europe/Asia divide
CLOSE_EPS = 0.03  # degrees (~3 km): closes gaps between country polygons without changing coastlines
KEEP_AS_IS = {"antartida"}


def poly_list(geom):
    return geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]


def key(ring):
    return tuple((round(x, 4), round(y, 4)) for x, y in ring)


def to_shapely(coords):
    p = Polygon(coords[0], coords[1:])
    return p if p.is_valid else make_valid(p)


def parts(g):
    """Polygons inside any shapely geometry."""
    if g.is_empty:
        return []
    if g.geom_type == "Polygon":
        return [g]
    if g.geom_type in ("MultiPolygon", "GeometryCollection"):
        return [q for sub in g.geoms for q in parts(sub)]
    return []


def rounded(obj, nd=4):
    if isinstance(obj, (list, tuple)):
        return [rounded(o, nd) for o in obj]
    return round(obj, nd)


def total_ring_length(geoms):
    singles = [q for g in geoms for q in parts(g)]  # make_valid() can turn one polygon into several
    return sum(r.length for p in singles for r in [p.exterior, *p.interiors])


def main():
    data = json.loads(SRC.read_text(encoding="utf-8"))
    feats = data["features"]
    by_id = {f["id"]: f for f in feats}

    def country_rings(name):
        return {key(p[0]) for f in feats if f["properties"].get("category") == "País" and f["properties"].get("name") == name
                for p in poly_list(f["geometry"])}

    russia, france = country_rings("Rusia"), country_rings("Francia")

    members = {}  # continent id -> list of shapely polygons
    for cid, f in by_id.items():
        if f["properties"].get("category") == "Continente":
            members[cid] = [to_shapely(p) for p in poly_list(f["geometry"])]

    # 1. French Guiana: a France polygon that sits in South America
    moved_guiana = 0
    keep = []
    for p, raw in zip(members["europa"], poly_list(by_id["europa"]["geometry"])):
        if key(raw[0]) in france and p.centroid.x < -30:
            members["america-del-sur"].append(p)
            moved_guiana += 1
        else:
            keep.append((p, raw))
    # 2. Russia: split at the Urals line
    # Europe side: from -30 to the Urals line. Anything of Russia outside it (Siberia, and Chukotka's eastern tip, which has
    # NEGATIVE longitudes because it lies across the antimeridian) goes to Asia.
    west = box(-30, -90, URALS_LON, 90)
    europe_polys, to_asia, n_russia = [], [], 0
    for p, raw in keep:
        if key(raw[0]) in russia:
            n_russia += 1
            europe_polys += parts(p.intersection(west))
            to_asia += parts(p.difference(west))
        else:
            europe_polys.append(p)
    members["europa"] = europe_polys
    members["asia"] += to_asia

    print(f"French Guiana moved to South America: {moved_guiana} polygon(s)")
    print(f"Russia polygons split at {URALS_LON}E: {n_russia} -> {len(to_asia)} piece(s) to Asia")
    print()
    print(f"{'continent':20} {'polygons':>9} {'->':>3} {'dissolved':>10} {'ring length before':>20} {'after':>8} {'holes':>6}")

    for cid, polys in members.items():
        if cid in KEEP_AS_IS:
            continue
        grown = unary_union([p.buffer(CLOSE_EPS, quad_segs=2, join_style="mitre") for p in polys])
        merged = grown.buffer(-CLOSE_EPS, quad_segs=2, join_style="mitre")
        out = parts(merged)
        holes = sum(len(p.interiors) for p in out)
        print(f"{cid:20} {len(polys):>9} {'->':>3} {len(out):>10} {total_ring_length(polys):>20.0f} {total_ring_length(out):>8.0f} {holes:>6}")
        geom = MultiPolygon(out)
        by_id[cid]["geometry"] = {"type": "MultiPolygon", "coordinates": rounded(mapping(geom)["coordinates"])}

    DST.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print()
    print(f"written: {DST.relative_to(ROOT)} ({DST.stat().st_size:,} bytes)")


if __name__ == "__main__":
    sys.exit(main())
