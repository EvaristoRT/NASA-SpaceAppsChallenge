# Ampliar el mapa por regiones: cómo trabajamos en paralelo

**Fecha:** 2026-11-15 · **De:** Carlos · **Para:** Evaristo (y su asistente de IA)
**Reparto:** Carlos hace **América** (rama `datos/sudamerica`) · Evaristo hace **Europa** (rama nueva `datos/europa`).
**Regla:** `main` no se toca hasta que los dos revisemos. Lo seguro (Argentina + Chile) no se arriesga.

> **Para el asistente de Evaristo:** sigue la sección 2 en orden. No fusiones nada a `main`, no publiques releases y no
> edites `config.py` (la región `europa` ya está). Si algo no cuadra, anótalo en la sección 4 de este archivo.

---

## 1. Cómo encaja todo

- **El código por región ya está en `datos/sudamerica`** (ver [SUDAMERICA.md](SUDAMERICA.md)): 05, 06 y 07 escriben cada región
  en su carpeta (`models/region=<r>/`, `gold/region=<r>/`, `gold/entrega_<r>/`). Correr Europa no pisa Argentina + Chile.
- **Regiones en `config.py`** (solo en la rama): `america` (−170, −57, −30, 72) y `europa` (−25, 34, 45, 72).
- **El bronze ya es global** (zips 2000–2025 de todos los países) y la máscara de fuentes estáticas (`aux/static_mask.parquet`)
  también: para Europa **solo falta 2026**, que hay que bajar por la API.
- **Cada uno valida su continente.** La **entrega final** sale de una sola máquina (la de Carlos, ver `PROPUESTA_CARLOS_ENTREGA.md`),
  porque el backend carga un solo zip: al final se hace una corrida que junte las regiones (o `global`).
  Lo que Europa le aporta a esa corrida son **los CSV de 2026** (`datos_2026/api/zona_europa/`).

## 2. Pasos para Europa (máquina de Evaristo)

```powershell
git fetch origin
git checkout -b datos/europa origin/datos/sudamerica
```

**a) 2026 de Europa.** Necesita una MAP_KEY propia (gratis, solo email: https://firms.modaps.eosdis.nasa.gov/api/map_key/),
en la variable `FIRMS_MAP_KEY` o en `pipeline/.firms_map_key` (git lo ignora). La clave de Carlos no se comparte.
Usar **su propia carpeta** de salida, para que los bloques no choquen con los de América:

```bash
BBOX="-25,34,45,72" OUT="<FIRE_DATA_DIR>/datos_2026/api/zona_europa" bash pipeline/scripts/00b_descargar_2026.sh
```

El script ya parte los bloques donde termina la calidad estándar (SP) y baja el resto en NRT. Son ~260 peticiones por zona;
el límite de la clave es 5000 cada 10 minutos.

**b) Cadena:**

```powershell
python pipeline/scripts/01_to_parquet.py --years 2026     # junta todas las zonas de datos_2026/api/ en el bronze de 2026
python pipeline/scripts/03_silver.py --region europa
python pipeline/scripts/04_calibration_set.py --region europa
python pipeline/scripts/05_model.py --region europa
python pipeline/scripts/06_apply_gold.py --region europa
python pipeline/scripts/07_export.py --region europa --zip   # para medir tamaños; NO publicar
```

Referencia de tiempos (máquina de Carlos, Sudamérica, 70 M de focos): silver ~7 min, calibración ~1.5 min, 06 + 07 ~10 min.

**c) Qué revisar** (anotarlo en la sección 4):

| Revisión | Dónde | Referencia |
|---|---|---|
| Validación MODIS → NOAA-20 (sesgo, error mediano, r) | `models/region=europa/metrics.json` → `validacion.modis_cd` | AR+CL +1.9% / 8.7% / 0.995 · Sudamérica +7.3% / 5.9% / 0.996 |
| Cobertura de la banda | `validacion.modis_cd.ic95_factor` | ~95% en las dos regiones |
| Deriva del factor por año | `deriva_factor_por_anio.modis` | Estable salvo 2023–2025 |
| Fuentes estáticas | `aux/static_mask.parquet` | Europa tiene muchas industriales y quemas agrícolas: revisar que el silver no deje mecheros |
| Tamaño y memoria | `gold/paquetes/ignis-backend-europa.zip` | AR+CL 24 MB · Sudamérica 104 MB |

**d) Subir el trabajo:** solo a la rama `datos/europa` (`git push -u origin datos/europa`). Nada a `main`.

## 3. Lo que hace Carlos en paralelo (América)

2026 de Norte y Centroamérica (`zona_norte` −170, 14, −50, 72 y `zona_centro` −95, 5, −85, 14), silver, calibración y
validación de `america`. Resultados en `SUDAMERICA.md` / este archivo cuando terminen.

## 4. Resultados y notas de Europa (Evaristo)

**Fecha:** 2026-11-15 · rama `datos/europa` (creada desde `datos/sudamerica`, sin cambios de código) · nada en `main`, nada publicado.

### Corrida
| Paso | Resultado | Tiempo |
|---|---|---|
| 00b 2026, `BBOX=-25,34,45,72` → `datos_2026/api/zona_europa/` | 254 bloques, 103 MB, sin errores. NOAA-20 y NOAA-21 con los 319 días (01-ene → 15-nov) | ~45 min |
| 01 `--years 2026` | 5.77 M filas en el bronze de 2026 (Sudamérica + Europa) | 13 s |
| 03 `--region europa` | 9.66 M focos limpios (2000–2025) + 0.84 M (2026). Máscara de estáticas: la global que ya existía | 30 s |
| 04 | 1,405,928 filas · 37,213 hexágonos r5 | 5 s |
| 05 | factores e IC en `models/region=europa/` | ~20 s |
| 06 | 4,353,915 filas · 190,018 hexágonos r6 · 2000-11-01 → 2026-11-15 | 12 s |
| 07 `--zip` | `ignis-backend-europa.zip` **29.9 MB** · `ignis-hotspots-europa.zip` 142.9 MB (en `gold/entrega_europa/`, sin publicar) | ~1 min |

Argentina + Chile no se tocó: `models/factores.parquet`, `gold/entrega/` y `gold/region=argentina_chile/` conservan sus fechas anteriores.

### Revisiones de la sección 2c
| Revisión | Europa | Referencia |
|---|---|---|
| **Validación MODIS → NOAA-20** (días-celda, 2023–2026) | sesgo −62.6% → **−2.0%** · error mediano **11.5%** · r **0.993** | AR+CL +1.9% / 8.7% / 0.995 · Sudamérica +7.3% / 5.9% / 0.996 |
| Validación MODIS → NOAA-20 (FRP) | sesgo +37.6% → **+0.6%** · error mediano 17.6% · r 0.994 | — |
| Validación S-NPP → NOAA-20 (días-celda) | sesgo −6.6% → −2.7% · error mediano 3.9% · r 0.978 | — |
| **Cobertura de la banda** (`ic95_factor`) | **89.4%** días-celda · 83.0% FRP · 97.4% S-NPP | ~95% en AR+CL y Sudamérica |
| **Deriva del factor** NOAA-20 / MODIS por año | 2.52–2.83, sin tendencia (2018 2.59 · 2022 2.83 · 2024 2.80 · 2026 2.69) | estable salvo 2023–2025 |
| Deriva S-NPP | 0.98 (2018) → 1.13 (2022) → **1.24 (2026)**: S-NPP se degrada, como en las otras regiones. No afecta: desde 2018-04 se usa NOAA-20 | — |
| **Fuentes estáticas** | ver abajo: **737 celdas r8 persistentes, 1.68% de los días-celda** | AR+CL: 100 celdas, 0.16% |
| **Tamaño y memoria** | zip 29.9 MB · `monthly` 2.65 M filas · backend: 438 MB cargado, **570 MB de pico** consultando toda la región | AR+CL 24 MB / ~340 MB · Sudamérica 104 MB / ~1.3 GB |

Factores globales: `k_modis` = 2.61 [2.54–2.83] · `k_snpp` = 1.02 [0.99–1.08] · `f_terra` = 2.02 [1.98–2.05].
Terra/Aqua ≈ 0.83 (AR+CL ≈ 0.62): en latitudes altas las pasadas de los dos se solapan más. Cae a 0.66 en 2025, igual que en todos lados.

Serie armonizada por año (miles de días-celda, banda 95%): 2003 274 [207–405] · 2007 421 [321–618] · 2011 307 [231–446] ·
2013 207 [163–271] · 2017 286 [227–384] · 2019 279 · 2020 246 · 2024 201 · 2025 176 · 2026 185 (hasta el 15-nov).
El backend con un polígono de toda la región da 2019 = 279,129: coincide.

### Hallazgos para discutir
1. **La bajada de 2011 (307 k) a 2013 (207 k) es real, no un salto entre satélites.** Llevando MODIS y S-NPP a NOAA-20 en los
   años en que coinciden dan casi lo mismo: 2013 205 k vs 207 k · 2014 351 vs 364 · 2015 340 vs 343 · 2016 236 vs 237. El empalme está bien.
2. **Fuentes industriales que la limpieza deja pasar (afecta al 03, de Carlos).** 737 celdas r8 tienen fuego en ≥ 60 meses distintos:
   1.68% de los días-celda de Europa, 10× más que en AR+CL. Las más persistentes son plantas industriales, no incendios:
   Avilés, España (43.54, −5.83; 173 meses), Gante, Bélgica (51.17, 3.80; 147), Turín y Brescia, Italia (45.11, 7.72 y 45.37, 10.34),
   Alchevsk, Ucrania (48.47, 38.77; 137). La máscara actual pide `type` 1–3 en ≥ 3 años, y FIRMS no marca estas como `type` 2.
   **Propuesta:** en el 03, agregar a la máscara las celdas r8 con fuego en ≥ N meses distintos repartidos en ≥ 10 años (p. ej. N = 60).
   El efecto en totales es chico (~2%), pero en el mapa aparecen como "fuego todo el año" y ensucian las anomalías de invierno.
3. **La banda cubre 89%, no 95%.** Es más angosta de lo que debería para Europa. Con 5 años de ajuste el remuestreo por año es grueso.
   Para decirlo bien ante los jueces: "contiene el valor real en el 89% de los meses en Europa (95.7% en AR+CL)". Mejora posible: un
   intervalo de predicción calibrado por región (la que propone Carlos en `HALLAZGOS_QA.md`).
4. **El recuadro de `europa` no es solo Europa.** El rectángulo (−25, 34, 45, 72) trae focos de 62 países, incluidos Irak (287 k), Argelia (226 k),
   Siria (200 k), Túnez, Marruecos, Líbano e Israel. Deja fuera Rusia al este de 45° E, Canarias, Svalbard y parte de las Azores.
   Para el modelo no importa (factores por h3_r3), pero en el mapa "Europa" incluye el norte de África y Oriente Medio.
   ¿Lo dejamos, recortamos por países (la columna `country`) o ajustamos el recuadro? `config.py` es tuyo según la regla.
5. **S-NPP en 2026 en Europa llega solo al 22-oct** (en Sudamérica, al 2-nov) y le faltan ~19 días. No afecta al producto (NOAA-20 desde 2018-04).
6. **Memoria para la corrida conjunta:** Europa sola son ~570 MB de pico. Sumando América (~1.3 GB por Sudamérica + Norte), la entrega
   conjunta va a necesitar Cloud Run con `--memory 4Gi` o más.
