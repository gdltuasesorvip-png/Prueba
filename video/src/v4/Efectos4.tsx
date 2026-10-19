import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { AZ, FUENTE, MONO } from "../v3/paleta";
import { backOut, easeIn, easeOut, ip, rnd } from "../v3/util";

const usarT = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return f / fps;
};

// Líneas de velocidad radiales (estilo manga) en azul/blanco.
export const LineasVelocidad: React.FC<{ fuerza?: number; cx?: number; cy?: number }> = ({ fuerza = 1, cx = 540, cy = 860 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: fuerza, WebkitMaskImage: `radial-gradient(ellipse at ${cx}px ${cy}px, transparent 30%, #000 75%)` }}>
      <svg width="1080" height="1920">
        {Array.from({ length: 70 }).map((_, i) => {
          const a = rnd(i * 7 + (f % 3) * 131) * Math.PI * 2;
          const r0 = 500 + rnd(i + f) * 300;
          const len = 300 + rnd(i * 3 + f) * 700;
          const w = 2 + rnd(i * 11) * 7;
          return (
            <line key={i} x1={cx + Math.cos(a) * r0} y1={cy + Math.sin(a) * r0} x2={cx + Math.cos(a) * (r0 + len)} y2={cy + Math.sin(a) * (r0 + len)} stroke={i % 4 === 0 ? AZ.cian : "#ffffff"} strokeOpacity={0.35 + rnd(i) * 0.4} strokeWidth={w} strokeLinecap="round" />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// Interfaz de cámara/casco: esquinas, REC, velocímetro y minimapa con ruta a DLB.
export const HUD: React.FC<{ duracion: number }> = ({ duracion }) => {
  const f = useCurrentFrame();
  const t = f / 30;
  const entra = ip(f, [0, 10], [0, 1], easeOut);
  const sale = ip(f, [duracion - 8, duracion], [1, 0]);
  const vel = Math.max(0, 38 + Math.sin(t * 2.2) * 6 - ip(t, [duracion / 30 - 2.2, duracion / 30], [0, 40]));
  const ang = -120 + (vel / 80) * 240;
  const ruta = ip(f, [0, duracion - 10], [0, 1]);
  const esq = (st: React.CSSProperties) => <div style={{ position: "absolute", width: 90, height: 90, borderColor: AZ.cian, borderStyle: "solid", ...st }} />;
  return (
    <AbsoluteFill style={{ opacity: entra * sale, pointerEvents: "none" }}>
      {esq({ left: 50, top: 120, borderWidth: "6px 0 0 6px" })}
      {esq({ right: 50, top: 120, borderWidth: "6px 6px 0 0" })}
      {esq({ left: 50, bottom: 220, borderWidth: "0 0 6px 6px" })}
      {esq({ right: 50, bottom: 220, borderWidth: "0 6px 6px 0" })}
      <div style={{ position: "absolute", left: 80, top: 150, display: "flex", alignItems: "center", gap: 14, fontFamily: MONO, fontSize: 28, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>
        <span style={{ width: 20, height: 20, borderRadius: 99, background: "#ff3b5c", opacity: f % 30 < 18 ? 1 : 0.2 }} />
        REC · {String(Math.floor(t / 60)).padStart(2, "0")}:{String(Math.floor(t % 60)).padStart(2, "0")}:{String(f % 30).padStart(2, "0")}
      </div>
      {/* velocímetro */}
      <div style={{ position: "absolute", left: 70, bottom: 260, width: 260, height: 260 }}>
        <svg width="260" height="260" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="88" fill="rgba(4,11,31,0.55)" />
          <path d="M 35 155 A 85 85 0 1 1 165 155" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="10" strokeLinecap="round" />
          <path d="M 35 155 A 85 85 0 1 1 165 155" fill="none" stroke={AZ.cian} strokeWidth="10" strokeLinecap="round" strokeDasharray="400" strokeDashoffset={400 - (vel / 80) * 400} />
          <line x1="100" y1="100" x2="100" y2="34" stroke="#fff" strokeWidth="5" strokeLinecap="round" transform={`rotate(${ang} 100 100)`} />
          <circle cx="100" cy="100" r="8" fill="#fff" />
          <text x="100" y="150" textAnchor="middle" fontFamily="Nunito" fontWeight="900" fontSize="34" fill="#fff">{Math.round(vel)}</text>
          <text x="100" y="172" textAnchor="middle" fontFamily="'JetBrains Mono'" fontSize="13" fill={AZ.cian}>km/h</text>
        </svg>
      </div>
      {/* minimapa */}
      <div style={{ position: "absolute", right: 70, bottom: 260, width: 270, height: 270, borderRadius: 30, background: "rgba(4,11,31,0.6)", border: `2px solid ${AZ.cian}66`, overflow: "hidden" }}>
        <svg width="270" height="270" viewBox="0 0 270 270">
          {[40, 100, 160, 220].map((x) => <line key={x} x1={x} y1="0" x2={x - 30} y2="270" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />)}
          {[60, 140, 210].map((y) => <line key={y} x1="0" y1={y} x2="270" y2={y + 20} stroke="rgba(255,255,255,0.08)" strokeWidth="12" />)}
          <path d="M 30 240 L 80 200 L 90 150 L 160 140 L 190 80 L 215 55" fill="none" stroke={AZ.cian} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="420" strokeDashoffset={420 * (1 - ruta)} />
          <circle cx="215" cy="55" r={12 + Math.sin(f / 4) * 3} fill={AZ.real} stroke="#fff" strokeWidth="4" />
        </svg>
        <div style={{ position: "absolute", left: 14, top: 12, fontFamily: MONO, fontSize: 18, color: AZ.cian, letterSpacing: 2 }}>RUTA · DLB</div>
      </div>
    </AbsoluteFill>
  );
};

// Contorno neón alrededor de la(s) persona(s) usando el recorte.
export const Neon: React.FC<{ base: number; en: number; dur: number; color?: string }> = ({ base, en, dur, color = AZ.cian }) => {
  const f = useCurrentFrame();
  const fr = f + base;
  const p = ip(f, [en * 30, en * 30 + 6, (en + dur) * 30 - 6, (en + dur) * 30], [0, 1, 1, 0]);
  if (p <= 0) return null;
  return (
    <Img
      src={staticFile(`recorte_v4/f_${fr}.webp`)}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: p, filter: `drop-shadow(0 0 3px #fff) drop-shadow(0 0 14px ${color}) drop-shadow(0 0 30px ${color})` }}
    />
  );
};

// Grietas de cristal desde un punto de impacto.
export const Grietas: React.FC<{ cx?: number; cy?: number; seed?: number }> = ({ cx = 640, cy = 760, seed = 1 }) => {
  const f = useCurrentFrame();
  const d = ip(f, [0, 5], [0, 1], easeOut);
  const ramas = Array.from({ length: 13 }).map((_, i) => {
    const a = (i / 13) * Math.PI * 2 + rnd(seed + i) * 0.4;
    let x = cx, y = cy;
    const pts = [`${x},${y}`];
    const L = 260 + rnd(seed * 3 + i) * 900;
    for (let k = 1; k <= 6; k++) {
      const r = (L / 6) * k;
      x = cx + Math.cos(a + (rnd(i * 10 + k + seed) - 0.5) * 0.3) * r;
      y = cy + Math.sin(a + (rnd(i * 20 + k + seed) - 0.5) * 0.3) * r;
      pts.push(`${x},${y}`);
    }
    return pts.join(" ");
  });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="1080" height="1920">
        {[60, 130, 220].map((r, i) => (
          <circle key={r} cx={cx} cy={cy} r={r * d} fill="none" stroke="#fff" strokeOpacity={0.55 - i * 0.12} strokeWidth="3" strokeDasharray="30 18" />
        ))}
        {ramas.map((p, i) => (
          <polyline key={i} points={p} fill="none" stroke="#ffffff" strokeWidth={i % 3 ? 3 : 6} strokeOpacity="0.9" strokeDasharray="2200" strokeDashoffset={2200 * (1 - d)} style={{ filter: `drop-shadow(0 0 6px ${AZ.cian})` }} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

// Fragmentos de cristal que caen (transición de salida de la rotura).
export const Fragmentos: React.FC<{ duracion: number }> = ({ duracion }) => {
  const f = useCurrentFrame();
  const t = f / 30;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 26 }).map((_, i) => {
        const x = rnd(i + 1) * 1080, y0 = rnd(i + 2) * 1920;
        const s = 60 + rnd(i + 3) * 160;
        const y = y0 + 1600 * t * t * (0.6 + rnd(i + 4));
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: s, height: s, background: `linear-gradient(135deg, rgba(255,255,255,0.75), ${AZ.cian}55)`, clipPath: `polygon(${rnd(i + 5) * 50}% 0, 100% ${rnd(i + 6) * 60}%, ${40 + rnd(i + 7) * 60}% 100%, 0 ${30 + rnd(i + 8) * 60}%)`, rotate: `${t * 300 * (i % 2 ? 1 : -1)}deg`, opacity: ip(f, [duracion - 6, duracion], [1, 0]) }} />
        );
      })}
    </AbsoluteFill>
  );
};

// Rayos de luz que bajan desde arriba.
export const Rayos: React.FC<{ duracion: number }> = ({ duracion }) => {
  const f = useCurrentFrame();
  const o = ip(f, [0, 10, duracion - 10, duracion], [0, 1, 1, 0]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: o, mixBlendMode: "screen" }}>
      <div style={{ position: "absolute", left: 540 - 1300, top: -1300, width: 2600, height: 2600, borderRadius: 999, rotate: `${f * 0.4}deg`, background: `repeating-conic-gradient(from 0deg at 50% 50%, rgba(219,233,255,0.55) 0deg 4deg, transparent 4deg 13deg)`, WebkitMaskImage: "radial-gradient(circle at 50% 50%, #000 0%, transparent 55%)" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 0%, rgba(219,233,255,0.6) 0%, transparent 55%)` }} />
    </AbsoluteFill>
  );
};

// Polaroid: el fotograma congelado sale volando girando.
export const Polaroid: React.FC<{ src: string; duracion: number }> = ({ src, duracion }) => {
  const f = useCurrentFrame();
  const encoge = ip(f, [0, 8], [0, 1], easeOut);
  const vuela = ip(f, [8, duracion], [0, 1], easeIn);
  const s = 1 - 0.32 * encoge;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, scale: String(s), rotate: `${-6 * encoge + vuela * 40}deg`, translate: `${vuela * 1500}px ${-vuela * 500}px`, padding: 34 * encoge, paddingBottom: 150 * encoge, background: "#f7faff", boxShadow: "0 40px 120px rgba(0,0,0,0.55)", boxSizing: "border-box" }}>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 34 * encoge, textAlign: "center", fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: 76, color: AZ.marino, opacity: encoge }}>casi me mato…</div>
      </div>
    </AbsoluteFill>
  );
};

// Pin de ubicación que cae con rebote y ondas.
export const PinCae: React.FC<{ etiqueta: string }> = ({ etiqueta }) => {
  const f = useCurrentFrame();
  const y = ip(f, [0, 10], [-900, 0], (n) => 1 - Math.abs(Math.cos(n * Math.PI * 1.5)) * (1 - n));
  const et = ip(f, [10, 18], [0, 1], backOut(2));
  return (
    <div style={{ position: "relative", width: 300, height: 380 }}>
      {[0, 1, 2].map((k) => {
        const r = ((f - 10 + k * 12) % 36) / 36;
        return f >= 10 ? <div key={k} style={{ position: "absolute", left: 150 - 140 * r, top: 330 - 40 * r, width: 280 * r, height: 80 * r, borderRadius: "50%", border: `4px solid ${AZ.cian}`, opacity: 1 - r }} /> : null;
      })}
      <svg width="300" height="340" viewBox="0 0 120 136" style={{ position: "absolute", left: 0, top: 0, translate: `0 ${y}px`, filter: "drop-shadow(0 20px 30px rgba(4,11,31,0.5))" }}>
        <path d="M60 132 C60 132 12 80 12 50 A48 48 0 0 1 108 50 C108 80 60 132 60 132 Z" fill={AZ.real} stroke="#fff" strokeWidth="5" />
        <circle cx="60" cy="50" r="20" fill="#fff" />
        <text x="60" y="58" textAnchor="middle" fontFamily="Nunito" fontWeight="900" fontSize="20" fill={AZ.real}>DLB</text>
      </svg>
      <div style={{ position: "absolute", left: 150, top: 350, translate: "-50% 0", scale: String(et), whiteSpace: "nowrap", background: "#fff", color: AZ.marino, fontFamily: FUENTE, fontWeight: 900, fontSize: 36, padding: "10px 26px", borderRadius: 99, boxShadow: "0 16px 40px rgba(4,11,31,0.4)" }}>{etiqueta}</div>
    </div>
  );
};

// Brochazo azul que revela (máscara con trazo grueso).
export const Brochazo: React.FC<{ duracion?: number; children: React.ReactNode }> = ({ duracion = 14, children }) => {
  const f = useCurrentFrame();
  const p = ip(f, [0, duracion], [0, 1], easeOut);
  const id = "brocha";
  return (
    <AbsoluteFill>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="1080" height="1920">
            <path d="M -200 300 C 300 150, 700 500, 1300 250 M 1300 650 C 700 900, 300 500, -200 800 M -200 1150 C 400 1000, 700 1400, 1300 1150 M 1300 1600 C 700 1800, 300 1450, -200 1750 M -200 2050 C 400 1900, 700 2200, 1300 2000" fill="none" stroke="#fff" strokeWidth="520" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - p} />
          </mask>
        </defs>
      </svg>
      <AbsoluteFill style={{ mask: `url(#${id})`, WebkitMask: `url(#${id})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// Paneles que se deslizan (transición de 3 franjas verticales).
export const Paneles: React.FC<{ duracion: number }> = ({ duracion }) => {
  const f = useCurrentFrame();
  const m = duracion / 2;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {[0, 1, 2].map((i) => {
        const dir = i % 2 ? 1 : -1;
        const y = f < m ? ip(f, [i, m], [dir * 1920, 0], easeOut) : ip(f, [m, duracion - (2 - i)], [0, -dir * 1920], easeIn);
        return <div key={i} style={{ position: "absolute", left: i * 360 - 1, width: 362, top: 0, height: 1920, translate: `0 ${y}px`, background: [AZ.real, AZ.marino, AZ.electrico][i] }} />;
      })}
    </AbsoluteFill>
  );
};

export { usarT };
