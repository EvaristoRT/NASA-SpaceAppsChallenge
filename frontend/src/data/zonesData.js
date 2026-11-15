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
  }
];

