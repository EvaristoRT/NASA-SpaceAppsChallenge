"""Paso 05 - Modelo de armonización: factores que llevan cada satélite a "equivalente NOAA-20".

RESPONSABLE: Carlos          ESTADO: nivel 1 funcionando (probado con tabla falsa)

Entrada
    calibration/region=<region>/calibration.parquet     (paso 04)
    o, mientras el paso 04 no exista:  --fake  (genera una tabla falsa con factores conocidos)

Salida  (en <FIRE_DATA_DIR>/models/)
    factores.parquet      una fila por (origen, metrica, h3_r3, mes): factor, factor_global, n_meses, num, den
    metrics.json          validación, deriva del factor por año y control con FRP
    figs/*.png            gráficas de validación

Columnas que se esperan en la tabla de calibración (contrato del paso 04):
    h3_r5, h3_r3, year, month, y para cada satélite S en terra, aqua, modis, snpp, n20, n21:
    cd_S (días-celda), n_S (focos), frp_S (MW). `modis` = Terra ∪ Aqua.

Cadena (todo termina en la escala de NOAA-20):
    2018-04 -> hoy        NOAA-20 tal cual (factor 1)
    2012-01 -> 2018-03    S-NPP      x k_snpp
    2002-07 -> 2011-12    MODIS T+A  x k_modis
    2000-11 -> 2002-06    Terra      x f_terra x k_modis

Nivel 1: razón de sumas por región (h3_r3) x mes calendario, encogida hacia el factor global
con un prior de pseudo-cuentas (mismo método que backend/ignis/harmonize.py::_ratio):
    factor = (sum(num) + prior * factor_global) / (sum(den) + prior)
    k_modis = n20 / modis   en meses de traslape dentro de config.TRAIN_YEARS
    k_snpp  = n20 / snpp    ídem, y solo hasta config.SNPP_STABLE_END (después S-NPP se degrada)
    f_terra = modis / terra en 2003-2010 (los dos MODIS sanos)
Se ajusta para dos métricas: `cd` (días-celda) y `frp` (MW).

Validación (temporal): factores ajustados con TRAIN_YEARS se aplican a TEST_YEARS y se comparan
contra NOAA-20 observado. También se reporta la línea base "sin armonizar" para ver cuánto mejora.

Valores de referencia medidos en Sudamérica, ene-jul 2026 (para saber si algo salió mal):
    cd_n20 / cd_modis ~ 2.84      frp_n20 / frp_modis ~ 1.04      cd_n20 / cd_snpp ~ 1.00 (ene-mar)

Uso:
    python pipeline/scripts/05_model.py --fake                 # sin datos reales, verifica el método
    python pipeline/scripts/05_model.py                        # con la tabla del paso 04
    python pipeline/scripts/05_model.py --region sudamerica --prior 50
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config  # noqa: E402

SATS = ("terra", "aqua", "modis", "snpp", "n20", "n21")
METRICS = ("cd", "frp")


def ym(date: str) -> int:
    """'2018-04-01' -> índice de mes 2018*12+3."""
    y, m = int(date[:4]), int(date[5:7])
    return y * 12 + (m - 1)


AQUA0, SNPP0, SNPP_STABLE, SNPP_END = ym(config.AQUA_START), ym(config.SNPP_START), ym(config.SNPP_STABLE_END), ym(config.SNPP_END)
N200, N210 = ym(config.NOAA20_START), ym(config.NOAA21_START)

# origen -> (numerador, denominador, función que dice qué meses sirven para ajustar)
ORIGINS = {
    "modis": ("n20", "modis", lambda m: m >= N200),
    "snpp": ("n20", "snpp", lambda m: (m >= N200) & (m <= SNPP_STABLE)),
    "terra": ("modis", "terra", lambda m: (m >= ym("2003-01-01")) & (m <= ym("2010-12-01"))),
}


# --------------------------------------------------------------------------- tabla falsa
def fake_calibration(seed: int = 7, n_regions: int = 24, cells_per_region: int = 30) -> tuple[pd.DataFrame, dict]:
    """Tabla con la forma del contrato y factores verdaderos conocidos, para verificar el método.

    Imita lo que medimos: NOAA-20 ve ~2.84x los días-celda de MODIS (variando por región),
    S-NPP ~ NOAA-20 pero se degrada desde 2026-04, Terra ve ~0.5 de MODIS (normal) y se degrada al final del periodo,
    el FRP casi no depende del sensor.
    """
    rng = np.random.default_rng(seed)
    regions = np.arange(n_regions)
    k_true = 2.84 * rng.lognormal(0, 0.15, n_regions)       # n20 / modis por región
    f_true = 1.0 / (0.52 * rng.lognormal(0, 0.05, n_regions))  # modis / terra por región
    peak = rng.integers(0, 12, n_regions)                    # mes pico de la temporada de fuego

    months = np.arange(ym("2000-11-01"), ym("2026-11-01") + 1)
    rows = []
    for r in regions:
        for c in range(cells_per_region):
            base = rng.gamma(2.0, 3.0)
            for m in months:
                year, month = divmod(m, 12)
                season = 0.25 + np.exp(-0.5 * (((month - peak[r] + 6) % 12 - 6) / 1.6) ** 2)
                lam = base * season * rng.lognormal(0, 0.35)   # actividad "real" en escala NOAA-20
                terra_deg = 1.0 if year < 2022 else 1.0 - 0.06 * (year - 2021 + (month / 12))
                snpp_deg = 1.0 if m <= SNPP_STABLE else 1.0 - 0.04 * (m - SNPP_STABLE)
                has_aqua, has_snpp, has_n20, has_n21 = m >= AQUA0, SNPP0 <= m <= SNPP_END, m >= N200, m >= N210
                modis_lam = lam / k_true[r]
                terra = rng.poisson(modis_lam / f_true[r] * terra_deg)
                aqua = rng.poisson(modis_lam * (1 - 1 / f_true[r])) if has_aqua else 0
                modis = terra + aqua if has_aqua else terra
                vals = {
                    "terra": terra, "aqua": aqua, "modis": modis,
                    "snpp": rng.poisson(lam * 1.0 * snpp_deg) if has_snpp else 0,
                    "n20": rng.poisson(lam) if has_n20 else 0,
                    "n21": rng.poisson(lam * 0.99) if has_n21 else 0,
                }
                if not any(vals.values()):
                    continue
                row = {"h3_r5": r * 1000 + c, "h3_r3": r, "year": year, "month": month + 1, "lat": 0.0, "lon": 0.0}
                for s, v in vals.items():
                    row[f"cd_{s}"] = v
                    row[f"n_{s}"] = int(v * rng.uniform(1.2, 1.6))
                    # FRP: mismo fuego -> misma energía, con ruido; MODIS levemente menor
                    row[f"frp_{s}"] = float(v * (k_true[r] if s in ("terra", "aqua", "modis") else 1.0)
                                            * (0.96 if s in ("terra", "aqua", "modis") else 1.0) * rng.uniform(25, 35))
                rows.append(row)
    truth = {"k_modis_cd_by_region": dict(enumerate(np.round(k_true, 4).tolist())),
             "f_terra_cd_by_region": dict(enumerate(np.round(f_true, 4).tolist())),
             "k_modis_cd_mean": round(float(k_true.mean()), 4)}
    return pd.DataFrame(rows), truth


# --------------------------------------------------------------------------- ajuste
def load(path: Path) -> pd.DataFrame:
    df = pd.read_parquet(path)
    missing = [f"{p}_{s}" for p in METRICS for s in SATS if f"{p}_{s}" not in df] + \
              [c for c in ("h3_r5", "h3_r3", "year", "month") if c not in df]
    if missing:
        raise SystemExit(f"A la tabla de calibración le faltan columnas: {missing}")
    return df


def prepare(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["m"] = df["year"] * 12 + df["month"] - 1
    for p in METRICS:
        for s in SATS:
            df[f"{p}_{s}"] = df[f"{p}_{s}"].fillna(0).astype("float64")
    return df


def fit(df: pd.DataFrame, years: tuple[int, int], prior: float) -> pd.DataFrame:
    """Factores por (origen, metrica, h3_r3, mes calendario), encogidos hacia el global del origen."""
    out = []
    in_years = df["year"].between(*years)
    for origin, (num, den, ok) in ORIGINS.items():
        # terra se ajusta en su propia ventana (2003-2010), no en TRAIN_YEARS
        sel = ok(df["m"]) & (in_years if origin != "terra" else True)
        d = df[sel]
        for p in METRICS:
            nc, dc = f"{p}_{num}", f"{p}_{den}"
            tot_den = d[dc].sum()
            kg = float(d[nc].sum() / tot_den) if tot_den > 0 else np.nan
            g = d.groupby(["h3_r3", "month"])[[nc, dc]].sum().reset_index()
            # prior en las unidades del denominador: pseudo-cuentas equivalentes a `prior` días-celda
            pr = prior if p == "cd" else prior * (tot_den / max(d[f"cd_{den}"].sum(), 1))
            g["factor"] = (g[nc] + pr * kg) / (g[dc] + pr)
            out.append(pd.DataFrame({
                "origen": origin, "metrica": p, "h3_r3": g["h3_r3"], "mes": g["month"],
                "factor": g["factor"], "factor_global": kg, "num": g[nc], "den": g[dc],
                "n_meses": d.groupby(["h3_r3", "month"]).size().reindex(pd.MultiIndex.from_frame(g[["h3_r3", "month"]])).to_numpy(),
            }))
    return pd.concat(out, ignore_index=True)


def factor_for(df: pd.DataFrame, fac: pd.DataFrame, origin: str, metric: str) -> np.ndarray:
    f = fac[(fac["origen"] == origin) & (fac["metrica"] == metric)]
    glob = float(f["factor_global"].iloc[0]) if len(f) else np.nan
    look = f.set_index(["h3_r3", "mes"])["factor"]
    idx = pd.MultiIndex.from_arrays([df["h3_r3"], df["month"]])
    return look.reindex(idx).fillna(glob).to_numpy()


# --------------------------------------------------------------------------- validación
def score(obs: pd.Series, pred: pd.Series) -> dict:
    ape = (pred - obs).abs() / obs.clip(lower=1)
    return {"sesgo_pct": round(float((pred.sum() / obs.sum() - 1) * 100), 2),
            "error_abs_mediano_pct": round(float(ape.median() * 100), 2),
            "pearson_r": round(float(np.corrcoef(obs, pred)[0, 1]), 4) if len(obs) > 2 else None,
            "n": int(len(obs))}


def validate(df: pd.DataFrame, fac: pd.DataFrame) -> tuple[dict, pd.DataFrame]:
    res: dict = {"esquema": f"ajuste {config.TRAIN_YEARS}, prueba {config.TEST_YEARS}"}
    test = df[df["year"].between(*config.TEST_YEARS)]
    series = None
    for origin in ("modis", "snpp"):
        num, den, ok = ORIGINS[origin]
        t = test[ok(test["m"])].copy()
        if t.empty:
            continue
        for p in METRICS:
            t["pred"] = t[f"{p}_{den}"] * factor_for(t, fac, origin, p)
            reg = t.groupby(["h3_r3", "m"])[[f"{p}_{num}", "pred", f"{p}_{den}"]].sum()
            tot = t.groupby("m")[[f"{p}_{num}", "pred", f"{p}_{den}"]].sum()
            res[f"{origin}_{p}"] = {
                "armonizado_mensual_total": score(tot[f"{p}_{num}"], tot["pred"]),
                "armonizado_region_mes": score(reg[f"{p}_{num}"], reg["pred"]),
                "sin_armonizar_mensual_total": score(tot[f"{p}_{num}"], tot[f"{p}_{den}"]),
            }
            if origin == "modis" and p == "cd":
                series = tot.rename(columns={f"{p}_{num}": "n20_real", "pred": "modis_armonizado", f"{p}_{den}": "modis_crudo"})
    return res, series


def drift(df: pd.DataFrame) -> dict:
    """Factor global por año. Si cambia con los años, un factor constante no basta."""
    out = {}
    for origin in ("modis", "snpp"):
        num, den, ok = ORIGINS[origin]
        d = df[ok(df["m"])].groupby("year")[[f"cd_{num}", f"cd_{den}"]].sum()
        out[origin] = {int(y): round(float(r[f"cd_{num}"] / r[f"cd_{den}"]), 4) for y, r in d.iterrows() if r[f"cd_{den}"] > 0}
    return out


def frp_control(series: pd.DataFrame | None, df: pd.DataFrame) -> dict:
    """La serie armonizada de días-celda debe seguir al FRP de NOAA-20, que casi no depende del sensor."""
    if series is None:
        return {}
    frp = df.groupby("m")["frp_n20"].sum().reindex(series.index)
    return {"r_modis_armonizado_vs_frp_n20": round(float(np.corrcoef(series["modis_armonizado"], frp)[0, 1]), 4),
            "r_n20_real_vs_frp_n20": round(float(np.corrcoef(series["n20_real"], frp)[0, 1]), 4)}


def plot(series: pd.DataFrame | None, out: Path) -> list[str]:
    if series is None:
        return []
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    out.mkdir(parents=True, exist_ok=True)
    x = pd.to_datetime([f"{m // 12}-{m % 12 + 1:02d}-01" for m in series.index])
    fig, ax = plt.subplots(figsize=(11, 4.5))
    ax.plot(x, series["n20_real"], color="#1b1b1b", lw=2.2, label="NOAA-20 observado")
    ax.plot(x, series["modis_armonizado"], color="#d1495b", lw=1.6, ls="--", label="MODIS armonizado (equiv. NOAA-20)")
    ax.plot(x, series["modis_crudo"], color="#8d99ae", lw=1.2, label="MODIS crudo")
    ax.set_title(f"Validación en {config.TEST_YEARS[0]}–{config.TEST_YEARS[1]} (factores ajustados en {config.TRAIN_YEARS[0]}–{config.TRAIN_YEARS[1]})")
    ax.set_ylabel("días-celda por mes")
    ax.legend(frameon=False)
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    p1 = out / "validacion_modis_vs_n20.png"
    fig.savefig(p1, dpi=150)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(5, 5))
    lim = max(series["n20_real"].max(), series["modis_armonizado"].max()) * 1.05
    ax.scatter(series["n20_real"], series["modis_armonizado"], s=18, color="#d1495b")
    ax.plot([0, lim], [0, lim], color="#1b1b1b", lw=1)
    ax.set_xlim(0, lim); ax.set_ylim(0, lim)
    ax.set_xlabel("NOAA-20 observado"); ax.set_ylabel("MODIS armonizado")
    ax.set_title("1:1 mensual")
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    p2 = out / "validacion_1a1.png"
    fig.savefig(p2, dpi=150)
    plt.close(fig)
    return [p1.name, p2.name]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data-dir", help="Carpeta de datos (por defecto: FIRE_DATA_DIR)")
    ap.add_argument("--region", default=config.DEFAULT_REGION, choices=sorted(config.REGIONS))
    ap.add_argument("--prior", type=float, default=30.0, help="Peso del encogimiento hacia el factor global (días-celda)")
    ap.add_argument("--fake", action="store_true", help="Usar una tabla falsa con factores conocidos")
    args = ap.parse_args()

    models = config.layer("models", args.data_dir)
    truth = None
    if args.fake:
        models = models / "fake"
        df, truth = fake_calibration()
        print(f"Tabla falsa: {len(df):,} filas")
    else:
        path = config.layer("calibration", args.data_dir) / f"region={args.region}" / "calibration.parquet"
        if not path.exists():
            print(f"No existe {path}. Corre el paso 04, o prueba con --fake")
            return 1
        df = load(path)
    df = prepare(df)
    models.mkdir(parents=True, exist_ok=True)

    fac = fit(df, config.TRAIN_YEARS, args.prior)
    fac.to_parquet(models / "factores.parquet", index=False)
    val, series = validate(df, fac)
    metrics = {
        "region": "fake" if args.fake else args.region,
        "referencia": config.REFERENCE_SATELLITE,
        "prior": args.prior,
        "factores_globales": {f"{o}_{p}": round(float(g["factor_global"].iloc[0]), 4)
                              for (o, p), g in fac.groupby(["origen", "metrica"])},
        "validacion": val,
        "deriva_factor_por_anio": drift(df),
        "control_frp": frp_control(series, df),
        "figuras": plot(series, models / "figs"),
    }
    if truth:
        k = fac[(fac.origen == "modis") & (fac.metrica == "cd")].groupby("h3_r3").apply(
            lambda g: (g["num"].sum() + 0) / g["den"].sum(), include_groups=False)
        err = [abs(k[r] / truth["k_modis_cd_by_region"][r] - 1) for r in k.index]
        metrics["verdad_fake"] = {**{k_: v for k_, v in truth.items() if k_ == "k_modis_cd_mean"},
                                  "error_medio_k_modis_por_region_pct": round(float(np.mean(err) * 100), 2)}
    (models / "metrics.json").write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")

    print(json.dumps({k_: metrics[k_] for k_ in ("factores_globales", "control_frp")}, indent=2, ensure_ascii=False))
    m = val.get("modis_cd", {})
    if m:
        a, b = m["armonizado_mensual_total"], m["sin_armonizar_mensual_total"]
        print(f"MODIS -> NOAA-20 (días-celda), prueba {config.TEST_YEARS}: sesgo {b['sesgo_pct']}% -> {a['sesgo_pct']}%, "
              f"error mediano {b['error_abs_mediano_pct']}% -> {a['error_abs_mediano_pct']}%, r {a['pearson_r']}")
    if truth:
        print("Recuperación en tabla falsa:", metrics["verdad_fake"])
    print(f"Salida en {models}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
