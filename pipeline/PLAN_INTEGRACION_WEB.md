# Plan de integración: entrega de datos → backend y front

**Para:** Manuel (backend / web) · **De:** equipo de datos (Paco, Evaristo, Carlos) · **Versión:** 2026-11-14 · **Estado: propuesta, por acordar**

Resuelve el "Punto abierto" de [PLAN_EQUIPO.md](PLAN_EQUIPO.md): hoy hay dos armonizaciones en el repo y en la demo solo puede quedar una.
La propuesta es que **el backend sirva la serie que calcula el pipeline y deje de calcular la suya.**

---

## 1. Qué cambia, en una frase

El backend ya hace casi todo bien: lee parquet en memoria, filtra por polígono, calcula climatología y anomalía por área, exporta CSV.
Lo único que se reemplaza es **de dónde salen los números**. En vez de `harmonize.py` (referencia MODIS, probado con datos sintéticos),
los lee ya armonizados del pipeline (referencia **NOAA-20**, validado con datos reales).

| | Hoy (`backend/ignis/harmonize.py`) | Con la entrega del pipeline |
|---|---|---|
| Referencia | MODIS Terra + Aqua | **NOAA-20** (S-NPP se apagó el 2026-11-02, MODIS se está apagando) |
| Unidad | día-celda H3 r8 | igual: día-celda H3 r8 |
| Factores | por región H3 r3 × era VIIRS | por región H3 r3 × **mes calendario** × satélite |
| Validación | años pares / impares, datos sintéticos | **temporal**: ajuste 2018–2022, prueba 2023–2026, datos reales: sesgo −56% → **+1.9%** |
| Datos | sintéticos o CSV pequeños | FIRMS completo 2000-11 → 2026-11-14, Argentina + Chile (luego Sudamérica / mundo) |

---

## 2. Qué entregamos

Lo genera el paso 07 (Paco) en `<FIRE_DATA_DIR>/gold/entrega/`. Hay dos opciones; **proponemos la B**.

### Opción A: los parquet del pipeline tal cual
`harmonized.parquet` (una fila por hexágono r6 × día, ~4.1 M filas, 43 MB) y `hotspots.parquet` (focos individuales).
Obliga a reescribir `store.py` y `analytics.py`. **No la recomendamos.**

### Opción B (recomendada): el 07 escribe también en el formato de `store.py::write_processed`
El backend sigue leyendo `DATA_DIR/` con los mismos cuatro archivos y casi no cambia:

| Archivo | Columnas | Notas |
|---|---|---|
| `cells.parquet` | `cell_id` INT (0..N-1, ordenado), `h3` VARCHAR, `lat`, `lon` DOUBLE, `region` UBIGINT | **una celda = hexágono H3 r6** (~36 km²), no r8. ~117 k celdas en AR+CL |
| `monthly.parquet` | `cell_id`, `m` (meses desde 2000-01), `value` (armonizado), `modis_ta`, `modis_t`, `viirs` (crudos), `src`, **nuevas:** `value_ci_lower`, `value_ci_upper`, `frp_mw`, `is_nrt` | ordenado por `cell_id, m`. ~2.2 M filas en AR+CL. `value` = suma mensual de `harmonized_count` |
| `months.parquet` | `m`, `viirs_sats`, `terra_only`, `modis_full`, **nueva:** `source` (`Terra` / `MODIS` / `S-NPP` / `NOAA-20`) | una fila por mes |
| `info.json` | `synthetic: false`, `harmonization` = contenido de `models/metrics.json` (referencia, factores, validación), `cutoff_date`, `region`, `model_version` | lo muestra la sección de metodología |
| `hotspots.parquet` | ver contrato en PLAN_EQUIPO.md | para el CSV de focos individuales |

Tamaño para Argentina + Chile: **decenas de MB en total.** Cabe en memoria en cualquier servidor gratuito.

---

## 3. Qué tiene que hacer Manuel en el backend

Ordenado por prioridad. Los tiempos son estimados.

| # | Tarea | Archivo | Tiempo |
|---|---|---|---|
| 1 | **Apuntar `DATA_DIR` a la entrega** del paso 07 y comprobar que `/api/meta` y `/api/search` responden con `synthetic: false` | `main.py` (variable de entorno, ya existe) | 15 min |
| 2 | **Dejar de usar `harmonize.py` y `build_from_firms.py` en modo real.** `build_demo.py` y `synth.py` se pueden quedar para los tests | `data/`, `ignis/` | 15 min |
| 3 | **Etiquetas de fuente:** `MonthPoint.source` pasa a `"Terra (escalado)"`, `"MODIS (escalado)"`, `"S-NPP (escalado)"`, `"NOAA-20"`. `_src_label` lee la columna `source` de `months.parquet` en vez de deducirla de `viirs_sats` | `models.py`, `analytics.py` | 30 min |
| 4 | **Textos del contrato:** `count` = "días-celda en quema, **equivalente NOAA-20**" (hoy dice "MODIS-equivalent") | `models.py` | 5 min |
| 5 | **Línea base fija 2003–2020** (`config.BASELINE_YEARS` del pipeline): `baseline_end` por defecto = 2020, no "último año completo". Así el mapa, el calendario y el CSV usan la misma mediana | `models.py`, `analytics.py` | 15 min |
| 6 | **Incertidumbre e indicadores nuevos** en `MonthPoint`, opcionales: `count_ci_lower`, `count_ci_upper`, `frp_mw`, `is_nrt` (sumando las columnas nuevas de `monthly`) | `models.py`, `analytics.py` | 45 min |
| 7 | **CSV de focos individuales:** `POST /api/export.csv?level=hotspots` que filtra `hotspots.parquet` por bbox, polígono y fechas, con tope de filas como el actual `MAX_CELL_ROWS` | `main.py` | 1 h |
| 8 | **Tests:** que `test_api.py` corra con una muestra chica del formato nuevo (se la pasamos) | `tests/` | 30 min |

**Total: ~3.5–4 h.** Lo mínimo para la demo son las tareas 1–5 (~1.5 h).

### Importante sobre la anomalía
El backend **debe seguir calculando la mediana y la anomalía por área**, como hoy en `analytics.timeline`.
La mediana de una suma no es la suma de las medianas, así que no sirve sumar anomalías por celda.
La `anomaly_pct` por hexágono que trae `harmonized.parquet` solo sirve para colorear cada hexágono en el mapa.

---

## 4. Qué tiene que hacer el front

Hoy `AnalysisView.jsx` usa `buildDemoAnalysis()` (datos inventados). Hay que conectarlo a `POST /api/search` con un adaptador
`SearchResponse → { calendar, peak, peakYear, riskMonth, ratio, status, synthetic }`:

| Campo del panel | De dónde sale en la respuesta |
|---|---|
| `calendar[año][mes]` | `series[].count` agrupado por año y mes (`null` en meses futuros) |
| `total`, `peakYear` | `kpis.total`, `kpis.peak_year` |
| `riskMonth` | `kpis.peak_calendar_month − 1` (el front cuenta los meses desde 0) |
| `ratio`, `status` | `kpis.latest_vs_median` → `elevated` si ≥ 1.25, `low` si ≤ 0.75 (mismo umbral que hoy) |
| `synthetic` | `synthetic` (debe ser `false`) |
| fuente por mes (nuevo) | `series[].source`, para marcar en gris o con un patrón los meses estimados (antes de 2018-04) |
| banda de incertidumbre (nuevo) | `series[].count_ci_lower / count_ci_upper` |

---

## 5. Qué hay que decirle al usuario en la interfaz

1. **Unidad:** "días-celda con fuego, en equivalente NOAA-20". No es número de incendios ni de focos.
2. **Lo medido y lo estimado:** desde 2018-04 es NOAA-20 tal cual. Antes es una estimación (S-NPP, MODIS o Terra × factor).
3. **Los datos recientes son preliminares:** los meses con `is_nrt = true` son datos rápidos de FIRMS que NASA reemplaza ~5 meses después.
4. **Limitación honesta:** antes de 2012 no hay ningún VIIRS para verificar el factor de MODIS. Es el tramo menos comprobable.
5. **Cobertura:** hoy solo Argentina + Chile. Un polígono fuera de esa zona debe devolver un aviso, no una serie en cero.

---

## 6. Cómo llegan los datos al servidor

Los parquet **no se suben al repo** (regla del equipo, el `.gitignore` los bloquea). Hay que elegir una de estas:

- **Subirlos a mano** al disco o volumen del servicio donde corra el backend.
- Publicarlos como archivo de un **GitHub Release** y que el backend los descargue al arrancar.
- Si el backend aún no está desplegado: correrlo local para la demo.

**Pregunta para Manuel:** ¿dónde está o va a estar desplegado el backend? De eso depende la opción.

---

## 7. Orden de trabajo y quién hace qué

| # | Qué | Quién | Depende de |
|---|---|---|---|
| 1 | Acordar opción A o B y este formato | Paco + Manuel | — |
| 2 | Paso 07 escribe la entrega en el formato acordado + una muestra chica para tests | Paco | 1 |
| 3 | Tareas 1–5 del backend con la muestra | Manuel | 2 (la muestra) |
| 4 | Adaptador del front (`AnalysisView`) | equipo web | 3 |
| 5 | Prueba de punta a punta: dibujar un polígono en Argentina y comparar la serie con la nuestra | Manuel + Evaristo | 3 |
| 6 | Tareas 6–8 (incertidumbre, CSV de focos, tests) | Manuel | 5 |
| 7 | Ampliar a Sudamérica o al mundo: mismo formato, archivos más grandes | datos → Manuel | 6 |

**Para la prueba del punto 5:** un polígono que cubra todo `argentina_chile` debe dar, sumando `series[].count`, el mismo total
por año que la tabla de `HALLAZGOS_QA.md` (p. ej. 2019 = 307,757 días-celda).

---

## 8. Preguntas abiertas

1. ¿Opción B te sirve, o prefieres leer los parquet del pipeline directo (A)?
2. ¿Dónde se despliega el backend y cuánta memoria tiene? (Importa para Sudamérica o el mundo.)
3. ¿El front necesita el mapa por hexágono (anomalía por celda) además del calendario por área? Si sí, hace falta un endpoint más.
4. Los cambios a `models.py` necesitan acuerdo de los devs web (lo dice el archivo): ¿quién más lo revisa?
