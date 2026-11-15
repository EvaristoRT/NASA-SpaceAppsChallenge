# Diseño del frontend (IgnisSync)

El código del mapa es de Mauricio (ver los commits `feat:` anteriores). Esta carpeta lleva además el sistema de estilos compartido (`../design/`) aplicado
a esa base. **No cambia la lógica ni el comportamiento**, solo la presentación y el marcado mínimo para quitar los emojis.

## Qué cambió
- `src/styles/tokens.css`: copia de `../design/tokens.css`; si cambia allá, copiar de nuevo.
- `src/index.css`, `src/main.jsx`, `index.html`: tokens y Source Sans 3 incluida en el paquete (`@fontsource/source-sans-3`), sin Inter ni Google Fonts.
- `src/App.css`: reescrito sobre los tokens, incluidas las herramientas de dibujo y la ficha del área trazada.
- `Navbar`, `SidebarZones`, `ZoneSummary`, `AreaSummary` (antes ZoneDrawer y DrawnAreaDrawer): sin emojis; `data-category` para el cuadrito de color de cada categoría.
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
  **Mapa:** las etiquetas del mapa (países, ciudades, ríos, mares) también siguen el idioma: `applyMapLanguage` en `Globe.jsx` cambia `name_en` por `name_<idioma>` (con respaldo a `name_en` y `name`)
  en las capas de texto de cada estilo y guarda el texto original para poder volver al inglés. Los títulos de la página también cambian (`app.title` en `translations.js`).
- **Relieve:** `applyTerrain` en `Globe.jsx` es el de la rama `view_tests` (Mapbox Terrain-DEM; exageración 2.8 en Relieve y 1.8 en Satélite (en `view_tests` eran 1.95 y 1.35, subidas un poco); cámara a 58° al cambiar a
  Relieve y 45° al elegir una zona). Se probaron un sombreado propio, una exageración según el zoom y mensajes de diagnóstico, y se quitaron para dejarlo igual que en `view_tests`.
  Lo único añadido: si tras cargar el estilo falta el terreno, se vuelve a aplicar al entrar en reposo (hasta 5 intentos, en silencio). Si el relieve se ve plano en algún
  navegador web, lo más probable es la aceleración por hardware desactivada, una GPU en la lista negra del navegador o la protección de privacidad estricta (Brave, Firefox).

## Estilos de mapa, explorador y panel de análisis (14-nov)
- **Tres modos de visualización**, distintos entre sí y no solo de color: **Satélite** (fotografía), **Cartografía urbana** (mapa de calles) y **Topografía y Relieve** (terreno 3D). Se quitaron
  Oscuro y Claro porque solo cambiaban colores (`MAP_STYLES` en `zonesData.js` y `styles` en `translations.js`).
- **Explorador por niveles** (`SidebarZones.jsx`): primero los *Continentes* (con su número de países) y, al elegir uno, sus *países* de la A a la Z con un botón de regreso. Sigue la selección: elegir un
  continente (en el mapa, en el buscador o en la lista) abre el explorador en sus países, y elegir un país abre su continente. No tiene buscador propio: **hay un solo buscador, el de la barra superior**
  ("Buscar lugar..."), que ignora acentos y mayúsculas (`normalizeSearch`), agrupa los resultados en Continentes y Países y busca los países solo por nombre y capital (así un continente no arrastra
  todos sus países). América del Sur y América del Norte se separan en `utils/continents.js` (los datos solo dicen "América"). El explorador ya no tapa el cuadro de coordenadas (`bottom: 76px`).
- **Cómo se despliega la información** (definido el 14-nov para que se aprecie el movimiento de la cámara): al elegir una zona **solo vuela la cámara**; no hay recuadros encima y además se **ocultan los controles y las
  coordenadas** mientras vuela (`is-flying` en `App.jsx`, avisado por `trackFlight` en `Globe.jsx`). Los vuelos duran 1 s (`FLY_MS` en `Globe.jsx`; antes 2 a 2.5 s). Cuando la cámara
  se detiene (`moveend`, con respaldo de 1.5 s) aparece **un único panel a la derecha** (`InfoPanel.jsx`) con pestañas: *Resumen | Análisis* para un país o continente (`ZoneSummary.jsx`) y *Área | Análisis*
  para un área trazada (`AreaSummary.jsx`, que aparece de inmediato porque no hay vuelo). **Elegir un continente deja el explorador abierto** (para escoger uno de sus países); **elegir un país lo cierra**.
  La pestaña *Análisis* (`AnalysisView.jsx`) lleva la frase que los datos respaldan, el calendario años × meses (rampa Inferno, mes en curso con recuadro amarillo, pie "Fig. 1"), la lista de
  hechos y el aviso de demostración; el panel se ensancha a 440 px en esa pestaña. **Los datos son de demostración** (`utils/demoAnalysis.js`, deterministas por zona); cuando el backend responda
  (`POST /api/search`), el panel debe recibir un objeto con la misma forma (`calendar[año][mes]`, `max`, `peak`, `total`, `ratio`, `status`…) y se borra esa función. Para añadir más pestañas
  (por ejemplo, comparación MODIS/VIIRS o descarga CSV) basta agregar un elemento a `tabs` en `InfoPanel.jsx`.
- **Mapa plano (2D)**: es solo un cambio de proyección, no una vista para manipular. En 2D no se puede **rotar ni inclinar** (`applyFlatConstraints` en `Globe.jsx`: sin rotación con el botón derecho ni con gestos, `maxPitch` 0 y el rumbo siempre norte arriba) y se ocultan la brújula, la inclinación, el giro automático y la órbita. El desplazamiento es **libre y el mundo se repite** (`FLAT_WORLD_COPIES = true`), como en cualquier mapa web, y todo sigue siendo seleccionable. Se probó dejar un solo mundo (`renderWorldCopies` en falso), pero Mapbox obliga entonces a que el mapa llene el ancho de la pantalla y al alejar el arrastre queda bloqueado en horizontal (en diagonal solo se mueve en vertical), que se sentía raro; con `false` no hay forma de ver el mundo completo con márgenes. Además, el cambio a 2D ya no se pierde si se pulsa mientras cargan las teselas.
- **Hover y clic sobre el mapa, por niveles:** los polígonos del mapa son de países (ver la sección de contornos) y de cada país se deduce su continente. `pickZone` en `Globe.jsx` elige igual que el explorador: **lejos** (zoom < 4, `COUNTRY_ZOOM`) y sin continente elegido, el **continente**; **dentro del continente ya elegido** (o de un país suyo), el **país**; **cerca** (zoom ≥ 4), siempre el país. Así se elige un continente y después uno de sus países tocando el mapa; la Antártida (sin países) siempre elige el continente. Al pasar el cursor aparece una **etiqueta con el nombre** de lo que se elegiría al tocar (popup de Mapbox, clase `hover-label`, en el idioma activo) que sigue al cursor. Se probaron puntos visibles por país y **se quitaron** a petición de Manuel (hacían ruido).

## Colores del mapa (en `Globe.jsx` y en `App.css`; si cambian en uno, cambiar el otro)
- **Amarillo neón** = lo activo: zona seleccionada, área que se dibuja, herramienta activa, fila seleccionada, controles encendidos.
- **Blanco** = hover. **Verde** = primer vértice del polígono y "Cerrar polígono". **Rojo** = destructivo.
- Los 196 países van en gris claro y suave. 

## Contornos con los límites de Mapbox (14-nov)
Los contornos de países y continentes **ya no salen de nuestros datos** (`worldZonesGeoJSON.json`, de ~76 vértices por país, con los que Córcega y Cerdeña salían como burbujas y la costa se separaba de la real) sino del tileset público de Mapbox
**`mapbox.country-boundaries-v1`** (capa `country_boundaries`, polígonos exactos hasta el zoom 12, sin descargar nada). `setupZoneLayers` en `Globe.jsx` define `zones-fill` (relleno casi transparente para detectar el país bajo el cursor),
`zones-line` (fronteras y costas con los colores, anchos y opacidad originales: `rgba(223,225,226,0.45)`, 0.9 → 1.4 → 2.0, opacidad 0.8) y las capas de hover y de selección.
- **Códigos ISO:** cada polígono trae `iso_3166_1`. Nuestros países no llevan el código, pero sí la bandera en `icon`, que lo codifica (`utils/countryIso.js`: `isoFromFlag`, `zoneByIso`, `isoListOf`, `zoneFilter`). La Antártida se asigna por `AQ`.
- **Visión del mundo:** los polígonos vienen una vez por visión (límites en disputa); se usan solo los comunes y los de la de EE. UU. (`WORLDVIEW_FILTER`). Los de disputa (`D0…`) no son zonas nuestras y no se eligen.
- **Un continente no tiene polígono propio:** se ilumina (hover o selección) con los de todos sus países (relleno y bordes suaves; `applyZoneHighlight`). **Por eso ya no existe el contorno azul de continente en reposo**: Mapbox no puede unir países.
  Para recuperarlo con exactitud haría falta descargar datos más finos (Natural Earth 50m) y regenerar los continentes con `tools/build_continents.py`.
- **Pequeños países ausentes de lejos:** Vaticano, Mónaco, San Marino, Maldivas, Nauru y Tuvalu no se dibujan a zoom lejano (aparecen al acercarse); siguen disponibles en el explorador.
- **Rusia y la Guayana Francesa:** como cada polígono es un país entero, Rusia (Siberia incluida) cuenta como Europa y la Guayana Francesa como Francia (Europa), no como Asia y Sudamérica.
- Qué quedó sin uso en el mapa: `src/utils/outlines.js` y `generateZonesGeoJSON` / `generateZonesOutlineGeoJSON` (siguen en `geoUtils.js`; `findCoveredCountries` aún usa `worldZonesGeoJSON.json` para saber qué países cubre un área trazada).

### Contornos propios (versión anterior, ya no usada por el mapa)
El dato original tenía cada continente como la suma de los polígonos de sus países (el contorno dibujaba todas las fronteras), Europa incluía toda Rusia y la
Guayana Francesa, y varias aristas sobre ±180° o el polo se dibujaban como trazos rectos a través del mapa.
- `tools/build_continents.py` (necesita Shapely, solo como herramienta): parte de `tools/worldZonesGeoJSON.original.json` (copia intacta del dato original),
  mueve la Guayana a Sudamérica, parte Rusia en los Urales (60° E, aproximado) y funde cada continente. Escribe `src/data/worldZonesGeoJSON.json`. Se puede repetir.
  Si se regenera el GeoJSON de origen, hay que volver a pasar el script.
- `src/utils/outlines.js`: las capas de línea leen de una fuente `zones-outline` sin las aristas sobre ±180° ni el polo.
- `node tools/check_outlines.mjs` comprueba que no queda ninguna arista artificial. `tools/preview_outlines.html` dibuja antes y después sin Mapbox
  (servirla desde esta carpeta, por ejemplo con `python -m http.server`).
- La línea Europa/Asia en Rusia es recta a 60° E; los Urales reales no lo son.
- **Aspecto poligonal:** los países traen pocos vértices (~76 de media). `buildOutlineCollection(fc, { smooth: true })` suaviza solo las líneas (corte de esquinas de Chaikin, 2 pasadas; 3 si la zona es muy angulosa); el relleno conserva los polígonos originales. En `Globe.jsx` el contorno de países y continentes es una sola capa (`zones-line`) con los **colores, anchos y opacidad originales** (países `rgba(223,225,226,0.45)`, continentes `rgba(36,145,255,0.75)`, ancho 0.9 → 1.4 → 2.0 según el zoom, opacidad 0.8) y uniones redondeadas. Una versión intermedia con una capa aparte para países, más tenue de lejos, cambiaba los colores y se revirtió. `tools/preview_outlines.html?v=smooth&k=3` compara el resultado sin Mapbox.

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
