import { useSyncExternalStore } from 'react';

// Rampa de color de los días con fuego, compartida por el calendario, la capa del mapa y las leyendas.
// Cero = "sin fuego" (color propio, no el primer color de la rampa).
// Dos paletas: Inferno (térmica, la de siempre) y Cividis (modo accesible, pensada para daltonismo).
export const INFERNO = ['#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#f7d13d', '#fcffa4'];
export const CIVIDIS = ['#00224e', '#123570', '#3b496c', '#575d6d', '#707173', '#8a8678', '#a59c74', '#c3b369', '#e1cc55', '#fee838'];

// floor: las rampas oscuras empiezan más arriba, para que sobre el fondo atenuado de la zona los valores bajos no se hundan.
// textAbove: a partir de este punto de la rampa el texto sobre la celda va en negro.
const PALETTES = {
  inferno: { stops: INFERNO, floor: 0.45, textAbove: 0.62 },
  cividis: { stops: CIVIDIS, floor: 0.3, textAbove: 0.6 }
};

// Modo de colores accesibles: se recuerda en el navegador y lo comparten el calendario, el mapa y las leyendas
const STORAGE_KEY = 'ignissync-ramp';
const readSaved = () => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved && PALETTES[saved] ? saved : 'inferno';
  } catch {
    return 'inferno';
  }
};
let current = readSaved();
const listeners = new Set();

export const getRampId = () => current;
export const isAccessible = () => current !== 'inferno';
export function setRampId(id) {
  if (!PALETTES[id] || id === current) return;
  current = id;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // sin almacenamiento: el modo vale solo para esta visita
  }
  listeners.forEach((listener) => listener());
}
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
// Hook: vuelve a pintar el componente cuando cambia la paleta
export const useRampId = () => useSyncExternalStore(subscribe, getRampId);

export const getFloor = () => PALETTES[current].floor;

// Escala fija del mapa (días-celda por hexágono y mes): la misma para todos los meses, para poder compararlos.
// 40 cubre el percentil 99 medido en Argentina y Chile (37.5); lo que pasa de ahí se pinta con el color máximo.
export const FIRE_MAX = 40;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function ramp(t) {
  const stops = PALETTES[current].stops;
  const x = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const a = hexToRgb(stops[i]);
  const b = hexToRgb(stops[i + 1]);
  const f = x - i;
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',')})`;
}

// Color del texto sobre una celda del punto t de la rampa. Inferno conserva su umbral de siempre; en el modo accesible se elige
// el negro o el blanco con más contraste, para que el número se lea sobre los tonos grises de Cividis.
export function textColorAt(t) {
  if (current === 'inferno') return t > PALETTES.inferno.textAbove ? '#000000' : '#ffffff';
  const [r, g, b] = ramp(t)
    .match(/\d+/g)
    .map((v) => {
      const c = Number(v) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#000000' : '#ffffff';
}

// Gradiente de la leyenda (de 0 al máximo de la escala)
export const rampGradient = () => {
  const floor = getFloor();
  return `linear-gradient(90deg, ${Array.from({ length: 12 }, (_, i) => ramp(floor + ((1 - floor) * i) / 11)).join(',')})`;
};

// Expresión de Mapbox con el mismo color que el calendario: raíz cuadrada del valor sobre FIRE_MAX, sobre la rampa activa
export const fireColorExpression = () => {
  const { stops, floor } = PALETTES[current];
  return [
    'interpolate',
    ['linear'],
    ['+', floor, ['*', 1 - floor, ['sqrt', ['min', ['/', ['get', 'v'], FIRE_MAX], 1]]]],
    ...stops.flatMap((color, i) => [i / (stops.length - 1), color])
  ];
};
