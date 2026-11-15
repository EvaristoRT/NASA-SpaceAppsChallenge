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

- [ ] **2026 de Norte y Centroamérica** con el `00b` corregido, cada zona en su carpeta (como hice con Europa):
  ```bash
  BBOX="-170,14,-50,72" OUT="<FIRE_DATA_DIR>/datos_2026/api/zona_norte"  bash pipeline/scripts/00b_descargar_2026.sh
  BBOX="-95,5,-85,14"   OUT="<FIRE_DATA_DIR>/datos_2026/api/zona_centro" bash pipeline/scripts/00b_descargar_2026.sh
  ```
  Comprobar que NOAA-20 tenga todos los días de 2026 en cada zona. En Europa: 319 días (01-ene → 15-nov).
  Ojo, huecos de 2026 entre las tres zonas y el bbox de `america` (calculados con los bbox): **Galápagos** (≈ −91, −0.5; queda al oeste de
  `sudamerica` y al sur de `zona_centro`) y el **este de Groenlandia** (−50 a −30). El Caribe sí está cubierto: Cuba y las Antillas Mayores
  por `zona_norte` (≥ 14° N) y las Antillas Menores del sur por `sudamerica`. Para 2000–2025 no hay huecos (el bronze es global).
  Decidir si se baja una zona chica para Galápagos o se anota como limitación.
- [ ] **Cadena:** `01 --years 2026` → `03 --region america` → `04` → `05` → `06` → `07 --zip`, todo con `--region america`.
- [ ] **Industrias y mecheros de gas (importante para América).** En Europa la limpieza dejó pasar **737 celdas r8 industriales**
  (1.7% de los días-celda; acerías de Avilés, Gante y Alchevsk) porque FIRMS no las marca como `type` 2 (`REGIONES.md` §4, rama `datos/europa`).
  En América hay que revisar sobre todo los **mecheros de gas de Permian (Texas / Nuevo México), Bakken (Dakota del Norte), Alberta y el
  golfo de México**, y las refinerías y acerías.
  Medida rápida, sobre el silver de `america`: celdas r8 con fuego en ≥ 60 meses distintos, cuántas son y qué % de días-celda suman.
  Si es más del ~1%, **reforzar la máscara del 03**: agregar las celdas r8 con fuego en ≥ N meses distintos repartidos en ≥ 10 años
  (N ≈ 60; ajustarlo mirando que no caigan zonas de quema agrícola reales), regenerar `aux/static_mask.parquet` y volver a correr 03 → 07.
  Con eso también quedan limpias Europa y Argentina + Chile.
- [ ] **Validación de `america`** (`models/region=america/metrics.json`), comparada con las otras regiones:

  | Región | Sesgo MODIS → NOAA-20 | Error mediano | r | Cobertura de la banda |
  |---|---|---|---|---|
  | Argentina + Chile | +1.9% | 8.7% | 0.995 | 95.7% |
  | Sudamérica | +7.3% | 5.9% | 0.996 | 95.7% |
  | Europa | −2.0% | 11.5% | 0.993 | 89.4% |
  | **América** | | | | |

  Revisar también la deriva del factor por año y que **no haya saltos en 2002, 2012 y 2018** en la serie anual (como en Europa: llevar MODIS y
  S-NPP a NOAA-20 en 2012–2017 y ver que den lo mismo).
- [ ] **Medir el tamaño de la entrega:** zips y pico de memoria del backend con `gold/entrega_america/`. Sudamérica sola da ~1.35 GB;
  se espera 2–3 GB. En local alcanza; para Cloud Run es el dato que decide `--memory`.
- [ ] **Pasarle la entrega a Evaristo** para la prueba local completa (sección 4). Por USB o red: la carpeta `gold/entrega_america/`.
- [ ] **Lámina de validación para los jueces** (tarea C5): gráfica MODIS armonizado vs NOAA-20 de `america` y la tabla de arriba, con
  la frase acordada para la banda ("contiene el valor real en el X% de los meses").

## 3. Manuel — app (para leerlo cuando la entrega de América esté lista)

Las tareas de Manuel van con detalle en `PLAN_INTEGRACION_WEB.md` (en `main`); aquí, solo lo que falta para el MVP:

- [ ] **CSV de focos individuales** (lo pide el reto): `POST /api/export.csv?level=hotspots`, que lea `hotspots/` (particionado por año) filtrando
  por polígono y fechas, con tope de filas, más un **botón de descarga** en el panel. Hoy solo se exportan totales mensuales.
- [ ] **Meses futuros en el calendario:** hoy salen vacíos. La API ya trae `climatology` (mediana, p25, p75, p90 por mes de la zona):
  mostrar en los meses que faltan del año el **rango esperado**, con un estilo distinto y la etiqueta "esperado, no medido".
- [ ] **Bloque "próximos meses"** (p. ej. "dic: bajo · ene: medio · feb–mar: temporada alta") a partir de la misma `climatology`.
- [ ] **Banda de incertidumbre** y meses NRT dibujados (el adaptador ya los trae: `count_ci_lower/upper`, `is_nrt`).

## 4. Evaristo — integración, prueba y predicción

- [ ] **Revisar y fusionar a `main`** las ramas `datos/sudamerica` (código por región) y `datos/europa` (solo docs) cuando América esté validada.
- [ ] **Backtest de la predicción** (con `gold/region=america`): para cada mes de 2021–2025, calcular el rango "normal" sin ese año y medir cuántas
  veces el valor real cae dentro. También decidir si el periodo base sigue en 2003–2020 o conviene el más reciente. Resultado aquí, en la sección 5.
- [ ] **Prueba local de punta a punta:** backend con `DATA_DIR=gold/entrega_america` + front con `VITE_API_URL=http://localhost:8000`.
  Probar Brasil, México, EE. UU., Canadá y un polígono dibujado. Comparar los totales con `gold/region=america` (como la prueba de polígonos de AR+CL).

## 5. Resultados

_(Carlos y Evaristo anotan aquí: validación de `america`, celdas industriales, tamaños, backtest de la predicción y prueba local)_
