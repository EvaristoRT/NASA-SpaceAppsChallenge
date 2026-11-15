"""Paso 06 - Aplica el modelo y arma la serie armonizada (capa gold).

RESPONSABLE: Evaristo        ESTADO: pendiente (plantilla)

Entrada
    silver/region=<region>/**/*.parquet        (paso 03)
    models/factores.parquet                    (paso 05)

Salida
    gold/region=<region>/harmonized.parquet    una fila por (h3_r6, date)

Para cada (h3_r6, día) se elige UNA fuente según la fecha (nunca se suman satélites):
    desde config.NOAA20_START                      NOAA-20            primary_source = 'NOAA-20'
    de config.SNPP_START a NOAA20_START            S-NPP x k_snpp     primary_source = 'S-NPP'
    de config.AQUA_START a SNPP_START              MODIS x k_modis    primary_source = 'MODIS'
    antes de config.AQUA_START                     Terra x f_terra x k_modis   primary_source = 'Terra'
El factor se busca por el h3_r3 de la celda y el mes calendario; si no hay, el global.

Columnas (contrato con el front; no quitar los crudos: son la trazabilidad):
    h3_index VARCHAR, date DATE, year INT, month INT, dekad INT
    modis_raw_count INT, viirs_raw_count INT            focos crudos del día (VIIRS = solo el satélite usado)
    harmonized_count DOUBLE                             días-celda en equivalente NOAA-20
    harmonized_ci_lower DOUBLE, harmonized_ci_upper DOUBLE     (iguales a harmonized_count hasta tener nivel 2)
    harmonized_frp_mw DOUBLE
    primary_source VARCHAR, is_nrt BOOLEAN
    fire_regime VARCHAR                                 'wildfire' por ahora

`dekad`: 1 = días 1-10, 2 = días 11-20, 3 = del 21 al fin de mes.

Uso previsto:
    python pipeline/scripts/06_apply_gold.py
"""
import sys

if __name__ == "__main__":
    sys.exit("06_apply_gold.py está pendiente. Responsable: Evaristo. El contrato está en el docstring.")
