import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { AZ } from "../v3/paleta";
import { easeOut, ip, rnd } from "../v3/util";

const usarDibujo = (desde: number, dur = 0.8) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return ip(f / fps, [desde, desde + dur], [0, 1], easeOut);
};

export const Billete: React.FC<{ w?: number; rot?: number }> = ({ w = 170, rot = 0 }) => (
  <svg width={w} height={w * 0.5} viewBox="0 0 200 100" style={{ rotate: `${rot}deg` }}>
    <rect x="3" y="3" width="194" height="94" rx="12" fill={AZ.cielo} stroke={AZ.real} strokeWidth="5" />
    <rect x="16" y="16" width="168" height="68" rx="8" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="3" />
    <circle cx="100" cy="50" r="22" fill={AZ.real} />
    <text x="100" y="62" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="34" fill="#fff">$</text>
  </svg>
);

// Lluvia de billetes que caen girando (desde = s relativos).
export const LluviaBilletes: React.FC<{ desde: number; n?: number; hacia?: "abajo" | "fuera" }> = ({ desde, n = 14 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps - desde;
  if (t < 0) return null;
  return (
    <>
      {Array.from({ length: n }).map((_, i) => {
        const r0 = rnd(i + 3), r1 = rnd(i + 17), r2 = rnd(i + 31);
        const tt = t - r0 * 0.5;
        if (tt < 0) return null;
        const x = 60 + r1 * 960 + Math.sin(tt * 3 + i) * 60;
        const y = -120 + tt * (520 + r2 * 380);
        return (
          <div key={i} style={{ position: "absolute", left: x - 85, top: y, opacity: ip(tt, [0, 0.15], [0, 1]), transform: `rotate(${tt * (120 + r2 * 200) * (i % 2 ? 1 : -1)}deg) rotateY(${tt * 360}deg)` }}>
            <Billete w={150 + r2 * 60} />
          </div>
        );
      })}
    </>
  );
};

export const Colchon: React.FC<{ desde: number; size?: number }> = ({ desde, size = 420 }) => {
  const d = usarDibujo(desde, 0.6);
  const f = useCurrentFrame();
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 300 186" style={{ scale: String(0.6 + 0.4 * d), opacity: d }}>
      <g transform={`translate(0 ${Math.sin(f / 6) * 2})`}>
        <rect x="150" y="54" width="110" height="52" rx="8" fill={AZ.cielo} stroke={AZ.real} strokeWidth="4" transform="rotate(-12 205 80)" />
        <text x="205" y="92" textAnchor="middle" fontFamily="Nunito" fontWeight="900" fontSize="28" fill="#fff" transform="rotate(-12 205 80)">$</text>
      </g>
      <rect x="10" y="80" width="280" height="80" rx="30" fill="#fff" stroke={AZ.real} strokeWidth="6" />
      {[60, 110, 160, 210].map((x) => (
        <circle key={x} cx={x + 15} cy="120" r="5" fill={AZ.hielo} />
      ))}
      <path d="M30 160 V178 M270 160 V178" stroke={AZ.real} strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
};

export const Alcancia: React.FC<{ desde: number; size?: number; color?: string }> = ({ desde, size = 260, color = AZ.real }) => {
  const d = usarDibujo(desde, 0.7);
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const moneda = ip(f / fps, [desde + 0.3, desde + 0.8], [-70, 40], easeOut);
  return (
    <svg width={size} height={size * 0.85} viewBox="0 0 240 204" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="120" cy={moneda + 30} r="16" fill={AZ.cian} stroke="#fff" strokeWidth="3" opacity={moneda < 38 ? 1 : 0} />
      <g stroke={color} strokeWidth="8" strokeDasharray="900" strokeDashoffset={900 * (1 - d)} fill="#fff">
        <path d="M40 110 C40 60 85 42 125 42 C170 42 205 70 205 110 C205 140 185 160 160 168 V190 H140 V174 H105 V190 H85 V168 C60 160 40 140 40 110 Z" />
        <path d="M205 100 H222 V125 H205" />
        <path d="M70 60 L58 34 L92 46" />
      </g>
      <rect x="100" y="56" width="44" height="8" rx="4" fill={color} opacity={d} />
      <circle cx="160" cy="96" r="6" fill={color} opacity={d} />
    </svg>
  );
};

export const Documento: React.FC<{ desde: number; size?: number; color?: string }> = ({ desde, size = 110, color = AZ.real }) => {
  const d = usarDibujo(desde, 0.6);
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="500" strokeDashoffset={500 * (1 - d)}>
      <path d="M28 10 H76 L98 32 V110 H28 Z" />
      <path d="M76 10 V32 H98" />
      <path d="M44 56 H82 M44 74 H82 M44 92 H66" />
    </svg>
  );
};

export const Firma: React.FC<{ desde: number; size?: number; color?: string }> = ({ desde, size = 110, color = AZ.real }) => {
  const d = usarDibujo(desde, 0.7);
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="600" strokeDashoffset={600 * (1 - d)}>
      <rect x="18" y="14" width="84" height="92" rx="10" />
      <path d="M34 40 H86 M34 58 H70" />
      <path d="M32 88 C42 70 50 98 60 82 C66 72 72 92 88 80" />
    </svg>
  );
};

export const PinRed: React.FC<{ desde: number; size?: number; color?: string }> = ({ desde, size = 110, color = AZ.real }) => {
  const d = usarDibujo(desde, 0.6);
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="500" strokeDashoffset={500 * (1 - d)}>
      <path d="M60 108 C60 108 24 70 24 46 A36 36 0 0 1 96 46 C96 70 60 108 60 108 Z" />
      <path d="M48 46 H72 M60 34 V58" />
    </svg>
  );
};

export const Cama: React.FC<{ desde: number; size?: number; color?: string }> = ({ desde, size = 420, color = AZ.cian }) => {
  const d = usarDibujo(desde, 0.9);
  const f = useCurrentFrame();
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 300 180" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
      <g strokeDasharray="1200" strokeDashoffset={1200 * (1 - d)}>
        <path d="M20 40 V160 M20 120 H280 V160 M20 95 H280" />
        <rect x="40" y="70" width="60" height="25" rx="12" />
        <path d="M110 95 V75 H260 Q280 75 280 95" />
        <path d="M250 20 V60 M235 20 H265" />
      </g>
      <path d="M150 40 H175 L185 18 L197 58 L207 30 L214 40 H240" strokeWidth="5" strokeDasharray="160" strokeDashoffset={160 - ((f * 5) % 320)} />
    </svg>
  );
};

export const Hebilla: React.FC<{ clic: number; size?: number }> = ({ clic, size = 520 }) => {
  // la lengüeta entra en la hebilla en el instante `clic` (s relativos)
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const x = ip(t, [clic - 0.5, clic], [-180, 0], easeOut);
  const g = t >= clic && t < clic + 0.2 ? 1.06 : 1;
  return (
    <svg width={size} height={size * 0.42} viewBox="0 0 500 210" style={{ scale: String(g) }}>
      <path d="M-10 70 H130" stroke={AZ.profundo} strokeWidth="64" transform={`translate(${x} 0)`} />
      <g transform={`translate(${x} 0)`}>
        <rect x="120" y="44" width="120" height="52" rx="10" fill="#cfd8e8" stroke={AZ.marino} strokeWidth="5" />
        <rect x="150" y="60" width="60" height="20" rx="6" fill={AZ.marino} />
      </g>
      <rect x="230" y="20" width="190" height="100" rx="26" fill={AZ.real} stroke="#fff" strokeWidth="6" />
      <rect x="276" y="52" width="96" height="36" rx="12" fill={AZ.cian} />
      <path d="M420 70 H520" stroke={AZ.profundo} strokeWidth="64" />
      {t >= clic ? (
        <text x="325" y="185" textAnchor="middle" fontFamily="Nunito" fontWeight="900" fontSize="54" fill={AZ.real} opacity={ip(t, [clic, clic + 0.1, clic + 0.9, clic + 1.2], [0, 1, 1, 0])}>¡CLIC!</text>
      ) : null}
    </svg>
  );
};

export const Sirena: React.FC<{ size?: number }> = ({ size = 160 }) => {
  const f = useCurrentFrame();
  const on = Math.floor(f / 5) % 2 === 0;
  return (
    <svg width={size} height={size} viewBox="0 0 160 160">
      {[0, 1, 2].map((k) => (
        <circle key={k} cx="80" cy="86" r={40 + ((f * 3 + k * 25) % 75)} fill="none" stroke={AZ.cian} strokeWidth="5" opacity={1 - ((f * 3 + k * 25) % 75) / 75} />
      ))}
      <path d="M44 120 V86 A36 36 0 0 1 116 86 V120 Z" fill={on ? AZ.cian : AZ.real} stroke="#fff" strokeWidth="5" />
      <rect x="34" y="118" width="92" height="18" rx="6" fill={AZ.marino} stroke="#fff" strokeWidth="4" />
    </svg>
  );
};

export const Confeti: React.FC<{ desde: number; n?: number; cx?: number; cy?: number }> = ({ desde, n = 40, cx = 540, cy = 900 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps - desde;
  if (t < 0 || t > 2.2) return null;
  const cols = [AZ.real, AZ.cian, "#fff", AZ.electrico, AZ.hielo];
  return (
    <>
      {Array.from({ length: n }).map((_, i) => {
        const ang = rnd(i + 5) * Math.PI * 2;
        const v = 500 + rnd(i + 9) * 900;
        const x = cx + Math.cos(ang) * v * t;
        const y = cy + Math.sin(ang) * v * t + 900 * t * t;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: 18, height: i % 3 ? 10 : 18, borderRadius: i % 3 ? 3 : 99, background: cols[i % cols.length], rotate: `${t * 720 + i * 40}deg`, opacity: ip(t, [1.4, 2.2], [1, 0]) }} />;
      })}
    </>
  );
};
