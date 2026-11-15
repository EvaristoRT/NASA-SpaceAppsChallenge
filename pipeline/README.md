# Pipeline de datos — armonización MODIS / VIIRS

Convierte los focos de calor de NASA FIRMS (2000 → hoy) en una serie de tiempo única,
expresada en **equivalente NOAA-20**, lista para la app web.

El plan, las decisiones y quién hace qué están en [PLAN_EQUIPO.md](PLAN_EQUIPO.md).
Este archivo es solo **cómo ponerlo a andar** y **cómo trabajar sin pisarnos**.

---

## 1. Preparar tu máquina (una vez)

```powershell
cd pipeline
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Crea el archivo `pipeline\.env` con la ruta donde vas a guardar los datos (git lo ignora):

```
FIRE_DATA_DIR=C:\ruta\a\tus\datos
```

Los datos **no viven en el repo ni en Drive**: cada quien los tiene en su disco, en esa carpeta.

## 2. Conseguir los datos (una vez)

| Qué | Tamaño | Cómo |
|---|---|---|
| Archivo histórico 2000–2025 (48 zips) | ~9.3 GB | `python pipeline/scripts/00_get_raw.py` — los baja de NASA, sin cuenta. Si alguien te pasa la carpeta de zips, ponla dentro de `FIRE_DATA_DIR` y el script solo baja lo que falte |
| Año 2026 (bloques de la API) | ~350 MB | copia la carpeta `datos_2026\` de Carlos dentro de tu `FIRE_DATA_DIR` |

No hace falta descomprimir nada: el paso 01 lee los zips directamente.
Para comprobar que tienes todo: `python pipeline/scripts/00_get_raw.py --check`

## 3. Correr el pipeline

Siempre desde la raíz del repo, con el entorno activado:

| Paso | Script | Qué hace | Estado |
|---|---|---|---|
| 00 | `00_get_raw.py` | baja los zips del archivo histórico | ✅ funciona |
| 00b | `00b_descargar_2026.sh` | baja / refresca 2026 por la API (necesita MAP_KEY) | ✅ funciona |
| 01 | `01_to_parquet.py` | zips + bloques 2026 → **bronze** (todos los focos, sin filtrar) | ✅ funciona |
| 02 | `02_qa.py` | revisión de calidad de bronze | ✅ funciona |
| 03 | `03_silver.py` | limpieza + celdas H3 + región → **silver** | ⏳ Paco |
| 04 | `04_calibration_set.py` | días-celda por hexágono × mes × satélite | ⏳ Evaristo |
| 05 | `05_model.py` | factores hacia NOAA-20 + validación | ✅ nivel 1 (probado con `--fake`; espera la tabla del 04) |
| 06 | `06_apply_gold.py` | serie armonizada → **gold** | ⏳ Evaristo |
| 07 | `07_export.py` | anomalías + focos para el CSV → entrega al equipo web | ⏳ Paco |

```powershell
python pipeline/scripts/01_to_parquet.py      # ~40 min la primera vez (todo el archivo, global)
python pipeline/scripts/02_qa.py
```

Cada script explica sus entradas, salidas y reglas al inicio del archivo (`--help` lo muestra).
Las plantillas pendientes ya traen ese contrato escrito: **se programa dentro de ese archivo, no en uno nuevo**.

Capas, dentro de `FIRE_DATA_DIR`:

```
bronze/        un registro por foco, todos los sensores, sin filtrar        (paso 01)
silver/        focos limpios con h3_r8 / r6 / r5 / r3, por región           (paso 03)
aux/           máscara de fuentes estáticas                                 (paso 03)
calibration/   días-celda, focos y FRP por hexágono r5 × mes × satélite     (paso 04)
models/        factores, métricas y gráficas de validación                  (paso 05)
gold/          serie armonizada y entrega al equipo web                     (pasos 06 y 07)
qa/            tablas de la revisión de calidad                             (paso 02)
```

## 4. Reglas para no pisarnos

Lo que pasó el 14 de noviembre: se subieron archivos por la página de GitHub ("Add files via upload")
sin traer antes los cambios de los demás. Eso borró un script de otro compañero y metió al repo un
entorno virtual, un `.env` y datos. Para que no se repita:

1. **Nada de subir archivos por la web de GitHub.** Siempre con git, desde tu clone.
2. **Antes de empezar y antes de cada push:** `git pull --rebase`.
3. **Cada quien edita solo sus scripts** (los que llevan su nombre en la tabla). Si necesitas un cambio
   en el script de otro, se lo pides o lo avisas en el grupo antes de tocarlo.
4. **`config.py` y `PLAN_EQUIPO.md` no se cambian sin avisar a los tres.** Ahí están las decisiones comunes.
5. **Nunca se sube:** `.venv/`, `.env`, la MAP_KEY, datos (`.csv`, `.parquet`, `.zip`). El `.gitignore`
   ya los bloquea; si `git status` te muestra uno de esos, algo anda mal: no hagas `git add -f`.
6. **Antes de cada commit mira `git status`.** Si aparecen cientos de archivos, detente y pregunta.
7. Los datos se comparten entre nosotros por USB o por red local, nunca por el repo ni por Drive.
8. Mensajes de commit en inglés con el formato de `.gitmessage` (`feat:`, `fix:`, `docs:`, `chore:`).

Flujo de cada día:

```powershell
git pull --rebase
# ... trabajas en tu script ...
git status                      # revisa qué vas a subir
git add pipeline/scripts/03_silver.py
git commit
git pull --rebase
git push
```
