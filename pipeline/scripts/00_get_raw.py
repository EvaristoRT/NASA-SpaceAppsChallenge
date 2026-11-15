"""Paso 00 - Baja el archivo histórico de FIRMS (zips anuales por país) directo de NASA.

No hace falta cuenta, ni token, ni que nadie te pase un USB: los zips son públicos en
    https://firms.modaps.eosdis.nasa.gov/data/country/zips/<producto>_<año>_all_countries.zip
Así los tres tenemos exactamente los mismos bytes de entrada.

Destino: <FIRE_DATA_DIR>/raw/zips/   (si ya tienes los zips en otra subcarpeta de
FIRE_DATA_DIR no hace falta bajarlos de nuevo: el paso 01 los busca recursivamente,
y este script los reconoce y los salta).

Tamaño aproximado: MODIS 1.9 GB, VIIRS S-NPP 4.8 GB, VIIRS NOAA-20 2.6 GB (total ~9.3 GB).
Es reanudable: salta los zips que ya existen con el tamaño correcto.

El año en curso (2026) NO está en zips: se baja con scripts/00b_descargar_2026.sh
o se copia la carpeta datos_2026/ de un compañero.

Uso:
    python pipeline/scripts/00_get_raw.py                      # todo
    python pipeline/scripts/00_get_raw.py --product modis      # un producto
    python pipeline/scripts/00_get_raw.py --years 2018-2025
    python pipeline/scripts/00_get_raw.py --check              # solo dice qué falta
"""
from __future__ import annotations

import argparse
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config  # noqa: E402

BASE_URL = "https://firms.modaps.eosdis.nasa.gov/data/country/zips"
# producto -> (primer año, último año con zip publicado). El zip de un año sale cuando el año cierra.
PRODUCTS = {"modis": (2000, 2025), "viirs-snpp": (2012, 2025), "viirs-jpss1": (2018, 2025)}


def remote_size(url: str) -> int | None:
    try:
        with urllib.request.urlopen(urllib.request.Request(url, method="HEAD"), timeout=60) as r:
            return int(r.headers.get("Content-Length") or 0) or None
    except urllib.error.HTTPError:
        return None


def download(url: str, target: Path) -> None:
    partial = target.with_suffix(".zip.partial")
    with urllib.request.urlopen(url, timeout=120) as r, open(partial, "wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
    partial.replace(target)  # solo queda un .zip si la descarga terminó completa


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data-dir", help="Carpeta de datos (por defecto: FIRE_DATA_DIR)")
    ap.add_argument("--product", choices=sorted(PRODUCTS), help="Solo un producto")
    ap.add_argument("--years", help="Año o rango: 2005 o 2018-2025")
    ap.add_argument("--check", action="store_true", help="No baja nada; solo lista lo que falta")
    args = ap.parse_args()

    data_dir = config.data_dir(args.data_dir)
    dest = data_dir / "raw" / "zips"
    have = {p.name: p for p in data_dir.rglob("*_all_countries.zip")}
    lo, hi = 0, 9999
    if args.years:
        a, _, b = args.years.partition("-")
        lo, hi = int(a), int(b or a)

    missing = done = 0
    for product, (first, last) in PRODUCTS.items():
        if args.product and product != args.product:
            continue
        for year in range(max(first, lo), min(last, hi) + 1):
            name = f"{product}_{year}_all_countries.zip"
            url = f"{BASE_URL}/{name}"
            size = remote_size(url)
            if size is None:
                print(f"  no publicado  {name}")
                continue
            local = have.get(name)
            if local and local.stat().st_size == size:
                done += 1
                continue
            missing += 1
            estado = "incompleto" if local else "falta"
            if args.check:
                print(f"  {estado:10s}  {name}  ({size / 1e6:.0f} MB)")
                continue
            target = local or dest / name
            target.parent.mkdir(parents=True, exist_ok=True)
            print(f"  bajando  {name}  ({size / 1e6:.0f} MB) ...", flush=True)
            download(url, target)
            done += 1
            missing -= 1
    print(f"Completos: {done}   Faltan: {missing}   (carpeta: {data_dir})")
    return 0 if missing == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
