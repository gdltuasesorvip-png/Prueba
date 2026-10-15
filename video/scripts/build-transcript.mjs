// Convierte la salida de faster-whisper (JSON por clip) en src/Reel/transcript.ts
// Uso: node scripts/build-transcript.mjs <carpeta-json> [<otra-carpeta> ...]
// Los tiempos quedan en segundos relativos al archivo original (sin recortes).
import fs from "node:fs";
import path from "node:path";

const out = {};
for (const dir of process.argv.slice(2)) {
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const name = file.replace(/\.json$/, "");
    const segs = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    const words = [];
    for (const s of segs) {
      for (const w of s.words) {
        let text = w.w;
        const prev = words[words.length - 1];
        // Whisper a veces parte las cifras en dos tokens ("$11" + ",000"): se vuelven a unir.
        if (prev && /^[.,]\d{3}/.test(text) && /\d$/.test(prev.w)) {
          prev.w = (prev.w + text).replace(/,(\d{3})/g, ".$1");
          prev.e = w.e;
          continue;
        }
        text = text.replace(/(\d),(\d{3})/g, "$1.$2");
        words.push({ w: text, s: w.s, e: w.e });
      }
    }
    out[name] = words;
  }
}
const ts = `// Generado por scripts/build-transcript.mjs. Tiempos en segundos relativos al archivo original de cada clip.
export type Word = { w: string; s: number; e: number };

export const TRANSCRIPT: Record<string, Word[]> = ${JSON.stringify(out, null, 1)};
`;
fs.writeFileSync("src/Reel/transcript.ts", ts);
console.log("ok", Object.entries(out).map(([k, v]) => `${k}: ${v.length}`).join(", "));
