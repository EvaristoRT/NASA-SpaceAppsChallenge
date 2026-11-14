"""Synthetic demo data with KNOWN ground truth. NOT real fire data.

Used to (1) run the app before real FIRMS data is processed and (2) test that the
harmonization removes the artificial step when VIIRS arrives. Every output built from
this carries meta.synthetic = true so the UI can show a banner.
"""
from __future__ import annotations

import h3
import numpy as np
import pandas as pd

from .harmonize import month_index

M_START, M_END = month_index(2000, 11), month_index(2026, 10)
AQUA_START, SNPP_START, N20_START, N21_START = (month_index(2002, 7), month_index(2012, 2),
                                                month_index(2018, 5), month_index(2024, 2))
VIIRS_SENS = {1: 2.0, 2: 2.9, 3: 3.8}  # VIIRS sees more than MODIS, and more with more satellites


def make(seed: int = 7, n_cells: int = 6000, year_noise: float = 0.25,
         bbox=(-98.5, 17.0, -94.0, 22.0), res: int = 8):
    rng = np.random.default_rng(seed)
    lon0, lat0, lon1, lat1 = bbox
    ids = {}
    while len(ids) < n_cells:
        lat = rng.uniform(lat0, lat1, 4000)
        lon = rng.uniform(lon0, lon1, 4000)
        for c in (h3.latlng_to_cell(a, b, res) for a, b in zip(lat, lon)):
            ids[c] = None
            if len(ids) >= n_cells:
                break
    hexes = list(ids)
    ll = np.array([h3.cell_to_latlng(c) for c in hexes])
    cells = pd.DataFrame({
        "cell_id": np.arange(n_cells, dtype="int32"), "h3": hexes,
        "lat": ll[:, 0].astype("float32"), "lon": ll[:, 1].astype("float32"),
        "region": [h3.cell_to_parent(c, 3) for c in hexes],
    })
    cells["region"] = cells["region"].astype("category").cat.codes.astype("int16")

    months = np.arange(M_START, M_END + 1)
    mon = months % 12 + 1
    year = 2000 + months // 12
    season = 0.15 + 2.2 * np.exp(-((mon - 4.5) / 1.3) ** 2)
    yfac_by_year = {y: float(np.exp(rng.normal(0, year_noise))) for y in np.unique(year)}
    yfac = np.array([yfac_by_year[y] for y in year])
    prop = rng.lognormal(-1.2, 1.0, n_cells)
    lam = prop[:, None] * (season * yfac)[None, :]  # TRUE burning cell-days, cells x months

    terra_only = months < AQUA_START
    n_sats = np.where(months >= N21_START, 3, np.where(months >= N20_START, 2, np.where(months >= SNPP_START, 1, 0)))
    sens = np.array([VIIRS_SENS.get(n, 0.0) for n in n_sats])

    modis_ta = rng.poisson(lam * 0.45 * np.where(terra_only, 0.5, 1.0)[None, :])
    modis_t = np.where(terra_only[None, :], modis_ta, rng.binomial(modis_ta, 0.5))
    viirs = rng.poisson(lam * sens[None, :] * 0.45)

    ci, mi = np.nonzero((modis_ta > 0) | (viirs > 0))
    monthly = pd.DataFrame({
        "cell_id": ci.astype("int32"), "m": months[mi].astype("int16"),
        "modis_ta": modis_ta[ci, mi].astype("int32"), "modis_t": modis_t[ci, mi].astype("int32"),
        "viirs": viirs[ci, mi].astype("int32"),
    })
    meta = pd.DataFrame({"m": months, "viirs_sats": n_sats, "terra_only": terra_only, "modis_full": ~terra_only})
    truth = pd.Series(lam.sum(axis=0) * 0.45, index=months, name="true_modis_equiv")
    return cells, monthly, meta, truth
