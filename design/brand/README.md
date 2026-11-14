# Recursos de marca de Space Apps: NO incluidos en el repositorio

Los logotipos, el símbolo y los patrones de la marca NASA Space Apps (https://www.spaceappschallenge.org/brand/) **no están en este repositorio**,
porque las condiciones de uso para proyectos de equipos no se han confirmado (la guía oficial en PDF no se pudo leer). Para usarlos:

1. Leer la guía: https://assets.spaceappschallenge.org/media/documents/Space_Apps_Brand_Guide_VUGpVJm.pdf, o preguntar a la sede.
2. Descargar `NASA_Space_Apps_Logos_2026.zip` y `Space_Apps_Patterns.zip` desde la página de marca.
3. Colocar los que se vayan a usar en estas rutas, que es donde los esperan las páginas de ejemplo:
   - `design/brand/symbol/space-apps-symbol-white.svg` (el símbolo redondo, sin texto)
   - `design/brand/patterns/orbits.png`

Sin esos archivos, `preview.html` se ve igual salvo por el símbolo y el patrón de la franja superior.

**No usar los logotipos completos** (default y motif): dicen "NASA SPACE APPS CHALLENGE" con "NASA" en rojo, y ponen el nombre de la NASA como marca
dentro de la interfaz. Tampoco el logotipo de la NASA (el "meatball" o el "worm"). La aplicación debe indicar que no cuenta con el respaldo de la NASA.

Los patrones oficiales son PNG opacos: `orbits` es gris sobre negro y se mezcla con `mix-blend-mode: screen`; los demás son líneas oscuras sobre blanco
y necesitan `filter: invert(1)` antes. Se aplican al ~25 % de opacidad sobre un azul de la marca.
