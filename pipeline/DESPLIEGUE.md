# Despliegue: que cualquiera pueda usar la app

**Versión:** 2026-11-15 · **Servidor elegido: Hugging Face Spaces** (gratis, 16 GB de RAM: alcanza para el mundo).
Los pasos marcados con 👤 requieren una cuenta y los hace una persona.

```
Usuario ──► FRONT en Vercel ──► API en un Hugging Face Space (Docker) ──► al arrancar baja los datos del GitHub Release
            (ya desplegado)     deploy/huggingface/Dockerfile            ignis-backend-<región>.zip
```

| Pieza | Dónde | Estado |
|---|---|---|
| Datos | GitHub Release `latest` del repo (público) | ✅ `datos-2026-11-14` publicado y probado |
| API (`backend/`) | Hugging Face Space, tipo Docker, plan gratis | ⏳ los archivos están en `deploy/huggingface/` |
| Front | Vercel | ✅ ya está. Falta la variable `VITE_API_URL` |

**Por qué Hugging Face y no Render:** medimos el mundo contra Argentina + Chile (bronze 2005 y 2020): ~20× más hexágonos con fuego.
El backend actual guarda los datos en memoria: ~230 MB hoy, ~2.5–3 GB para el mundo (con picos de 4–5 GB). Render gratis da 512 MB;
el Space gratis, 16 GB. `render.yaml` se queda como alternativa para regiones chicas.

---

## Paso 1 · Datos en un GitHub Release (equipo de datos: Carlos) ✅

```powershell
.venv\Scripts\python.exe pipeline/scripts/07_export.py --zip
```
Deja `ignis-backend-<región>.zip` (~24 MB para AR+CL) e `ignis-hotspots-<región>.zip` en `<FIRE_DATA_DIR>/gold/paquetes/`.
En GitHub: **Releases → Draft a new release** → tag `datos-AAAA-MM-DD` → adjuntar los zip → **sin** marcar "pre-release" → Publish.
Los nombres no llevan fecha a propósito: la API siempre baja de `releases/latest/download/<nombre>`.

## Paso 2 · Crear el Space en Hugging Face (Evaristo) 👤

1. Crear una cuenta en https://huggingface.co (gratis).
2. **New → Space**:
   - Space name: `ignissync-api` · License: MIT (o la del repo) · **SDK: Docker → Blank** · Hardware: **CPU basic (free)** · **Public**.
3. En el Space: **Files → Add file → Create a new file** dos veces, copiando tal cual:
   - `Dockerfile` ← contenido de [deploy/huggingface/Dockerfile](../deploy/huggingface/Dockerfile)
   - `README.md` ← contenido de [deploy/huggingface/README.md](../deploy/huggingface/README.md). Reemplaza el README que crea Hugging Face; el bloque `---` de arriba es la configuración del Space.
4. Al guardar, el Space se construye solo (pestaña **Logs**, ~3–5 min). Señales de que salió bien:
   - `fetch_data: 5 files, 24.3 MB in /tmp/ignis-data`
   - `Uvicorn running on http://0.0.0.0:7860`
   - Arriba aparece **Running** en verde.
5. La dirección pública de la API es `https://<usuario>-ignissync-api.hf.space`. Probar:
   - `/health` → `{"status":"ok"}`
   - `/api/meta` → `"synthetic": false`, `"last_month": "2026-11"`
   - `/docs` → documentación interactiva de la API

## Paso 3 · Conectar el front en Vercel 👤

**Settings → Environment Variables** → `VITE_API_URL` = `https://<usuario>-ignissync-api.hf.space` (sin `/` al final), en Production y Preview.
Luego **Deployments → Redeploy**: las variables `VITE_` se leen al construir.
CORS ya está resuelto: `backend/main.py` acepta cualquier `https://*.vercel.app`.

## Paso 4 · Verificar

1. En la app de Vercel, elegir Argentina: el calendario muestra datos reales, sin el aviso de "datos de demostración".
2. Elegir México: "Sin datos para esta zona".
3. Con toda la región, 2019 ≈ 307,757 días-celda (tabla de `HALLAZGOS_QA.md`).

Probado en local el 2026-11-15, todo excepto la construcción del contenedor (no hay Docker en la máquina):
clonar `main` desde GitHub → `fetch_data.py` baja el release en 4 s → `/health` ok, `/api/meta` con `synthetic: false`,
`/api/search` con 2019 = 307,448 con el bbox, CORS devuelve el origen de Vercel, México da 0 celdas y `/api/export.csv` responde.

---

## Operación

| Quiero… | Hago… |
|---|---|
| **Datos nuevos** (refresco NRT, arreglos) | Carlos publica un release nuevo con los mismos nombres → en el Space: **Settings → Restart this Space** (arranca con `/tmp` vacío y baja el `latest`) |
| **Código nuevo del backend** (commit en `main`) | En el Space: **Settings → Factory rebuild**. El Dockerfile vuelve a clonar `main` |
| **Otra región o el mundo** | Publicar `ignis-backend-global.zip` → en el Space: **Settings → Variables and secrets → New variable** `DATA_URL` = `https://github.com/EvaristoRT/NASA-SpaceAppsChallenge/releases/latest/download/ignis-backend-global.zip` → Restart. No se toca el Dockerfile |
| Volver a datos anteriores | En GitHub, marcar el release anterior como *latest* → Restart del Space |

**Se duerme:** el Space gratis se suspende tras ~48 h sin visitas. La primera visita lo despierta en ~1–2 min.
Antes de una presentación, abrir `/health` unos minutos antes.

**Para el mundo, además:** bajar 2026 global (`BBOX=world`, Carlos), poner la región en las rutas de `models/` y `gold/entrega/`
(hoy se sobrescriben entre regiones) y partir `ignis-hotspots` por año (GitHub acepta hasta 2 GB por archivo).

**Seguridad:** no hay secretos en este despliegue. Los datos son públicos (NASA FIRMS) y el token de Mapbox vive solo en Vercel.

---

## Alternativa: Render (solo regiones chicas)

`render.yaml` en la raíz define el mismo servicio en Render gratis (512 MB): alcanza para Argentina + Chile (~230 MB, pico ~340 MB),
no para el mundo. **New → Blueprint** → elegir el repo → Apply. Mismo `VITE_API_URL` en Vercel, con la URL de Render.
