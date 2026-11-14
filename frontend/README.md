# nasa_space_apps
Calendario de actividad de quemas basado en puntos de calor satelitales de MODIS y VIIRS (NASA FIRMS). NASA Space Apps Challenge 2026, Boca del Río.

## Visor de Globo Terráqueo Interactivo (Mapbox GL JS)

Módulo de mapa interactivo con proyección de globo 3D para la selección y visualización de áreas de interés del dashboard.

### Características
- Proyección de globo terráqueo 3D con atmósfera y estrellas vía Mapbox GL JS v3.
- Selección e interacción con zonas y regiones de interés.
- Panel informativo con métricas, coordenadas y modo órbita cinemática.
- Soporte para token de acceso configurado mediante la variable de entorno `VITE_MAPBOX_TOKEN` o desde la interfaz.
- 5 estilos cartográficos conmutables (Satélite fotorrealista, Cyber dark, Calles, Topografía y Claro).

### Requisitos y Ejecución
1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Configura tu token de Mapbox en el archivo `.env` (opcional, incluye fallback por defecto):
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
