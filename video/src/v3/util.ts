import { Easing, interpolate } from "remotion";
import { BLOQUES } from "../datos/edicion";

export const ip = (t: number, a: number[], b: number[], easing?: (n: number) => number) =>
  interpolate(t, a, b, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });

export const easeOut = Easing.out(Easing.cubic);
export const easeIn = Easing.in(Easing.cubic);
export const backOut = (s = 1.7) => Easing.out(Easing.back(s));

const TODAS = BLOQUES.flatMap((b) => b.palabras);

// Momento (s, línea de salida) en que se dice una palabra, buscando a partir de `desde`.
export const palabra = (texto: string, desde = 0): number => {
  const p = TODAS.find((w) => w.texto === texto && w.inicio >= desde - 0.02);
  if (!p) throw new Error(`palabra no encontrada: ${texto} desde ${desde}`);
  return p.inicio;
};

// Pseudo-aleatorio determinista.
export const rnd = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
