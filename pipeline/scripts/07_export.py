"""Paso 07 - Exporta lo que consume el equipo web: serie armonizada, anomalías y focos para el CSV.

RESPONSABLE: Paco            ESTADO: pendiente (plantilla)

Entrada
    gold/region=<region>/harmonized.parquet    (paso 06)
    silver/region=<region>/**/*.parquet        (paso 03)

Salida (en <FIRE_DATA_DIR>/gold/entrega/)
    harmonized.parquet     la serie del paso 06 más la anomalía ya calculada:
                             median_same_month DOUBLE   mediana del mismo mes calendario en config.BASELINE_YEARS
                             anomaly_pct DOUBLE         (valor del mes - mediana) / mediana x 100
                           La anomalía se calcula aquí y no en el navegador: así todos ven el mismo número.
    hotspots.parquet       focos individuales limpios para el botón "descargar CSV":
                             h3_r6, acq_date, acq_time, latitude, longitude, sensor, satellite,
                             source, frp, confidence_level, daynight, type
                           ordenado por h3_r6, acq_date y particionado por year.
    LEEME_ENTREGA.md       columnas, unidades, fecha de corte, qué meses son NRT, versión del modelo.

Antes de escribir este paso hay que acordar con Manuel (backend) UNA de dos:
    a) el backend lee estos parquet tal cual, o
    b) este script escribe además en el formato de backend/ignis/store.py::write_processed.
Hoy el backend calcula su propia armonización (referencia MODIS) en backend/ignis/harmonize.py;
al conectar esta entrega, esa parte del backend deja de usarse para no tener dos números distintos.

Uso previsto:
    python pipeline/scripts/07_export.py
"""
import sys

if __name__ == "__main__":
    sys.exit("07_export.py está pendiente. Responsable: Paco. El contrato está en el docstring.")
