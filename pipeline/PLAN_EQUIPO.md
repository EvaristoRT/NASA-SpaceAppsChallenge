# Plan del equipo de datos — Armonización MODIS → VIIRS

**Equipo:** 3 personas, solo conversión de datos y entrenamiento. El front y la API los hace otro equipo.
**Lo que entregamos:** `harmonized.parquet` (la serie armonizada 2001–2025) y la descripción de sus columnas.

---

## Decisiones que todos respetan

| Tema | Decisión |
|---|---|
| Dirección | MODIS 2001–2011 se convierte a **unidades VIIRS**. De 2012 en adelante la serie es VIIRS real |
| VIIRS de referencia | **Solo S-NPP**: es el único que existe desde 2012. Si se suman NOAA-20/21, los conteos "suben" en 2018 y 2023 sin que haya más fuego |
| MODIS | Terra + Aqua, collection 6.1, tipo **archive** (no NRT) |
| Región | Primero **Argentina + Chile**; después **global** con el mismo código, cambiando un parámetro |
| Limpieza | Fuera `type` 1 (volcán) y 3 (offshore). Fuera confianza `low`. `type` 2 (fuente estática) se marca aparte |
| Unidad para calibrar | Hexágono **H3 resolución 5 × mes** |
| Corte de prueba | Entrenar **2012–2019**, probar **2020–2025**. Nadie lo cambia |
| Dónde viven los datos | **Fuera del repo** (Romero: `C:\NASA`). Cada quien pone su ruta en la variable `FIRE_DATA_DIR` |
| Qué se comparte entre nosotros | **Parquet**, nunca CSV, por USB o Drive. En git solo van scripts |
| Scripts | **Uno solo por paso, en el repo.** Nadie hace su versión propia |

---

## Quién hace qué

### Dev A — MODIS + tabla de calibración (Romero)
1. Descargar **MODIS C6.1, 2001–2025** (Argentina y Chile primero; global después).
2. Escribir y probar el script de conversión `scripts/01_to_parquet.py` (lo usa también Dev B).
3. Convertir MODIS → `bronze/sensor=MODIS/`.
4. Revisión de calidad de MODIS (`scripts/02_qa.py`): años completos, duplicados, nulos, rangos de fecha por satélite.
5. Cuando tenga el bronze de VIIRS de Dev B: armar la **capa silver** (`03_silver.py`) y la **tabla de calibración** (`04_calibration_set.py`), y repartirla.
6. Al final, con el modelo de Dev C: aplicar a 2001–2011 y exportar `harmonized.parquet` (`06_apply_gold.py`, `07_export.py`).

**Entrega:** `bronze/sensor=MODIS/`, `calibration.parquet`, `harmonized.parquet`.

### Dev B — VIIRS + cobertura del suelo
1. Descargar **VIIRS S-NPP 2012–2025** (Argentina y Chile primero; global después).
2. Con el script de Dev A, convertir VIIRS → `bronze/sensor=VIIRS/`.
3. Revisión de calidad de VIIRS con el mismo `02_qa.py`.
4. **Capa de cobertura del suelo por hexágono** (`scripts/aux_landcover.py`): para cada hexágono H3 r5, cuál es el tipo de terreno dominante (bosque, pastizal, cultivo, etc.). Fuente sugerida: MODIS Land Cover **MCD12Q1** (sirve también para lo global). Salida: `aux/h3_landcover.parquet` con `h3_r5, landcover_class, pct`.
   → Esto **no depende de los datos de fuego**, así que se puede empezar desde ya.
5. Pasarle a Dev A el bronze de VIIRS y el landcover.

**Entrega:** `bronze/sensor=VIIRS/`, `aux/h3_landcover.parquet`.

### Dev C — Modelo y validación
1. **Desde ya**, con una tabla de calibración falsa que tenga las mismas columnas (ver abajo):
   - `05_model.py` **Nivel 1**: factor `sum(viirs)/sum(modis)` por `landcover × mes`.
   - Evaluación sobre 2020–2025: error medio, sesgo, correlación de la serie mensual.
   - **La gráfica clave:** VIIRS real vs MODIS crudo vs MODIS armonizado (2012–2025).
2. **Nivel 2**: quantile mapping por tipo de terreno. Corrige el problema del cero (celdas con 0 focos MODIS donde VIIRS sí ve fuegos chicos).
3. Intervalo de confianza del 95% (bootstrap sobre los factores o regresión por cuantiles).
4. Cuando llegue la tabla real: correr el mismo código, comparar niveles, elegir el ganador.
5. Guardar el modelo ganador en `models/` (`factores_nivel1.parquet`, o `.joblib` si es Random Forest) junto con un `metrics.json`.

**Entrega:** el archivo del modelo, `metrics.json` y las gráficas de validación.

---

## Orden y puntos de control

| # | Punto de control | Quién | Depende de |
|---|---|---|---|
| 1 | Script de conversión funcionando con 1 año de prueba | A | — |
| 2 | Bronze MODIS y bronze VIIRS (Arg+Chile) listos y revisados | A, B | 1 |
| 2' | Landcover por hexágono listo | B | — (en paralelo) |
| 2'' | Nivel 1 + validación funcionando con datos falsos | C | — (en paralelo) |
| 3 | Tabla de calibración **real** repartida | A | 2, 2' |
| 4 | Nivel 1 con datos reales + gráfica de validación | C | 3 |
| 5 | `harmonized.parquet` entregado al equipo de front | A | 4 |
| 6 | Nivel 2 / intervalos / versión global | todos | 5 |

**Regla de oro:** llegar al punto 5 con el Nivel 1 antes de invertir tiempo en el Nivel 2 o en lo global.

---

## Contratos (las columnas que todos usan)

### Bronze — un registro por foco
`sensor, satellite, acq_date, acq_time, latitude, longitude, bright_mir, bright_tir, frp, confidence_raw, confidence_level, scan, track, daynight, type, year`
Particionado por `sensor` y `year`.

### Tabla de calibración — una fila por hexágono r5 × mes (2012–2025)
| columna | tipo | qué es |
|---|---|---|
| `h3_r5` | UBIGINT | hexágono |
| `year`, `month` | INT | |
| `landcover_class` | VARCHAR | de Dev B |
| `modis_count` | INT | focos MODIS (Terra+Aqua) en el mes |
| `modis_frp` | DOUBLE | suma de FRP MODIS (MW) |
| `modis_days` | INT | días del mes con al menos un foco MODIS |
| `viirs_count` | INT | focos VIIRS S-NPP — **lo que el modelo aprende a estimar** |
| `viirs_frp` | DOUBLE | suma de FRP VIIRS (MW) |
| `lat`, `lon` | DOUBLE | centro del hexágono |

### Gold — lo que se entrega al front (esquema del CONTEXT.md)
`h3_index, date, year, month, dekad, modis_raw_count, viirs_raw_count, harmonized_count, harmonized_ci_lower, harmonized_ci_upper, harmonized_frp_mw, fire_regime`

---

## Estructura en el repo
```
pipeline/
├── PLAN_EQUIPO.md        ← este archivo
├── config.py             ← lee FIRE_DATA_DIR y la región
├── scripts/
│   ├── 01_to_parquet.py
│   ├── 02_qa.py
│   ├── 03_silver.py
│   ├── 04_calibration_set.py
│   ├── 05_model.py
│   ├── 06_apply_gold.py
│   ├── 07_export.py
│   └── aux_landcover.py
└── requirements.txt
```
Fuera del repo, en `FIRE_DATA_DIR`:
```
raw/  bronze/  silver/  aux/  calibration/  models/  gold/
```
