"""Raw FIRMS archive CSVs -> cell-month table (the input of harmonize.harmonize).

Expected files in data/raw/ (FIRMS "Archive Download", request by country/area, CSV):
    modis*.csv   columns: latitude, longitude, acq_date, satellite (Terra|Aqua), confidence 0-100, type
    viirs*.csv   columns: latitude, longitude, acq_date, satellite (N|N20|N21 / Suomi-NPP...), confidence l|n|h, type
Any file whose name contains "modis" is MODIS, "viirs" is VIIRS. Several files per sensor are fine.
Columns `type` is optional; when present only type 0 (presumed vegetation fire) is kept, which drops
volcanoes, offshore and static sources (gas flares).
"""
from __future__ import annotations

from pathlib import Path

import h3
import numpy as np
import pandas as pd

from .harmonize import MIN_DAYS

RES, REGION_RES = 8, 3
USECOLS = {"latitude", "longitude", "acq_date", "satellite", "confidence", "type"}


def _read(path: Path, kind: str) -> pd.DataFrame:
    df = pd.read_csv(path, usecols=lambda c: c in USECOLS, dtype={"confidence": "string", "satellite": "string"})
    if "type" in df:
        df = df[df["type"].fillna(0).astype(int) == 0]
    conf = df["confidence"].str.strip().str.lower()
    if kind == "modis":
        df = df[pd.to_numeric(conf, errors="coerce").fillna(0) >= 30]  # drop low-confidence (<30)
    else:
        df = df[conf.isin(["n", "nominal", "h", "high"]) | pd.to_numeric(conf, errors="coerce").ge(30)]
    sat = df["satellite"].str.strip().str.lower()
    if kind == "modis":
        df = df.assign(sat=np.where(sat.str.contains("terra"), "terra", "aqua"))
    else:
        df = df.assign(sat=np.select([sat.isin(["n20"]) | sat.str.contains("noaa-20"), sat.isin(["n21"]) | sat.str.contains("noaa-21")],
                                     ["n20", "n21"], "snpp"))
    d = pd.to_datetime(df["acq_date"])
    return pd.DataFrame({"lat": df["latitude"].to_numpy(), "lon": df["longitude"].to_numpy(),
                         "date": d.dt.normalize().to_numpy(), "sat": df["sat"].to_numpy()})


def _cells(df: pd.DataFrame) -> pd.DataFrame:
    # H3 on unique ~1e-4 deg rounded coords first: far fewer calls than rows
    key = (df["lat"].round(4).astype("float64"), df["lon"].round(4).astype("float64"))
    uniq = pd.DataFrame({"lat": key[0], "lon": key[1]}).drop_duplicates()
    uniq["h3"] = [h3.latlng_to_cell(a, b, RES) for a, b in zip(uniq["lat"], uniq["lon"])]
    out = df.assign(lat=key[0], lon=key[1]).merge(uniq, on=["lat", "lon"], how="left")
    return out[["h3", "date", "sat"]]


def _cell_days_per_month(df: pd.DataFrame) -> pd.Series:
    d = df.drop_duplicates(["h3", "date"])
    m = (d["date"].dt.year - 2000) * 12 + d["date"].dt.month - 1
    return d.groupby([d["h3"], m.rename("m")]).size()


def build(raw_dir: Path):
    mod = [_read(p, "modis") for p in sorted(raw_dir.glob("*modis*.csv"))]
    vii = [_read(p, "viirs") for p in sorted(raw_dir.glob("*viirs*.csv"))]
    if not mod or not vii:
        raise SystemExit(f"Need at least one *modis*.csv and one *viirs*.csv in {raw_dir}")
    mod, vii = pd.concat(mod), pd.concat(vii)
    mod, vii = _cells(mod).assign(sat=mod["sat"].to_numpy()), _cells(vii).assign(sat=vii["sat"].to_numpy())

    s_ta = _cell_days_per_month(mod).rename("modis_ta")
    s_t = _cell_days_per_month(mod[mod["sat"] == "terra"]).rename("modis_t")
    s_v = _cell_days_per_month(vii).rename("viirs")
    monthly = pd.concat([s_ta, s_t, s_v], axis=1).fillna(0).astype("int32").reset_index()

    # month metadata: which satellites are active (>= MIN_DAYS distinct days with detections)
    def active(df, sat=None):
        d = df if sat is None else df[df["sat"] == sat]
        m = (d["date"].dt.year - 2000) * 12 + d["date"].dt.month - 1
        return d.groupby(m)["date"].nunique().ge(MIN_DAYS)

    allm = np.arange(int(monthly["m"].min()), int(monthly["m"].max()) + 1)
    terra, aqua = active(mod, "terra").reindex(allm, fill_value=False), active(mod, "aqua").reindex(allm, fill_value=False)
    nv = sum(active(vii, s).reindex(allm, fill_value=False).astype(int) for s in ("snpp", "n20", "n21"))
    meta = pd.DataFrame({"m": allm, "viirs_sats": nv.to_numpy(), "terra_only": (terra & ~aqua).to_numpy(),
                         "modis_full": (terra & aqua).to_numpy()})

    uc = pd.Index(monthly["h3"].unique())
    ll = np.array([h3.cell_to_latlng(c) for c in uc])
    cells = pd.DataFrame({"cell_id": np.arange(len(uc), dtype="int32"), "h3": uc, "lat": ll[:, 0].astype("float32"),
                          "lon": ll[:, 1].astype("float32")})
    cells["region"] = pd.Series([h3.cell_to_parent(c, REGION_RES) for c in uc]).astype("category").cat.codes.astype("int16")
    monthly["cell_id"] = monthly["h3"].map(pd.Series(cells["cell_id"].to_numpy(), index=cells["h3"])).astype("int32")
    monthly["m"] = monthly["m"].astype("int16")
    return cells, monthly[["cell_id", "m", "modis_ta", "modis_t", "viirs"]], meta
