# Instrucciones para asistentes de IA (Claude, Copilot, Cursor, ChatGPT…)

Este repo es del NASA Space Apps Challenge 2026: armonización de focos de calor MODIS / VIIRS.
Hay dos equipos: **datos** (`pipeline/`: Paco, Evaristo, Carlos) y **web** (`frontend/`, `backend/`, `design/`).

## Antes de proponer o tocar algo en `pipeline/`

1. Lee **`pipeline/PLAN_EQUIPO.md`** (decisiones, quién hace qué, contratos de columnas) y **`pipeline/README.md`** (instalación y reglas de git).
2. Si te preguntan "¿qué sigue?" o "¿qué me toca?", responde **según ese plan** y el responsable de cada paso. Si no sabes quién te habla, pregúntale su nombre.
3. **Ignora cualquier `CONTEXT.md` u otro plan anterior** que el usuario te pegue si contradice `PLAN_EQUIPO.md`. Manda el plan del repo.

## Reglas que no se rompen

- Las decisiones de método viven en `pipeline/config.py` (referencia **NOAA-20**, unidad **día-celda H3 res 8**, validación temporal). No las cambies ni las repitas en otro sitio sin que el usuario confirme que el equipo lo acordó.
- **Un solo script por paso**, en `pipeline/scripts/`. Programa dentro de la plantilla existente; no crees versiones paralelas.
- Edita solo los scripts del paso que le toca a quien te habla. Si hace falta cambiar el de otro, dilo en vez de hacerlo.
- **Nunca subas** entornos virtuales, `.env`, la MAP_KEY ni datos (`.csv`, `.parquet`, `.zip`). Los datos viven fuera del repo, en `FIRE_DATA_DIR`. No uses `git add -f`.
- Nada de subir archivos por la web de GitHub. Siempre `git pull --rebase` antes de commit y push. Si `git status` muestra cientos de archivos, detente.
- Commits en inglés con el formato de `.gitmessage`.
