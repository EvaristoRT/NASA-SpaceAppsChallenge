import { ALL_COUNTRIES } from './allCountries.js';

// --- CONTINENTES ---
export const CONTINENTS = [
  {
    id: 'america-del-sur',
    name: 'América del Sur',
    nativeName: 'South America',
    category: 'Continente',
    continent: 'América',
    icon: '🌎',
    coords: [-58.4, -14.2],
    zoom: 2.8,
    pitch: 35,
    bearing: 0,
    area: '17,840,000 km²',
    population: '434 millones',
    climate: 'Tropical, Ecuatorial, Desértico, Glaciar',
    description: 'Continente caracterizado por la majestuosa cordillera de los Andes, la cuenca fluvial y selva amazónica más grande del planeta, y una extraordinaria biodiversidad.',
    highlights: ['Selva Amazónica', 'Cordillera de los Andes', 'Cataratas del Iguazú', 'Desierto de Atacama', 'Patagonia'],
    polygon: [
      [-81, 12], [-75, 11], [-60, 8], [-50, 0], [-35, -5],
      [-38, -18], [-44, -23], [-53, -33], [-65, -42], [-68, -55],
      [-75, -50], [-73, -40], [-71, -30], [-76, -14], [-81, -4],
      [-79, 2], [-77, 8], [-81, 12]
    ]
  },
  {
    id: 'america-del-norte',
    name: 'América del Norte',
    nativeName: 'North America',
    category: 'Continente',
    continent: 'América',
    icon: '🌎',
    coords: [-100.0, 42.0],
    zoom: 2.6,
    pitch: 40,
    bearing: -10,
    area: '24,709,000 km²',
    population: '592 millones',
    climate: 'Ártico, Templado, Desértico, Subtropical',
    description: 'Abarca desde las tundras árticas de Canadá y Alaska hasta las costas tropicales del sur de México y el Caribe.',
    highlights: ['Montañas Rocosas', 'Gran Cañón del Colorado', 'Grandes Lagos', 'Bosques Boreales de Canadá', 'Península de Yucatán'],
    polygon: [
      [-168, 66], [-140, 70], [-100, 75], [-60, 60], [-55, 48],
      [-70, 42], [-75, 35], [-80, 25], [-87, 21], [-97, 18],
      [-93, 15], [-105, 20], [-115, 30], [-124, 40], [-125, 50],
      [-135, 58], [-165, 60], [-168, 66]
    ]
  },
  {
    id: 'europa',
    name: 'Europa',
    nativeName: 'Europe',
    category: 'Continente',
    continent: 'Europa',
    icon: '🌍',
    coords: [15.25, 50.1],
    zoom: 3.2,
    pitch: 35,
    bearing: 5,
    area: '10,180,000 km²',
    population: '746 millones',
    climate: 'Mediterráneo, Oceánico, Continental, Subpolar',
    description: 'Cuna de la civilización occidental moderna, con una densa red de culturas milenarias, los Alpes, llanuras fértiles y extensas costas marinas.',
    highlights: ['Los Alpes', 'Mar Mediterráneo', 'Fiordos Noruegos', 'Río Danubio', 'Península Ibérica'],
    polygon: [
      [-10, 36], [-9, 43], [-1, 46], [-5, 50], [-4, 58],
      [10, 58], [15, 65], [28, 70], [40, 65], [45, 55],
      [35, 45], [26, 40], [20, 38], [15, 36], [5, 36], [-10, 36]
    ]
  },
  {
    id: 'africa',
    name: 'África',
    nativeName: 'Africa',
    category: 'Continente',
    continent: 'África',
    icon: '🌍',
    coords: [21.7, 5.0],
    zoom: 2.7,
    pitch: 30,
    bearing: 0,
    area: '30,370,000 km²',
    population: '1,400 millones',
    climate: 'Ecuatorial, Sabana, Desértico (Sahara), Mediterráneo',
    description: 'Segundo continente más grande del mundo y cuna de la humanidad, hogar del desierto cálido más extenso y de una icónica fauna salvaje en sus sabanas.',
    highlights: ['Desierto del Sahara', 'Río Nilo', 'Gran Valle del Rift', 'Monte Kilimanjaro', 'Selva del Congo', 'Delta del Okavango'],
    polygon: [
      [-17, 15], [-17, 30], [-5, 36], [10, 37], [25, 32],
      [35, 30], [44, 12], [51, 10], [42, -5], [35, -20],
      [28, -34], [18, -34], [12, -15], [9, 4], [-12, 8], [-17, 15]
    ]
  },
  {
    id: 'asia',
    name: 'Asia',
    nativeName: 'Asia',
    category: 'Continente',
    continent: 'Asia',
    icon: '🌏',
    coords: [95.0, 38.0],
    zoom: 2.3,
    pitch: 35,
    bearing: 0,
    area: '44,579,000 km²',
    population: '4,750 millones',
    climate: 'Siberiano polar, Desértico, Monzónico, Tropical húmedo',
    description: 'El continente más grande y poblado de la Tierra, albergando la cumbre más alta del planeta (Everest) y culturas ancestrales de gran influencia global.',
    highlights: ['Cordillera del Himalaya', 'Meseta Tibetana', 'Desierto de Gobi', 'Archipiélago Japonés', 'Sudeste Asiático'],
    polygon: [
      [35, 30], [50, 40], [60, 60], [80, 72], [140, 72],
      [170, 65], [140, 45], [130, 35], [120, 20], [105, 10],
      [95, 5], [80, 10], [70, 22], [55, 25], [35, 30]
    ]
  },
  {
    id: 'oceania',
    name: 'Oceanía',
    nativeName: 'Oceania',
    category: 'Continente',
    continent: 'Oceanía',
    icon: '🌏',
    coords: [134.0, -25.0],
    zoom: 3.0,
    pitch: 30,
    bearing: 0,
    area: '8,526,000 km²',
    population: '45 millones',
    climate: 'Árido, Templado, Marino, Tropical isleño',
    description: 'Continente insular dominado por la masa continental de Australia, los paisajes alpinos y glaciares de Nueva Zelanda y miles de islas polinesias y melanesias.',
    highlights: ['Gran Barrera de Coral', 'Outback Australiano', 'Alpes del Sur de Nueva Zelanda', 'Archipiélago de Fiyi', 'Montes Blue Mountains'],
    polygon: [
      [113, -22], [120, -14], [135, -12], [145, -12], [153, -28],
      [150, -38], [140, -38], [130, -32], [115, -34], [113, -22]
    ]
  },
  {
    id: 'antartida',
    name: 'Antártida',
    nativeName: 'Antarctica',
    category: 'Continente',
    continent: 'Antártida',
    icon: '❄️',
    coords: [0.0, -82.0],
    zoom: 2.2,
    pitch: 60,
    bearing: 0,
    area: '14,200,000 km²',
    population: '1,000 a 5,000 (científicos)',
    climate: 'Polar extremo (el lugar más frío y ventoso de la Tierra)',
    description: 'El continente blanco contiene más del 70% del agua dulce del mundo en forma de hielo. Es un santuario internacional para la ciencia y la paz.',
    highlights: ['Meseta Antártica', 'Península Antártica', 'Barrera de hielo de Ross', 'Monte Erebus', 'Glaciar Thwaites'],
    polygon: [
      [-180, -70], [-90, -65], [0, -68], [90, -65], [180, -70],
      [180, -89], [-180, -89], [-180, -70]
    ]
  }
];

// --- ZONAS GEOGRÁFICAS & MARAVILLAS NATURALES ---
export const WONDER_ZONES = [
  {
    id: 'amazonia',
    name: 'Selva Amazónica',
    nativeName: 'Amazonia',
    category: 'Zona Ecológica',
    continent: 'América',
    icon: '🌿',
    coords: [-62.2, -3.4],
    zoom: 4.8,
    pitch: 45,
    bearing: -15,
    area: '6,700,000 km²',
    population: '30 millones',
    climate: 'Ecuatorial lluvioso continuo',
    description: 'El bosque tropical más extenso del planeta, hogar de 1 de cada 10 especies conocidas y pulmón vital para el ciclo del agua y el carbono global.',
    highlights: ['Río Amazonas', 'Parque Nacional Jaú', 'Canopea tropical', 'Río Negro y Río Solimões'],
    polygon: [
      [-50.0, 0.0], [-51.0, 2.0], [-53.0, 3.5], [-56.0, 2.5], [-59.5, 3.8],
      [-60.5, 4.8], [-63.5, 3.5], [-65.5, 2.0], [-67.0, 1.8], [-70.0, 1.5],
      [-73.0, 2.0], [-75.0, 1.0], [-77.5, 0.5], [-78.5, -1.8], [-77.5, -4.5],
      [-76.5, -7.0], [-74.5, -9.5], [-72.5, -12.5], [-69.5, -14.0], [-66.0, -16.5],
      [-63.5, -17.8], [-60.5, -16.5], [-58.0, -14.5], [-55.0, -13.0], [-53.0, -11.0],
      [-50.0, -9.0], [-48.0, -6.0], [-48.0, -2.0], [-49.0, -0.5], [-50.0, 0.0]
    ]
  },
  {
    id: 'himalaya',
    name: 'Cordillera del Himalaya',
    nativeName: 'The Himalayas',
    category: 'Zona Geográfica',
    continent: 'Asia',
    icon: '🏔️',
    coords: [86.9, 27.9],
    zoom: 5.5,
    pitch: 62,
    bearing: 40,
    area: '595,000 km²',
    population: '52 millones',
    climate: 'Alpino de alta montaña, nieves perpetuas',
    description: 'La cordillera más alta del planeta, surgida por la colisión tectónica entre el subcontinente indio y Eurasia. Alberga los 14 "ochomiles", incluyendo el Monte Everest (8,848 m).',
    highlights: ['Monte Everest', 'K2', 'Meseta Tibetana', 'Glaciares de Siachen', 'Nacimiento de los ríos Ganges e Indo'],
    polygon: [
      [74.0, 35.8], [75.2, 35.2], [76.5, 34.2], [78.2, 32.5], [80.5, 30.8],
      [82.5, 29.8], [84.5, 28.9], [86.5, 28.2], [88.5, 27.8], [90.5, 27.6],
      [92.5, 27.5], [94.5, 28.5], [95.8, 29.8], [95.2, 30.5], [93.8, 29.6],
      [91.8, 28.8], [89.8, 29.0], [87.5, 29.4], [85.5, 29.8], [83.0, 30.8],
      [81.0, 31.8], [78.8, 33.5], [77.0, 35.0], [75.0, 36.2], [74.0, 35.8]
    ]
  },
  {
    id: 'gran-barrera-coral',
    name: 'Gran Barrera de Coral',
    nativeName: 'Great Barrier Reef',
    category: 'Zona Marina',
    continent: 'Oceanía',
    icon: '🪸',
    coords: [147.7, -18.2],
    zoom: 5.2,
    pitch: 48,
    bearing: -20,
    area: '344,400 km²',
    population: 'Ecosistema marino deshabitado',
    climate: 'Marino tropical cálido',
    description: 'La estructura viva más grande de la Tierra, visible desde el espacio exterior. Compuesta por más de 2,900 arrecifes individuales y 900 islas.',
    highlights: ['Arrecife Heart Reef', 'Whitsunday Islands', 'Tortugas verdes marinas', 'Más de 1,500 especies de peces'],
    polygon: [
      [143.5, -9.5], [144.2, -10.8], [145.2, -12.5], [146.0, -14.5], [146.8, -16.5],
      [148.5, -18.8], [150.5, -20.5], [152.8, -21.8], [153.2, -23.5], [152.8, -24.6],
      [154.0, -24.4], [153.8, -22.5], [151.8, -20.0], [149.2, -17.5], [147.2, -15.0],
      [146.0, -13.0], [145.0, -11.0], [144.2, -9.8], [143.5, -9.5]
    ]
  },
  {
    id: 'anillo-de-fuego',
    name: 'Cinturón de Fuego del Pacífico',
    nativeName: 'Pacific Ring of Fire',
    category: 'Zona Geológica',
    continent: 'Mundo',
    icon: '🌋',
    coords: [140.0, 35.0],
    zoom: 3.2,
    pitch: 50,
    bearing: 30,
    area: '40,000 km de longitud',
    population: 'Cientos de millones en zonas costeras',
    climate: 'Variado (Arco circum-pacífico)',
    description: 'La zona con mayor actividad sísmica y volcánica de la Tierra. Concentra más del 75% de los volcanes activos e inactivos del mundo y el 90% de los terremotos.',
    highlights: ['Monte Fuji', 'Fosa de las Marianas', 'Cinturón volcánico de los Andes', 'Krakatoa', 'Falla de San Andrés'],
    polygon: [
      [178.0, -42.0], [175.0, -35.0], [177.0, -22.0], [170.0, -15.0], [155.0, -7.0],
      [145.0, -4.0], [130.0, -2.0], [120.0, 0.0], [122.0, 14.0], [121.0, 24.0],
      [130.0, 32.0], [140.0, 36.0], [145.0, 44.0], [158.0, 52.0], [163.0, 58.0],
      [-175.0, 52.0], [-160.0, 55.0], [-150.0, 60.0], [-140.0, 58.0], [-130.0, 50.0],
      [-122.0, 42.0], [-118.0, 34.0], [-105.0, 20.0], [-90.0, 14.0], [-80.0, 5.0],
      [-77.0, -2.0], [-73.0, -18.0], [-70.0, -32.0], [-72.0, -45.0], [-68.0, -55.0],
      [-75.0, -54.0], [-77.0, -42.0], [-76.0, -30.0], [-79.0, -16.0], [-84.0, 2.0],
      [-95.0, 12.0], [-110.0, 18.0], [-124.0, 32.0], [-127.0, 44.0], [-135.0, 54.0],
      [-148.0, 56.0], [-160.0, 52.0], [-175.0, 49.0], [160.0, 48.0], [148.0, 40.0],
      [138.0, 32.0], [128.0, 28.0], [117.0, 20.0], [116.0, 10.0], [118.0, -5.0],
      [125.0, -8.0], [140.0, -10.0], [150.0, -12.0], [165.0, -20.0], [172.0, -32.0],
      [173.0, -42.0], [178.0, -42.0]
    ]
  },
  {
    id: 'desierto-del-sahara',
    name: 'Desierto del Sahara',
    nativeName: 'Sahara Desert',
    category: 'Zona Geográfica',
    continent: 'África',
    icon: '🏜️',
    coords: [13.0, 23.4],
    zoom: 4.4,
    pitch: 45,
    bearing: 10,
    area: '9,200,000 km²',
    population: '2.5 millones',
    climate: 'Hiperárido, amplitudes térmicas extremas',
    description: 'El desierto cálido más grande del mundo, abarcando 11 países del norte de África con dunas gigantescas (ergs), mesetas rocosas (hamadas) y oasis históricos.',
    highlights: ['Erg Chebbi', 'Estructura de Richat (Ojo del Sahara)', 'Macizo de Ahaggar', 'Ruta de caravanas tuareg'],
    polygon: [
      [-16.8, 20.8], [-15.5, 24.0], [-13.0, 27.5], [-9.5, 29.5], [-5.0, 30.5],
      [-1.0, 32.2], [3.5, 33.5], [8.0, 34.0], [11.0, 33.0], [15.0, 31.2],
      [20.0, 30.8], [25.0, 31.5], [30.0, 31.0], [32.5, 30.0], [34.0, 27.5],
      [35.5, 24.0], [36.5, 20.5], [35.0, 18.0], [32.0, 15.5], [28.0, 14.5],
      [23.0, 14.8], [17.5, 15.2], [12.0, 15.0], [6.0, 15.5], [0.0, 16.0],
      [-6.0, 16.5], [-11.0, 17.0], [-16.0, 17.5], [-16.5, 19.0], [-16.8, 20.8]
    ]
  },
  {
    id: 'fosa-marianas',
    name: 'Fosa de las Marianas',
    nativeName: 'Mariana Trench',
    category: 'Zona Marina',
    continent: 'Oceanía / Pacífico',
    icon: '🌊',
    coords: [142.2, 11.35],
    zoom: 5.0,
    pitch: 55,
    bearing: 45,
    area: '2,550 km de longitud',
    population: 'Abisal / Zona deshabitada',
    climate: 'Presión hidrostática extrema (>1,000 atm)',
    description: 'El punto más profundo de la corteza oceánica terrestre. El abismo Challenger desciende a casi 11,000 metros bajo el nivel del mar, donde habitan criaturas extremófilas.',
    highlights: ['Abismo Challenger (-10,994 m)', 'Sirena Deep', 'Paredes tectónicas de subducción', 'Ecosistemas quimiosintéticos'],
    polygon: [
      [141.5, 11.0], [142.2, 11.35], [143.2, 12.5], [144.2, 14.2], [145.3, 16.5],
      [145.8, 19.0], [145.5, 21.5], [144.8, 23.5], [144.0, 25.0], [145.2, 24.8],
      [146.6, 22.8], [147.2, 19.5], [146.8, 16.2], [145.5, 13.8], [144.2, 12.0],
      [142.8, 10.8], [141.5, 11.0]
    ]
  }
];

// Países destacados con polígonos detallados
export const FEATURED_COUNTRIES_POLYGONS = {
  espana: [
    [-9.3, 42.1], [-8.9, 43.8], [-1.8, 43.4], [3.3, 42.4], [2.2, 41.4],
    [0.2, 40.5], [-0.3, 38.8], [-2.1, 36.7], [-5.6, 36.0], [-7.5, 37.1],
    [-7.4, 38.2], [-6.9, 39.0], [-6.8, 41.5], [-9.3, 42.1]
  ],
  mexico: [
    [-117, 32], [-114, 31], [-108, 31], [-100, 28], [-97, 26],
    [-97, 21], [-91, 19], [-87, 21], [-87, 18], [-92, 14],
    [-96, 16], [-104, 19], [-106, 23], [-110, 24], [-115, 30], [-117, 32]
  ],
  japon: [
    [129, 31], [130, 33], [135, 34], [140, 35], [141, 41],
    [145, 44], [141, 45], [139, 41], [136, 36], [131, 34], [129, 31]
  ],
  islandia: [
    [-24, 65], [-22, 66.5], [-16, 66.5], [-13.5, 65],
    [-15, 63.8], [-19, 63.4], [-23, 64.2], [-24, 65]
  ],
  madagascar: [
    [43.5, -12], [49.5, -12], [50.5, -15], [48.5, -23],
    [47, -25.5], [44, -25.5], [43.5, -21], [44.5, -16], [43.5, -12]
  ]
};

// Enriquecer países con polígonos si están disponibles
const enrichedCountries = ALL_COUNTRIES.map((country) => {
  if (FEATURED_COUNTRIES_POLYGONS[country.id]) {
    return {
      ...country,
      polygon: FEATURED_COUNTRIES_POLYGONS[country.id]
    };
  }
  return country;
});

// Catálogo Global Completo de Zonas del Globo Terráqueo
export const ZONES = [
  ...CONTINENTS,
  ...WONDER_ZONES,
  ...enrichedCountries
];

// Estilos de mapa disponibles
export const MAP_STYLES = [
  {
    id: 'satellite',
    name: 'Satélite Fotorrealista',
    styleUrl: 'mapbox://styles/mapbox/satellite-streets-v12',
    icon: '🛰️',
    description: 'Fotografía satelital de alta resolución con capas de carreteras y relieve.'
  },
  {
    id: 'dark',
    name: 'Modo Cyber Dark',
    styleUrl: 'mapbox://styles/mapbox/dark-v11',
    icon: '🌑',
    description: 'Diseño oscuro elegante de alto contraste, ideal para visualizar zonas y datos nocturnos.'
  },
  {
    id: 'streets',
    name: 'Cartografía Urbana',
    styleUrl: 'mapbox://styles/mapbox/streets-v12',
    icon: '🗺️',
    description: 'Mapa vectorial detallado con nombres de países, ciudades y redes viales.'
  },
  {
    id: 'outdoors',
    name: 'Relieve & Topografía',
    styleUrl: 'mapbox://styles/mapbox/outdoors-v12',
    icon: '🏔️',
    description: 'Énfasis en curvas de nivel, cadenas montañosas y accidentes geográficos.'
  },
  {
    id: 'light',
    name: 'Minimalista Claro',
    styleUrl: 'mapbox://styles/mapbox/light-v11',
    icon: '☀️',
    description: 'Estética limpia y pulida con tonos suaves para visualización ejecutiva.'
  }
];

// Token de acceso por defecto (configurable via VITE_MAPBOX_TOKEN o modal)
export const DEFAULT_MAPBOX_TOKEN = '';
