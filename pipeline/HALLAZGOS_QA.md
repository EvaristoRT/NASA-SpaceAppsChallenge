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
