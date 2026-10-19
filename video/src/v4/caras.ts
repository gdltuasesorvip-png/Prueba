// Evita tapar rostros: elige, entre posiciones candidatas, la primera que no pise ninguna cara
// durante todo el tiempo que el elemento está en pantalla (teniendo en cuenta el zoom de cámara).
export type Rect = [number, number, number, number]; // x, y, ancho, alto (lienzo 1080x1920)
export type Muestra = { t: number; c: number[][] };
export type Cam = (t: number) => { s: number; x: number };

const MARGEN = 36;
const ORIGEN: [number, number] = [540, 864]; // transformOrigin de la cámara (50% 45%)

const cajasEn = (caras: Muestra[], a: number, b: number, cam?: Cam): number[][] => {
  const out: number[][] = [];
  for (const m of caras) {
    if (m.t < a - 0.25 || m.t > b + 0.25) continue;
    const { s, x } = cam ? cam(m.t) : { s: 1, x: 0 };
    for (const [x0, y0, x1, y1] of m.c) {
      out.push([ORIGEN[0] + (x0 - ORIGEN[0]) * s + x - MARGEN, ORIGEN[1] + (y0 - ORIGEN[1]) * s - MARGEN, ORIGEN[0] + (x1 - ORIGEN[0]) * s + x + MARGEN, ORIGEN[1] + (y1 - ORIGEN[1]) * s + MARGEN]);
    }
  }
  return out;
};

const solape = (r: Rect, c: number[]) => {
  const w = Math.max(0, Math.min(r[0] + r[2], c[2]) - Math.max(r[0], c[0]));
  const h = Math.max(0, Math.min(r[1] + r[3], c[3]) - Math.max(r[1], c[1]));
  return w * h;
};

export const elegir = (caras: Muestra[], a: number, b: number, candidatos: Rect[], cam?: Cam): Rect => {
  const cajas = cajasEn(caras, a, b, cam);
  let mejor = candidatos[0];
  let menor = Infinity;
  for (const r of candidatos) {
    const total = cajas.reduce((acc, c) => acc + solape(r, c), 0);
    if (total === 0) return r;
    if (total < menor) {
      menor = total;
      mejor = r;
    }
  }
  return mejor;
};
