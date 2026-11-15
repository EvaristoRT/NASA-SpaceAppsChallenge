# Recursos de marca de Space Apps

Se incluyen los **patrones** (`patterns/`) y el **símbolo** (`symbol/`), descargados de https://www.spaceappschallenge.org/brand/.
Los logotipos completos **no están en este repositorio**.

El equipo confirmó (14-nov-2026) que se pueden usar. Guía oficial: https://assets.spaceappschallenge.org/media/documents/Space_Apps_Brand_Guide_VUGpVJm.pdf

## `patterns/`
PNG opacos: `orbits` (líneas grises sobre negro) y `waves`, `voronoi`, `rosette`, `fiduciaries`, `code` (líneas oscuras sobre blanco).
Se aplican al ~25 % de opacidad sobre un azul de la marca, solo dentro de `.brandbar` / `.brandband` (ver `components.css`):
- `orbits`: `mix-blend-mode: screen; opacity: .25`.
- los demás: añadir la clase `.is-lines` (`filter: invert(1)`) y lo mismo.

Uso previsto, un patrón por pantalla: `orbits` en la barra de marca, `voronoi` en el pie (recuerda las celdas H3), `waves` para el área seleccionada;
`rosette`, `fiduciaries` y `code` reservados. Vista de todos en `components.html`.
`code.png` está reducido de 2360 a 1180 px y a escala de grises (de 1.6 MB a 0.5 MB).

## Símbolo y logotipos
`symbol/` lleva el símbolo redondo, sin texto (blanco para fondos oscuros, negro para claros). La aplicación usa la copia de `frontend/public/brand/`.
**No usar los logotipos completos** (default y motif): dicen "NASA SPACE APPS CHALLENGE" con "NASA" en rojo y ponen el nombre de la NASA como marca
dentro de la interfaz. Tampoco el logotipo de la NASA (el "meatball" o el "worm"). La aplicación debe indicar que no cuenta con el respaldo de la NASA.
