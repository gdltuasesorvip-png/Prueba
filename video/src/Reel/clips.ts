export type Sfx = "ding" | "boom" | "sparkle";

export type ClipSpec = {
  src: string;
  /** Segundo del clip original en el que empieza (recorta silencio inicial). */
  from: number;
  /** Segundo del clip original en el que termina (recorta silencio final). */
  to: number;
  /** Multiplicador de volumen para nivelar el audio entre clips. */
  gain: number;
  emoji: string;
  chapter: string;
  detail: string;
  /** Efecto de sonido al aparecer el dato destacado. */
  sfx: Sfx;
};

export const CLIPS: ClipSpec[] = [
  {
    src: "clips/00-intro.mp4",
    from: 0.9,
    to: 15.27,
    gain: 1,
    emoji: "🤔",
    chapter: "¿Tienes $11.000 guardados?",
    detail: "Si no, mira esto hasta el final",
    sfx: "ding",
  },
  {
    src: "clips/01-consultas.mp4",
    from: 1.0,
    to: 24.5,
    gain: 1,
    emoji: "🩺",
    chapter: "Consultas prenatales y estudios",
    detail: "Acumulado: $2.100",
    sfx: "ding",
  },
  {
    src: "clips/02-adn-fetal.mp4",
    from: 0,
    to: 13.0,
    gain: 1,
    emoji: "🧬",
    chapter: "ADN fetal",
    detail: "Acumulado: $3.300",
    sfx: "ding",
  },
  {
    src: "clips/03-parto.mp4",
    from: 0,
    to: 21.3,
    gain: 1,
    emoji: "👶",
    chapter: "Parto natural o cesárea",
    detail: "Total: $6.600 – $11.300",
    sfx: "ding",
  },
  {
    src: "clips/04-complicaciones.mp4",
    from: 1.4,
    to: 10.49,
    gain: 1.8,
    emoji: "⚠️",
    chapter: "¿Y si hay complicaciones?",
    detail: "La cuenta no tiene límite",
    sfx: "boom",
  },
  {
    src: "clips/05-seguro.mp4",
    from: 1.0,
    to: 19.14,
    gain: 1.15,
    emoji: "🛡️",
    chapter: "La alternativa: un seguro",
    detail: "$80 – $100 al mes",
    sfx: "sparkle",
  },
];

export const COLORS = {
  bg: "#0B1120",
  teal: "#1FB8B0",
  lime: "#D4F23A",
  red: "#FF5A5F",
  white: "#FFFFFF",
};

export const FONT =
  "Inter, 'Helvetica Neue', Helvetica, Arial, 'Noto Color Emoji', sans-serif";
