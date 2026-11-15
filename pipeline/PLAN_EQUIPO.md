# Plan del equipo de datos — Armonización MODIS / VIIRS

**Equipo de datos:** Evaristo y Carlos (Paco dejó el equipo el 2026-11-15). El front y la API los hace el equipo web.
**Versión del plan:** 2026-11-15 (cambia "Quién hace qué": reparto entre dos, aceptado en [PROPUESTA_CARLOS_ENTREGA.md](PROPUESTA_CARLOS_ENTREGA.md)).

**Lo que entregamos al equipo web:**
- `harmonized.parquet`: la serie armonizada de 2000-11 hasta hoy, por hexágono y día, con la anomalía ya calculada.
- `hotspots.parquet`: los focos individuales limpios, para el CSV de descarga que pide el reto.
- `LEEME_ENTREGA.md`: columnas, unidades, fecha de corte y versión del modelo.

Cómo instalar y correr: [README.md](README.md). Las constantes de este plan viven en [config.py](config.py).

---

## Decisiones que todos respetan

| Tema | Decisión | Por qué |
|---|---|---|
| **Referencia** | Toda la serie se expresa en **equivalente NOAA-20** | S-NPP dejó de operar el 2026-11-02 (última fila en FIRMS) y ya venía perdiendo sensibilidad: NOAA-20 / S-NPP pasó de 0.98 en enero a 1.26 en julio de 2026. MODIS se está apagando: Terra/Aqua, estable en ~0.50 de 2003 a 2021, cae a 0.43 en 2024 y 0.38 en 2025. NOAA-20 está activo, tiene 8 años de traslape con MODIS y NOAA-21 concuerda con él al 1%. Además así **el mes actual es dato medido** y lo estimado es el pasado |
| **Unidad de conteo** | **Día-celda en quema**: celda H3 res 8 con ≥ 1 foco ese día | Quita la diferencia de huella (VIIRS 375 m vs MODIS 1 km). Medido: baja la brecha NOAA-20/MODIS de 3.98× (focos) a 2.84× (días-celda). Idea tomada de `backend/ignis/harmonize.py` |
| **Segunda métrica** | **FRP** (potencia radiativa, MW), **con su propio factor** | Depende mucho menos del sensor que los focos, pero no es neutro: NOAA-20 / MODIS = 0.71 en Argentina + Chile 2018–2022 (MODIS suma lo que ven dos satélites). El modelo lo armoniza igual que los días-celda (validación: sesgo +4.8%, r 0.99) |
| **Satélites** | Cada satélite en su columna; **nunca se suman** VIIRS entre sí ni se mezclan en una métrica | Sumarlos hace "subir" los conteos en 2018 y 2023 sin que haya más fuego |
| **Cadena** | NOAA-20 tal cual desde 2018-04 · S-NPP × k 2012–2018 · MODIS (Terra+Aqua) × k 2002-07–2011 · Terra × f × k antes de 2002-07 | Un solo salto en todo, salvo Terra solo (dos), porque nunca coincidió con VIIRS |
| **Terra solo** | 2000-11 a 2002-06 lleva factor propio | Aqua entra en 2002-07 y la capacidad de observación se duplica de golpe |
| **Limpieza** | En silver, nunca en bronze. Fuera `type` 1, 2 y 3; fuera confianza `low`. Los NRT (sin `type`) se filtran con una máscara de celdas estáticas armada con el archive | Sin esto, los mecheros de gas (p. ej. Vaca Muerta) aparecen como fuego todo el año |
| **Estratos del modelo** | Región = hexágono padre **H3 res 3** × **mes calendario**, con encogimiento hacia el factor global | No depende de una capa de cobertura del suelo, así el MVP no se bloquea. Landcover queda como mejora |
| **Validación** | **Temporal**: ajustar 2018–2022, probar 2023–2026. Factores de S-NPP solo hasta 2026-03 | Años alternos no detectan deriva, y hay deriva (Terra, S-NPP) |
| **Anomalías** | Mediana del mismo mes calendario sobre **2003–2020**, calculada en el pipeline | Evita el tramo Terra solo y los años con NRT; todos ven el mismo número |
| **Región** | Bronze global. De silver en adelante, `--region` (por defecto `argentina_chile`) | El MVP es Argentina + Chile. **Los datos de 2026 cubren solo Sudamérica** (bbox de la API); para ir a global hay que bajar 2026 con `BBOX=world` |
| **Datos** | **Locales**, en `FIRE_DATA_DIR` de cada quien. Ni en el repo ni en Drive | Los zips son públicos en NASA: los tres partimos de los mismos bytes |
| **Archive vs NRT** | Se usa archive (calidad estándar) donde exista; NRT solo en la cola reciente, marcado con `source = 'nrt'` / `is_nrt` hasta la entrega | NRT es el mismo dato procesado de prisa; NASA lo reemplaza ~5 meses después |
| **Scripts** | Uno solo por paso, en `pipeline/scripts/`. Nadie hace su versión propia | Ver reglas en el README |

---

## Quién hace qué

Desde 2026-11-15 el equipo de datos son dos. **Cada script tiene un solo dueño**; si otro lo cambia, avisa en el repo.

### Evaristo — código de conversión, calibración, serie final y entrega, y despliegue
- Dueño del código de ✅ `01_to_parquet.py`, ✅ `04_calibration_set.py`, ✅ `06_apply_gold.py` y ✅ `07_export.py` (este último era de Paco).
- **Despliegue** con el equipo web: Render (API), Vercel (`VITE_API_URL`) y reiniciar Render cuando haya un release de datos nuevo. Ver [DESPLIEGUE.md](DESPLIEGUE.md).

### Carlos — datos de entrada, limpieza, modelo y publicación de la entrega
- Dueño del código de ✅ `00b_descargar_2026.sh`, ✅ `02_qa.py`, ✅ `03_silver.py` (era de Paco) y ✅ `05_model.py`.
- **Genera la entrega en su máquina** (cadena 01 → 07 `--zip`) y **publica los releases de datos** en GitHub.
- **Contacto de datos con Manuel.**

### Reglas entre los dos
- **Una sola máquina genera la entrega: la de Carlos.** Ningún otro publica releases de datos.
- Si alguien cambia el código de 01, 04, 06 o 07, avisa a Carlos en el repo para volver a generar la entrega.
- Antes de publicar un release nuevo, Carlos lo anota en el repo: con Render desplegado, la app toma el release `latest` la próxima vez que el servidor arranca.
- Paco hizo `03_silver.py` y `07_export.py`; su trabajo queda en el historial de git.

---

## Orden y puntos de control

| # | Punto de control | Quién | Depende de |
|---|---|---|---|
| 1 | Los tres con datos locales y bronze completo (`00`, `01`, `02` sin sorpresas) | todos | — |
| 2 | Silver de `argentina_chile` + máscara de estáticas | Paco | 1 |
| 2' | Nivel 1 y validación corriendo con tabla falsa | Carlos | — (en paralelo) |
| 3 | Tabla de calibración real | Evaristo | 2 |
| 4 | Factores con datos reales + gráfica de validación | Carlos | 3 |
| 5 | `harmonized.parquet` | Evaristo | 4 |
| 6 | **Entrega al equipo web** (anomalías + `hotspots.parquet`) | Paco | 5 |
| 7 | Mejoras: intervalos de confianza, quantile mapping, región `sudamerica` | quien quede libre | 6 |

**Regla de oro:** llegar al punto 6 con el nivel 1 antes de mejorar nada. Una serie simple entregada vale más que una fina a medias.

---

## Punto abierto con el equipo web

✅ **Cerrado el 2026-11-15.** El backend sirve lo que entrega el paso 07 (opción B de [PLAN_INTEGRACION_WEB.md](PLAN_INTEGRACION_WEB.md)) y ya no usa `backend/ignis/harmonize.py` con datos reales. Manuel lo integró en `d688866`.

---

## Contratos (las columnas que todos usan)

### Bronze — un registro por foco, sin filtrar · `bronze/sensor=<S>/year=<A>/<producto>.parquet`
`satellite, source, origin, version, country, acq_date, acq_time, acq_datetime_utc, latitude, longitude, bright_mir, bright_tir, frp, confidence_raw, confidence_level, scan, track, daynight, type` + particiones `sensor`, `year`.

- `satellite`: `Terra` | `Aqua` | `S-NPP` | `NOAA-20` | `NOAA-21`
- `source`: `archive` | `nrt` · `origin`: `country_zip` | `api_bbox`
- `confidence_level`: `low` | `nominal` | `high` (MODIS: <30, 30–79, ≥80)
- `type`: 0 vegetación, 1 volcán, 2 fuente estática, 3 offshore; **NULL en NRT**
- `country`: NULL en los datos de la API

### Silver — focos limpios · `silver/region=<R>/year=<A>/silver.parquet`
Las columnas de bronze más `h3_r8, h3_r6, h3_r5, h3_r3` (UBIGINT).

### Calibración — una fila por `h3_r5 × year × month` · `calibration/region=<R>/calibration.parquet`
`h3_r5, h3_r3, year, month, lat, lon` y, para cada satélite `S` en `terra, aqua, modis, snpp, n20, n21`: `cd_S` (días-celda), `n_S` (focos), `frp_S` (MW). `modis` = Terra ∪ Aqua.

### Modelo · `models/factores.parquet`
`origen` (`modis` | `snpp` | `terra`), `h3_r3`, `mes`, `factor`, `factor_global`, `n_meses`, `metrica` (`cd` | `frp`). Más `metrics.json` y `figs/`.

### Gold — lo que recibe el equipo web · `gold/entrega/harmonized.parquet`
`h3_index, date, year, month, dekad, modis_raw_count, viirs_raw_count, harmonized_count, harmonized_ci_lower, harmonized_ci_upper, harmonized_frp_mw, primary_source, is_nrt, fire_regime, median_same_month, anomaly_pct`

### Hotspots — focos para el CSV · `gold/entrega/hotspots.parquet`
`h3_r6, acq_date, acq_time, latitude, longitude, sensor, satellite, source, frp, confidence_level, daynight, type`, ordenado por `h3_r6, acq_date`, particionado por `year`.

---

## Trampas de estos datos (medidas, no supuestas)

1. **`type` no existe en NRT** y los CSV de 7 días de FIRMS traen otra codificación (`T`/`A`, `nominal`). El paso 01 ya unifica todo.
2. **`acq_time` viene sin ceros a la izquierda** (`55` = 00:55). El paso 01 lo rellena.
3. **Aqua entra en 2002-07**: sin tratarlo, aparece un salto falso de ~100%.
4. **Terra se degrada desde 2024**: Terra/Aqua es ~0.50 de 2003 a 2021 (normal: Terra pasa en la mañana) y cae a 0.43 en 2024 y 0.38 en 2025. Revisar si `k_modis` cambia en esos años.
5. **S-NPP se degrada en 2026** y termina el 2026-11-02.
6. **El FRP de NOAA-21 sale ~17% más alto que el de NOAA-20** con casi los mismos focos: no mezclar su FRP sin calibrar.
7. **2026 es un año incompleto y regional** (Sudamérica): comparar siempre el mismo mes contra el mismo mes, nunca totales anuales.
