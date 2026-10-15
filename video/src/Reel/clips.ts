export type ClipSpec = {
  src: string;
  /** Segundo del clip original en el que empieza (recorta silencio inicial). */
  from: number;
  /** Segundo del clip original en el que termina (recorta silencio final). */
  to: number;
  /** Multiplicador de volumen para nivelar el audio entre clips. */
  gain: number;
  chapter: string;
  detail: string;
};

export const CLIPS: ClipSpec[] = [
  {
    src: "clips/01-consultas.mp4",
    from: 1.0,
    to: 24.5,
    gain: 1,
    chapter: "Consultas prenatales y estudios",
    detail: "Acumulado: $2.100",
  },
  {
    src: "clips/02-adn-fetal.mp4",
    from: 0,
    to: 13.0,
    gain: 1,
    chapter: "ADN fetal",
    detail: "Acumulado: $3.300",
  },
  {
    src: "clips/03-parto.mp4",
    from: 0,
    to: 21.3,
    gain: 1,
    chapter: "Parto natural o cesárea",
    detail: "Total: $6.600 – $11.300",
  },
  {
    src: "clips/04-complicaciones.mp4",
    from: 1.4,
    to: 10.49,
    gain: 1.8,
    chapter: "¿Y si hay complicaciones?",
    detail: "La cuenta no tiene límite",
  },
  {
    src: "clips/05-seguro.mp4",
    from: 1.0,
    to: 19.14,
    gain: 1.15,
    chapter: "La alternativa: un seguro",
    detail: "$80 – $100 al mes",
  },
];

export const COLORS = {
  bg: "#0B1120",
  teal: "#1FB8B0",
  lime: "#D4F23A",
  white: "#FFFFFF",
};

export const FONT = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif";
