"""Paso 03 - Capa silver: focos limpios, con celdas H3, filtrados a la región.

RESPONSABLE: Paco            ESTADO: pendiente (plantilla)

Entrada
    bronze/**/*.parquet                    (paso 01)
    aux/static_mask.parquet                (lo genera este mismo paso, ver abajo)

Salida
    silver/region=<region>/year=<año>/silver.parquet      un registro por foco limpio
    aux/static_mask.parquet                               celdas h3_r8 con fuentes estáticas

Columnas de silver (las de bronze, más):
    h3_r8  UBIGINT    celda de la unidad de conteo (día-celda)
    h3_r6  UBIGINT    celda del producto final
    h3_r5  UBIGINT    celda de calibración
    h3_r3  UBIGINT    región del modelo (estrato)

Reglas (las constantes están en config.py, no las repitas aquí):
    1. Región: bbox de config.REGIONS[--region]. Por defecto argentina_chile.
    2. Fuera confianza 'low' (config.DROP_CONFIDENCE).
    3. Con `type` (archive): se queda solo type = 0 (config.KEEP_TYPES).
    4. Sin `type` (NRT): se quita el foco si su h3_r8 está en aux/static_mask.parquet.
       La máscara se arma con el archive: celdas h3_r8 que tienen focos type 1, 2 o 3
       en al menos 3 años distintos. Así los mecheros de gas no entran por la cola NRT.
    5. Duplicados exactos (satellite, acq_date, acq_time, latitude, longitude): se deja uno.
    6. Si un mismo día existe en archive y en NRT para el mismo satélite, gana archive.

Cómo calcular H3 rápido (NO usar una función de Python fila por fila: son >300 millones de filas):
    con.execute("INSTALL h3 FROM community"); con.execute("LOAD h3")
    h3_latlng_to_cell(latitude, longitude, 8)          -> h3_r8
    h3_cell_to_parent(h3_r8, 5)                        -> h3_r5      (ídem 6 y 3)
Probado con DuckDB 2.0: la extensión se instala sola la primera vez (necesita internet).

Uso previsto:
    python pipeline/scripts/03_silver.py                       # región por defecto
    python pipeline/scripts/03_silver.py --region sudamerica
"""
import sys

if __name__ == "__main__":
    sys.exit("03_silver.py está pendiente. Responsable: Paco. El contrato está en el docstring de este archivo.")
