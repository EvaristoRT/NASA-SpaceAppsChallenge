# Recursos de marca de Space Apps

Solo se incluyen los **patrones** (`patterns/`), descargados de https://www.spaceappschallenge.org/brand/ (`Space_Apps_Patterns.zip`).
El símbolo y los logotipos **no están en este repositorio**.

**Pendiente:** las condiciones de uso para proyectos de equipos no se han confirmado (la guía oficial en PDF no se pudo leer:
https://assets.spaceappschallenge.org/media/documents/Space_Apps_Brand_Guide_VUGpVJm.pdf). Confirmarlo con la sede
(nasa.spaceapps.bocadelrio@gmail.com) y, si no se permite su uso, retirar `patterns/`.

## `patterns/`
PNG opacos: `orbits` (líneas grises sobre negro) y `waves`, `voronoi`, `rosette`, `fiduciaries`, `code` (líneas oscuras sobre blanco).
Se aplican al ~25 % de opacidad sobre un azul de la marca, solo dentro de `.brandbar` / `.brandband` (ver `components.css`):
- `orbits`: `mix-blend-mode: screen; opacity: .25`.
- los demás: añadir la clase `.is-lines` (`filter: invert(1)`) y lo mismo.

Uso previsto, un patrón por pantalla: `orbits` en la barra de marca, `voronoi` en el pie (recuerda las celdas H3), `waves` para el área seleccionada;
`rosette`, `fiduciaries` y `code` reservados. Vista de todos en `components.html`.
`code.png` está reducido de 2360 a 1180 px y a escala de grises (de 1.6 MB a 0.5 MB).

## Símbolo y logotipos: no incluidos
`preview.html` busca `design/brand/symbol/space-apps-symbol-white.svg` (el símbolo redondo, sin texto); sin él la barra se ve igual salvo por ese símbolo.
**No usar los logotipos completos** (default y motif): dicen "NASA SPACE APPS CHALLENGE" con "NASA" en rojo y ponen el nombre de la NASA como marca
dentro de la interfaz. Tampoco el logotipo de la NASA (el "meatball" o el "worm"). La aplicación debe indicar que no cuenta con el respaldo de la NASA.
