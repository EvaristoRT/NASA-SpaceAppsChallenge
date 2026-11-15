"""Configuración única del pipeline de datos. Todos los scripts importan de aquí.

Los datos NO viven en el repo. Cada quien los tiene en su máquina, en la carpeta
que diga la variable FIRE_DATA_DIR. Dos formas de definirla:

    1) Variable de entorno:      set FIRE_DATA_DIR=C:\\Hacka\\NASA        (PowerShell: $env:FIRE_DATA_DIR="...")
    2) Archivo pipeline/.env:    FIRE_DATA_DIR=C:\\Hacka\\NASA            (git lo ignora)

Dentro de FIRE_DATA_DIR:

    <cualquier subcarpeta>/*_all_countries.zip   zips anuales de FIRMS (se buscan recursivamente)
    datos_2026/api/<SENSOR>/*.csv                bloques de 2026 bajados por la API
    bronze/  silver/  aux/  calibration/  models/  gold/  qa/     los genera el pipeline

Las decisiones de método están aquí como constantes para que nadie las repita
(ni las contradiga) dentro de un script. Si se cambia una, se cambia aquí y se
avisa al equipo: ver pipeline/PLAN_EQUIPO.md.
"""
from __future__ import annotations

import os
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent


def _load_dotenv() -> None:
    env = PIPELINE_DIR / ".env"
    if not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv()


def data_dir(override: str | None = None) -> Path:
    """Carpeta local de datos (FIRE_DATA_DIR). Termina con un mensaje claro si falta."""
    value = override or os.environ.get("FIRE_DATA_DIR")
    if not value:
        raise SystemExit(
            "Falta FIRE_DATA_DIR. Crea pipeline/.env con una línea:\n"
            "    FIRE_DATA_DIR=C:\\ruta\\a\\tus\\datos\n"
            "o pasa --data-dir. Ver pipeline/README.md."
        )
    path = Path(value)
    if not path.is_dir():
        raise SystemExit(f"FIRE_DATA_DIR no existe: {path}")
    return path


def layer(name: str, override: str | None = None) -> Path:
    """Ruta de una capa (bronze, silver, aux, calibration, models, gold, qa)."""
    return data_dir(override) / name


# --------------------------------------------------------------------------- decisiones de método
# Sensor de referencia: toda la serie se expresa en "equivalente NOAA-20".
# Motivo (medido con datos de 2026): S-NPP dejó de operar el 2026-11-02 y en sus
# últimos meses perdía sensibilidad; Terra/Aqua, estable en ~0.50 de 2003 a 2021, cae a
# 0.43 en 2024 y 0.38 en 2025 (QA global). NOAA-20 está
# activo, tiene 8 años de traslape con MODIS y NOAA-21 concuerda con él al ~1%.
REFERENCE_SATELLITE = "NOAA-20"

# Unidad de conteo: "día-celda en quema" = celda H3 res 8 con >= 1 foco ese día.
# Quita la diferencia de huella entre VIIRS (375 m) y MODIS (1 km).
H3_RES_UNIT = 8
H3_RES_CALIBRATION = 5   # estratos del modelo: hexágono r5 x mes
H3_RES_GOLD = 6          # lo que consume el front

# Limpieza (se aplica en silver, nunca en bronze).
KEEP_TYPES = (0,)                 # 0 = fuego en vegetación. 1 volcán, 2 fuente estática, 3 offshore -> fuera
DROP_CONFIDENCE = ("low",)
# Los datos NRT no traen `type`: se filtran con la máscara de celdas estáticas (aux/static_mask.parquet).

# Fechas clave (verificadas en FIRMS el 2026-11-14).
AQUA_START = "2002-07-01"         # antes de esto MODIS = solo Terra
SNPP_START = "2012-01-20"
SNPP_STABLE_END = "2026-03-31"    # después S-NPP se degrada: no usar para ajustar factores
SNPP_END = "2026-11-02"
NOAA20_START = "2018-04-01"
NOAA21_START = "2023-03-01"

# Corte de validación: temporal, no años alternos (los alternos no detectan deriva).
TRAIN_YEARS = (2018, 2022)
TEST_YEARS = (2023, 2026)

# Ventana de referencia para medianas y anomalías.
BASELINE_YEARS = (2003, 2020)

# Regiones (oeste, sur, este, norte). El filtro se aplica desde silver.
REGIONS = {
    "argentina_chile": (-76.0, -56.0, -53.0, -17.0),
    "sudamerica": (-85.0, -57.0, -32.0, 14.0),   # cobertura de los datos de 2026 bajados por API
    "global": (-180.0, -90.0, 180.0, 90.0),
}
DEFAULT_REGION = "argentina_chile"

# Nombre único de cada satélite en todas las capas.
SATELLITES = ("Terra", "Aqua", "S-NPP", "NOAA-20", "NOAA-21")
