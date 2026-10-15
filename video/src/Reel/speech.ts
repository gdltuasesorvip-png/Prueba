import { Word } from "./transcript";

export type Chunk = { start: number; end: number; words: Word[] };

const clean = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}$.]/gu, "");

/** Agrupa palabras en bloques cortos para subtítulos tipo reel. */
export const chunkWords = (words: Word[], maxWords = 3, maxGap = 0.7): Chunk[] => {
  const chunks: Chunk[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) {
      chunks.push({ start: cur[0].s, end: cur[cur.length - 1].e, words: cur });
      cur = [];
    }
  };
  words.forEach((w, i) => {
    const prev = words[i - 1];
    if (prev && w.s - prev.e > maxGap) flush();
    cur.push(w);
    const endsSentence = /[.!?]$/.test(w.w);
    if (cur.length >= maxWords || endsSentence) flush();
  });
  flush();
  return chunks;
};

const NUMBER_WORDS = new Set([
  "mil", "cien", "ciento", "cientos", "dos", "tres", "cuatro", "cinco",
  "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince",
  "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa",
  "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos",
  "ochocientos", "novecientos", "dólares", "dolares", "y",
]);

const isNumeric = (w: string) => {
  const c = clean(w);
  return /^\$?\d[\d.,]*$/.test(c) || NUMBER_WORDS.has(c);
};

export type AmountEvent = { start: number; end: number; text: string };

/** Detecta montos en el habla (cifras o números en palabras) y devuelve cuándo se dicen. */
export const findAmounts = (words: Word[]): AmountEvent[] => {
  const events: AmountEvent[] = [];
  let run: Word[] = [];
  const flush = () => {
    const core = run.filter((w) => {
      const c = clean(w.w);
      return !["y", "dólares", "dolares"].includes(c);
    });
    if (core.length) {
      const digits = run.find((w) => /\d/.test(w.w));
      const text = digits
        ? run.filter((w) => /\d|\$/.test(w.w)).map((w) => w.w).join(" ")
        : run.map((w) => w.w).join(" ");
      events.push({ start: run[0].s, end: run[run.length - 1].e, text: text.replace(/[,.]$/, "") });
    }
    run = [];
  };
  words.forEach((w) => {
    if (isNumeric(w.w)) {
      const c = clean(w.w);
      // "y" y "un" solo cuentan dentro de una cifra, no al inicio.
      if (run.length === 0 && ["y", "dólares", "dolares"].includes(c)) return;
      run.push(w);
    } else flush();
  });
  flush();
  // Evita duplicados muy seguidos (p. ej. "mil cien" repetido).
  return events.filter((e, i) => i === 0 || e.start - events[i - 1].end > 0.8);
};

export const EMOJI_RULES: { re: RegExp; emoji: string }[] = [
  { re: /consulta/, emoji: "🩺" },
  { re: /estudio|examen|exámen|laboratorio|ecograf/, emoji: "🔬" },
  { re: /adn|genét/, emoji: "🧬" },
  { re: /embaraz|bebé|bebe|hijo/, emoji: "🤰" },
  { re: /parto|cesárea|cesarea|nacer|nace/, emoji: "👶" },
  { re: /complicaci|emergencia|riesgo/, emoji: "⚠️" },
  { re: /incubadora|intensiva|terapia|hospital|clínica|clinica/, emoji: "🏥" },
  { re: /guardad|ahorr|banco/, emoji: "🏦" },
  { re: /seguro|protec|cobertura|póliza|poliza/, emoji: "🛡️" },
  { re: /mes|mensual|anual|año/, emoji: "📅" },
  { re: /dólar|dolar|plata|dinero|pagar|cuesta|costo|gasto|cuenta/, emoji: "💸" },
  { re: /perfecto|tranquil|feliz/, emoji: "✨" },
];

export type EmojiEvent = { start: number; emoji: string };

/** Emojis que saltan cuando se dice una palabra clave (máximo uno cada 1,5 s). */
export const findEmojis = (words: Word[]): EmojiEvent[] => {
  const events: EmojiEvent[] = [];
  for (const w of words) {
    const c = clean(w.w);
    const rule = EMOJI_RULES.find((r) => r.re.test(c));
    if (!rule) continue;
    const last = events[events.length - 1];
    if (last && w.s - last.start < 1.5) continue;
    events.push({ start: w.s, emoji: rule.emoji });
  }
  return events;
};

/** Palabra clave para resaltar en el subtítulo. */
export const isKeyword = (w: string) =>
  isNumeric(w) || EMOJI_RULES.some((r) => r.re.test(clean(w))) || /\bno\b/.test(clean(w));
