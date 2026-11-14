# Diseño del frontend (IgnisSync)

El código del mapa es de Mauricio (ver los commits `feat:` anteriores). Esta carpeta lleva además el sistema de estilos compartido (`../design/`) aplicado
a esa base. **No cambia la lógica ni el comportamiento**, solo la presentación y el marcado mínimo para quitar los emojis.

## Qué cambió
- `src/styles/tokens.css`: copia de `../design/tokens.css`; si cambia allá, copiar de nuevo.
- `src/index.css`, `src/main.jsx`, `index.html`: tokens y Source Sans 3 incluida en el paquete (`@fontsource/source-sans-3`), sin Inter ni Google Fonts.
- `src/App.css`: reescrito sobre los tokens, incluidas las herramientas de dibujo y la ficha del área trazada.
- `Navbar`, `SidebarZones`, `ZoneDrawer`, `DrawnAreaDrawer`: sin emojis; `data-category` para el cuadrito de color de cada categoría.
- `Globe.jsx`: colores de atmósfera, categorías, hover, selección y dibujo; marcadores como punto con etiqueta.
- La clase `glass-panel` pasó a llamarse `panel`.

## Colores del mapa (en `Globe.jsx` y en `App.css`; si cambian en uno, cambiar el otro)
- **Amarillo neón** = lo activo: zona seleccionada, área que se dibuja, herramienta activa, fila seleccionada, controles encendidos.
- **Blanco** = hover. **Verde** = primer vértice del polígono y "Cerrar polígono". **Rojo** = destructivo.
- Los 196 países van en gris claro y suave. Zona Marina, Ecológica y Geológica usan azul claro, verde y lavanda; las tres azuladas se parecen entre sí.

## Contornos de continentes
El dato original tenía cada continente como la suma de los polígonos de sus países (el contorno dibujaba todas las fronteras), Europa incluía toda Rusia y la
Guayana Francesa, y varias aristas sobre ±180° o el polo se dibujaban como trazos rectos a través del mapa.
- `tools/build_continents.py` (necesita Shapely, solo como herramienta): parte de `tools/worldZonesGeoJSON.original.json` (copia intacta del dato original),
  mueve la Guayana a Sudamérica, parte Rusia en los Urales (60° E, aproximado) y funde cada continente. Escribe `src/data/worldZonesGeoJSON.json`. Se puede repetir.
  Si se regenera el GeoJSON de origen, hay que volver a pasar el script.
- `src/utils/outlines.js`: las capas de línea leen de una fuente `zones-outline` sin las aristas sobre ±180° ni el polo.
- `node tools/check_outlines.mjs` comprueba que no queda ninguna arista artificial. `tools/preview_outlines.html` dibuja antes y después sin Mapbox
  (servirla desde esta carpeta, por ejemplo con `python -m http.server`).
- La línea Europa/Asia en Rusia es recta a 60° E; los Urales reales no lo son.

## Para ejecutarlo
Token público de Mapbox en `.env.local` (ignorado por git): `VITE_MAPBOX_TOKEN=pk.…`. Luego `npm install` y `npm run dev`.

## Pendiente y límites
- **Los recursos de marca de Space Apps no están incluidos** (condiciones de uso sin confirmar). La barra superior muestra el símbolo y un patrón si se colocan en
  `public/brand/space-apps-symbol-white.svg` y `public/brand/orbits.png`; sin ellos oculta el símbolo. Ver `../design/brand/README.md`.
- Probado: lint limpio, compilación correcta, trazado de un polígono y su ficha. **No visto con imágenes satelitales ni con las capas de zonas sobre el mapa real**:
  Mapbox respondió 429 (demasiadas peticiones) de forma sostenida con el token de prueba.
- No probados: los modos Mano Alzada y Rectángulo, ni pantallas angostas con el explorador abierto (heredado: el explorador tapa la ficha).
- Heredado de la base: los marcadores insertan `zone.name` con `innerHTML` sin escapar (sin riesgo con datos fijos), y `public/data/world-zones.geojson` es una copia
  del dato original que ningún archivo usa.
