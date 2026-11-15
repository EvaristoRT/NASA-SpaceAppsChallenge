# Guion del video demo (30 segundos)

**Para:** quien grabe el video de la entrega · **Regla de Space Apps:** el video dura **30 segundos o menos** y va en un enlace público
(YouTube, Drive, etc.) que no pida contraseña ni registro. Si se pasa de 30 s, no compite por premios globales.

**Historia:** Bolivia 2024, el año de los grandes incendios de la Chiquitanía. Con datos de FIRMS (NOAA-20, sin volcanes ni industrias),
Bolivia tuvo ~936 mil focos en 2024 contra 290–380 mil en 2019–2023 (~2.7×), con el pico en **septiembre de 2024** (~376 mil).
Así el calendario muestra un caso real y llamativo en segundos.
Plan B con la misma ruta: **Canadá 2023** (1.64 M de focos, diez veces 2022; pico en agosto).

---

## 1. Antes de grabar

1. **Datos reales:** backend con la entrega de América (`DATA_DIR` = carpeta de `ignis-backend-america.zip`) y el front con
   `VITE_API_URL=http://localhost:8000` (ver README §5). Comprobar que el panel **no** diga "Demo data".
2. **Idioma: inglés** (botón EN arriba). Los jueces son internacionales.
3. **Pantalla:** navegador a pantalla completa (F11), 1920×1080, sin barra de marcadores ni pestañas extra, zoom del navegador al 100%.
4. **Ensayo previo (importante):** hacer la ruta completa una vez antes de grabar. La app guarda en caché las consultas y así
   en el video no aparecen pantallas de "cargando".
5. **Grabar:** OBS Studio, o la barra de juegos de Windows (`Win + Alt + R`). Editar en Clipchamp (viene con Windows): cortar
   tiempos muertos y acelerar las transiciones a 1.5–2×.
6. **Sin logos de NASA** ni contenido generado con IA en el video. Si se agrega voz o música generadas con IA, las reglas piden
   marcarlo: mejor solo texto en pantalla.

## 2. Ruta (30 s)

| Tiempo | Qué se hace | Qué muestra (funcionalidad del reto) | Texto en pantalla (opcional, en inglés) |
|---|---|---|---|
| 0–3 s | Globo girando, vista inicial | La app web | **"26 years of satellite fire data, one comparable series"** |
| 3–7 s | Explorer → *Americas* → **Bolivia** (o escribir "Bolivia" en el buscador) | Elegir una región | — |
| 7–12 s | Pestaña **Analysis**: calendario de **2024**. Pasar el cursor sobre **septiembre**, el mes más intenso, y leer la frase del mes contra lo normal | Calendario de quema, colores accesibles, mes vs. mediana histórica, anomalía | **"Sep 2024: record burning in Bolivia"** |
| 12–15 s | Clic en **septiembre de 2024** → el mapa pinta los hexágonos con fuego de ese mes | Mapa de la actividad del mes | — |
| 15–18 s | Bajar a la **Fig. 2** (serie 2000–2026 con banda) | Serie armonizada sin saltos en 2002, 2012 y 2018, con incertidumbre | **"MODIS + VIIRS harmonized to NOAA-20, 2000–2026"** |
| 18–21 s | Pestaña **Prediction**: "Next three months…" y el mes más activo según la mediana | Anticipar periodos críticos | **"Expected range for the coming months"** |
| 21–25 s | **Draw Area → Enter coordinates → Center and radius**: lat −17.0, lon −61.0, radio 150 km → *Create area* | Elegir el área con coordenadas (o dibujando) | — |
| 25–29 s | En el área: **Period** = sep 2024 → menú **Download** → *Hotspots* (CSV) y *Calendar* (PNG) | Descarga de focos y de visualizaciones | **"Download hotspots (CSV) and charts (PNG)"** |
| 29–30 s | Cierre | — | **"github.com/EvaristoRT/NASA-SpaceAppsChallenge"** |

**Ojo con la descarga de focos:** para Bolivia entera, septiembre de 2024 supera el límite de 300,000 focos por archivo y la app
lo avisa. Por eso la descarga se muestra en el área de 150 km. Si aun así lo supera, bajar el radio a 100 km.

## 3. Lo que debe quedar claro aunque se vea rápido

- Se elige **cualquier zona** (país, polígono dibujado o coordenadas).
- El calendario permite ver **qué meses y qué años** tuvieron más fuego.
- El mes se compara **contra lo normal** de la zona.
- La serie es **una sola desde 2000** aunque cambien los satélites, y lleva **incertidumbre**.
- Hay **predicción** de los meses que vienen.
- Se **descargan** los focos y las gráficas.

## 4. Si sobra o falta tiempo

- **Si se pasa de 30 s:** quitar primero el paso de la Fig. 2 (15–18 s). Luego, acortar la elección de Bolivia escribiendo en el buscador.
- **Si sobra tiempo:** cambiar a español con el botón ES durante 1 s ("bilingüe") o mostrar la navegación del calendario con el teclado.
