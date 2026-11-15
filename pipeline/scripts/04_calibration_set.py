"""Paso 04 - Tabla de calibración: una fila por hexágono r5 x mes, con cada satélite por separado.

RESPONSABLE: Evaristo        ESTADO: pendiente (plantilla)

Entrada
    silver/region=<region>/**/*.parquet    (paso 03)

Salida
    calibration/region=<region>/calibration.parquet

Una fila por (h3_r5, year, month). Para cada satélite S en {terra, aqua, modis, snpp, n20, n21}:
    cd_<S>     INT      días-celda: número de pares (h3_r8, acq_date) distintos con >= 1 foco de S
    n_<S>      INT      focos crudos de S
    frp_<S>    DOUBLE   suma de FRP de S (MW)
`modis` = Terra y Aqua juntos (la unión de sus días-celda, NO la suma de cd_terra + cd_aqua).
Más:  h3_r3 (región del modelo), lat, lon (centro del hexágono r5).

Por qué cada satélite va en su columna:
    La referencia es NOAA-20 (config.REFERENCE_SATELLITE). Si se suman los VIIRS en una
    sola columna, el conteo "sube" en 2018 y 2023 sin que haya más fuego, y la cola
    degradada de S-NPP contamina la serie. Con columnas separadas, el modelo (paso 05)
    ajusta un factor por satélite y no hace falta el concepto de "era".

Importante:
    - Incluir también los meses SIN traslape (2000-2017): el paso 06 los necesita para aplicar el modelo.
    - Meses sin ningún foco en un hexágono no generan fila (se interpretan como 0 al leer).
    - cd_* se cuenta sobre h3_r8 (config.H3_RES_UNIT), agrupado por su padre h3_r5.

Uso previsto:
    python pipeline/scripts/04_calibration_set.py
    python pipeline/scripts/04_calibration_set.py --region sudamerica
"""
import sys

if __name__ == "__main__":
    sys.exit("04_calibration_set.py está pendiente. Responsable: Evaristo. El contrato está en el docstring.")
