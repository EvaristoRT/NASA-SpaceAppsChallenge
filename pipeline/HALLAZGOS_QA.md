# Hallazgos del QA de bronze

Resultados de `02_qa.py` sobre el bronze completo. Las tablas completas quedan en `<FIRE_DATA_DIR>/qa/*.csv` de quien lo corre.
Cada entrada dice quién la corrió y cuándo. Si encuentras algo nuevo, agrégalo aquí en vez de mandarlo solo por chat.

---

## 2026-11-14 · Evaristo · bronze 2000–2026 (esquema con `origin`)

**Totales:** 552,941,852 focos = 548,501,203 del archivo 2000–2025 (48 zips, global) + 4,440,649 de 2026 (API, Sudamérica).
Coincide con los 4.4 M de 2026 que reportó Carlos.

### Todo en orden
| Revisión | Resultado |
|---|---|
| Vida de cada satélite | Terra 2000-11, Aqua 2002-07, S-NPP 2012-01 → **2026-11-02**, NOAA-20 2018-04, NOAA-21 2026-01 (en 2026 viene por API). Todos llegan a 2026-11-14 salvo S-NPP |
| Años o productos faltantes | Ninguno |
| Nulos en `frp`, confianza | 0 |
| `type` nulo | Solo en NRT de 2026 (2.59 M filas), como se esperaba → máscara de estáticas en silver |
| Duplicados exactos | ~10 por satélite y año sobre ~20 M (despreciable; el silver puede quitarlos con un `DISTINCT`) |
| Volcanes / estáticas / offshore | VIIRS 29.7 M, MODIS 3.75 M → se quitan en silver |

### Para tener en cuenta
1. **Terra se degrada (afecta `k_modis`, paso 05 · Carlos).** Terra/Aqua ≈ 0.50 estable de 2003 a 2021; luego 0.47 (2022), 0.49 (2023), **0.43 (2024), 0.38 (2025)**, 0.48 (2026, solo Sudamérica).
   Como el ajuste es 2018–2022 y MODIS se aplica a 2002–2011, conviene ajustar `k_modis` con Aqua por separado o comprobar que no cambia entre años.
2. **El total VIIRS salta de 20 M (2017) a 33.6 M (2018) y 41.7 M (2019).** No es más fuego: entra NOAA-20 y se suman dos satélites. Confirma la regla de una columna por satélite (paso 04).
3. **Terra 2022 tiene solo 353 días con focos** (12 días sin datos). Revisar antes de usar 2022 en el ajuste.
4. **2026:** la parte archive (`SP`) llega hasta ~2026-07/08 y el resto es NRT. NOAA-20 2026 = 1.41 M y NOAA-21 = 1.37 M (~3% de diferencia).
5. La carpeta `datos_2026/bulk_7d/` no la lee el paso 01 (solo `datos_2026/api/`). Hoy no hace falta porque la API llega al 2026-11-14.

---

## 2026-11-14 · Evaristo · tabla de calibración `argentina_chile` (paso 04)

Corrida sobre el silver del paso 03 (14.6 M focos limpios): **1,111,085 filas · 21,496 hexágonos r5 · 2000–2026**, en 6 s.

Comprobaciones: `n_*` suma exactamente los focos de silver por satélite; `cd_n20` de 2020 coincide con un conteo directo
(533,865); sin claves repetidas ni nulos; en todas las filas `max(cd_terra, cd_aqua) ≤ cd_modis ≤ cd_terra + cd_aqua`.

Probada con `05_model.py` (sin cambiarlo): corre de punta a punta. MODIS → NOAA-20 en la prueba 2023–2026:
sesgo −56.4% → **+1.9%**, error mediano 59.5% → **8.7%**, r = 0.995.

Para Carlos:
1. Factores globales en Argentina + Chile: `cd` MODIS → NOAA-20 = **2.32** (el plan citaba 2.84, medido en otra región/periodo),
   S-NPP → NOAA-20 = 1.01, Terra → MODIS = 2.77.
2. **FRP no sale tan neutro aquí:** `frp_n20 / frp_modis` = **0.71** en 2018–2022 (el plan decía ~1.04 en 2026). Revisar antes de
   usar FRP como "control independiente".
3. `cd_n21` solo tiene datos en 2026: no hay zips anuales de NOAA-21 (jpss2) en el archivo que bajamos.
4. En mi máquina `pyarrow` no carga (Windows bloquea su DLL por control de aplicaciones), así que `pd.read_parquet` falla.
   Si a alguien le pasa, el 05 se puede leer con `duckdb.sql(...).df()`. Es de la máquina, no del código.

---

## 2026-11-14 · Evaristo · serie armonizada `argentina_chile` (paso 06)

Con los factores de `05_model.py` corrido sobre la tabla real del paso 04 (en mi máquina; se rehace cuando Carlos publique los oficiales):
**4,103,854 filas · 116,988 hexágonos r6 · 2000-11-01 a 2026-11-14**, 43 MB, en 12 s. Sin claves repetidas ni nulos.

Cortes de fuente exactamente en las fechas de `config.py`: Terra hasta 2002-06-30, MODIS hasta 2012-01-19, S-NPP hasta 2018-03-31, NOAA-20 después.

Días-celda armonizados por año (equivalente NOAA-20): 2003 467 k · 2011 309 k · **2013 289 k** · 2017 295 k · **2019 308 k** · 2020 534 k · 2024 342 k.
No hay saltos en los cambios de fuente (2002, 2012, 2018). En los años NOAA-20 el total coincide exacto con `cd_n20` del paso 04.

Para tener en cuenta:
1. **Hay filas con `harmonized_count = 0`** (37% en la era NOAA-20, 16% en la de S-NPP): celdas-día donde solo otro satélite vio fuego.
   Se dejan porque conservan los crudos. Para sumar no molestan; para contar "celdas con fuego" hay que filtrar `> 0`.
2. **El FRP armonizado de la era Terra (2000-11 a 2002-06) sale alto**: 12.2 M MW en 2001 contra ~8 M en 2003. La cadena FRP
   (f_terra 3.34 × k_modis 0.71) es menos confiable que la de días-celda. Carlos: revisar junto con el 0.71.
3. `harmonized_ci_lower/upper` = `harmonized_count` hasta que exista el nivel 2.
4. `region` no va dentro del archivo: DuckDB la agrega al leer por estar en la ruta (`region=...`).

---

## 2026-11-14 · Carlos · modelo nivel 1 con datos reales (`argentina_chile`, paso 05)

Mismo silver y misma tabla que Evaristo (14,595,802 focos · 1,111,085 filas): los resultados coinciden.

### Validación (ajuste 2018–2022, prueba 2023–2026, serie mensual total)
| Conversión | Sin armonizar | Armonizado | r mensual | r región-mes |
|---|---|---|---|---|
| MODIS → NOAA-20, días-celda | sesgo −56.4% | **sesgo +1.9%**, error mediano 8.7% | 0.995 | 0.985 |
| MODIS → NOAA-20, FRP | sesgo +39.5% | **sesgo +4.8%**, error mediano 11.1% | 0.990 | 0.958 |
| S-NPP → NOAA-20, días-celda | sesgo −1.8% | **sesgo −0.8%**, error mediano 2.8% | 0.990 | 0.993 |
| S-NPP → NOAA-20, FRP | sesgo +1.6% | sesgo +4.1%, error mediano 5.8% | 0.989 | 0.973 |

Factores globales: `k_modis` = 2.32 (días-celda) y 0.71 (FRP) · `k_snpp` = 1.01 · `f_terra` = 2.77. Gráficas en `<FIRE_DATA_DIR>/models/figs/`.

### ¿El factor de MODIS sirve para 2002–2011? (respuesta a la nota 1 de Evaristo)
- Usando S-NPP como juez independiente: **S-NPP / MODIS es estable de 2012 a 2024** (2.10–2.39, sin tendencia, ruido ±6%).
  Solo en 2025 Terra se cae (S-NPP / Terra pasa de ~5.5 a 7.2). Como desde 2018 la serie usa NOAA-20 directo, esa caída no entra al producto.
- **Limitación que hay que declarar:** en esta región Terra/Aqua sube de 0.47 (2003) a ~0.62 (2011–2022). Antes de 2012 no hay VIIRS
  para saber si es el fuego (p. ej. quemas más temprano en el día) o un sensor. `cd_modis` es la unión de ambos, así que le afecta poco,
  pero es la parte menos verificable de la serie.
- Ajustar con Aqua sola no ayuda: NOAA-20 / Aqua varía igual que NOAA-20 / MODIS (3.41–3.89). Se queda la unión.

### El FRP no es neutro (respuesta a la nota 2)
Confirmado: 0.71. Se armoniza con su propio factor (ya lo hace el modelo) y valida bien. Se corrigió la fila "Segunda métrica" del plan.

---

## 2026-11-14 · Evaristo (por Carlos) · intervalos de confianza 95% (ya en `main`)

Hecho en la rama `feat/bootstrap-ci` y pasado a `main` con acuerdo del equipo (toca `05_model.py` de Carlos).

**Método:** bootstrap con 200 réplicas en el paso 05. En cada réplica se le da un peso Poisson(1) a cada hexágono r5 **y** a cada año,
y se recalculan los factores con la misma fórmula del nivel 1. `factores.parquet` gana `factor_lo`, `factor_hi`, `factor_global_lo`, `factor_global_hi`
(percentiles 2.5 y 97.5). El factor central no cambia: los resultados del nivel 1 son idénticos. Tarda ~20 s más.

**Calibración (prueba 2023–2026, total mensual):**
| Conversión | Cobertura del IC 95% | Ancho relativo mediano |
|---|---|---|
| MODIS → NOAA-20, días-celda | **95.7%** | 59% |
| MODIS → NOAA-20, FRP | 93.6% | 83% |
| S-NPP → NOAA-20, días-celda | 94.9% | 46% |
| S-NPP → NOAA-20, FRP | 97.4% | 78% |

Remuestreando solo hexágonos la cobertura salía en 83% (intervalo demasiado angosto): el que más varía es el año, por eso se remuestrean los dos.

Factores globales con IC: `k_modis` 2.32 [2.24 – 2.42] · `k_snpp` 1.01 [0.99 – 1.02] · `f_terra` 2.77 [2.69 – 2.91].

**En el paso 06:** `harmonized_ci_lower/upper` = fuente × `factor_lo/hi` (Terra: `f_terra` y `k_modis` encadenados). En la era NOAA-20 son iguales al valor.
Si `factores.parquet` no trae IC, el 06 sigue funcionando y deja los límites iguales al valor.
Ejemplo por año: 2005 = 368 k [291 k – 493 k] · 2011 = 309 k [246 k – 412 k] · 2015 = 218 k [181 k – 271 k] · 2019 = 308 k (medido).

**Cómo leerlo:** es la incertidumbre del factor, no del conteo. Sumar `ci_lower` y `ci_upper` de varias celdas da una banda algo conservadora,
pero así se midió la cobertura de arriba, así que para totales de región es la banda correcta. El tramo Terra solo (2000-11 a 2002-06) es el más ancho (±60%).
