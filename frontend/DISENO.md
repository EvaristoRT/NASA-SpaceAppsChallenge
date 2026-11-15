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

## Qué regiones hay (acordado el 14-nov)
Solo **países y continentes**. Se quitaron las 6 zonas especiales (Selva Amazónica, Himalaya, Gran Barrera de Coral, Cinturón de Fuego, Sahara, Fosa de las Marianas):
ya no están en `zonesData.js`, ni en el GeoJSON, ni en los colores del mapa. El explorador lateral es **una sola lista de países de la A a la Z** con buscador (nombre,
capital o continente) y el continente como texto secundario; sin pestañas ni categorías. Los continentes siguen en el mapa (contorno y etiqueta) y se encuentran
desde el buscador de la barra superior. `tools/build_continents.py` ya no vuelve a generar las zonas.

## Idioma y relieve (rama `view_tests`, de Mauricio, integrada)
- **Idioma:** `src/context/LanguageContext.jsx` (español por defecto, inglés, se recuerda en `localStorage`) y `src/i18n/translations.js`; selector ES/EN en la barra superior.
  Se traduce la interfaz y también el contenido de países y continentes: `src/i18n/zoneText.js` (`localizeZone(zone, lang)`) devuelve una copia en inglés al vuelo,
  sin duplicar los datos. Nombres de país con `Intl.DisplayNames` (el código ISO sale de la bandera del campo `icon`), capitales con la tabla `CAPITALS_EN`
  (solo las que cambian), descripción y puntos destacados por plantilla, y los 7 continentes con texto propio. El buscador acepta el nombre en ambos idiomas.
  Los datos originales siguen en español (el GeoJSON exportado conserva `paises_detectados` en español para la API).
  Al cambiar el texto del explorador, editar las dos lenguas en `translations.js` (`sidebarZones`).
- **Relieve:** `applyTerrain` en `Globe.jsx` es el de la rama `view_tests` (Mapbox Terrain-DEM; exageración 1.95 en Relieve y 1.35 en Satélite; cámara a 58° al cambiar a
  Relieve y 45° al elegir una zona). Se probaron un sombreado propio, una exageración según el zoom y mensajes de diagnóstico, y se quitaron para dejarlo igual que en `view_tests`.
  Lo único añadido: si tras cargar el estilo falta el terreno, se vuelve a aplicar al entrar en reposo (hasta 5 intentos, en silencio). Si el relieve se ve plano en algún
  navegador web, lo más probable es la aceleración por hardware desactivada, una GPU en la lista negra del navegador o la protección de privacidad estricta (Brave, Firefox).

## Colores del mapa (en `Globe.jsx` y en `App.css`; si cambian en uno, cambiar el otro)
- **Amarillo neón** = lo activo: zona seleccionada, área que se dibuja, herramienta activa, fila seleccionada, controles encendidos.
- **Blanco** = hover. **Verde** = primer vértice del polígono y "Cerrar polígono". **Rojo** = destructivo.
- Los 196 países van en gris claro y suave. 

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
- **Aspecto poligonal:** los países traen pocos vértices (~76 de media). `buildOutlineCollection(fc, { smooth: true })` suaviza solo las líneas (corte de esquinas de Chaikin, 2 pasadas; 3 si la zona es muy angulosa); el relleno conserva los polígonos originales. En `Globe.jsx` las fronteras de países van en su propia capa (`zones-line-countries`), casi invisibles de lejos y más marcadas al acercarse, con uniones redondeadas; continentes y zonas especiales conservan el trazo principal. `tools/preview_outlines.html?v=smooth&k=3` compara el resultado sin Mapbox.

## Para ejecutarlo
Token público de Mapbox en `.env` o `.env.local` (ignorados por git): `VITE_MAPBOX_TOKEN=pk.…`. Luego `npm install` y `npm run dev`.
El token se lee **solo** de esa variable: se quitaron el botón "Configurar Token", la ventana para pegarlo y el guardado en `localStorage`. En Vercel se define
en las variables de entorno del proyecto. Si falta, `vite build` avisa y el mapa muestra un aviso con el nombre de la variable.

## Pendiente y límites
- **Recursos de marca:** el equipo confirmó que se pueden usar. En `public/brand/` van el símbolo blanco (sin texto) y los patrones `orbits` (barra superior), `waves-vertical` (cabecera del explorador, las ondas giradas para que corran de arriba hacia abajo) y `waves` (cabecera de la ficha del área trazada), sobre el degradado azul. Los PNG de `public/brand/` son versiones para pantalla (líneas blancas finas sobre transparente, a doble densidad para que no se pixelen, a ~35 % de opacidad y desvanecidas hacia el texto) generadas con `tools/make_patterns.py` a partir de los originales de `../design/brand/patterns/`: a 1 px las líneas originales casi no se veían. **Siguen fuera** los logotipos completos (dicen "NASA" en rojo) y el logotipo de la NASA. Ver `../design/brand/README.md`.
- Probado: lint limpio, compilación correcta, trazado de un polígono y su ficha. **No visto con imágenes satelitales ni con las capas de zonas sobre el mapa real**:
  Mapbox respondió 429 (demasiadas peticiones) de forma sostenida con el token de prueba.
- No probados: los modos Mano Alzada y Rectángulo, ni pantallas angostas con el explorador abierto (heredado: el explorador tapa la ficha).
- Heredado de la base: los marcadores insertan `zone.name` con `innerHTML` sin escapar (sin riesgo con datos fijos), y `public/data/world-zones.geojson` es una copia
  del dato original que ningún archivo usa.
