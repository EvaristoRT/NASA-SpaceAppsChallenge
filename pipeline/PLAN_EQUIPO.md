# Plan del equipo de datos — Armonización MODIS → VIIRS

**Equipo:** 3 personas, solo conversión de datos y entrenamiento. El front y la API los hace otro equipo.
**Lo que entregamos:**
- `harmonized.parquet`: la serie armonizada de 2001 hasta el mes más reciente (agregada por hexágono y día).
- `hotspots.parquet`: los focos individuales limpios, para el CSV de descarga que pide el reto.
- La descripción de las columnas de ambos.

---

## Decisiones que todos respetan

| Tema | Decisión |
|---|---|
| Dirección | MODIS 2001–2011 se convierte a **unidades VIIRS**. De 2012 en adelante la serie es VIIRS real |
| VIIRS de referencia | **Solo S-NPP**: es el único que existe desde 2012. Si se suman NOAA-20/21, los conteos "suben" en 2018 y 2023 sin que haya más fuego |
| MODIS | Terra + Aqua, collection 6.1, tipo **archive** (no NRT) |
| Región | **La conversión (bronze) es global desde el inicio**, una sola vez. El filtro de región se aplica a partir de la capa silver (`--region argentina_chile` o `--region global`). MVP con Argentina + Chile; para pasar a global solo se vuelven a correr silver → calibración → modelo → gold, sin reconvertir |
| Estratos del modelo | Con Argentina + Chile basta `terreno × mes`. En global se agrega **hemisferio o banda de latitud** (enero es verano en el sur e invierno en el norte). El código debe aceptar ese estrato desde el principio |
| Limpieza | Fuera `type` 1 (volcán) y 3 (offshore). Fuera confianza `low`. `type` 2 (fuente estática) se marca aparte |
| Unidad para calibrar | Hexágono **H3 resolución 5 × mes** |
| Corte de prueba | Entrenar **2012–2019**, probar **2020–2025**. Nadie lo cambia |
| Dónde viven los datos | **Fuera del repo** (Romero: `C:\NASA`). Cada quien pone su ruta en la variable `FIRE_DATA_DIR` |
| Qué se comparte entre nosotros | **Parquet**, nunca CSV, por USB o Drive. En git solo van scripts |
| Scripts | **Uno solo por paso, en el repo.** Nadie hace su versión propia |
| Datos recientes | El archive llega con meses de retraso. Los meses que falten hasta hoy se completan con **VIIRS NRT** (y MODIS NRT si se quiere el crudo) |
| Continuidad de S-NPP | **Por confirmar en FIRMS** si S-NPP sigue entregando datos (el README del backend dice que paró el 2026-11-02). Si paró, NOAA-20 se armoniza a la escala de S-NPP con el traslape 2018+ y lo sustituye desde esa fecha |

---

## Huecos frente al reto (y quién los cubre)

| # | Hueco | Por qué importa | Quién |
|---|---|---|---|
| 1 | **No hay datos de 2026** (solo archive hasta 2025) | El caso de uso principal es comparar *el mes actual* con la mediana histórica | Dev B |
| 2 | **S-NPP podría haber dejado de operar** | Es nuestra referencia; sin ella la serie se corta hoy | Dev B (datos) + Dev C (factor) |
| 3 | **La tabla gold está agregada, no tiene puntos** | El reto pide un CSV con los *hotspots* de la búsqueda | Dev A |

---

## Quién hace qué

### Dev A — MODIS + tabla de calibración (Romero)
1. ~~Descargar MODIS 2000–2025~~ ✅ ya está (global, todos los países).
2. Escribir y probar el script de conversión `scripts/01_to_parquet.py` (lo usa también Dev B). Probar primero con un año.
3. ~~Convertir **todo MODIS, global** → `bronze/sensor=MODIS/`~~ ✅ (111.4 M focos, 2000-11-01 a 2025-12-31).
4. Revisión de calidad de MODIS (`scripts/02_qa.py`): años completos, duplicados, nulos, rangos de fecha por satélite.
5. Cuando tenga el bronze de VIIRS de Dev B: armar la **capa silver** (`03_silver.py`) y la **tabla de calibración** (`04_calibration_set.py`), y repartirla.
6. Al final, con el modelo de Dev C: aplicar a 2001–2011 y exportar `harmonized.parquet` (`06_apply_gold.py`, `07_export.py`).
7. **Hueco 3:** exportar `hotspots.parquet`, los focos individuales ya limpios (mismas reglas de limpieza que el silver), ordenados por `h3_r6, acq_date`, para que el front filtre por área y fechas y lo baje como CSV.

**Entrega:** `bronze/sensor=MODIS/`, `calibration.parquet`, `harmonized.parquet`, `hotspots.parquet`.

### Dev B — VIIRS + cobertura del suelo
1. ~~Descargar VIIRS S-NPP 2012–2025~~ ✅ ya está (global, todos los países).
2. Con el script de Dev A, convertir **todo VIIRS S-NPP, global** → `bronze/sensor=VIIRS/` (dejarlo corriendo; es lo más pesado).
3. Revisión de calidad de VIIRS con el mismo `02_qa.py`.
4. **Capa de cobertura del suelo por hexágono** (`scripts/aux_landcover.py`): para cada hexágono H3 r5, cuál es el tipo de terreno dominante (bosque, pastizal, cultivo, etc.). Fuente sugerida: MODIS Land Cover **MCD12Q1** (sirve también para lo global). Salida: `aux/h3_landcover.parquet` con `h3_r5, landcover_class, pct`.
   → Esto **no depende de los datos de fuego**, así que se puede empezar desde ya.
5. Pasarle a Dev A el bronze de VIIRS y el landcover.
6. **Hueco 2 (primero, es rápido):** confirmar en FIRMS hasta qué fecha hay datos de S-NPP. Si paró, convertir también **VIIRS NOAA-20 2018–hoy** (ya se tienen 2018–2025) con `satellite` distinto, para que Dev C calcule el factor NOAA-20 → S-NPP.
7. **Hueco 1:** bajar **VIIRS NRT** de los meses de 2026 que el archive aún no cubre y convertirlo con el mismo script (marcar el origen en una columna `source = 'archive' | 'nrt'`). Al empalmar, quitar duplicados por `(satellite, acq_date, acq_time, latitude, longitude)`.

**Entrega:** `bronze/sensor=VIIRS/` (archive + NRT), `aux/h3_landcover.parquet`.

### Dev C — Modelo y validación
1. **Desde ya**, con una tabla de calibración falsa que tenga las mismas columnas (ver abajo):
   - `05_model.py` **Nivel 1**: factor `sum(viirs)/sum(modis)` por `landcover × mes`.
   - Evaluación sobre 2020–2025: error medio, sesgo, correlación de la serie mensual.
   - **La gráfica clave:** VIIRS real vs MODIS crudo vs MODIS armonizado (2012–2025).
2. **Nivel 2**: quantile mapping por tipo de terreno. Corrige el problema del cero (celdas con 0 focos MODIS donde VIIRS sí ve fuegos chicos).
3. Intervalo de confianza del 95% (bootstrap sobre los factores o regresión por cuantiles).
4. Cuando llegue la tabla real: correr el mismo código, comparar niveles, elegir el ganador.
5. Guardar el modelo ganador en `models/` (`factores_nivel1.parquet`, o `.joblib` si es Random Forest) junto con un `metrics.json`.
6. **Hueco 2 (solo si S-NPP paró):** con el mismo método, calcular el factor **NOAA-20 → S-NPP** usando 2018 hasta la fecha en que S-NPP paró, validarlo igual y guardarlo como `models/factores_n20_a_snpp.parquet`.

**Entrega:** el archivo del modelo, `metrics.json` y las gráficas de validación.

---

## Orden y puntos de control

| # | Punto de control | Quién | Depende de |
|---|---|---|---|
| 1 | Script de conversión funcionando con 1 año de prueba | A | — |
| 2 | Bronze MODIS y bronze VIIRS (Arg+Chile) listos y revisados | A, B | 1 |
| 2' | Landcover por hexágono listo | B | — (en paralelo) |
| 2'' | Nivel 1 + validación funcionando con datos falsos | C | — (en paralelo) |
| 2''' | Confirmado si S-NPP sigue activo (hueco 2) | B | — (hacerlo primero) |
| 3 | Tabla de calibración **real** repartida | A | 2, 2' |
| 4 | Nivel 1 con datos reales + gráfica de validación | C | 3 |
| 5 | `harmonized.parquet` + `hotspots.parquet` entregados al equipo de front | A | 4 |
| 6 | Serie extendida hasta hoy con NRT (y NOAA-20 si S-NPP paró) | B, C | 5 |
| 7 | **Versión global**: landcover global, silver → calibración → modelo (con estrato de hemisferio) → gold con `--region global` | todos | 5 |
| 8 | Nivel 2 / intervalos | C | 5 |

**Costo estimado de pasar a global** (con el bronze global ya hecho): unas **3–5 horas**, casi todo tiempo de cómputo y la capa de cobertura del suelo global. No hay que reconvertir ni reescribir scripts.

**Regla de oro:** llegar al punto 5 con el Nivel 1 antes de invertir tiempo en el Nivel 2 o en lo global.

---

## Contratos (las columnas que todos usan)

### Bronze — un registro por foco
`sensor, satellite, source, version, country, acq_date, acq_time, acq_datetime_utc, latitude, longitude, bright_mir, bright_tir, frp, confidence_raw, confidence_level, scan, track, daynight, type, year`
- Un archivo por zip: `bronze/sensor=MODIS/year=2005/modis.parquet`, `bronze/sensor=VIIRS/year=2015/viirs-snpp.parquet`, `.../viirs-jpss1.parquet`.
- `satellite`: `Terra`, `Aqua`, `S-NPP`, `NOAA-20`, `NOAA-21`. `source` = `archive` o `nrt`. `country` sale del nombre del CSV.
- Leer: `read_parquet('bronze/**/*.parquet', hive_partitioning=true)`.

**Cómo correr la conversión** (Windows, desde la raíz del repo):
```powershell
py -m venv .venv
.venv\Scripts\python -m pip install -r pipeline\requirements.txt
$env:FIRE_DATA_DIR = "C:\ruta\a\tus\zips"          # busca los zips en subcarpetas
.venv\Scripts\python pipeline\scripts\01_to_parquet.py --sensor MODIS
.venv\Scripts\python pipeline\scripts\01_to_parquet.py --product viirs-snpp
.venv\Scripts\python pipeline\scripts\01_to_parquet.py --product viirs-jpss1 --years 2018-2025
```
Si se interrumpe, se vuelve a correr y salta lo ya convertido (`--overwrite` para rehacer).
Referencia (12 núcleos): MODIS completo 4.5 min (111 M focos, 1.5 GB); un año de VIIRS S-NPP ≈ 40 s (≈ 21 M focos, 340 MB).

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

### Hotspots — los focos individuales para el CSV (hueco 3)
`h3_r6, acq_date, acq_time, latitude, longitude, sensor, satellite, source, frp, confidence_level, daynight, type`
Ya limpios (sin volcanes, offshore ni confianza `low`), ordenados por `h3_r6, acq_date` y particionados por `year`.

---

## Estructura en el repo
```
pipeline/
├── PLAN_EQUIPO.md        ← este archivo
├── scripts/              ← cada script lee FIRE_DATA_DIR (y --region a partir de silver)
│   ├── 01_to_parquet.py  ✅
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
