// Convierte la salida de faster-whisper (JSON por clip) en src/Reel/transcript.ts
// Uso: node scripts/build-transcript.mjs <carpeta-json>
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
// Mismo recorte inicial que en src/Reel/clips.ts (segundos descartados al inicio de cada clip).
const FROM = {
  "00-intro": 0.9,
  "01-consultas": 1.0,
  "02-adn-fetal": 0,
  "03-parto": 0,
  "04-complicaciones": 1.4,
  "05-seguro": 1.0,
};
const out = {};
for (const [name, from] of Object.entries(FROM)) {
  const segs = JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), "utf8"));
  const words = [];
  for (const s of segs) {
    for (const w of s.words) {
      const start = +(w.s - from).toFixed(2);
      const end = +(w.e - from).toFixed(2);
      if (end <= 0) continue;
      let text = w.w;
      const prev = words[words.length - 1];
      // Whisper a veces parte las cifras en dos tokens ("$11" + ",000"): se vuelven a unir.
      if (prev && /^[.,]\d{3}/.test(text) && /\d$/.test(prev.w)) {
        prev.w = (prev.w + text).replace(/,(\d{3})/g, ".$1");
        prev.e = end;
        continue;
      }
      text = text.replace(/(\d),(\d{3})/g, "$1.$2");
      words.push({ w: text, s: Math.max(0, start), e: end });
    }
  }
  out[name] = words;
}
const ts = `// Generado por scripts/build-transcript.mjs. Tiempos en segundos relativos al inicio recortado de cada clip.
export type Word = { w: string; s: number; e: number };

export const TRANSCRIPT: Record<string, Word[]> = ${JSON.stringify(out, null, 1)};
`;
fs.writeFileSync("src/Reel/transcript.ts", ts);
console.log("ok", Object.entries(out).map(([k, v]) => `${k}: ${v.length} palabras`).join(", "));
