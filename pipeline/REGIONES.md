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

✅ **Terminado (2026-11-15).** 2026 de Norte y Centroamérica bajado en dos zonas que no se solapan con Sudamérica
(`zona_norte` −170, 14, −50, 72 · `zona_centro` −95, 5, −85, 14); con eso el bronze de 2026 tiene 8.4 M de focos.

| | Sudamérica | **América** |
|---|---|---|
| Focos limpios (silver) | 69.7 M | **~100 M** |
| Tabla de calibración | 4.6 M filas · 63,661 hex r5 | 6.9 M filas · 125,636 hex r5 |
| Factor MODIS → NOAA-20 (días-celda) | 2.65 | **2.64** [2.57–2.70] |
| Validación 2023–2026: sesgo / error mediano / r | +7.3% / 5.9% / 0.996 | **+5.4% / 6.3% / 0.995** |
| Meses dentro de la banda | 95.7% | 97.9% |
| `ignis-backend-<r>.zip` | 104 MB | **152 MB** |
| `ignis-hotspots-<r>.zip` | 892 MB | **1,346 MB** (cabe en el límite de 2 GB de GitHub) |
| Memoria del backend en reposo / pico con toda la región (máquina de Carlos) | 585 MB / 1.35 GB | **779 MB / 1.85 GB** |

**Validación por franja de latitud** (mismo modelo de `america`, prueba 2023–2026):

| Franja | Factor ajustado | Sesgo sin → con armonizar | Error mediano | r |
|---|---|---|---|---|
| Boreal (lat > 50: Canadá, Alaska) | **2.27** | −58.6% → +6.9% | 12.6% | 0.992 |
| EE. UU. y México (14–50) | 2.66 | −63.3% → −1.1% | 7.3% | 0.993 |
| Sudamérica (< 14) | 2.66 | −60.8% → +7.3% | 6.0% | 0.996 |

El factor boreal es distinto (fuegos de copa grandes y episódicos), pero los factores por región H3 res 3 lo capturan.
El error mes a mes es mayor en el boreal porque sus temporadas son cortas e irregulares.

**Para Cloud Run:** el pico local fue 1.85 GB y en Cloud Run `/tmp` vive en la RAM (+~150 MB de datos). Sugerencia: **`--memory 4Gi`**
(2Gi queda justo). Zips armados en la máquina de Carlos, **no publicados**.

Pendiente: Groenlandia y el Atlántico norte al este de −50 no tienen datos de 2026 (casi no hay fuegos ahí).

## 4. Resultados y notas de Europa (Evaristo)

_(escribir aquí)_
