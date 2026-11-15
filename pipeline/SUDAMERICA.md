# Ampliación a Sudamérica (rama `datos/sudamerica`)

**Fecha:** 2026-11-15 · **De:** Carlos · **Para:** Evaristo (y su asistente de IA)
**Estado:** trabajo en una rama aparte. **`main` no cambia** hasta que Evaristo revise y se decida el servidor.
Objetivo a mediano plazo: toda América, por etapas, sin arriesgar lo que ya funciona (Argentina + Chile).

> **Para el asistente de Evaristo:** esta rama cambia código de Evaristo (06 y 07). Revísalo con él antes de fusionar.
> No fusiones a `main` sin su visto bueno.

---

## 1. Qué cambia en el código

| Archivo | Dueño | Cambio |
|---|---|---|
| `05_model.py` | Carlos | Escribe en `models/region=<r>/`. La región por defecto se copia también a `models/` (lo que leen 06 y 07 en `main`) |
| `06_apply_gold.py` | **Evaristo** | Lee `models/region=<r>/factores.parquet`. Solo la región por defecto puede caer en `models/factores.parquet`; otra región **nunca** usa factores ajenos |
| `07_export.py` | **Evaristo** | Lee `models/region=<r>/metrics.json` (mismo criterio). La región por defecto sigue en `gold/entrega/`; las demás en `gold/entrega_<r>/`. Los zip ya llevan la región en el nombre |

Era la tarea E7 de `CONTEXTO_CARLOS.md`. Cambios mínimos, de rutas; no cambia ningún cálculo.

**Argentina + Chile no cambia:** con esta rama, 05 → 06 → 07 da la misma entrega que la que Carlos tiene lista para el release
`datos-2026-11-15` (aún sin publicar; factores idénticos; `monthly.parquet` con las mismas 2,209,842 filas y las mismas sumas de valor e IC;
`hotspots/` con los mismos 14,600,732 focos). Respaldo completo en la máquina de Carlos.

## 2. Resultados de Sudamérica

Región `sudamerica` de `config.py` (bbox −85, −57, −32, 14). 2026 por API cubre ese mismo bbox.

| | Argentina + Chile | **Sudamérica** |
|---|---|---|
| Focos limpios (silver) | 14.6 M | **69.7 M** |
| Tabla de calibración | 1.1 M filas · 21,496 hex r5 | 4.6 M filas · 63,661 hex r5 |
| Factor MODIS → NOAA-20 (días-celda) | 2.32 | **2.65** [2.60–2.69] |
| Factor MODIS → NOAA-20 (FRP) | 0.71 | 0.85 |
| Factor S-NPP → NOAA-20 | 1.01 | 1.01 |

**Validación** (ajuste 2018–2022, prueba 2023–2026, serie mensual total):

| MODIS → NOAA-20, días-celda | Argentina + Chile | **Sudamérica** |
|---|---|---|
| Sesgo sin armonizar | −56% | −61% |
| Sesgo armonizado | +1.9% | **+7.3%** |
| Error mediano mensual | 8.7% | **5.9%** |
| Correlación | 0.995 | **0.996** |
| Meses dentro de la banda | 95.7% | 95.7% |

S-NPP → NOAA-20: sesgo −1.0%, error mediano 2.0%, r 0.996.

**El +7.3% viene de 2023–2024:** la razón NOAA-20/MODIS bajó a 2.46–2.56 (2024 es el año récord de la región, con los grandes
incendios de la Amazonia y el Pantanal) y el factor se ajustó en 2018–2022 (~2.65). Terra/Aqua es estable hasta 2024, así que
no es deriva del sensor: es variación entre años, y la banda la cubre. Año pico armonizado: 2024 = 2.08 M días-celda.

## 3. El límite: el servidor

| | Argentina + Chile | **Sudamérica** |
|---|---|---|
| `ignis-backend-<r>.zip` | 24 MB | **104 MB** |
| `ignis-hotspots-<r>.zip` | 182 MB | **892 MB** |
| Memoria del backend en reposo (máquina de Carlos) | 356 MB | 585 MB |
| Pico con `/api/search` de toda la región (máquina de Carlos) | 517 MB | **1,346 MB** |
| Pico estimado en Render (escalando tu medición de 340 MB) | 340 MB | **~0.9 GB** |

**No cabe en Render gratis (512 MB), pero sí en Cloud Run** (commit `4c4ee` de Evaristo, hasta 32 GB).
Como en Cloud Run `/tmp` vive en la RAM, a ese pico hay que sumar los ~104 MB de datos descomprimidos:
**`--memory 2Gi`** alcanza con margen para Sudamérica (hoy AR+CL usa `1Gi`).

- Los zip ya llevan la región en el nombre: basta con cambiar `DATA_URL` a `.../ignis-backend-sudamerica.zip`, como dice la
  fila "Otra región o el mundo" de `DESPLIEGUE.md`.
- `ignis-hotspots-sudamerica.zip` pesa 892 MB: cabe en el límite de 2 GB por archivo de GitHub. Toda América probablemente no;
  ahí habría que partirlo por año, como ya anota `DESPLIEGUE.md`.
- Los zip de Sudamérica están armados en la máquina de Carlos pero **no publicados**.

## 4. Preguntas para Evaristo

1. ¿Te parecen bien los cambios de rutas en 06 y 07? ¿Prefieres hacerlos tú?
2. Con Cloud Run, ¿servimos Sudamérica (`--memory 2Gi`) en la entrega final, o la demo se queda con Argentina + Chile y
   Sudamérica entra después? El front tiene que dejar dibujar fuera de Argentina y Chile (Manuel).
3. Si vamos a toda América: hay que agregar la región en `config.py` (compartido) y bajar 2026 para Norte y Centroamérica.
   ¿Te parece una región `america` o varias (`sudamerica`, `centroamerica`, `norteamerica`)?

---

## Respuesta de Evaristo (2026-11-15)

1. **Cambios de rutas en 06 y 07: aprobados.** Los revisé (solo cambian rutas, no cálculos) y los probé corriendo Europa entera con esta rama:
   Argentina + Chile no se tocó (`models/factores.parquet`, `gold/entrega/` y `gold/region=argentina_chile/` conservaron sus fechas).
   Resultados en `REGIONES.md` §4 (rama `datos/europa`).
2. **El MVP es toda América**, servida **en local** por ahora (el despliegue en Cloud Run queda para después, cuando haya quien ponga la tarjeta).
   Argentina + Chile sigue siendo la red de seguridad hasta que América esté validada.
3. **Una sola región `america`** (la que ya pusiste en `config.py`). Para la app no hace falta partirla: el front muestra cualquier país
   que tenga celdas con datos (`useAnalysis.js` decide por `n_cells_with_fire > 0`), así que con la entrega de América funcionan solos
   Brasil, México, EE. UU., etc.

**Qué te toca para llegar al MVP:** [MVP_AMERICA.md](MVP_AMERICA.md).
