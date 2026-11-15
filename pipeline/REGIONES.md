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

_(escribir aquí)_
