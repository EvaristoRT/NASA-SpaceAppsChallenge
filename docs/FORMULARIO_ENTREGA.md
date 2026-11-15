# Textos para el formulario de entrega (Space Apps)

Listos para copiar y pegar, **en inglés** (los jueces son internacionales). Cada bloque indica el campo del formulario.
Las cifras salen de la validación documentada en el README y en `pipeline/`. Plazo: **15 de noviembre, 11:59 PM** hora del evento local.

**Antes de enviar, hay que llenar dos enlaces que todavía no existen:** el del video demo y, si se despliega, el de la app pública.

---

## 1. Project Name

```
IgnisSync: A Harmonized MODIS–VIIRS Burning Activity Calendar for the Americas
```

## 2. Summary *(50–200 palabras, máx. 1500 caracteres)*

```
IgnisSync is a web application that turns 26 years of NASA FIRMS active-fire detections into a single, comparable burning activity calendar for any area of the Americas. MODIS (Terra and Aqua, since 2000) and VIIRS (S-NPP, NOAA-20 and NOAA-21, since 2012) cannot be compared directly: VIIRS detects about four times more hotspots, so raw counts show false jumps every time a satellite changes. We harmonized 553 million hotspots into one series expressed as NOAA-20 equivalent, using a footprint-neutral unit (burning cell-days on an H3 grid) and a regional ratio model fitted on the years when both sensors overlap and validated on years it never saw. Across the Americas, the MODIS bias drops from −61% to +5.4%, and the 95% uncertainty band contains the observed value in 98% of the test months. Users choose a country, draw a polygon or type coordinates, then see which months and years burned the most, how the latest month compares with the historical median, the expected range for the coming months, and download the hotspots and charts. As MODIS reaches the end of its mission, this gives fire managers a consistent, future-proof view of when and where burning occurs.
```

## 3. Project Demonstration *(video ≤ 30 s, enlace público completo)*

```
https://   ← pegar aquí el enlace del video (YouTube no listado o público, o Google Drive con "cualquier persona con el enlace")
```
Guion: [`docs/DEMO_VIDEO.md`](DEMO_VIDEO.md). Comprobar que dura 0:30 o menos y que el enlace abre en una ventana de incógnito.

## 4. Project *(enlace público al proyecto)*

```
https://github.com/EvaristoRT/NASA-SpaceAppsChallenge
```
Si antes del cierre hay una app pública con datos reales, se puede poner su enlace aquí y dejar el repositorio en el README.

## 5. Project Details

```
WHAT IT DOES
IgnisSync is a web application that shows the burning activity calendar of any area in the Americas from November 2000 to November 2026 as one comparable time series. Users select a country, draw a polygon or type coordinates (center and radius, or a rectangle) and get:
- A burn calendar (years × months) with perceptually uniform, colorblind-safe color ramps, navigable with the keyboard.
- The latest complete month compared with the 2003–2020 median for that area, with anomaly ratio and percentile. The month in progress is flagged as partial and recent near-real-time months as preliminary.
- The harmonized monthly series with its 95% uncertainty band and the sensor behind each month.
- A prediction tab with the expected range for the coming months, from the area's own history.
- A map of the hexagons with fire in any chosen month, and the number of hotspots detected.
- Downloads: CSV of the monthly series, of the hexagons of a month and of the individual hotspots clipped to the exact polygon, plus the calendar and chart as PNG images. Spanish and English interface.

HOW IT WORKS
1. Data: the full NASA FIRMS record — MODIS Collection 6.1 (Terra, Aqua) and VIIRS 375 m (S-NPP, NOAA-20, NOAA-21) — from the yearly archive and, for 2026, the FIRMS area API. 553 million hotspots worldwide, converted to Parquet and processed with DuckDB.
2. Cleaning: volcanoes, offshore platforms, gas flares and other static sources are removed using FIRMS flags; near-real-time data, which has no such flag, is filtered with a static-cell mask built from the archive. Low-confidence detections are dropped.
3. A footprint-neutral unit: a "burning cell-day" is an H3 resolution-8 hexagon (~0.7 km², close to a MODIS pixel) with at least one hotspot that day. A fire front that VIIRS splits into many 375 m detections counts once, which reduces the NOAA-20/MODIS gap from 3.98× to 2.84× before any modeling.
4. Harmonization: a stratified ratio estimator, one factor per region (H3 resolution 3) and calendar month, shrunk toward a global factor where data is sparse. Each satellite is chained to NOAA-20 separately (S-NPP for 2012–2018, MODIS for 2002–2011, Terra alone for 2000–2002); satellites are never added together, which would create false jumps.
5. Uncertainty: a 95% band from a bootstrap that resamples hexagons and years.
6. Validation: factors are fitted on 2018–2022 and tested on 2023–2026 against what NOAA-20 actually measured. Americas: MODIS bias from −61% to +5.4%, median monthly error 6.3%, correlation 0.995, observed value inside the band in 97.9% of test months. The method was also validated independently in South America, Europe and Africa, with no false jumps at sensor transitions.

BENEFITS AND INTENDED IMPACT
Emergency managers, firefighters, land managers and scientists get a consistent fire history for their own area: which months are critical, which years were exceptional, whether this month is above normal, and what to expect next. Because the reference is NOAA-20 — an active sensor — the recent period is measured data and the series can keep growing after MODIS and S-NPP are gone (S-NPP stopped on 2 November 2026, and MODIS is degrading: in Africa its bias against NOAA-20 grows from about 0% in 2023–2024 to −24% in 2026). The downloads let analysts take the data into their own tools.

TOOLS AND LANGUAGES
Python (DuckDB with its H3 extension, Apache Arrow/Parquet, pandas, NumPy, matplotlib) for the data pipeline; FastAPI for the backend API; JavaScript with React, Vite and Mapbox GL JS for the web application; H3 hexagonal grid; Git and GitHub for collaboration and data releases.

WHAT MAKES IT CREATIVE
- It uses VIIRS NOAA-20 as the reference instead of MODIS, so the product does not depend on sensors that are ending.
- It harmonizes a footprint-neutral unit instead of raw hotspot counts, and treats every satellite separately, including the Terra-only years before Aqua.
- It validates on held-out years in several regions and fire regimes, and reports an uncertainty band whose coverage was measured, not assumed.
- It is honest about time: preliminary and partial months are flagged and never compared as if they were complete.

FACTORS WE CONSIDERED
Comparability across sensors, validation on unseen years, uncertainty, non-fire heat sources, preliminary near-real-time data, accessibility (color ramps, keyboard navigation, two languages) and scale (a reproducible pipeline that runs per region). Known limitations are documented: MODIS cannot be checked against VIIRS before 2012, the Terra-only years carry the widest band, the demo covers the Americas only, and the unit is burning cell-days (the raw hotspot count is shown separately and is in the CSV).
```

## 6. Use of Super Intelligence (SI)

**Qué marcar** (elegir las opciones del formulario que correspondan a esto):
- ✅ Código / programación (*code*)
- ✅ Texto / documentación (*text*, *writing*)
- ✅ Análisis de datos (*data analysis*), si aparece como opción
- ❌ Imágenes, video y audio: **no** se usó IA. Las gráficas salen de nuestro código, el video se graba con la app real y la voz es humana.
- ❌ "I did not use SI" — **no** marcar.

Si el formulario pide una descripción, usar esta (es la misma que la sección 7 del README):

```
Team members used AI coding assistants (large language models, e.g. Claude) to help write, review and debug the data pipeline, backend, frontend and deployment files, and to help run and summarize quality checks and draft documentation. The method choices were made by the team, and every reported figure comes from running the code on NASA FIRMS data; key results were cross-checked with independent calculations. No images, video or audio in the project are AI-generated, and no NASA branding was used or modified. This use is declared in the "Use of AI" section of the repository README.
```

## 7. NASA Data *(Link Text / Link Url)*

| Link Text | Link Url |
|---|---|
| NASA FIRMS – Fire Information for Resource Management System | https://firms.modaps.eosdis.nasa.gov/ |
| NASA FIRMS archive download (MODIS C6.1 and VIIRS 375 m active fires, yearly files) | https://firms.modaps.eosdis.nasa.gov/download/ |
| NASA FIRMS Area API (2026 near-real-time and standard data) | https://firms.modaps.eosdis.nasa.gov/api/ |
| NASA Earthdata – FIRMS (LANCE) overview and citation | https://www.earthdata.nasa.gov/data/tools/firms |

## 8. Space Agency Partner & Other Data *(Link Text / Link Url)*

| Link Text | Link Url |
|---|---|
| CONAE – Comisión Nacional de Actividades Espaciales (challenge partner) | https://www.argentina.gob.ar/ciencia/conae |
| Natural Earth – 1:110m country boundaries (public domain) | https://www.naturalearthdata.com/ |
| Mapbox GL JS and Mapbox tiles (base map, terrain, country boundaries) | https://www.mapbox.com/ |
| H3 – hexagonal hierarchical geospatial index (Uber) | https://h3geo.org/ |
| DuckDB | https://duckdb.org/ |
| Apache Arrow / Parquet | https://arrow.apache.org/ |
| pandas | https://pandas.pydata.org/ |
| NumPy | https://numpy.org/ |
| matplotlib | https://matplotlib.org/ |
| FastAPI | https://fastapi.tiangolo.com/ |
| React | https://react.dev/ |
| Vite | https://vite.dev/ |
| d3-scale-chromatic (viridis, cividis, inferno, magma color ramps) | https://github.com/d3/d3-scale-chromatic |
| Lucide icons | https://lucide.dev/ |
| Source Sans 3 font (SIL Open Font License) | https://fonts.google.com/specimen/Source+Sans+3 |
| NASA Space Apps brand resources (symbol and patterns) | https://www.spaceappschallenge.org/resources/ |
| Claude (Anthropic) – AI assistant used for code and documentation | https://www.anthropic.com/claude |

## 9. Antes de "Submit for Judging"

- [ ] Nombre, resumen y detalles pegados y guardados (**Save Progress**).
- [ ] Enlace del video: público, ≤ 30 s, abre sin iniciar sesión (probar en incógnito).
- [ ] Enlace del proyecto: el repositorio abre sin iniciar sesión.
- [ ] Opciones de uso de IA marcadas.
- [ ] Todas las URLs completas, empezando con `https://`.
- [ ] Marcar los dos casilleros de verificación (términos y trabajo original).
- [ ] **Submit for Judging** antes de las 11:59 PM (solo cuenta el último envío).
