import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AZ, DEGRADADO, FUENTE, MONO, SERIF } from "../v3/paleta";
import { backOut, easeIn, easeOut, ip, rnd } from "../v3/util";

// Cristal esmerilado que barre la pantalla (transición).
export const Vidrio: React.FC<{ duracion: number }> = ({ duracion }) => {
  const f = useCurrentFrame();
  const x = ip(f, [0, duracion], [-1300, 1300], (n) => n);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 540 - 450 + x, top: -300, width: 900, height: 2600, rotate: "12deg", backdropFilter: "blur(26px) saturate(1.4) brightness(1.15)", WebkitBackdropFilter: "blur(26px) saturate(1.4) brightness(1.15)", background: "linear-gradient(90deg, rgba(219,233,255,0.15), rgba(79,209,255,0.25), rgba(219,233,255,0.15))", borderLeft: "3px solid rgba(255,255,255,0.8)", borderRight: "3px solid rgba(255,255,255,0.5)" }} />
    </AbsoluteFill>
  );
};

// Mosaico de baldosas que se giran y cubren/descubren (cubre en la mitad).
export const Mosaico: React.FC<{ duracion: number }> = ({ duracion }) => {
  const f = useCurrentFrame();
  const m = duracion / 2;
  const cols = 6, filas = 11, w = 1080 / cols, h = 1920 / filas;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: cols * filas }).map((_, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        const d = (c + r) * 0.45;
        const p = f < m ? ip(f, [d * 0.5, m], [0, 1], easeOut) : 1 - ip(f, [m + d * 0.3, duracion], [0, 1], easeIn);
        return <div key={i} style={{ position: "absolute", left: c * w - 1, top: r * h - 1, width: w + 2, height: h + 2, background: [AZ.real, AZ.electrico, AZ.marino, AZ.cian][(c + r) % 4], transform: `perspective(600px) rotateY(${(1 - p) * 90}deg)`, opacity: p > 0.02 ? 1 : 0 }} />;
      })}
    </AbsoluteFill>
  );
};

// Ola de agua que sube y baja (cubre en la mitad).
export const Ola: React.FC<{ duracion: number }> = ({ duracion }) => {
  const f = useCurrentFrame();
  const m = duracion / 2;
  const nivel = f < m ? ip(f, [0, m], [2000, -300], easeOut) : ip(f, [m, duracion], [-300, -2300], easeIn);
  const ola = (fase: number, amp: number) => {
    let d = `M 0 ${nivel}`;
    for (let x = 0; x <= 1080; x += 40) d += ` L ${x} ${nivel + Math.sin(x / 120 + f / 3 + fase) * amp}`;
    return d + " L 1080 2400 L 0 2400 Z";
  };
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="1080" height="1920">
        <path d={ola(0, 50)} fill={AZ.cian} opacity="0.8" transform="translate(0 -60)" />
        <path d={ola(2, 40)} fill={AZ.electrico} />
        <path d={ola(4, 30)} fill={AZ.marino} transform="translate(0 80)" />
      </svg>
    </AbsoluteFill>
  );
};

// Explosión de chispas + barrido de luz ("ahora viene la magia").
export const Magia: React.FC<{ duracion: number }> = ({ duracion }) => {
  const f = useCurrentFrame();
  const t = f / 30;
  const barrido = ip(f, [0, 10], [-400, 1500], easeOut);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: barrido - 300, top: -200, width: 220, height: 2400, rotate: "22deg", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)", filter: "blur(12px)", opacity: ip(f, [0, 3, 10, 14], [0, 1, 1, 0]) }} />
      {Array.from({ length: 46 }).map((_, i) => {
        const a = rnd(i + 3) * Math.PI * 2, v = 300 + rnd(i + 7) * 900;
        const x = 540 + Math.cos(a) * v * t, y = 820 + Math.sin(a) * v * t + 300 * t * t;
        const s = 10 + rnd(i + 11) * 26;
        return (
          <svg key={i} width={s * 2} height={s * 2} viewBox="-10 -10 20 20" style={{ position: "absolute", left: x - s, top: y - s, opacity: ip(f, [0, 3, duracion - 10, duracion], [0, 1, 1, 0]), rotate: `${f * 12 + i * 30}deg` }}>
            <path d="M0 -10 L2.5 -2.5 L10 0 L2.5 2.5 L0 10 L-2.5 2.5 L-10 0 L-2.5 -2.5 Z" fill={i % 3 ? "#ffffff" : AZ.cian} />
          </svg>
        );
      })}
    </AbsoluteFill>
  );
};

// Hélice de ADN que gira.
export const ADN: React.FC<{ size?: number }> = ({ size = 220 }) => {
  const f = useCurrentFrame();
  const n = 14;
  return (
    <svg width={size * 0.6} height={size} viewBox="0 0 120 200">
      {Array.from({ length: n }).map((_, i) => {
        const y = 10 + i * 13.5;
        const ph = i * 0.55 + f / 6;
        const x1 = 60 + Math.sin(ph) * 40, x2 = 60 - Math.sin(ph) * 40;
        const front = Math.cos(ph) > 0;
        return (
          <g key={i}>
            <line x1={x1} y1={y} x2={x2} y2={y} stroke={AZ.hielo} strokeWidth="3" opacity="0.7" />
            <circle cx={x1} cy={y} r={front ? 7 : 5} fill={front ? AZ.cian : AZ.electrico} />
            <circle cx={x2} cy={y} r={front ? 5 : 7} fill={front ? AZ.electrico : AZ.cian} />
          </g>
        );
      })}
    </svg>
  );
};

// Contador con formato de miles.
export const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const Estrellas: React.FC<{ n?: number; size?: number }> = ({ n = 5, size = 40 }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Array.from({ length: n }).map((_, i) => {
        const p = ip(f, [i * 3, i * 3 + 8], [0, 1], backOut(3));
        return (
          <svg key={i} width={size} height={size} viewBox="-10 -10 20 20" style={{ scale: String(p) }}>
            <path d="M0 -9 L2.6 -3 L9 -2.8 L4 1.4 L5.6 8 L0 4.4 L-5.6 8 L-4 1.4 L-9 -2.8 L-2.6 -3 Z" fill="#ffd166" stroke="#fff" strokeWidth="1" />
          </svg>
        );
      })}
    </div>
  );
};

export { AZ, DEGRADADO, FUENTE, MONO, SERIF };
