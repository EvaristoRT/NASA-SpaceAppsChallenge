# API de IgnisSync en un Hugging Face Space (tipo Docker, plan gratis: 2 CPU, 16 GB de RAM).
# Este archivo se copia tal cual al Space. Guía: pipeline/DESPLIEGUE.md
#
# El Space no guarda el código: al construirse lo baja del repo público de GitHub (rama main)
# y, al arrancar, fetch_data.py baja los datos del GitHub Release "latest".
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face corre el contenedor con el usuario 1000
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH
WORKDIR /home/user

ARG REPO=EvaristoRT/NASA-SpaceAppsChallenge
ARG BRANCH=main
# Esta línea cambia cada vez que hay un commit nuevo en main: así una reconstrucción baja el código nuevo
# en vez de reutilizar la copia vieja que Docker tiene guardada.
ADD https://api.github.com/repos/${REPO}/git/refs/heads/${BRANCH} /tmp/version.json
RUN git clone --depth 1 --branch ${BRANCH} https://github.com/${REPO}.git repo

WORKDIR /home/user/repo/backend
RUN pip install --no-cache-dir --user -r requirements.txt

# Valores por defecto. Se pueden cambiar sin tocar este archivo en Settings → Variables del Space
# (p. ej. DATA_URL con el zip del mundo).
ENV DATA_DIR=/tmp/ignis-data \
    DATA_URL=https://github.com/EvaristoRT/NASA-SpaceAppsChallenge/releases/latest/download/ignis-backend-argentina_chile.zip \
    PORT=7860

EXPOSE 7860
CMD ["sh", "-c", "python fetch_data.py && exec uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
