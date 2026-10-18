// Valores tomados de estilo.md (medidos sobre referencia.mp4 y escalados a 1080x1920).
export const COLOR = {
  azul: "#0e56f6",
  negro: "#131215",
  gris: "#8a8f9c",
  azulClaro: "#dbe6ff",
  blanco: "#fbfafd",
  oscuro: "#151821",
  verde: "#4ade80",
  naranja: "#d97757",
  fondoFinal: "#0e0e1a",
  manchaTR: "#d2dffd",
  manchaBL: "#dee6fa",
};

export const SUB = {
  fuente: "Nunito, sans-serif",
  tamNormal: 46,
  tamDestacada: 104,
  pesoNormal: 700,
  pesoDestacada: 900,
  anchoMax: 760,
  interlineado: 1.05,
  yBusto: 190, // centro del bloque sobre busto (≈10 %)
  yGraficoAbajo: 1480, // centro del bloque bajo un gráfico (≈77 %)
  yGraficoArriba: 190,
  framesEntrada: 3, // 100 ms
  framesSalida: 3,
  blurPx: 8,
  sombraBusto: "0 2px 12px rgba(0,0,0,0.35)",
};

export const GRAF = {
  framesEntrada: 6, // 200 ms
  desplazamiento: 24,
  blurPx: 6,
  radioTarjeta: 28,
  sombraTarjeta: "0 20px 60px rgba(20,30,80,0.10)",
  mono: "'JetBrains Mono', monospace",
};

export const ZOOM = { pushIn: 0.05 }; // +5 % en ~3 s
