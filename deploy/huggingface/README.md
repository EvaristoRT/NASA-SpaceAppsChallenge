---
title: IgnisSync API
emoji: 🔥
colorFrom: red
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
short_description: API de focos de calor MODIS/VIIRS armonizados (NASA Space Apps 2026)
---

# IgnisSync API

API del proyecto de armonización de focos de calor MODIS / VIIRS (NASA Space Apps Challenge 2026).
Recibe un polígono y devuelve la serie mensual armonizada (equivalente NOAA-20), la climatología y las anomalías.

- Código: https://github.com/EvaristoRT/NASA-SpaceAppsChallenge (carpeta `backend/`). El `Dockerfile` de este Space es `deploy/Dockerfile` del repo
- Datos: GitHub Release `latest` del mismo repo, generado por el pipeline (`pipeline/`)
- Documentación de la API: `/docs`

Fuente de los datos: NASA FIRMS (MODIS C6.1, VIIRS S-NPP / NOAA-20 / NOAA-21).
