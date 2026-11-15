export const translations = {
  es: {
    navbar: {
      brandTag: 'NASA Space Apps 2026 · Boca del Río',
      toggleSidebar: 'Alternar panel de zonas',
      openExplorer: 'Abrir explorador de zonas',
      searchPlaceholder: 'Buscar país (ej. México, España, Japón...), capital o zona...',
      cartographyStyle: 'Estilo de Cartografía',
      changeStyle: 'Cambiar estilo de mapa',
      drawButton: 'Dibujar Zona',
      drawTitle: 'Dibujar zona manualmente (forma libre o rectangular)',
      globe3D: 'Globo 3D',
      map2D: 'Plano 2D',
      switchTo2D: 'Cambiar a proyección plana 2D (Mercator)',
      switchTo3D: 'Cambiar a proyección esférica 3D (Globo)',
      languageTab: 'Alternar idioma',
      langEs: 'ES',
      langEn: 'EN',
      langEsFull: 'Español',
      langEnFull: 'English'
    },
    styles: {
      satellite: {
        name: 'Satélite Fotorrealista',
        desc: 'Fotografía satelital de alta resolución con capas de carreteras y relieve.'
      },
      dark: {
        name: 'Modo Cyber Dark',
        desc: 'Diseño oscuro elegante de alto contraste, ideal para visualizar zonas y datos nocturnos.'
      },
      streets: {
        name: 'Cartografía Urbana',
        desc: 'Mapa vectorial detallado con nombres de países, ciudades y redes viales.'
      },
      outdoors: {
        name: 'Topografía y Relieve',
        desc: 'Muestra curvas de nivel, elevaciones montañosas y senderos naturales.'
      },
      light: {
        name: 'Claro y Minimalista',
        desc: 'Estilo limpio y luminoso para presentaciones de alto impacto visual.'
      }
    },
    drawToolbar: {
      title: 'Herramienta de Dibujo y AOI',
      vertex: 'vértice',
      vertices: 'vértices',
      close: 'Cerrar',
      polygon: 'Polígono (Vértices)',
      polygonTitle: 'Dibujar polígono colocando puntos vértice por vértice',
      freehand: 'Mano Alzada',
      freehandTitle: 'Dibujar forma libre a mano alzada (mantén pulsado y arrastra)',
      rectangle: 'Rectángulo',
      rectangleTitle: 'Dibujar zona rectangular (clic y arrastra diagonalmente)',
      finishPolygon: 'Cerrar Polígono',
      finishPolygonTitle: 'Finalizar y cerrar el polígono actual (o presiona Enter)',
      undoVertex: 'Deshacer punto',
      undoVertexTitle: 'Deshacer el último vértice colocado (o presiona Backspace)',
      clearDrawing: 'Borrar trazado',
      clearDrawingTitle: 'Borrar trazado actual',
      closeToolbar: 'Cerrar barra de dibujo',
      hintPolygon: 'Haz clic en el mapa para colocar puntos. Cierra haciendo clic en el primer punto o pulsa Enter.',
      hintFreehand: 'Mantén pulsado el botón izquierdo y arrastra para dibujar el contorno.',
      hintRectangle: 'Haz clic y arrastra diagonalmente para definir la caja delimitadora.',
      hintSuccess: 'Área calculada exitosamente. Consulta las métricas en el panel lateral.'
    },
    mapControls: {
      zoomIn: 'Acercar zoom (+)',
      zoomInAria: 'Acercar',
      zoomOut: 'Alejar zoom (-)',
      zoomOutAria: 'Alejar',
      resetNorth: 'Orientar al Norte (0°)',
      resetNorthAria: 'Orientar al Norte',
      zenithView: 'Vista Cenital Plana (0°)',
      perspective3D: 'Vista Perspectiva 3D (60°)',
      togglePitchAria: 'Alternar inclinación 3D',
      resetView: 'Vista Global Completa',
      resetViewAria: 'Restaurar vista global',
      stopAutoSpin: 'Detener rotación automática',
      startAutoSpin: 'Iniciar rotación continua',
      autoSpinAria: 'Rotación automática',
      orbitAround: 'Orbitar alrededor de {name}',
      selectZoneToOrbit: 'Selecciona una zona para orbitar alrededor de ella',
      orbitAria: 'Modo órbita cinemática',
      fullscreen: 'Pantalla completa',
      exitFullscreen: 'Salir de pantalla completa',
      fullscreenAria: 'Pantalla completa'
    },
    hud: {
      coord: 'Coord:',
      zoom: 'Zoom:',
      bearing: 'Rumbo:',
      hoverPrompt: 'Pasa el cursor sobre el globo',
      globe3D: 'Globo 3D',
      mercator2D: 'Mercator 2D'
    },
    sidebarZones: {
      title: 'Explorador de Países y Zonas',
      closeSidebar: 'Cerrar barra lateral',
      searchPlaceholder: 'Buscar entre más de 190 países...',
      categories: {
        all: 'Todos',
        americas: 'América',
        europe: 'Europa',
        asia: 'Asia',
        africa: 'África',
        oceania: 'Oceanía',
        continents: 'Continentes',
        wonders: 'Maravillas'
      },
      categoryBadges: {
        country: 'País',
        continent: 'Continente',
        wonder: 'Zona de Interés'
      },
      noZonesFound: 'No se encontraron zonas coincidentes.',
      tryOtherSearch: 'Intenta buscar con otro término o selecciona otra categoría.',
      availableZones: 'zonas disponibles'
    },
    zoneDrawer: {
      close: 'Cerrar panel',
      copyCoords: 'Copiar latitud y longitud',
      copy: 'Copiar',
      copied: 'Copiado',
      capital: 'Capital',
      continent: 'Continente',
      area: 'Superficie',
      population: 'Población',
      climate: 'Clima / Entorno',
      variable: 'Variable',
      about: 'Acerca de esta zona',
      highlights: 'Puntos Destacados',
      detailedZoom: 'Zoom Detallado',
      orbit3D: 'Orbitar en 3D',
      stopOrbit: 'Detener Órbita'
    },
    drawnAreaDrawer: {
      close: 'Cerrar detalles del área',
      aoiTitle: 'Área de Interés Manual',
      drawnZone: 'Zona Trazada',
      center: 'Centro',
      copyCoords: 'Copiar coordenadas del centro y caja delimitadora',
      copied: 'Copiado',
      estimatedArea: 'Superficie Estimada',
      perimeter: 'Perímetro Total',
      coveredCountries: 'Países Intersecados / Detectados',
      noCountriesDetected: 'Ningún país principal detectado en este polígono.',
      focusArea: 'Enfocar Área',
      copyGeoJSON: 'Copiar GeoJSON',
      copiedGeoJSON: '¡Copiado!',
      clearArea: 'Borrar Área',
      geoJSONHint: 'Puedes exportar este GeoJSON o utilizarlo para consultar anomalías térmicas y puntos de calor MODIS/VIIRS.',
      types: {
        rectangle: 'Rectángulo',
        polygon: 'Polígono por Vértices',
        freehand: 'Forma Libre'
      }
    },
    errorToast: {
      mapboxNotice: 'Aviso de Mapbox:',
      dismiss: 'Descartar',
      missingToken: 'No se encontró el token de Mapbox. Define VITE_MAPBOX_TOKEN en el archivo .env (o en las variables de entorno de Vercel) y vuelve a compilar o desplegar.',
      invalidToken: 'Token no válido o no autorizado.'
    }
  },
  en: {
    navbar: {
      brandTag: 'NASA Space Apps 2026 · Boca del Río',
      toggleSidebar: 'Toggle zones panel',
      openExplorer: 'Open zones explorer',
      searchPlaceholder: 'Search country (e.g. Mexico, Spain, Japan...), capital or zone...',
      cartographyStyle: 'Cartography Style',
      changeStyle: 'Change map style',
      drawButton: 'Draw Area',
      drawTitle: 'Draw area manually (freehand or rectangle)',
      globe3D: '3D Globe',
      map2D: '2D Map',
      switchTo2D: 'Switch to 2D flat projection (Mercator)',
      switchTo3D: 'Switch to 3D spherical projection (Globe)',
      languageTab: 'Toggle language',
      langEs: 'ES',
      langEn: 'EN',
      langEsFull: 'Español',
      langEnFull: 'English'
    },
    styles: {
      satellite: {
        name: 'Photorealistic Satellite',
        desc: 'High-resolution satellite photography with roads and terrain relief.'
      },
      dark: {
        name: 'Cyber Dark Mode',
        desc: 'Sleek high-contrast dark design, ideal for visualizing night data and zones.'
      },
      streets: {
        name: 'Urban Cartography',
        desc: 'Detailed vector map with country names, cities, and road networks.'
      },
      outdoors: {
        name: 'Topography & Relief',
        desc: 'Shows contour lines, mountain elevations, and hiking trails.'
      },
      light: {
        name: 'Light & Minimalist',
        desc: 'Clean and bright style for high-impact visual presentations.'
      }
    },
    drawToolbar: {
      title: 'Drawing & AOI Tool',
      vertex: 'vertex',
      vertices: 'vertices',
      close: 'Close',
      polygon: 'Polygon (Vertices)',
      polygonTitle: 'Draw polygon by placing vertex points',
      freehand: 'Freehand',
      freehandTitle: 'Draw freehand shape (click and drag)',
      rectangle: 'Rectangle',
      rectangleTitle: 'Draw rectangular area (click and drag diagonally)',
      finishPolygon: 'Close Polygon',
      finishPolygonTitle: 'Finish and close current polygon (or press Enter)',
      undoVertex: 'Undo point',
      undoVertexTitle: 'Undo last placed vertex (or press Backspace)',
      clearDrawing: 'Clear drawing',
      clearDrawingTitle: 'Clear current drawing',
      closeToolbar: 'Close drawing toolbar',
      hintPolygon: 'Click on the map to add points. Close by clicking the first point or press Enter.',
      hintFreehand: 'Click and hold left mouse button to draw freehand outline.',
      hintRectangle: 'Click and drag diagonally to define the bounding box.',
      hintSuccess: 'Area calculated successfully. View metrics in the side panel.'
    },
    mapControls: {
      zoomIn: 'Zoom in (+)',
      zoomInAria: 'Zoom in',
      zoomOut: 'Zoom out (-)',
      zoomOutAria: 'Zoom out',
      resetNorth: 'Orient to North (0°)',
      resetNorthAria: 'Orient to North',
      zenithView: 'Top-Down Flat View (0°)',
      perspective3D: '3D Perspective View (60°)',
      togglePitchAria: 'Toggle 3D tilt',
      resetView: 'Full Global View',
      resetViewAria: 'Reset global view',
      stopAutoSpin: 'Stop auto-rotation',
      startAutoSpin: 'Start continuous rotation',
      autoSpinAria: 'Auto-rotation',
      orbitAround: 'Orbit around {name}',
      selectZoneToOrbit: 'Select a zone to orbit around it',
      orbitAria: 'Cinematic orbit mode',
      fullscreen: 'Fullscreen',
      exitFullscreen: 'Exit fullscreen',
      fullscreenAria: 'Fullscreen'
    },
    hud: {
      coord: 'Coord:',
      zoom: 'Zoom:',
      bearing: 'Heading:',
      hoverPrompt: 'Hover cursor over the globe',
      globe3D: '3D Globe',
      mercator2D: 'Mercator 2D'
    },
    sidebarZones: {
      title: 'Countries & Zones Explorer',
      closeSidebar: 'Close sidebar',
      searchPlaceholder: 'Search among 190+ countries...',
      categories: {
        all: 'All',
        americas: 'Americas',
        europe: 'Europe',
        asia: 'Asia',
        africa: 'Africa',
        oceania: 'Oceania',
        continents: 'Continents',
        wonders: 'Wonders'
      },
      categoryBadges: {
        country: 'Country',
        continent: 'Continent',
        wonder: 'Area of Interest'
      },
      noZonesFound: 'No matching zones found.',
      tryOtherSearch: 'Try searching with another keyword or select a different category.',
      availableZones: 'zones available'
    },
    zoneDrawer: {
      close: 'Close panel',
      copyCoords: 'Copy latitude and longitude',
      copy: 'Copy',
      copied: 'Copied',
      capital: 'Capital',
      continent: 'Continent',
      area: 'Area',
      population: 'Population',
      climate: 'Climate / Environment',
      variable: 'Variable',
      about: 'About this zone',
      highlights: 'Highlights',
      detailedZoom: 'Detailed Zoom',
      orbit3D: '3D Orbit',
      stopOrbit: 'Stop Orbit'
    },
    drawnAreaDrawer: {
      close: 'Close area details',
      aoiTitle: 'Manual Area of Interest',
      drawnZone: 'Drawn Area',
      center: 'Center',
      copyCoords: 'Copy center & bounding box coordinates',
      copied: 'Copied',
      estimatedArea: 'Estimated Surface Area',
      perimeter: 'Total Perimeter',
      coveredCountries: 'Intersected / Detected Countries',
      noCountriesDetected: 'No major country detected within this polygon.',
      focusArea: 'Focus Area',
      copyGeoJSON: 'Copy GeoJSON',
      copiedGeoJSON: 'Copied!',
      clearArea: 'Delete Area',
      geoJSONHint: 'You can export this GeoJSON or use it to query MODIS/VIIRS thermal anomalies and heat points.',
      types: {
        rectangle: 'Rectangle',
        polygon: 'Vertex Polygon',
        freehand: 'Freehand Shape'
      }
    },
    errorToast: {
      mapboxNotice: 'Mapbox Notice:',
      dismiss: 'Dismiss',
      missingToken: 'Mapbox token not found. Define VITE_MAPBOX_TOKEN in your .env file (or Vercel environment variables) and rebuild or redeploy.',
      invalidToken: 'Invalid or unauthorized token.'
    }
  }
};
