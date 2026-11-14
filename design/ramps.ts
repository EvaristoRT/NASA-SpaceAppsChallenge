/* Colour ramps for hotspot counts and anomalies. Depends on: d3-scale-chromatic (+ @types).
   All ramps are perceptually uniform and colour-blind safe. */
import {
  interpolateCividis,
  interpolateInferno,
  interpolateMagma,
  interpolatePuOr,
  interpolateViridis,
} from "d3-scale-chromatic";

export type RampId = "viridis" | "cividis" | "inferno" | "magma";
export type Transform = "linear" | "sqrt" | "log";

/* `floor` = where the ramp starts (0..1). Dark ramps (inferno/magma/cividis) begin almost black/navy, which would
   merge with the "no fire" cell on a deep-blue background, so they start higher. */
/* `group`: "thermal" = the normal look; "accessible" = colour-vision-deficiency options, shown under their own
   "Accessibility" heading in the selector. */
export type RampGroup = "thermal" | "accessible";
export const RAMPS: Record<RampId, { label: string; interpolate: (t: number) => string; note: string; floor: number; group: RampGroup }> = {
  inferno: { label: "Inferno", interpolate: interpolateInferno, floor: 0.2, group: "thermal", note: "Default. Thermal-camera look; perceptually uniform." },
  magma: { label: "Magma", interpolate: interpolateMagma, floor: 0.2, group: "thermal", note: "Softer thermal alternative." },
  viridis: { label: "Viridis", interpolate: interpolateViridis, floor: 0.08, group: "accessible", note: "Safe for the common colour-vision deficiencies." },
  cividis: { label: "Cividis", interpolate: interpolateCividis, floor: 0.15, group: "accessible", note: "Optimised for colour-vision deficiency." },
};
export const DEFAULT_RAMP: RampId = "inferno";

export const RAMP_GROUPS: { id: RampGroup; label: string; ramps: RampId[] }[] = [
  { id: "thermal", label: "Térmicas", ramps: (Object.keys(RAMPS) as RampId[]).filter((r) => RAMPS[r].group === "thermal") },
  { id: "accessible", label: "Accesibilidad (daltonismo)", ramps: (Object.keys(RAMPS) as RampId[]).filter((r) => RAMPS[r].group === "accessible") },
];

/* Zero hotspots must read as "no fire", not as the lowest colour of the ramp. Mirrors tokens.css. */
export const NO_FIRE = { dark: "#20233b", light: "#e9ecf5" };
export const NO_DATA = { dark: "#2c3050", light: "#d9deec" };

/* Hotspot markers on the map: oxide orange core with a neon-yellow halo (brand colours). */
export const HOTSPOT = { core: "#ff5804", halo: "#e7f434" };

export const MAP_STYLE = { dark: "mapbox://styles/mapbox/dark-v11", light: "mapbox://styles/mapbox/light-v11" };

function norm(v: number, max: number, mode: Transform): number {
  if (v <= 0 || max <= 0) return 0;
  const x = Math.min(v / max, 1);
  if (mode === "sqrt") return Math.sqrt(x);
  if (mode === "log") return Math.log1p(v) / Math.log1p(max);
  return x;
}

/** Colour for a monthly count. `max` is usually the 95th-99th percentile so one extreme month does not wash out the rest.
 *  The ramp starts at its `floor` so the lowest non-zero value is still distinguishable from NO_FIRE. */
export function countColor(
  v: number | null | undefined,
  max: number,
  ramp: RampId = DEFAULT_RAMP,
  mode: Transform = "sqrt",
  theme: "dark" | "light" = "dark",
): string {
  if (v == null) return NO_DATA[theme];
  if (v <= 0) return NO_FIRE[theme];
  const { interpolate, floor } = RAMPS[ramp];
  return interpolate(floor + (1 - floor) * norm(v, max, mode));
}

/** Anomaly vs historical median. ratio = count / median.
 *  Diverging PuOr (colour-blind safe): purple = below normal, orange = above normal, light = normal.
 *  Symmetric on log2: 0.5x and 2x sit at the extremes. */
export function anomalyColor(ratio: number | null | undefined, theme: "dark" | "light" = "dark"): string {
  if (ratio == null || !isFinite(ratio) || ratio <= 0) return NO_DATA[theme];
  const t = Math.max(-1, Math.min(1, Math.log2(ratio))); // -1 .. 1
  return interpolatePuOr((t + 1) / 2); // d3 PuOr: 0 = purple, 1 = orange -> above normal = orange
}

/** Black or white text, whichever has more contrast on `color` (accepts "#rrggbb" or "rgb(r, g, b)"). */
export function textOn(color: string): "#000000" | "#ffffff" {
  const m = color.match(/\d+(\.\d+)?/g);
  let r: number, g: number, b: number;
  if (color.startsWith("#")) {
    const h = color.length === 4 ? color.slice(1).replace(/./g, "$&$&") : color.slice(1);
    [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  } else if (m && m.length >= 3) {
    [r, g, b] = m.slice(0, 3).map(Number);
  } else return "#ffffff";
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.179 ? "#000000" : "#ffffff";
}

/** n evenly spaced legend stops for a ramp (for a legend bar or Mapbox step expression). */
export function legendStops(ramp: RampId = DEFAULT_RAMP, n = 7): string[] {
  const { interpolate, floor } = RAMPS[ramp];
  return Array.from({ length: n }, (_, i) => interpolate(floor + ((1 - floor) * i) / (n - 1)));
}
