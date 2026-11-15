# Contenedor de la API de IgnisSync. Sirve igual para Google Cloud Run (principal) y para un Hugging Face Space.
# Guía: pipeline/DESPLIEGUE.md
#
# No copia nada de la carpeta local: al construirse baja el código del repo público de GitHub (rama main),
# y al arrancar fetch_data.py baja los datos del GitHub Release "latest". Por eso se puede construir desde
# cualquier sitio, p. ej.:   gcloud run deploy ignissync-api --source deploy
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

# Usuario sin privilegios (Hugging Face exige el 1000; en Cloud Run da igual)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH
WORKDIR /home/user

ARG REPO=EvaristoRT/NASA-SpaceAppsChallenge
ARG BRANCH=main
# Esta línea cambia cada vez que hay un commit nuevo en main: así una reconstrucción baja el código nuevo
# en vez de reutilizar la copia que Docker tiene guardada.
ADD https://api.github.com/repos/${REPO}/git/refs/heads/${BRANCH} /tmp/version.json
RUN git clone --depth 1 --branch ${BRANCH} https://github.com/${REPO}.git repo

WORKDIR /home/user/repo/backend
RUN pip install --no-cache-dir --user -r requirements.txt

# Valores por defecto; se cambian sin tocar este archivo:
#   Cloud Run:     gcloud run services update ignissync-api --update-env-vars DATA_URL=...
#   Hugging Face:  Settings → Variables
# PORT: Cloud Run pone el suyo (8080) al arrancar; Hugging Face usa este 7860.
# /tmp en Cloud Run vive en la memoria del contenedor: los datos descomprimidos cuentan en la RAM.
ENV DATA_DIR=/tmp/ignis-data \
    DATA_URL=https://github.com/EvaristoRT/NASA-SpaceAppsChallenge/releases/latest/download/ignis-backend-argentina_chile.zip \
    PORT=7860

EXPOSE 7860
CMD ["sh", "-c", "python fetch_data.py && exec uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
