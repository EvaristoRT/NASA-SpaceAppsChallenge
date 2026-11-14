"""MODIS + VIIRS harmonization.

Unit of count: a *burning cell-day* = one H3 res-8 cell (~0.74 km2, similar to a
MODIS 1 km pixel) with >= 1 hotspot on a given day. Counting cell-days instead
of raw points removes the footprint difference (VIIRS 375 m vs MODIS 1 km).

Remaining differences are *sensitivity* and *overpass count*. They are removed by
mapping every sensor "era" onto one reference: MODIS Terra+Aqua (the longest,
most stable configuration, 2002-07 to present).

    era                          how it is mapped to the reference
    ---------------------------  -----------------------------------------------
    MODIS Terra only (to 2002-06) x f_terra[region]  (Terra+Aqua / Terra, 2003-2010)
    MODIS Terra+Aqua              reference, unchanged
    VIIRS with 1, 2 or 3 sats     x k[era, region]   (MODIS / VIIRS in overlap months)

Factors are fitted per coarse region (H3 res 3 parent, ~12,000 km2) because the
VIIRS/MODIS ratio depends on fire size and time of day, which vary by biome. Each
regional factor is shrunk toward the global one with a pseudo-count prior so that
regions with little data do not produce wild factors.

Eras are read from the data (a satellite is "present" in a month when it has
detections on >= MIN_DAYS distinct days), not hard-coded.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

SRC_MODIS, SRC_TERRA_SCALED, SRC_VIIRS_SCALED = 0, 1, 2
SOURCE_LABELS = {SRC_MODIS: "MODIS", SRC_TERRA_SCALED: "MODIS Terra-only (scaled)", SRC_VIIRS_SCALED: "VIIRS (scaled to MODIS)"}

TERRA_CAL_START, TERRA_CAL_END = 3 * 12, 10 * 12 + 11  # 2003-01 .. 2010-12 (both MODIS satellites active)
MIN_DAYS = 20  # distinct days with detections for a satellite to count as active in a month


def month_index(year: int, month: int) -> int:
    return (year - 2000) * 12 + (month - 1)


def month_label(m: int) -> str:
    return f"{2000 + m // 12}-{m % 12 + 1:02d}"


def _ratio(df: pd.DataFrame, num: str, den: str, prior: float):
    g = df.groupby("region", observed=True)[[num, den]].sum()
    tot_den = g[den].sum()
    kg = float(g[num].sum() / tot_den) if tot_den > 0 else 1.0
    k = (g[num] + prior * kg) / (g[den] + prior)
    return k, kg


def _prepare(monthly: pd.DataFrame, cells: pd.DataFrame, meta: pd.DataFrame) -> pd.DataFrame:
    m = meta.set_index("m")
    df = monthly.copy()
    df["region"] = df["cell_id"].map(cells.set_index("cell_id")["region"])
    df["era"] = df["m"].map(m["viirs_sats"]).fillna(0).astype(int)
    df["terra_only"] = df["m"].map(m["terra_only"]).fillna(False).astype(bool)
    df["modis_full"] = df["m"].map(m["modis_full"]).fillna(False).astype(bool)
    return df


def fit(df: pd.DataFrame, mask: pd.Series | None = None, prior: float = 30.0) -> dict:
    """Fit correction factors on the rows selected by `mask` (default: all)."""
    d = df if mask is None else df[mask]
    out: dict = {"viirs": {}, "viirs_global": {}, "terra": None, "terra_global": 1.0}

    cal = d[(d["era"] > 0) & d["modis_full"]]
    all_k = cal["modis_ta"].sum() / cal["viirs"].sum() if cal["viirs"].sum() > 0 else 1.0
    for era in (1, 2, 3):
        sub = cal[cal["era"] == era]
        if sub["viirs"].sum() > 0:
            out["viirs"][era], out["viirs_global"][era] = _ratio(sub, "modis_ta", "viirs", prior)
        else:
            out["viirs"][era], out["viirs_global"][era] = None, float(all_k)

    t = d[d["modis_full"] & d["m"].between(TERRA_CAL_START, TERRA_CAL_END)]
    if t["modis_t"].sum() > 0:
        out["terra"], out["terra_global"] = _ratio(t, "modis_ta", "modis_t", prior)
    return out


def apply(df: pd.DataFrame, f: dict) -> tuple[np.ndarray, np.ndarray]:
    """Return (value, source) arrays for every row of df."""
    value = df["modis_ta"].to_numpy(dtype="float64").copy()
    source = np.full(len(df), SRC_MODIS, dtype="int8")

    to = df["terra_only"].to_numpy()
    if to.any():
        k = df["region"].map(f["terra"]) if f["terra"] is not None else pd.Series(np.nan, index=df.index)
        k = k.fillna(f["terra_global"]).to_numpy()
        value[to] = df["modis_t"].to_numpy()[to] * k[to]
        source[to] = SRC_TERRA_SCALED

    for era in (1, 2, 3):
        sel = (df["era"] == era).to_numpy()
        if not sel.any():
            continue
        tbl = f["viirs"][era]
        k = df["region"].map(tbl) if tbl is not None else pd.Series(np.nan, index=df.index)
        k = k.fillna(f["viirs_global"][era]).to_numpy()
        value[sel] = df["viirs"].to_numpy()[sel] * k[sel]
        source[sel] = SRC_VIIRS_SCALED
    return value, source


def harmonize(monthly: pd.DataFrame, cells: pd.DataFrame, meta: pd.DataFrame, prior: float = 30.0):
    """monthly: cell_id, m, modis_ta, modis_t, viirs. Returns (monthly+value+src, summary)."""
    df = _prepare(monthly, cells, meta)
    f = fit(df, prior=prior)
    value, source = apply(df, f)
    out = monthly.copy()
    out["value"] = value.astype("float32")
    out["src"] = source
    summary = {
        "unit": "MODIS-equivalent burning cell-days (H3 res 8 cell with >=1 hotspot in a day)",
        "reference": "MODIS Terra+Aqua",
        "k_viirs_global": {str(e): round(float(v), 4) for e, v in f["viirs_global"].items()},
        "f_terra_global": round(float(f["terra_global"]), 4),
        "prior_weight": prior,
        "validation": validate(df, prior),
    }
    return out, summary


def validate(df: pd.DataFrame, prior: float = 30.0) -> dict:
    """Fit on odd years, test on even years: how well does k*VIIRS reproduce MODIS?"""
    year = 2000 + df["m"] // 12
    f = fit(df, mask=(year % 2 == 1), prior=prior)
    test = df[(year % 2 == 0) & (df["era"] > 0) & df["modis_full"]]
    if test.empty:
        return {"n_test_months": 0}
    value, _ = apply(test, f)
    t = test.assign(pred=value)
    reg = t.groupby(["region", "m"], observed=True)[["modis_ta", "pred"]].sum()
    tot = t.groupby("m")[["modis_ta", "pred"]].sum()
    raw = t.groupby("m")[["modis_ta", "viirs"]].sum()
    ape = (tot["pred"] - tot["modis_ta"]).abs() / tot["modis_ta"].clip(lower=1)
    return {
        "scheme": "fit on odd years, test on even years",
        "n_test_months": int(len(tot)),
        "pearson_r_region_month": round(float(np.corrcoef(reg["modis_ta"], reg["pred"])[0, 1]), 4),
        "median_abs_pct_error_monthly_total": round(float(ape.median()) * 100, 2),
        "bias_pct_total": round(float((tot["pred"].sum() / tot["modis_ta"].sum() - 1) * 100), 2),
        "raw_viirs_over_modis_total": round(float(raw["viirs"].sum() / raw["modis_ta"].sum()), 3),
    }
