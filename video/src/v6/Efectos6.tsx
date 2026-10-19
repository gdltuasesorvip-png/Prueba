import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AZ, DEGRADADO, FUENTE, MONO, SERIF } from "../v3/paleta";
import { backOut, easeIn, easeOut, ip, rnd } from "../v3/util";

// Rebobinado VHS: franjas que suben, desplazamiento de color, ◀◀ y contador de tiempo que retrocede.
export const RebobinarVHS: React.FC<{ duracion: number; desde: number; hasta: number }> = ({ duracion, desde, hasta }) => {
  const f = useCurrentFrame();
  const o = Math.sin((f / duracion) * Math.PI);
  const tc = ip(f, [0, duracion], [desde, hasta]);
  const mm = String(Math.floor(tc / 60)).padStart(2, "0"), ss = String(Math.floor(tc % 60)).padStart(2, "0"), ff = String(Math.floor((tc % 1) * 30)).padStart(2, "0");
  return (
    <AbsoluteFill style={{ opacity: o, pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${AZ.real}55, ${AZ.noche}88)`, mixBlendMode: "multiply" }} />
      {Array.from({ length: 26 }).map((_, i) => (
        <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 1920 - ((i * 97 + f * 170) % 2000), height: 4 + (i % 5) * 6, background: i % 3 ? "rgba(255,255,255,0.4)" : AZ.cian, opacity: 0.55, translate: `${(rnd(i + f) - 0.5) * 60}px 0` }} />
      ))}
      <div style={{ position: "absolute", left: 60, top: 120, fontFamily: MONO, fontSize: 40, color: "#fff", letterSpacing: 4, textShadow: `3px 0 ${AZ.cian}, -3px 0 ${AZ.real}` }}>◀◀ REW</div>
      <div style={{ position: "absolute", right: 60, top: 120, fontFamily: MONO, fontSize: 40, color: "#fff", letterSpacing: 2, textShadow: `3px 0 ${AZ.cian}, -3px 0 ${AZ.real}` }}>{`${mm}:${ss}:${ff}`}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 820, textAlign: "center", fontFamily: FUENTE, fontWeight: 900, fontSize: 150, color: "#fff", letterSpacing: -8, textShadow: `6px 0 ${AZ.cian}, -6px 0 ${AZ.real}, 0 0 50px ${AZ.cian}` }}>◀◀</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1000, textAlign: "center", fontFamily: MONO, fontSize: 36, letterSpacing: 8, color: "#fff" }}>DESDE EL PRINCIPIO</div>
    </AbsoluteFill>
  );
};

// Tarjeta de capítulo a pantalla completa ("PREGUNTA 2 DE 4"), con cuatro formas de entrar/salir.
export type Forma = "diagonal" | "iris" | "puertas" | "zoom";
export const Capitulo: React.FC<{ duracion: number; forma: Forma; numero: number; total: number; texto: string }> = ({ duracion, forma, numero, total, texto }) => {
  const f = useCurrentFrame();
  const ent = 9, sal = 9;
  const pIn = ip(f, [0, ent], [0, 1], easeOut);
  const pOut = ip(f, [duracion - sal, duracion], [0, 1], easeIn);
  let clip = "none";
  let tr = "";
  if (forma === "diagonal") {
    const a = ip(pIn, [0, 1], [-60, 0]) + ip(pOut, [0, 1], [0, 160]);
    clip = `polygon(${a}% 0, ${a + 160}% 0, ${a + 100}% 100%, ${a - 60}% 100%)`;
  } else if (forma === "iris") {
    const r = pIn * (1 - pOut) * 120;
    clip = `circle(${r}% at 50% 45%)`;
  } else if (forma === "puertas") {
    const g = (1 - pIn) * 50 + pOut * 50;
    clip = `polygon(0 0, ${50 - g}% 0, ${50 - g}% 100%, 0 100%, 0 0, 100% 0, 100% 100%, ${50 + g}% 100%, ${50 + g}% 0, 100% 0)`;
  } else {
    tr = `scale(${ip(pIn, [0, 1], [0.2, 1]) * (1 + pOut * 4)})`;
  }
  const op = forma === "zoom" ? Math.min(1, pIn * 2) * (1 - pOut) : 1;
  const txt = ip(f, [ent - 2, ent + 8], [0, 1], backOut(1.6));
  return (
    <AbsoluteFill style={{ clipPath: clip, transform: tr || undefined, opacity: op, pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, ${AZ.real}, ${AZ.profundo} 55%, ${AZ.noche})` }} />
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} style={{ position: "absolute", left: -200, right: -200, top: 200 + i * 190, height: 2, background: `${AZ.cian}33`, rotate: "-8deg", translate: `${((f * (4 + i)) % 400) - 200}px 0` }} />
      ))}
      <div style={{ position: "absolute", left: 80, right: 80, top: 640, display: "flex", flexDirection: "column", gap: 26 }}>
        <div style={{ fontFamily: MONO, fontSize: 34, letterSpacing: 8, color: AZ.cian, opacity: txt }}>{`PREGUNTA ${numero} DE ${total}`}</div>
        <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 92, lineHeight: 1.02, letterSpacing: -3, color: "#fff", translate: `${(1 - txt) * 120}px 0`, opacity: txt }}>{texto}</div>
        <div style={{ height: 12, width: `${txt * 100}%`, maxWidth: 520, borderRadius: 9, background: DEGRADADO }} />
      </div>
      <div style={{ position: "absolute", right: 60, bottom: 260, fontFamily: SERIF, fontStyle: "italic", fontSize: 330, lineHeight: 1, color: `${AZ.cian}44` }}>{numero}</div>
    </AbsoluteFill>
  );
};

// Sello que cae y golpea.
export const Sello: React.FC<{ texto: string; desde: number; rot?: number; tam?: number }> = ({ texto, desde, rot = -10, tam = 58 }) => {
  const f = useCurrentFrame();
  const p = ip(f - desde * 30, [0, 7], [0, 1], backOut(2.5));
  if (f < desde * 30) return null;
  return (
    <div style={{ display: "inline-block", rotate: `${rot}deg`, scale: String(2.4 - 1.4 * p), opacity: Math.min(1, p * 2), border: `6px solid ${AZ.cian}`, color: AZ.cian, background: "rgba(4,11,31,0.85)", borderRadius: 16, padding: "6px 22px", fontFamily: FUENTE, fontWeight: 900, fontSize: tam, letterSpacing: 2, whiteSpace: "nowrap", boxShadow: `0 0 30px ${AZ.cian}66` }}>
      {texto}
    </div>
  );
};

// Ondas de choque (anillos) para golpes de impacto.
export const Onda: React.FC<{ cx: number; cy: number; duracion?: number }> = ({ cx, cy, duracion = 18 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {[0, 4, 8].map((d, i) => {
        const p = ip(f - d, [0, duracion], [0, 1], easeOut);
        if (f < d) return null;
        return <div key={i} style={{ position: "absolute", left: cx - 700 * p, top: cy - 700 * p, width: 1400 * p, height: 1400 * p, borderRadius: 9999, border: `${10 * (1 - p) + 2}px solid ${i === 1 ? "#fff" : AZ.cian}`, opacity: 1 - p }} />;
      })}
    </AbsoluteFill>
  );
};
