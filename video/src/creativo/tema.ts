// Paleta y transición por escena para la versión creativa.
export type Tema = { nombre: string; claro: boolean; acento: string; acento2: string; transicion: "circulo" | "barrido" | "zoomBlur" | "deslizar" };

export const TEMAS: Record<string, Tema> = {
  coste: { nombre: "coste", claro: true, acento: "#0e56f6", acento2: "#7cc4ff", transicion: "circulo" },
  complicaciones: { nombre: "complicaciones", claro: false, acento: "#ff5a3c", acento2: "#ffb020", transicion: "zoomBlur" },
  cobertura: { nombre: "cobertura", claro: true, acento: "#12b76a", acento2: "#8de4b5", transicion: "deslizar" },
  ahorro: { nombre: "ahorro", claro: false, acento: "#ffb020", acento2: "#12b76a", transicion: "barrido" },
  plazo: { nombre: "plazo", claro: true, acento: "#ff2d7a", acento2: "#ffb3cf", transicion: "circulo" },
  comenta: { nombre: "comenta", claro: false, acento: "#7c5cff", acento2: "#4fd1ff", transicion: "deslizar" },
};

export const TEMA_BUSTO: Tema = { nombre: "busto", claro: false, acento: "#ffb020", acento2: "#ff5a3c", transicion: "circulo" };
export const TEMA_CUADERNO: Tema = { nombre: "cuaderno", claro: true, acento: "#0e56f6", acento2: "#7cc4ff", transicion: "deslizar" };

export const FONDO_CLARO = "#fbfafd";
export const FONDO_OSCURO = "#0f1120";
export const TEXTO_CLARO = "#131215";
export const TEXTO_OSCURO = "#ffffff";
