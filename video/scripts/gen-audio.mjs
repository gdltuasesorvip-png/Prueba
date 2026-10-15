// Genera música de fondo suave y efectos de sonido como WAV (sin derechos de terceros).
import fs from "node:fs";
const SR = 44100;

function writeWav(path, L, R) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.max(-1, Math.min(1, L[i])) * 32767, 44 + i * 4);
    buf.writeInt16LE(Math.max(-1, Math.min(1, R[i])) * 32767, 46 + i * 4);
  }
  fs.writeFileSync(path, buf);
}
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const sec = (s) => Math.round(s * SR);

// ---------- Música: 72 bpm, Do mayor, I - V - vi - IV ----------
function music(durationSec) {
  const n = sec(durationSec);
  const L = new Float32Array(n), R = new Float32Array(n);
  const bpm = 72, beat = 60 / bpm, bar = beat * 4;
  const chords = [
    [60, 64, 67, 71], // Cmaj7
    [55, 59, 62, 67], // G
    [57, 60, 64, 67], // Am7
    [53, 57, 60, 64], // F
  ];
  const addTone = (startS, durS, freq, amp, pan, attack, decayRate, harm2) => {
    const s0 = sec(startS), len = sec(durS);
    for (let i = 0; i < len && s0 + i < n; i++) {
      const t = i / SR;
      const env = Math.min(1, t / attack) * Math.exp(-decayRate * t) *
        (i > len - sec(0.05) ? (len - i) / sec(0.05) : 1);
      const v = (Math.sin(2 * Math.PI * freq * t) + harm2 * Math.sin(2 * Math.PI * freq * 2 * t + 0.3)) * amp * env;
      L[s0 + i] += v * (1 - pan) ; R[s0 + i] += v * pan;
    }
  };
  for (let b = 0; b * bar < durationSec; b++) {
    const ch = chords[b % 4];
    const t0 = b * bar;
    // Pad sostenido
    ch.forEach((m, k) => addTone(t0, bar + 0.4, midi(m), 0.05, 0.4 + 0.07 * k, 0.6, 0.25, 0.25));
    // Bajo suave en 1 y 3
    [0, 2].forEach((bt) => addTone(t0 + bt * beat, beat * 2, midi(ch[0] - 12), 0.11, 0.5, 0.01, 1.6, 0.1));
    // Arpegio de corcheas, tipo piano suave
    const arp = [ch[0], ch[1], ch[2], ch[3], ch[2] + 12, ch[1] + 12, ch[3], ch[2]];
    for (let e = 0; e < 8; e++) {
      const vel = e % 2 === 0 ? 0.075 : 0.055;
      addTone(t0 + e * beat * 0.5, 1.4, midi(arp[e]), vel, 0.3 + 0.4 * (e / 7), 0.004, 2.2, 0.35);
    }
  }
  // Entrada y salida suaves
  for (let i = 0; i < sec(2); i++) { const g = i / sec(2); L[i] *= g; R[i] *= g; }
  for (let i = 0; i < sec(3); i++) { const g = i / sec(3); L[n - 1 - i] *= g; R[n - 1 - i] *= g; }
  return [L, R];
}

// ---------- Música 2: 92 bpm, La menor, vi - IV - I - V, más pulso ----------
function music2(durationSec) {
  const n = sec(durationSec);
  const L = new Float32Array(n), R = new Float32Array(n);
  const bpm = 92, beat = 60 / bpm, bar = beat * 4;
  const chords = [
    [57, 60, 64, 67], // Am7
    [53, 57, 60, 64], // F
    [60, 64, 67, 71], // Cmaj7
    [55, 59, 62, 67], // G
  ];
  const addTone = (startS, durS, freq, amp, pan, attack, decayRate, harm2) => {
    const s0 = sec(startS), len = sec(durS);
    for (let i = 0; i < len && s0 + i < n; i++) {
      const t = i / SR;
      const env = Math.min(1, t / attack) * Math.exp(-decayRate * t) *
        (i > len - sec(0.03) ? (len - i) / sec(0.03) : 1);
      const v = (Math.sin(2 * Math.PI * freq * t) + harm2 * Math.sin(2 * Math.PI * freq * 2 * t + 0.3)
        + 0.12 * Math.sin(2 * Math.PI * freq * 3 * t)) * amp * env;
      L[s0 + i] += v * (1 - pan); R[s0 + i] += v * pan;
    }
  };
  for (let b = 0; b * bar < durationSec; b++) {
    const ch = chords[b % 4];
    const t0 = b * bar;
    ch.forEach((m, k) => addTone(t0, bar + 0.3, midi(m), 0.04, 0.4 + 0.07 * k, 0.5, 0.2, 0.3));
    // Bajo pulsante en corcheas
    for (let e = 0; e < 8; e++) addTone(t0 + e * beat * 0.5, 0.3, midi(ch[0] - 24), e % 2 === 0 ? 0.16 : 0.1, 0.5, 0.005, 6, 0.2);
    // Arpegio en semicorcheas, suave
    const arp = [ch[0], ch[2], ch[1], ch[3], ch[2] + 12, ch[1], ch[3], ch[0] + 12];
    for (let e = 0; e < 16; e++) addTone(t0 + e * beat * 0.25, 0.5, midi(arp[e % 8] + 12), e % 4 === 0 ? 0.05 : 0.03, 0.3 + 0.4 * ((e % 8) / 7), 0.003, 5, 0.3);
    // Golpe de percusión sintética en 1 y 3 (ruido corto filtrado por decaimiento)
    [0, 2].forEach((bt) => { const s0 = sec(t0 + bt * beat); let seed = 11 + b; for (let i = 0; i < sec(0.12) && s0 + i < n; i++) { seed = (seed * 1664525 + 1013904223) % 4294967296; const r = seed / 4294967296 * 2 - 1; const v = r * 0.12 * Math.exp(-40 * i / SR); L[s0 + i] += v; R[s0 + i] += v; } });
  }
  for (let i = 0; i < sec(1.5); i++) { const g = i / sec(1.5); L[i] *= g; R[i] *= g; }
  for (let i = 0; i < sec(3); i++) { const g = i / sec(3); L[n - 1 - i] *= g; R[n - 1 - i] *= g; }
  return [L, R];
}

// ---------- Efectos ----------
function fx(durS, fn) {
  const n = sec(durS); const L = new Float32Array(n), R = new Float32Array(n);
  let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 * 2 - 1; };
  for (let i = 0; i < n; i++) { const t = i / SR; const [l, r] = fn(t, rnd); L[i] = l; R[i] = r; }
  return [L, R];
}
const whoosh = fx(0.5, (t, rnd) => {
  const env = Math.sin(Math.PI * Math.min(1, t / 0.5)) ** 1.5;
  const v = rnd() * 0.5 * env;
  return [v, v * 0.9];
});
const pop = fx(0.18, (t) => {
  const f = 900 - 2500 * t; const v = 0.6 * Math.sin(2 * Math.PI * f * t) * Math.exp(-28 * t);
  return [v, v];
});
const ding = fx(1.1, (t) => {
  const v = 0.45 * (Math.sin(2 * Math.PI * 1568 * t) + 0.5 * Math.sin(2 * Math.PI * 2349 * t) + 0.25 * Math.sin(2 * Math.PI * 3136 * t)) * Math.exp(-5 * t);
  return [v, v];
});
const boom = fx(1.6, (t, rnd) => {
  const f = 48 + 40 * Math.exp(-9 * t);
  const v = 0.9 * Math.sin(2 * Math.PI * f * t) * Math.exp(-2.6 * t) + 0.12 * rnd() * Math.exp(-14 * t);
  return [v, v];
});
const sparkle = fx(1.4, (t) => {
  const notes = [1046.5, 1318.5, 1568, 2093];
  let v = 0;
  notes.forEach((f, k) => { const tt = t - k * 0.09; if (tt > 0) v += 0.28 * Math.sin(2 * Math.PI * f * tt) * Math.exp(-4 * tt); });
  return [v, v];
});
const riser = fx(1.2, (t, rnd) => {
  const env = Math.min(1, t / 1.0) ** 2 * (t > 1.05 ? Math.max(0, (1.2 - t) / 0.15) : 1);
  const v = (rnd() * 0.25 + 0.2 * Math.sin(2 * Math.PI * (200 + 600 * t) * t)) * env;
  return [v, v];
});

const click = fx(0.08, (t, rnd) => { const v = (rnd() * 0.5 + 0.5 * Math.sin(2 * Math.PI * 2400 * t)) * Math.exp(-90 * t); return [v, v]; });
const blip = fx(0.14, (t) => { const v = 0.5 * Math.sin(2 * Math.PI * (700 + 900 * t) * t) * Math.exp(-30 * t); return [v, v]; });
const tick = fx(0.06, (t) => { const v = 0.6 * Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-120 * t); return [v, v]; });
const swoosh = fx(0.35, (t, rnd) => { const env = Math.sin(Math.PI * Math.min(1, t / 0.35)) ** 2; const v = (rnd() * 0.3 + 0.25 * Math.sin(2 * Math.PI * (300 + 1800 * t) * t)) * env; return [v * 0.6, v]; });
const cash = fx(1.0, (t, rnd) => {
  // Caja registradora: campanilla + lluvia de monedas
  let v = 0.35 * (Math.sin(2 * Math.PI * 2093 * t) + 0.4 * Math.sin(2 * Math.PI * 3136 * t)) * Math.exp(-6 * t);
  for (let k = 0; k < 8; k++) { const tt = t - 0.08 - k * 0.07; if (tt > 0) v += 0.14 * Math.sin(2 * Math.PI * (2500 + 400 * (k % 3)) * tt) * Math.exp(-35 * tt); }
  v += 0.05 * rnd() * Math.exp(-10 * t);
  return [v, v];
});
const hit = fx(0.6, (t, rnd) => { const v = 0.8 * Math.sin(2 * Math.PI * (90 + 60 * Math.exp(-20 * t)) * t) * Math.exp(-7 * t) + 0.25 * rnd() * Math.exp(-30 * t); return [v, v]; });

const out = process.argv[2];
writeWav(`${out}/music2.wav`, ...music2(110));
writeWav(`${out}/click.wav`, ...click);
writeWav(`${out}/blip.wav`, ...blip);
writeWav(`${out}/tick.wav`, ...tick);
writeWav(`${out}/swoosh.wav`, ...swoosh);
writeWav(`${out}/cash.wav`, ...cash);
writeWav(`${out}/hit.wav`, ...hit);
writeWav(`${out}/music.wav`, ...music(130));
writeWav(`${out}/whoosh.wav`, ...whoosh);
writeWav(`${out}/pop.wav`, ...pop);
writeWav(`${out}/ding.wav`, ...ding);
writeWav(`${out}/boom.wav`, ...boom);
writeWav(`${out}/sparkle.wav`, ...sparkle);
writeWav(`${out}/riser.wav`, ...riser);
console.log("ok");
