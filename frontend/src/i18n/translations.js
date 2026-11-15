export const translations = {
  es: {
    app: {
      title: 'IgnisSync - Calendario de quemas armonizado MODIS y VIIRS'
    },
    navbar: {
      brandTag: 'NASA Space Apps 2026 · Boca del Río',
      toggleSidebar: 'Alternar panel de zonas',
      openExplorer: 'Abrir explorador de zonas',
      searchPlaceholder: 'Buscar lugar...',
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
      streets: {
        name: 'Cartografía Urbana',
        desc: 'Mapa vectorial detallado con nombres de países, ciudades y redes viales.'
      },
      outdoors: {
        name: 'Topografía y Relieve',
        desc: 'Muestra curvas de nivel, elevaciones montañosas y senderos naturales.'
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
      title: 'Explorador',
      closeSidebar: 'Cerrar barra lateral',
      continents: 'Continentes',
      countries: 'Países',
      countOne: 'país',
      countMany: 'países',
      noCountries: 'Este continente no tiene países.',
      hint: 'Elige un continente para ver sus países'
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
    analysis: {
      title: 'Análisis de quemas',
      customArea: 'Área trazada',
      demoTitle: 'Datos de demostración.',
      demoText: 'Generados artificialmente; no son observaciones de incendios.',
      collapse: 'Ocultar análisis',
      expand: 'Mostrar análisis',
      statementAbove: '{month} está {ratio}× por encima de lo normal.',
      statementBelow: '{month} está por debajo de lo normal ({ratio}×).',
      statementNormal: '{month} está dentro de lo normal.',
      calendarLabel: 'Calendario: cada fila es un año, cada columna un mes',
      cellTitle: '{days} días con fuego',
      maxLabel: 'máximo',
      fig1: 'Fig. 1',
      fig1Text: 'Días con fuego detectado, por mes, equivalentes a MODIS. El recuadro amarillo marca el mes en curso. Gris: sin fuego.',
      factTotal: 'Quemas, {from}–{to}',
      factTotalUnit: 'días-celda eq. MODIS',
      factPeakYear: 'Año con más actividad',
      factRiskMonth: 'Mes de mayor riesgo',
      factStatus: 'Estado del mes',
      status: { normal: 'Normal', elevated: 'Elevado', low: 'Bajo' },
      monthsShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
      monthsLong: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    },
    panel: {
      tabSummary: 'Resumen',
      tabArea: 'Área',
      tabAnalysis: 'Análisis'
    },
    errorToast: {
      mapboxNotice: 'Aviso de Mapbox:',
      dismiss: 'Descartar',
      missingToken: 'No se encontró el token de Mapbox. Define VITE_MAPBOX_TOKEN en el archivo .env (o en las variables de entorno de Vercel) y vuelve a compilar o desplegar.',
      invalidToken: 'Token no válido o no autorizado.'
    }
  },
  en: {
    app: {
      title: 'IgnisSync - Harmonized MODIS and VIIRS burn calendar'
    },
    navbar: {
      brandTag: 'NASA Space Apps 2026 · Boca del Río',
      toggleSidebar: 'Toggle zones panel',
      openExplorer: 'Open zones explorer',
      searchPlaceholder: 'Search place...',
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
      streets: {
        name: 'Urban Cartography',
        desc: 'Detailed vector map with country names, cities, and road networks.'
      },
      outdoors: {
        name: 'Topography & Relief',
        desc: 'Shows contour lines, mountain elevations, and hiking trails.'
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
      title: 'Explorer',
      closeSidebar: 'Close sidebar',
      continents: 'Continents',
      countries: 'Countries',
      countOne: 'country',
      countMany: 'countries',
      noCountries: 'This continent has no countries.',
      hint: 'Pick a continent to see its countries'
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
    analysis: {
      title: 'Burn analysis',
      customArea: 'Drawn area',
      demoTitle: 'Demo data.',
      demoText: 'Artificially generated; these are not fire observations.',
      collapse: 'Hide analysis',
      expand: 'Show analysis',
      statementAbove: '{month} is {ratio}× above normal.',
      statementBelow: '{month} is below normal ({ratio}×).',
      statementNormal: '{month} is within the normal range.',
      calendarLabel: 'Calendar: each row is a year, each column a month',
      cellTitle: '{days} fire days',
      maxLabel: 'max',
      fig1: 'Fig. 1',
      fig1Text: 'Days with detected fire per month, MODIS-equivalent. The yellow outline marks the current month. Grey: no fire.',
      factTotal: 'Burns, {from}–{to}',
      factTotalUnit: 'MODIS-eq. cell-days',
      factPeakYear: 'Most active year',
      factRiskMonth: 'Highest-risk month',
      factStatus: 'Month status',
      status: { normal: 'Normal', elevated: 'Elevated', low: 'Low' },
      monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      monthsLong: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    },
    panel: {
      tabSummary: 'Summary',
      tabArea: 'Area',
      tabAnalysis: 'Analysis'
    },
    errorToast: {
      mapboxNotice: 'Mapbox Notice:',
      dismiss: 'Dismiss',
      missingToken: 'Mapbox token not found. Define VITE_MAPBOX_TOKEN in your .env file (or Vercel environment variables) and rebuild or redeploy.',
      invalidToken: 'Invalid or unauthorized token.'
    }
  }
};
