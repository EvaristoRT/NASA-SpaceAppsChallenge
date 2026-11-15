# MVP: toda América — qué falta y quién lo hace

**Fecha:** 2026-11-15 · **De:** Evaristo · **Para:** Carlos (y su asistente de IA); la sección 3 es para Manuel
**Decisión del equipo:** el MVP es **toda América** (región `america` de `config.py`, bbox −170, −57, −30, 72), **en local**.
El despliegue en Cloud Run queda para después (`DESPLIEGUE.md`). Argentina + Chile sigue en `main` como red de seguridad.

> **Para el asistente de Carlos:** marca cada casilla al terminarla y anota los números en la sección 5. Si algo no cuadra, escríbelo ahí.
> No fusiones a `main` sin el visto bueno de Evaristo, y no publiques releases hasta que la sección 4 esté completa.

---

## 1. Cuándo está listo el MVP

1. Al elegir **cualquier país de América** en la app (local), el calendario muestra datos reales armonizados 2000–2026.
2. El panel dice si el mes actual está por encima o por debajo de lo normal y **muestra lo esperado para los próximos meses**.
3. Se pueden **descargar en CSV los focos** de la zona elegida (lo pide el reto explícitamente).
4. Hay **evidencia para los jueces**: validación de la armonización y de la predicción, con sus cifras.

---

## 2. Carlos — datos de América (bloquea todo lo demás)

- [x] **2026 de Norte y Centroamérica** con el `00b` corregido, cada zona en su carpeta (como hice con Europa):
  ```bash
  BBOX="-170,14,-50,72" OUT="<FIRE_DATA_DIR>/datos_2026/api/zona_norte"  bash pipeline/scripts/00b_descargar_2026.sh
  BBOX="-95,5,-85,14"   OUT="<FIRE_DATA_DIR>/datos_2026/api/zona_centro" bash pipeline/scripts/00b_descargar_2026.sh
  ```
  Comprobar que NOAA-20 tenga todos los días de 2026 en cada zona. En Europa: 319 días (01-ene → 15-nov).
  Ojo, huecos de 2026 entre las tres zonas y el bbox de `america` (calculados con los bbox): **Galápagos** (≈ −91, −0.5; queda al oeste de
  `sudamerica` y al sur de `zona_centro`) y el **este de Groenlandia** (−50 a −30). El Caribe sí está cubierto: Cuba y las Antillas Mayores
  por `zona_norte` (≥ 14° N) y las Antillas Menores del sur por `sudamerica`. Para 2000–2025 no hay huecos (el bronze es global).
  Decidir si se baja una zona chica para Galápagos o se anota como limitación.
- [x] **Cadena:** `01 --years 2026` → `03 --region america` → `04` → `05` → `06` → `07 --zip`, todo con `--region america`.
- [x] **Industrias y mecheros de gas (importante para América).** En Europa la limpieza dejó pasar **737 celdas r8 industriales**
  (1.7% de los días-celda; acerías de Avilés, Gante y Alchevsk) porque FIRMS no las marca como `type` 2 (`REGIONES.md` §4, rama `datos/europa`).
  En América hay que revisar sobre todo los **mecheros de gas de Permian (Texas / Nuevo México), Bakken (Dakota del Norte), Alberta y el
  golfo de México**, y las refinerías y acerías.
  Medida rápida, sobre el silver de `america`: celdas r8 con fuego en ≥ 60 meses distintos, cuántas son y qué % de días-celda suman.
  Si es más del ~1%, **reforzar la máscara del 03**: agregar las celdas r8 con fuego en ≥ N meses distintos repartidos en ≥ 10 años
  (N ≈ 60; ajustarlo mirando que no caigan zonas de quema agrícola reales), regenerar `aux/static_mask.parquet` y volver a correr 03 → 07.
  Con eso también quedan limpias Europa y Argentina + Chile.
- [x] **Validación de `america`** (`models/region=america/metrics.json`), comparada con las otras regiones:

  | Región | Sesgo MODIS → NOAA-20 | Error mediano | r | Cobertura de la banda |
  |---|---|---|---|---|
  | Argentina + Chile | +1.9% | 8.7% | 0.995 | 95.7% |
  | Sudamérica | +7.3% | 5.9% | 0.996 | 95.7% |
  | Europa | −2.0% | 11.5% | 0.993 | 89.4% |
  | **América** | **+5.4%** | **6.3%** | **0.995** | **97.9%** |

  Revisar también la deriva del factor por año y que **no haya saltos en 2002, 2012 y 2018** en la serie anual (como en Europa: llevar MODIS y
  S-NPP a NOAA-20 en 2012–2017 y ver que den lo mismo).
- [x] **Medir el tamaño de la entrega:** zips y pico de memoria del backend con `gold/entrega_america/`. Sudamérica sola da ~1.35 GB;
  se espera 2–3 GB. En local alcanza; para Cloud Run es el dato que decide `--memory`.
- [ ] **Pasarle la entrega a Evaristo** para la prueba local completa (sección 4). Por USB o red: la carpeta `gold/entrega_america/`.
- [ ] **Lámina de validación para los jueces** (tarea C5): gráfica MODIS armonizado vs NOAA-20 de `america` y la tabla de arriba, con
  la frase acordada para la banda ("contiene el valor real en el X% de los meses").

## 3. Manuel — app (para leerlo cuando la entrega de América esté lista)

Las tareas de Manuel van con detalle en `PLAN_INTEGRACION_WEB.md` (en `main`); aquí, solo lo que falta para el MVP:

- [x] **CSV de focos individuales** (`0f065d9`, `abfc052`). Probado por Evaristo: recorte exacto al polígono (forma en L: 4,307 focos = conteo independiente, 0 fuera).
- [x] **Banda de incertidumbre** y meses NRT dibujados (`abfc052`, gráfica Fig. 2).

### 3.1 Lo que falta para cumplir el reto (2026-11-15)

Sale de la prueba general contra el texto del reto: [PRUEBA_RETO.md](PRUEBA_RETO.md). La API ya da todo lo necesario salvo donde se indica.
En orden de importancia:

- [ ] **1. Selector de rango de fechas (desde–hasta).** El objetivo lo pide textualmente: *"a user could select a region and a specific
  date range, then download analytics and visualizations"*. Hoy el panel muestra toda la historia y solo deja elegir un mes.
  - La API ya acepta `start` / `end` (`YYYY-MM`) en `/api/search` y `/api/export.csv`. Probado: con 2019-01 → 2020-12 devuelve 24 meses
    y la mediana de base no cambia (se calcula con toda la historia).
  - Que el rango filtre el calendario, la gráfica, los KPI del periodo y las descargas.
  - El CSV de focos admite hasta 12 meses (`HOTSPOTS_MAX_MONTHS`): si el rango es mayor, avisar o descargar por partes.
- [ ] **2. Meses futuros con el rango esperado** (la parte de "anticipar periodos críticos" y alerta temprana). Hoy salen vacíos.
  `/api/search` ya trae `climatology`: mediana, p25, p75 y p90 por mes calendario de la zona (base 2003–2020).
  Pintar los meses que faltan del año con un estilo distinto (rayado o translúcido), con el rango p25–p75 y la etiqueta "esperado, no medido".
- [ ] **3. Bloque "próximos meses"**, p. ej. "dic: bajo · ene: medio · feb–mar: **temporada alta**", con la misma `climatology`.
  Regla sugerida: alto si la mediana del mes está en el tercio superior de las 12 medianas de la zona, bajo si está en el inferior.
- [ ] **4. Descargar las visualizaciones como imagen** (PNG o SVG): el calendario y la gráfica de la serie. El reto dice
  *"download analytics **and visualizations**"*. Hoy solo hay CSV.
- [ ] **5. Número de focos visible.** El reto habla de *"the number of hotspots detected"* y *"number of fires detected"*. El calendario muestra
  **días-celda con fuego** (es el método, y está bien), pero ningún número de focos aparece en el panel.
  - Un KPI "focos detectados en la zona y el periodo", contados en el backend desde `hotspots/` con el mismo recorte por polígono que el CSV
    (`ignis/hotspots.py`). Si hace falta, solo para el rango elegido (≤ 12 meses).
  - Una línea que explique la unidad del calendario: "un día-celda = un hexágono de ~0.7 km² con al menos un foco ese día; así se pueden
    comparar MODIS (1 km) y VIIRS (375 m)".
- [ ] **6. Escribir latitud y longitud** (sugerido por el reto: *"an option to enter latitude and longitude"*). Por ejemplo, un centro
  + radio en km, o las cuatro esquinas de un rectángulo, que genere el mismo polígono que el dibujo. Hoy `CoordinatesHUD` solo las muestra.
- [ ] **7. Revisión rápida de accesibilidad del calendario nuevo**: que las celdas de meses futuros (punto 2) también se lean con teclado y lector de
  pantalla, igual que las de ahora (`role`, `aria-label`).

Cuando estén, avisar aquí para que Evaristo repita la prueba general (`PRUEBA_RETO.md`) con la entrega de América.

## 4. Evaristo — integración, prueba y predicción

- [ ] **Revisar y fusionar a `main`** las ramas `datos/sudamerica` (código por región) y `datos/europa` (solo docs) cuando América esté validada.
- [ ] **Backtest de la predicción** (con `gold/region=america`): para cada mes de 2021–2025, calcular el rango "normal" sin ese año y medir cuántas
  veces el valor real cae dentro. También decidir si el periodo base sigue en 2003–2020 o conviene el más reciente. Resultado aquí, en la sección 5.
- [ ] **Prueba local de punta a punta:** backend con `DATA_DIR=gold/entrega_america` + front con `VITE_API_URL=http://localhost:8000`.
  Probar Brasil, México, EE. UU., Canadá y un polígono dibujado. Comparar los totales con `gold/region=america` (como la prueba de polígonos de AR+CL).

## 5. Resultados

_(Carlos y Evaristo anotan aquí: validación de `america`, celdas industriales, tamaños, backtest de la predicción y prueba local)_

### 2026-11-15 · Carlos · datos y validación de `america`

**2026:** `zona_norte` y `zona_centro` bajadas con el `00b` corregido (258 y 254 partes, sin errores). Días con focos de NOAA-20:
319 en `zona_norte`, 319 en `sudamerica` y 289 en `zona_centro` (franja chica: hay días sin ningún fuego, no es hueco).
Bronze 2026: 8.4 M de focos. **Galápagos y el este de Groenlandia** quedan sin 2026: se anotan como limitación (casi no tienen fuegos
de vegetación; en Galápagos lo que hay es sobre todo volcánico, que la limpieza quita igual).

**Cadena `america`:** silver ~100 M focos limpios · calibración 6.9 M filas, 125,636 hex r5 · `k_modis` 2.64 [2.57–2.70] ·
`k_snpp` 1.01 · `f_terra` 2.63. Validación en la tabla de la sección 2. S-NPP → NOAA-20: sesgo −1.1%, error mediano 2.1%, r 0.990.

**Por franja de latitud** (mismo modelo): boreal > 50° N factor 2.27, sesgo +6.9%, error mediano 12.6%, r 0.992 ·
EE. UU. y México 2.66, −1.1%, 7.3%, 0.993 · Sudamérica 2.66, +7.3%, 6.0%, 0.996. Los factores por H3 res 3 capturan la diferencia boreal.

**Saltos en 2002 / 2012 / 2018:** no hay. En 2013–2017 (sin NOAA-20) el mismo año llevado a NOAA-20 por MODIS y por S-NPP da
−0.1%, −3.2%, +1.3%, +0.8%, +4.4%. Deriva anual de `k_modis`: 2.49–2.72, sin tendencia.

**Industrias y mecheros:** celdas r8 con fuego en ≥ 60 meses y ≥ 10 años = 1,388 celdas, **0.37%** de los días-celda (≥ 36 meses: 0.84%;
≥ 100 meses: 0.06%). Debajo del umbral de 1%: **no se refuerza la máscara**. Los primeros son industriales (Cleveland, Coatzacoalcos,
Mobile); los mecheros de Permian, Bakken y Alberta casi no aparecen porque FIRMS ya los marca `type` 2.
Tabla por celda en `aux/celdas_america_meses.parquet` (máquina de Carlos) por si se quiere usar un umbral más estricto.

**Tamaño:** `ignis-backend-america.zip` 152 MB · `ignis-hotspots-america.zip` 1,346 MB (< 2 GB de GitHub) · backend en reposo 779 MB,
pico 1.85 GB con `/api/search` de toda la región (máquina de Carlos). Para Cloud Run, `--memory 4Gi`.

**Entrega:** `gold/entrega_america/` lista en la máquina de Carlos para la prueba local de Evaristo (pendiente pasarla por USB o red).
