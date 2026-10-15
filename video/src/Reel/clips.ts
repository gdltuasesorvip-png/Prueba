export type Sfx = "ding" | "boom" | "sparkle";

export type ClipSpec = {
  src: string;
  /** Segundo del clip original en el que empieza (recorta silencio inicial). */
  from: number;
  /** Segundo del clip original en el que termina (recorta silencio final). */
  to: number;
  /** Multiplicador de volumen para nivelar el audio entre clips. */
  gain: number;
  emoji?: string;
  /** Rótulo del capítulo; si falta, el clip no lleva tarjeta. */
  chapter?: string;
  detail?: string;
  /** Efecto de sonido al aparecer el dato destacado. */
  sfx?: Sfx;
  /** Expresión regular (como texto) de la palabra que, al decirse, dispara el dato destacado y su efecto. */
  keyword?: string;
  /** Texto gigante sobre el clip (p. ej. una apertura sin voz). */
  overlay?: string;
  /** Transición de entrada a este clip. */
  enter: "fade" | "slide" | "wipe" | "slideUp";
};

export const CLIPS: ClipSpec[] = [
  {
    src: "clips/enhanced/00-intro.mp4",
    from: 0.9,
    to: 15.27,
    gain: 1,
    emoji: "🤔",
    chapter: "¿Tienes $11.000 guardados?",
    detail: "Si no, mira esto hasta el final",
    sfx: "ding",
    keyword: "guardad|once",
    enter: "slide",
  },
  {
    src: "clips/enhanced/01-consultas.mp4",
    from: 1.0,
    to: 24.5,
    gain: 1,
    emoji: "🩺",
    chapter: "Consultas prenatales y estudios",
    detail: "Acumulado: $2.100",
    sfx: "ding",
    keyword: "consulta",
    enter: "fade",
  },
  {
    src: "clips/enhanced/02-adn-fetal.mp4",
    from: 0,
    to: 13.0,
    gain: 1,
    emoji: "🧬",
    chapter: "ADN fetal",
    detail: "Acumulado: $3.300",
    sfx: "ding",
    keyword: "adn",
    enter: "wipe",
  },
  {
    src: "clips/enhanced/03-parto.mp4",
    from: 0,
    to: 21.3,
    gain: 1,
    emoji: "👶",
    chapter: "Parto natural o cesárea",
    detail: "Total: $6.600 – $11.300",
    sfx: "ding",
    keyword: "parto|cesárea|cesarea",
    enter: "slideUp",
  },
  {
    src: "clips/enhanced/04-complicaciones.mp4",
    from: 1.4,
    to: 10.49,
    gain: 1.8,
    emoji: "⚠️",
    chapter: "¿Y si hay complicaciones?",
    detail: "La cuenta no tiene límite",
    sfx: "boom",
    keyword: "complicaci",
    enter: "slide",
  },
  {
    src: "clips/enhanced/05-seguro.mp4",
    from: 1.0,
    to: 19.14,
    gain: 1.15,
    emoji: "🛡️",
    chapter: "La alternativa: un seguro",
    detail: "$80 – $100 al mes",
    sfx: "sparkle",
    keyword: "seguro",
    enter: "wipe",
  },
];

/** Segundo reel: "¿Cuánto cuesta un parto hoy?" armado con las mejores tomas. */
export const CLIPS2: ClipSpec[] = [
  {
    // Apertura dramática: cabeza entre las manos, sin voz.
    src: "clips2/enhanced/02.mp4",
    from: 0.3,
    to: 4.3,
    gain: 0,
    overlay: "Antes de salir embarazada…",
    enter: "fade",
  },
  {
    // Gancho completo, mejor toma.
    src: "clips2/enhanced/03.mp4",
    from: 4.0,
    to: 26.0,
    gain: 1,
    emoji: "👶",
    chapter: "¿Cuánto cuesta un parto hoy?",
    detail: "Clínica tipo A: $6.000 – $10.000",
    sfx: "boom",
    keyword: "dispara",
    enter: "slide",
  },
  {
    // Cuaderno: la cuenta del plan, en voz en off.
    src: "clips2/enhanced/01.mp4",
    from: 0,
    to: 19.6,
    gain: 0.9,
    emoji: "🧮",
    chapter: "Saquemos la cuenta",
    detail: "Plan con maternidad: $70 – $100 al mes",
    sfx: "sparkle",
    keyword: "plan",
    enter: "wipe",
  },
  {
    // Cierre de la cuenta (se salta la pausa larga).
    src: "clips2/enhanced/01.mp4",
    from: 21.7,
    to: 24.2,
    gain: 0.9,
    enter: "fade",
  },
  {
    // Cobertura, ahorro y llamado a la acción.
    src: "clips2/enhanced/04.mp4",
    from: 3.5,
    to: 37.4,
    gain: 1,
    emoji: "🛡️",
    chapter: "Lo que te cubre el plan",
    detail: "Pagas $1.200 y ahorras $8.800",
    sfx: "sparkle",
    keyword: "ahorras",
    enter: "slideUp",
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
