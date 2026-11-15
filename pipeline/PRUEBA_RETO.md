# Prueba general contra el reto "Harmonization of MODIS and VIIRS Hot Spots"

**Fecha:** 2026-11-15 · **De:** Evaristo · **Para:** todo el equipo
**Cómo se probó:** la API real (`backend/main.py`, sin parches) con la entrega de Argentina + Chile (`gold/entrega`), polígonos de prueba
y comparación contra cálculos independientes. El front se revisó **por código**: no se levantó en el navegador porque en esta máquina
faltan el token de Mapbox (`frontend/.env.local`) y `npm install`. Manuel ya lo probó en local con América.

---

## 1. Requisitos del reto, uno por uno

| # | Lo que pide el reto | Estado | Evidencia |
|---|---|---|---|
| 1 | Armonizar MODIS y VIIRS para que "el sensor de origen ya no importe" | ✅ | Validación temporal en 5 regiones (sesgo −56% → +1.9% en AR+CL; América +5.4%, Europa −2.0%, África −8.0%). Sin saltos en 2002, 2012 y 2018 (razón año/año anterior en los cortes: 0.83–1.5, variación natural) |
| 2 | Serie consistente desde inicios de los 2000 hasta hoy | ✅ | 2000-11 → 2026-11 (corte 2026-11-15), `synthetic: false` |
| 3 | App web que usa los datos armonizados | ✅ | Backend FastAPI + front React/Mapbox con la entrega del pipeline (opción B) |
| 4 | **Elegir una región** | ✅ | Países y continentes en el mapa + **polígono dibujado** (`DrawToolbar`). Probado con una forma cóncava en L: recorte exacto |
| 5 | **Elegir un rango de fechas** | 🟡 **Parcial** | La API acepta `start`/`end` (probado: 24 meses, misma mediana de base), pero **el front no tiene selector de rango**: muestra toda la historia y deja elegir un mes |
| 6 | Calendario de actividad de quema (meses × años) | ✅ | 27 años × 12 meses, en 0.5 s para toda Argentina |
| 7 | Qué meses y qué años tienen más fuego | ✅ | `peak_calendar_month`, `peak_year` (AR+CL: agosto; 2003) |
| 8 | Mes actual contra la mediana histórica | ✅ | Último mes **completo** (2026-10: 0.22× la mediana). El mes en curso va marcado `is_partial` y no se compara |
| 9 | Anomalías contra la historia | ✅ | Por mes: razón, z robusto (MAD) y percentil; línea base 2003–2020 |
| 10 | Anticipar periodos críticos / alerta temprana | 🟡 **Parcial** | La API da la climatología (mediana, p25, p75, p90 por mes), pero **el front no la muestra**: los meses futuros salen vacíos. El backtest de la predicción está pendiente |
| 11 | Rampas de color accesibles | ✅ | `design/ramps.ts`: viridis, cividis, inferno y magma (perceptualmente uniformes y aptas para daltonismo); calendario con raíz cuadrada para que se distingan los meses bajos |
| 12 | Descargar analíticas | ✅ | CSV mensual (con banda, fuente, parcial y preliminar), hexágonos del mes y **focos individuales** (comprobado contra un conteo independiente: 4,307 = 4,307, 0 fuera del polígono) |
| 13 | **Descargar visualizaciones** | ❌ **Falta** | No hay exportación a imagen (PNG/SVG) del calendario ni de la gráfica |
| 14 | "Número de focos detectados" | 🟡 **A explicar** | El calendario muestra **días-celda con fuego** (equivalente NOAA-20), no focos. Es una decisión de método (quita la diferencia de 375 m contra 1 km), pero el reto dice "number of hotspots". Los focos están en el CSV; no hay un número de focos visible en el panel |
| 15 | Opción para escribir latitud y longitud (sugerido) | ❌ Falta | `CoordinatesHUD` solo muestra las coordenadas; no se pueden escribir |
| 16 | Mapa interactivo | ✅ | Mapa con continentes/países, dibujo, y hexágonos con fuego del mes elegido (`/api/activity`: 16,816 hexágonos en Argentina, agosto 2020) |
| 17 | Zona sin datos | ✅ | Responde 0 celdas y el front avisa "sin datos para esta zona"; entradas inválidas dan un error claro (422) |
| 18 | Accesible para el público (URL) | 🟡 | El sitio de Vercel muestra datos de demostración hasta que haya backend desplegado. Decisión pendiente (§8 de `REGIONES.md`, tarea 3) |

## 2. Lo que falta, en orden de importancia

| # | Qué | Quién | Esfuerzo | Por qué importa |
|---|---|---|---|---|
| 1 | **Selector de rango de fechas** (desde–hasta) que filtre el calendario, la gráfica y las descargas; el CSV de focos admite hasta 12 meses | Manuel | ~1–2 h | El objetivo lo pide textualmente: "select a region and a specific date range, then download analytics" |
| 2 | **Meses futuros con el rango esperado** + bloque "próximos meses" a partir de `climatology` | Manuel | ~1–2 h | Es la parte de "anticipar periodos críticos" y alerta temprana |
| 3 | **Exportar el calendario y la gráfica como imagen** (PNG o SVG) | Manuel | ~1 h | "download analytics **and visualizations**" |
| 4 | **Número de focos visible** junto a los días-celda (KPI "focos detectados en la zona y el periodo") y una frase que explique la unidad | Datos (07: sumar focos por celda-mes en `monthly`) + Manuel | ~1 h | El reto habla de "number of hotspots"; así se cubre literal sin perder el método |
| 5 | Backtest de la predicción (cifra para los jueces) | Evaristo | ~1 h | Respaldar el punto 2 con números |
| 6 | Escribir lat/lon (centro + radio, o las esquinas de un rectángulo) | Manuel | ~1 h | Sugerido por el reto; útil para brigadistas |
| 7 | URL pública con datos reales | Evaristo + Carlos | según la decisión | Que los jueces la usen sin instalar nada |

## 3. Lo que nos distingue (para la presentación)

1. **La referencia es NOAA-20, no MODIS.** MODIS se está apagando (Terra/Aqua cae de 0.50 a 0.21) y S-NPP dejó de operar el 2026-11-02.
   La serie queda medida en el sensor que va a seguir funcionando: el presente es dato, el pasado es estimación.
2. **Unidad "día-celda" en H3 res 8**, que quita la diferencia de huella (375 m contra 1 km) antes de calibrar.
3. **Una cadena por satélite**, incluido el tramo Terra solo (2000-11 → 2002-06) y la entrada de Aqua, sin sumar VIIRS entre sí.
4. **Validación temporal real** (ajuste 2018–2022, prueba 2023–2026), en **5 regiones** (AR+CL, Sudamérica, América, Europa, África) y por franja de latitud.
5. **Incertidumbre medida, no supuesta:** banda del 95% por bootstrap (hexágonos × años), con su cobertura comprobada en años que no se usaron.
6. **Hallazgo científico:** la degradación de MODIS en 2025–2026 se ve con claridad en África (sesgo +0.7% en 2023 → −23.7% en 2026) y explica por qué la referencia tiene que ser VIIRS.
7. **Limpieza de fuentes que no son incendios:** volcanes, offshore, mecheros de gas e industrias, con una máscara de celdas estáticas que también filtra los datos NRT (que no traen `type`). Medido por región: 0.15–1.7% de residuo.
8. **Honestidad temporal:** meses preliminares (NRT) marcados, mes en curso excluido de la comparación, fuente de cada mes visible.
9. **FRP armonizado** como segunda métrica (potencia del fuego), con su propio factor.
10. **CSV de focos recortado al polígono exacto**, no al rectángulo que lo envuelve.
11. **Accesibilidad:** rampas perceptualmente uniformes y aptas para daltonismo, calendario navegable con teclado (ARIA), bilingüe español/inglés.
12. **Escala:** pipeline reproducible sobre **553 M de focos** (2000–2026) con DuckDB y Parquet, por región, con las decisiones documentadas y los datos publicables como release.
