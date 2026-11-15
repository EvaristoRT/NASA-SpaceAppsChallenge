"""Paso 05 - Modelo de armonización: factores que llevan cada satélite a "equivalente NOAA-20".

RESPONSABLE: Carlos          ESTADO: pendiente (plantilla)

Entrada
    calibration/region=<region>/calibration.parquet     (paso 04)
    Para empezar sin esperar: una tabla falsa con las mismas columnas.

Salida
    models/factores.parquet      una fila por (origen, h3_r3, mes_calendario): factor, n de meses, factor_global
    models/metrics.json          métricas de validación
    models/figs/*.png            gráficas de validación

Cadena (todo termina en la escala de NOAA-20):
    2018-04 -> hoy        NOAA-20 tal cual (factor 1)
    2012-01 -> 2018-03    S-NPP      x k_snpp
    2002-07 -> 2011-12    MODIS T+A  x k_modis
    2000-11 -> 2002-06    Terra      x f_terra x k_modis     (Terra solo nunca coincidió con VIIRS)

Nivel 1 (hacer esto primero y llegar al paso 07 antes de mejorar nada):
    k_modis = sum(cd_n20) / sum(cd_modis)      en meses con ambos, por h3_r3 x mes calendario
    k_snpp  = sum(cd_n20) / sum(cd_snpp)       solo hasta config.SNPP_STABLE_END
    f_terra = sum(cd_modis) / sum(cd_terra)    en 2003-2010 (ambos MODIS sanos)
    Cada factor regional se encoge hacia el global con un prior de pseudo-cuentas
    (como hace backend/ignis/harmonize.py::_ratio), para que regiones con pocos datos no den factores absurdos.
    Lo mismo para FRP (frp_*), como métrica aparte.

Valores de referencia medidos en Sudamérica, ene-jul 2026, para saber si algo salió mal:
    cd_n20 / cd_modis ~ 2.84      n_n20 / n_modis ~ 3.98      frp_n20 / frp_modis ~ 1.04
    cd_n20 / cd_snpp  ~ 1.00 (ene-mar) ... sube a 1.26 en julio: S-NPP se degrada, por eso SNPP_STABLE_END.
    cd_n21 / cd_n20   ~ 0.99

Validación (temporal, NO años alternos: los alternos no detectan deriva):
    ajustar con config.TRAIN_YEARS, probar con config.TEST_YEARS
    reportar por serie mensual regional: sesgo %, error absoluto mediano %, correlación
    gráfica clave: NOAA-20 real vs MODIS crudo vs MODIS armonizado
    control independiente: la serie armonizada de conteos debe seguir a la de FRP, que casi no depende del sensor
    revisar si k_modis cambia con los años (Terra se degrada desde 2022); si cambia, factor por época

Nivel 2 (solo después de entregar con el nivel 1): quantile mapping por estrato, intervalo de
confianza del 95% por bootstrap sobre los meses de traslape.

Uso previsto:
    python pipeline/scripts/05_model.py
"""
import sys

if __name__ == "__main__":
    sys.exit("05_model.py está pendiente. Responsable: Carlos. El contrato está en el docstring.")
