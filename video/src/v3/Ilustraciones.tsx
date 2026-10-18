import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { AZ } from "./paleta";
import { ip, easeOut } from "./util";

// Progreso de "dibujado" de trazos a partir de un instante (s, relativo a la Sequence).
const usarDibujo = (desde: number, dur = 0.8) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return ip(f / fps, [desde, desde + dur], [0, 1], easeOut);
};

type P = { desde: number; size?: number; color?: string; color2?: string };

export const Hospital: React.FC<P> = ({ desde, size = 420, color = AZ.real, color2 = AZ.cian }) => {
  const d = usarDibujo(desde, 1);
  const f = useCurrentFrame();
  const L = 2600;
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 420 380" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <g stroke={color} strokeWidth="10" strokeDasharray={L} strokeDashoffset={L * (1 - d)}>
        <path d="M30 360 H390" />
        <path d="M80 360 V140 H340 V360" />
        <path d="M150 140 V70 H270 V140" />
        <path d="M185 360 V290 H235 V360" />
        {[0, 1, 2].map((i) => (
          <rect key={i} x={105 + i * 80} y={180} width="50" height="40" rx="6" />
        ))}
        {[0, 2].map((i) => (
          <rect key={`b${i}`} x={105 + i * 80} y={240} width="50" height="40" rx="6" />
        ))}
      </g>
      <g opacity={d} style={{ transformOrigin: "210px 105px", scale: String(1 + 0.08 * Math.sin(f / 5)) }}>
        <rect x="198" y="80" width="24" height="50" rx="5" fill={color2} />
        <rect x="185" y="93" width="50" height="24" rx="5" fill={color2} />
      </g>
    </svg>
  );
};

export const Incubadora: React.FC<P> = ({ desde, size = 140, color = AZ.cian }) => {
  const d = usarDibujo(desde, 0.7);
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray="700" strokeDashoffset={700 * (1 - d)}>
      <path d="M20 95 Q20 35 70 35 Q120 35 120 95 Z" />
      <path d="M12 95 H128 V112 H12 Z" />
      <path d="M35 112 V128 M105 112 V128" />
      <circle cx="58" cy="78" r="10" />
      <path d="M68 80 Q85 72 95 84" />
    </svg>
  );
};

export const Monitor: React.FC<P> = ({ desde, size = 140, color = AZ.cian }) => {
  const d = usarDibujo(desde, 0.7);
  const f = useCurrentFrame();
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
      <g strokeDasharray="600" strokeDashoffset={600 * (1 - d)}>
        <rect x="12" y="20" width="116" height="80" rx="12" />
        <path d="M50 122 H90 M70 100 V122" />
      </g>
      <path d="M22 62 H48 L56 44 L66 82 L76 52 L84 62 H118" strokeDasharray="160" strokeDashoffset={160 - ((f * 6) % 320)} />
    </svg>
  );
};

export const Cruz: React.FC<P> = ({ desde, size = 140, color = AZ.cian }) => {
  const d = usarDibujo(desde, 0.6);
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" fill="none" stroke={color} strokeWidth="7" strokeLinejoin="round" strokeDasharray="500" strokeDashoffset={500 * (1 - d)}>
      <path d="M52 18 H88 V52 H122 V88 H88 V122 H52 V88 H18 V52 H52 Z" />
    </svg>
  );
};

export const Escudo: React.FC<P> = ({ desde, size = 300, color = AZ.real, color2 = AZ.cian }) => {
  const d = usarDibujo(desde, 0.9);
  const c = usarDibujo(desde + 0.6, 0.5);
  const f = useCurrentFrame();
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 200 230" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="esc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={color2} />
        </linearGradient>
      </defs>
      <path d="M100 10 L180 40 V110 C180 165 145 200 100 220 C55 200 20 165 20 110 V40 Z" fill="url(#esc)" opacity={d} />
      <path d="M100 10 L180 40 V110 C180 165 145 200 100 220 C55 200 20 165 20 110 V40 Z" stroke="#fff" strokeOpacity="0.5" strokeWidth="4" strokeDasharray="640" strokeDashoffset={640 * (1 - d)} />
      <path d="M62 115 L90 143 L142 88" stroke="#fff" strokeWidth="16" strokeDasharray="130" strokeDashoffset={130 * (1 - c)} />
      <circle cx="100" cy="115" r={90 + (f % 40) * 1.5} stroke="#fff" strokeOpacity={Math.max(0, 0.4 - (f % 40) / 100)} strokeWidth="3" />
    </svg>
  );
};

export const Bebe: React.FC<P> = ({ desde, size = 220, color = AZ.cian }) => {
  const d = usarDibujo(desde, 0.8);
  const f = useCurrentFrame();
  return (
    <svg width={size} height={size} viewBox="0 0 220 220" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" style={{ rotate: `${Math.sin(f / 9) * 4}deg` }}>
      <g strokeDasharray="1100" strokeDashoffset={1100 * (1 - d)}>
        <circle cx="110" cy="100" r="62" />
        <path d="M80 30 Q110 0 125 38" />
        <circle cx="88" cy="96" r="5" fill={color} />
        <circle cx="132" cy="96" r="5" fill={color} />
        <path d="M92 124 Q110 140 128 124" />
        <path d="M60 180 Q110 150 160 180 L170 210 H50 Z" />
      </g>
    </svg>
  );
};

export const Familia: React.FC<P> = ({ desde, size = 300, color = "#fff", color2 = AZ.cian }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps - desde;
  const pop = (k: number) => ip(t, [k * 0.12, k * 0.12 + 0.3], [0, 1], (n) => 1 - Math.pow(1 - n, 3) * Math.cos(n * 5));
  const persona = (x: number, h: number, k: number, c: string) => (
    <g key={k} style={{ transformOrigin: `${x}px 200px`, scale: String(pop(k)) }}>
      <circle cx={x} cy={200 - h - 28} r={h * 0.28} fill={c} />
      <path d={`M${x - h * 0.38} 200 Q${x - h * 0.38} ${200 - h + 12} ${x} ${200 - h + 6} Q${x + h * 0.38} ${200 - h + 12} ${x + h * 0.38} 200 Z`} fill={c} />
    </g>
  );
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 300 225">
      {persona(80, 120, 0, color)}
      {persona(220, 112, 1, color)}
      {persona(150, 70, 2, color2)}
      <path d="M150 40 C150 25 130 18 122 32 C114 18 94 25 94 40 C94 60 122 72 122 72 C122 72 150 60 150 40 Z" transform="translate(28 -20)" fill={color2} style={{ transformOrigin: "150px 30px", scale: String(pop(3) * (1 + 0.1 * Math.sin(f / 4))) }} />
    </svg>
  );
};

export const Pelota: React.FC<{ size?: number }> = ({ size = 160 }) => {
  const f = useCurrentFrame();
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" style={{ rotate: `${f * 24}deg` }}>
      <circle cx="80" cy="80" r="74" fill="#fff" stroke={AZ.hielo} strokeWidth="4" />
      <path d="M30 28 Q62 80 30 132" fill="none" stroke={AZ.real} strokeWidth="6" strokeDasharray="10 8" />
      <path d="M130 28 Q98 80 130 132" fill="none" stroke={AZ.real} strokeWidth="6" strokeDasharray="10 8" />
    </svg>
  );
};

export const Reloj: React.FC<{ size?: number; color?: string; vueltas?: number }> = ({ size = 300, color = AZ.real, vueltas = 1 }) => {
  const f = useCurrentFrame();
  const ang = f * 6 * vueltas;
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" strokeLinecap="round">
      <circle cx="100" cy="100" r="88" stroke={color} strokeWidth="10" />
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={i} x1="100" y1="22" x2="100" y2={i % 3 === 0 ? 38 : 30} stroke={color} strokeWidth={i % 3 === 0 ? 7 : 4} transform={`rotate(${i * 30} 100 100)`} />
      ))}
      <line x1="100" y1="100" x2="100" y2="58" stroke={AZ.cian} strokeWidth="9" transform={`rotate(${ang / 12} 100 100)`} />
      <line x1="100" y1="100" x2="100" y2="36" stroke={color} strokeWidth="6" transform={`rotate(${ang} 100 100)`} />
      <circle cx="100" cy="100" r="9" fill={color} />
    </svg>
  );
};

export const Calculadora: React.FC<{ size?: number }> = ({ size = 220 }) => {
  const f = useCurrentFrame();
  const n = String(1000 + ((f * 137) % 9000));
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 200 260">
      <rect x="10" y="10" width="180" height="240" rx="26" fill={AZ.marino} stroke={AZ.cian} strokeWidth="5" />
      <rect x="30" y="30" width="140" height="56" rx="10" fill={AZ.noche} />
      <text x="160" y="72" textAnchor="end" fontFamily="'JetBrains Mono', monospace" fontSize="30" fill={AZ.cian}>{n}</text>
      {Array.from({ length: 12 }).map((_, i) => (
        <rect key={i} x={30 + (i % 3) * 50} y={104 + Math.floor(i / 3) * 36} width="40" height="28" rx="8" fill={i === 11 ? AZ.real : AZ.profundo} />
      ))}
    </svg>
  );
};

export const Calendario: React.FC<{ progreso: number; oscuro?: boolean }> = ({ progreso, oscuro = false }) => {
  const meses = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 110px)", gap: 18 }}>
      {meses.map((m, i) => {
        const on = progreso * 12 > i;
        return (
          <div
            key={i}
            style={{
              height: 92,
              borderRadius: 22,
              background: on ? `linear-gradient(140deg, ${AZ.real}, ${AZ.cian})` : oscuro ? "rgba(255,255,255,0.06)" : "#fff",
              boxShadow: on ? "0 12px 30px rgba(14,86,246,0.35)" : "0 8px 24px rgba(14,40,120,0.08)",
              color: on ? "#fff" : AZ.gris,
              fontFamily: "Nunito, sans-serif",
              fontWeight: 900,
              fontSize: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              scale: on ? "1" : "0.94",
            }}
          >
            {m}
          </div>
        );
      })}
    </div>
  );
};

export const Cursor: React.FC<{ size?: number }> = ({ size = 90 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M5 3 L19 12 L12 13.5 L9 20 Z" fill="#fff" stroke={AZ.noche} strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);
