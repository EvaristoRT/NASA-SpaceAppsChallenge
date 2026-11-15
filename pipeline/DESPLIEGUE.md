# Despliegue: que cualquiera pueda usar la app

**Versión:** 2026-11-15 · **Estado:** listo para desplegar. Faltan los pasos que requieren cuentas (marcados con 👤).

```
Usuario ──► FRONT en Vercel ──► API en Render (FastAPI) ──► al arrancar baja los datos del GitHub Release
            (ya desplegado)     render.yaml + fetch_data.py    ignis-backend-argentina_chile.zip (24 MB)
```

| Pieza | Dónde | Estado |
|---|---|---|
| Front (mapa, panel de análisis) | Vercel | ✅ ya está. Falta la variable `VITE_API_URL` |
| API (`backend/`) | Render, plan gratis | ⏳ el repo ya trae `render.yaml` y `backend/fetch_data.py` |
| Datos | GitHub Release del repo (público) | ⏳ los zip ya están armados; falta publicarlos |

---

## Paso 1 · Publicar los datos (equipo de datos) 👤

En la máquina que genera la entrega (hoy, la de Evaristo):

```powershell
.venv\Scripts\python.exe pipeline/scripts/07_export.py --zip
```

Deja en `<FIRE_DATA_DIR>/gold/paquetes/`:

| Archivo | Tamaño | Para qué |
|---|---|---|
| `ignis-backend-argentina_chile.zip` | ~24 MB | Lo que baja la API: `cells`, `monthly`, `months`, `info.json`, LEEME |
| `ignis-hotspots-argentina_chile.zip` | ~184 MB | Focos individuales para el CSV (tarea 7 del backend; todavía no lo baja) |

En GitHub: **Releases → Draft a new release**
1. Tag: `datos-AAAA-MM-DD`, con la fecha de corte (hoy `datos-2026-11-14`).
2. Título: "Datos armonizados · corte 2026-11-14".
3. Arrastrar los dos zip.
4. **No** marcar "pre-release": la API baja de `releases/latest`, y GitHub no cuenta las pre-releases como latest.
5. Publish.

Los nombres de los zip no llevan fecha **a propósito**: así la URL de descarga nunca cambia
(`https://github.com/EvaristoRT/NASA-SpaceAppsChallenge/releases/latest/download/ignis-backend-argentina_chile.zip`).

## Paso 2 · Levantar la API en Render 👤

1. Entrar a https://render.com con la cuenta de GitHub del dueño del repo.
2. **New → Blueprint** → elegir este repo. Render lee `render.yaml` y propone el servicio `ignissync-api`.
3. `ALLOWED_ORIGINS`: dejarlo vacío. Las URL `*.vercel.app` ya se aceptan por el regex de `backend/main.py`; solo hace falta para un dominio propio.
4. **Apply**. La primera construcción tarda unos minutos.
5. Probar en el navegador:
   - `https://ignissync-api.onrender.com/health` → `{"status":"ok"}`
   - `https://ignissync-api.onrender.com/api/meta` → `"synthetic": false`, `"last_month": "2026-11"`

La URL exacta la muestra Render; puede llevar un sufijo si el nombre ya está tomado.

## Paso 3 · Conectar el front (equipo web) 👤

En Vercel: **Settings → Environment Variables**
- `VITE_API_URL` = la URL de Render del paso 2, **sin** `/` al final. En Production y Preview.

Luego **Deployments → Redeploy**: las variables `VITE_` se leen al construir, no en caliente.

## Paso 4 · Verificar

1. Abrir la app de Vercel y elegir Argentina: el calendario debe mostrar datos reales, no "datos de demostración".
2. Elegir un país fuera de la cobertura (p. ej. México): debe salir "Sin datos para esta zona".
3. Comparar con la tabla de `HALLAZGOS_QA.md`: con toda la región, 2019 ≈ 307,757 días-celda.

---

## Cosas que hay que saber

**El plan gratis de Render se duerme** tras 15 minutos sin uso. La primera consulta después tarda ~1 minuto: arranca, baja los 24 MB
y carga los datos. **Antes de presentar, abrir `/health` y hacer una consulta** para despertarlo.

**Memoria** (medida con la entrega real): ~230 MB con los datos cargados y ~340 MB de pico al consultar toda la región.
Cabe en los 512 MB del plan gratis. Para bajarla, `monthly.parquet` ya no trae la columna `src` (no se usaba) y guarda la banda y el FRP en 32 bits.
Para Sudamérica o el mundo no va a alcanzar: ahí conviene Hugging Face Spaces (Docker, 16 GB) o un plan pago.

**Actualizar los datos** (p. ej. al bajar los días faltantes de agosto o refrescar el NRT):
1. Correr la cadena 01 → 07 con `--zip` en la máquina que genera la entrega.
2. Publicar un **release nuevo** con los mismos nombres de archivo (tag con la nueva fecha de corte).
3. En Render: **Manual Deploy → Deploy latest commit**, o reiniciar el servicio. Arranca con `/tmp` vacío y baja el zip nuevo.
   No hay que tocar el front.

**Local sigue igual:** sin `DATA_URL`, `fetch_data.py` no hace nada y el backend usa lo que haya en `DATA_DIR`.

**Seguridad:** no hay secretos en este despliegue. Los datos son públicos (NASA FIRMS) y el token de Mapbox vive solo en Vercel.
