# Despliegue: que cualquiera pueda usar la app

**Versión:** 2026-11-15 · **Servidor elegido: Google Cloud Run**, con la oferta de Google Cloud para NASA Space Apps
(300 USD de crédito por 90 días; sin cobro automático al terminar).
Los pasos marcados con 👤 requieren una cuenta y los hace una persona.

```
Usuario ──► FRONT en Vercel ──► API en Google Cloud Run ──► al arrancar baja los datos del GitHub Release
            (ya desplegado)     contenedor: deploy/Dockerfile    ignis-backend-<región>.zip
```

| Pieza | Dónde | Estado |
|---|---|---|
| Datos | GitHub Release `latest` del repo (público) | ✅ `datos-2026-11-14` publicado y probado |
| API (`backend/`) | Google Cloud Run | ⏳ el contenedor está en `deploy/Dockerfile` |
| Front | Vercel | ✅ ya está. Falta la variable `VITE_API_URL` |

**Por qué Cloud Run:** medimos el mundo contra Argentina + Chile (bronze 2005 y 2020): ~20× más hexágonos con fuego.
El backend guarda los datos en memoria: ~230 MB hoy (pico ~340 MB) y ~2.5–3 GB para el mundo (picos de 4–5 GB).
Cloud Run da hasta 32 GB por contenedor, se apaga solo cuando nadie lo usa y solo cobra mientras responde.
Render gratis (512 MB) no alcanza para el mundo, y desde julio de 2026 los Spaces Docker de Hugging Face requieren el plan PRO.

---

## Paso 1 · Datos en un GitHub Release (Carlos) ✅

```powershell
.venv\Scripts\python.exe pipeline/scripts/07_export.py --zip
```
Deja `ignis-backend-<región>.zip` (~24 MB para AR+CL) e `ignis-hotspots-<región>.zip` en `<FIRE_DATA_DIR>/gold/paquetes/`.
En GitHub: **Releases → Draft a new release** → tag `datos-AAAA-MM-DD` → adjuntar los zip → **sin** marcar "pre-release" → Publish.
Los nombres no llevan fecha a propósito: la API siempre baja de `releases/latest/download/<nombre>`.

## Paso 2 · Cuenta y proyecto de Google Cloud (Evaristo) 👤

1. **Reclamar la oferta:** https://cloud.google.com/free → **Get started for free** → entrar con una cuenta de Google →
   país y términos → verificación con tarjeta. Google la usa para comprobar que no eres un robot y **no cobra** sin una actualización manual a cuenta de pago.
   Al terminar, la consola muestra el crédito de 300 USD.
2. **Crear el proyecto:** en https://console.cloud.google.com, arriba a la izquierda el selector de proyecto → **New project** →
   nombre `ignissync` → Create. Anotar el **Project ID** (p. ej. `ignissync-123456`).
3. **Alerta de presupuesto** (recomendado): menú ☰ → **Billing → Budgets & alerts → Create budget** → monto **5 USD** →
   avisos al 50%, 90% y 100% → Finish. Solo avisa por correo, no apaga nada.

## Paso 3 · Desplegar la API desde Cloud Shell (Evaristo) 👤

Cloud Shell es una terminal en el navegador que ya trae todo instalado: botón **>_** arriba a la derecha de la consola.
Pegar, uno por uno (cambiar `TU_PROJECT_ID`):

```bash
gcloud config set project TU_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
git clone --depth 1 https://github.com/EvaristoRT/NASA-SpaceAppsChallenge.git && cd NASA-SpaceAppsChallenge
gcloud run deploy ignissync-api --source deploy --region us-central1 --allow-unauthenticated \
  --memory 1Gi --cpu 1 --min-instances 0 --max-instances 2 --timeout 300
```

- Si pregunta por crear un repositorio de Artifact Registry: **Y**.
- Tarda ~3–5 min. Al final imprime **`Service URL: https://ignissync-api-xxxxx-uc.a.run.app`**.
- `--max-instances 2` limita cuánto puede crecer, y con eso el gasto. `--min-instances 0` lo apaga cuando nadie lo usa.
- `us-central1` es una de las regiones con capa gratuita.

Probar en el navegador:
- `<Service URL>/health` → `{"status":"ok"}`
- `<Service URL>/api/meta` → `"synthetic": false`, `"last_month": "2026-11"`
- `<Service URL>/docs` → documentación interactiva de la API

## Paso 4 · Conectar el front en Vercel 👤

**Settings → Environment Variables** → `VITE_API_URL` = `<Service URL>` (sin `/` al final), en Production y Preview.
Luego **Deployments → Redeploy**: las variables `VITE_` se leen al construir.
CORS ya está resuelto: `backend/main.py` acepta cualquier `https://*.vercel.app`. Para un dominio propio, se agrega con
`gcloud run services update ignissync-api --region us-central1 --update-env-vars ALLOWED_ORIGINS=https://tu-dominio`.

## Paso 5 · Verificar

1. En la app de Vercel, elegir Argentina: el calendario muestra datos reales, sin el aviso de "datos de demostración".
2. Elegir México: "Sin datos para esta zona".
3. Con toda la región, 2019 ≈ 307,757 días-celda (tabla de `HALLAZGOS_QA.md`).

Probado en local el 2026-11-15, todo excepto la construcción del contenedor (no hay Docker en la máquina):
clonar `main` desde GitHub → `fetch_data.py` baja el release en 4 s → `/health` ok, `/api/meta` con `synthetic: false`,
`/api/search` con 2019 = 307,448 con el bbox, CORS devuelve el origen de Vercel, México da 0 celdas y `/api/export.csv` responde.

---

## Operación (todo desde Cloud Shell, dentro de la carpeta del repo)

| Quiero… | Hago… |
|---|---|
| **Datos nuevos** (Carlos publicó un release) | `gcloud run services update ignissync-api --region us-central1 --update-env-vars DATA_VERSION=AAAA-MM-DD` (cualquier cambio crea una revisión nueva, que arranca vacía y baja el `latest`) |
| **Código nuevo del backend** (commit en `main`) | `git pull` y repetir el `gcloud run deploy …` del paso 3: el contenedor vuelve a clonar `main` |
| **Otra región o el mundo** | Publicar `ignis-backend-global.zip` → `gcloud run services update ignissync-api --region us-central1 --memory 6Gi --cpu 2 --update-env-vars DATA_URL=https://github.com/EvaristoRT/NASA-SpaceAppsChallenge/releases/latest/download/ignis-backend-global.zip` |
| Volver a la versión anterior | Consola → Cloud Run → `ignissync-api` → **Revisions** → mandar el 100% del tráfico a la revisión anterior |
| Ver qué pasa | Consola → Cloud Run → `ignissync-api` → **Logs** (ahí sale la línea `fetch_data: …`) |

**Arranque en frío:** con `--min-instances 0`, si nadie lo usa se apaga. La primera visita lo despierta en ~10–20 s
(baja 24 MB y carga los datos). Antes de presentar, abrir `/health`.

**Memoria:** en Cloud Run, `/tmp` vive en la RAM del contenedor, así que los datos descomprimidos también cuentan.
AR+CL: ~400 MB de pico → `--memory 1Gi`. Mundo: ~5–6 GB de pico → `--memory 6Gi`.

**Costo:** la capa gratuita de Cloud Run incluye cada mes 2 M de peticiones, 180,000 vCPU-segundos y 360,000 GiB-segundos.
Una demo queda muy por debajo, y además está el crédito. Después de los 90 días, sin pasar a cuenta de pago, el servicio se detiene.

**Para el mundo, además:** bajar 2026 global (`BBOX=world`, Carlos), poner la región en las rutas de `models/` y `gold/entrega/`
(hoy se sobrescriben entre regiones) y partir `ignis-hotspots` por año (GitHub acepta hasta 2 GB por archivo).

**Seguridad:** no hay secretos en este despliegue. Los datos son públicos (NASA FIRMS) y el token de Mapbox vive solo en Vercel.

---

## Alternativas (mismo `deploy/Dockerfile`)

- **Hugging Face Space** (requiere plan PRO, ~9 USD/mes desde julio de 2026): crear un Space tipo Docker, pegar `deploy/Dockerfile`
  y `deploy/huggingface/README.md` (este trae la configuración del Space en el bloque `---`).
- **Render gratis** (512 MB, solo regiones chicas): `render.yaml` en la raíz → **New → Blueprint**.
