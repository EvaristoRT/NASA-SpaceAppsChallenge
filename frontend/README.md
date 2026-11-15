# nasa_space_apps
Calendario de actividad de quemas basado en puntos de calor satelitales de MODIS y VIIRS (NASA FIRMS). NASA Space Apps Challenge 2026, Boca del Río.

## Visor de Globo Terráqueo Interactivo (Mapbox GL JS)

Módulo de mapa interactivo con proyección de globo 3D para la selección y visualización de áreas de interés del dashboard.

### Características
- Proyección de globo terráqueo 3D con atmósfera y estrellas vía Mapbox GL JS v3.
- Selección e interacción con zonas y regiones de interés.
- Panel informativo con métricas, coordenadas y modo órbita cinemática.
- Token de acceso de Mapbox leído solo de la variable de entorno `VITE_MAPBOX_TOKEN` (archivo `.env` en local, variables del proyecto en Vercel). La interfaz no lo pide ni lo guarda.
- 5 estilos cartográficos conmutables (Satélite fotorrealista, Cyber dark, Calles, Topografía y Claro).

### Requisitos y Ejecución
1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Crea el archivo `.env` (o `.env.local`) con tu token PÚBLICO de Mapbox (obligatorio; no hay token por defecto):
   ```env
   VITE_MAPBOX_TOKEN=tu_mapbox_access_token_aqui
   ```
   *(Puedes usar como plantilla `.env.example`)*

3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

4. Compilación para producción:
   ```bash
   npm run build
   ```

### Despliegue en Vercel
- **Root Directory:** `frontend` (el proyecto está dentro de esa carpeta, no en la raíz del repositorio). Framework Vite, build `npm run build`, salida `dist`.
- **Variable de entorno:** `VITE_MAPBOX_TOKEN` con el token público (`pk.…`), marcada para Production, Preview y Development.
- Vite incrusta la variable al compilar: si se cambia, hay que volver a desplegar. Si falta, la compilación avisa y el mapa muestra un aviso en lugar del globo.
