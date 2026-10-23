import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AZ, FUENTE, MONO, SERIF } from "../v3/paleta";
import { backOut, easeIn, easeOut, ip, rnd } from "../v3/util";

// Paleta del vídeo de viaje: los azules de siempre + turquesa (otro azul) + amarillo sol (contraste).
export const VJ = {
  turquesa: "#19e3c8",
  agua: "#0fb5d6",
  sol: "#ffc83d",
  solFuerte: "#ffb21f",
  ...AZ,
};
export const DEG_AGUA = `linear-gradient(100deg, ${AZ.real} 0%, ${VJ.agua} 55%, ${VJ.turquesa} 100%)`;
export const DEG_SOL = `linear-gradient(100deg, #ffd84d, ${VJ.solFuerte})`;

// Avión que cruza el cielo tirando de una pancarta.
export const AvionPancarta: React.FC<{ duracion: number; texto: string; y?: number }> = ({ duracion, texto, y = 300 }) => {
  const f = useCurrentFrame();
  const x = ip(f, [0, duracion], [1250, -1500], (n) => n);
  const ola = (i: number) => Math.sin(f / 3 + i * 0.7) * 10;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: x, top: y + Math.sin(f / 6) * 12, display: "flex", alignItems: "center" }}>
        <svg width="190" height="110" viewBox="0 0 190 110">
          <path d="M10 58 Q60 40 150 46 L182 50 Q188 55 182 60 L150 64 Q60 70 10 58 Z" fill="#fff" stroke={AZ.marino} strokeWidth="4" />
          <path d="M90 50 L60 8 L80 8 L120 48 Z" fill={AZ.real} />
          <path d="M90 62 L60 104 L80 104 L120 64 Z" fill={AZ.real} />
          <path d="M150 48 L168 26 L178 26 L170 50 Z" fill={VJ.turquesa} />
          {[0, 1, 2, 3].map((i) => <circle key={i} cx={40 + i * 22} cy={55} r="5" fill={AZ.cielo} />)}
        </svg>
        <svg width="70" height="40" viewBox="0 0 70 40"><path d="M0 20 L70 20" stroke="#fff" strokeWidth="3" strokeDasharray="6 5" /></svg>
        <div style={{ display: "flex" }}>
          {Array.from(texto).map((c, i) => (
            <div key={i} style={{ width: c === " " ? 30 : undefined, padding: c === " " ? 0 : "8px 6px", background: i % 2 ? VJ.sol : "#fff", color: AZ.marino, fontFamily: FUENTE, fontWeight: 900, fontSize: 64, translate: `0 ${ola(i)}px`, boxShadow: "0 10px 26px rgba(4,11,31,0.3)" }}>{c === " " ? "" : c}</div>
          ))}
        </div>
      </div>
      {/* estela */}
      <div style={{ position: "absolute", left: x + 170, top: y + 52, width: 1600, height: 6, borderRadius: 9, background: "linear-gradient(90deg, rgba(255,255,255,0.7), transparent)", opacity: 0.4 }} />
    </AbsoluteFill>
  );
};

// Barrido de nubes (transición): cubren a mitad y se van.
export const Nubes: React.FC<{ duracion: number }> = ({ duracion }) => {
  const f = useCurrentFrame();
  const m = duracion / 2;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      {Array.from({ length: 14 }).map((_, i) => {
        const dir = i % 2 ? 1 : -1;
        const x0 = dir * 1500;
        const x = f < m ? ip(f, [0, m], [x0, 0], easeOut) : ip(f, [m, duracion], [0, -x0], easeIn);
        const s = 700 + rnd(i) * 500;
        return <div key={i} style={{ position: "absolute", left: (i % 4) * 300 - 250 + x, top: (i * 150) % 1920 - 120, width: s, height: s * 0.62, borderRadius: "50%", background: i % 3 ? "#ffffff" : AZ.hielo, filter: "blur(18px)" }} />;
      })}
    </AbsoluteFill>
  );
};

// Sello de pasaporte (redondo o rectangular) que golpea.
export const Pasaporte: React.FC<{ titulo: string; sub: string; color?: string; rot?: number; redondo?: boolean }> = ({ titulo, sub, color = AZ.real, rot = -8, redondo }) => {
  const f = useCurrentFrame();
  const p = ip(f, [0, 7], [0, 1], backOut(2.6));
  return (
    <div style={{ rotate: `${rot}deg`, scale: String(2.3 - 1.3 * p), opacity: Math.min(1, p * 2), display: "inline-flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: `7px double ${color}`, borderRadius: redondo ? 999 : 22, width: redondo ? 330 : undefined, height: redondo ? 330 : undefined, padding: redondo ? 0 : "12px 28px", background: "rgba(247,250,255,0.9)", color, boxShadow: "0 18px 44px rgba(4,11,31,0.35)" }}>
      <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: 4 }}>{sub}</div>
      <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 52, lineHeight: 1.02, textAlign: "center", whiteSpace: "pre-line" }}>{titulo}</div>
      <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: 3 }}>★ ★ ★</div>
    </div>
  );
};

// Botones de redes animados (genéricos, sin logotipos de marca).
export const BotonLike: React.FC<{ desde: number }> = ({ desde }) => {
  const f = useCurrentFrame() - desde * 30;
  if (f < 0) return null;
  const p = ip(f, [0, 8], [0, 1], backOut(3));
  const lleno = f > 10;
  return (
    <div style={{ width: 170, height: 170, borderRadius: 999, background: lleno ? DEG_AGUA : "#fff", display: "flex", alignItems: "center", justifyContent: "center", scale: String(p * (1 + 0.15 * ip(f, [10, 13, 18], [0, 1, 0]))), boxShadow: "0 18px 40px rgba(4,11,31,0.4)", border: `5px solid ${lleno ? "#fff" : AZ.real}` }}>
      <svg width="90" height="90" viewBox="0 0 24 24" fill={lleno ? "#fff" : "none"} stroke={lleno ? "#fff" : AZ.real} strokeWidth="2" strokeLinejoin="round">
        <path d="M7 10v11H3V10z M7 10l4-8a3 3 0 0 1 3 3v4h6a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.6 21H7" />
      </svg>
    </div>
  );
};
export const Campanita: React.FC<{ desde: number; repique?: number }> = ({ desde, repique }) => {
  const fr = useCurrentFrame();
  const f = fr - desde * 30;
  if (f < 0) return null;
  const p = ip(f, [0, 8], [0, 1], backOut(3));
  const r2 = repique !== undefined ? fr - repique * 30 : -99;
  const mov = (fr: number) => (fr >= 0 && fr < 24 ? Math.sin(fr * 1.3) * 26 * (1 - fr / 24) : 0);
  return (
    <div style={{ width: 170, height: 170, borderRadius: 999, background: VJ.sol, display: "flex", alignItems: "center", justifyContent: "center", scale: String(p), boxShadow: `0 18px 40px rgba(255,178,31,0.5)`, border: "5px solid #fff" }}>
      <svg width="96" height="96" viewBox="0 0 24 24" fill={AZ.marino} style={{ rotate: `${mov(f) + mov(r2)}deg`, transformOrigin: "50% 10%" }}>
        <path d="M12 2a1.5 1.5 0 0 1 1.5 1.5v.6A6.5 6.5 0 0 1 18.5 10.5V15l2 2.5V19h-17v-1.5l2-2.5v-4.5A6.5 6.5 0 0 1 10.5 4.1v-.6A1.5 1.5 0 0 1 12 2z M9.5 20h5a2.5 2.5 0 0 1-5 0z" />
      </svg>
    </div>
  );
};
export const Suscribirse: React.FC<{ desde: number }> = ({ desde }) => {
  const f = useCurrentFrame() - desde * 30;
  if (f < 0) return null;
  const p = ip(f, [0, 8], [0, 1], backOut(2.5));
  const clic = f > 14;
  const cx = ip(f, [4, 14], [260, 40], easeOut), cy = ip(f, [4, 14], [140, 30], easeOut);
  return (
    <div style={{ position: "relative", scale: String(p) }}>
      <div style={{ background: clic ? AZ.marino : DEG_AGUA, color: "#fff", fontFamily: FUENTE, fontWeight: 900, fontSize: 56, padding: "22px 46px", borderRadius: 26, boxShadow: "0 18px 40px rgba(4,11,31,0.4)", scale: clic ? String(1 - 0.06 * ip(f, [14, 16, 20], [0, 1, 0])) : "1", whiteSpace: "nowrap" }}>
        {clic ? "✓ SUSCRITO" : "SUSCRÍBETE"}
      </div>
      <svg width="70" height="70" viewBox="0 0 24 24" style={{ position: "absolute", left: 140 + cx, top: 30 + cy, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))" }}>
        <path d="M5 2l14 10-6 1.5 3.5 7-2.6 1.3-3.5-7L5 19z" fill="#fff" stroke={AZ.noche} strokeWidth="1.4" />
      </svg>
    </div>
  );
};

// Corazones que suben (desde abajo de los costados, nunca sobre las caras: el contenedor decide la zona).
export const Corazones: React.FC<{ desde: number; n?: number; ancho: number; alto: number }> = ({ desde, n = 12, ancho, alto }) => {
  const f = useCurrentFrame() - desde * 30;
  if (f < 0 || f > 75) return null;
  return (
    <div style={{ position: "relative", width: ancho, height: alto }}>
      {Array.from({ length: n }).map((_, i) => {
        const d = i * 3;
        const k = (f - d) / 50;
        if (k < 0 || k > 1) return null;
        const s = 40 + rnd(i + 3) * 50;
        return (
          <svg key={i} width={s} height={s} viewBox="0 0 24 24" style={{ position: "absolute", left: rnd(i) * (ancho - s) + Math.sin(k * 6 + i) * 20, top: alto - k * alto, opacity: 1 - k, scale: String(ip(k, [0, 0.15], [0.3, 1])) }}>
            <path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" fill={[AZ.real, VJ.turquesa, AZ.cielo, VJ.sol][i % 4]} stroke="#fff" strokeWidth="1.5" />
          </svg>
        );
      })}
    </div>
  );
};

// "Postal": el vídeo se convierte en una postal con borde blanco, sello y saludo.
export const MarcoPostal: React.FC<{ p: number; children: React.ReactNode }> = ({ p, children }) => {
  const f = useCurrentFrame();
  const s = 1 - 0.2 * p;
  const rot = -4 * p;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${AZ.cielo}, ${VJ.agua} 60%, ${AZ.real})` }}>
      {p > 0.01
        ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ position: "absolute", left: ((i * 260 + f * (1 + i * 0.3)) % 1500) - 300, top: 80 + i * 300, width: 340, height: 120, borderRadius: 99, background: "#fff", opacity: 0.35 * p, filter: "blur(8px)" }} />
          ))
        : null}
      <AbsoluteFill style={{ scale: String(s), rotate: `${rot}deg`, translate: `0 ${-90 * p}px` }}>
        <AbsoluteFill style={{ outline: `${34 * p}px solid #fff`, boxShadow: p > 0.01 ? "0 40px 90px rgba(4,11,31,0.45)" : undefined, overflow: "hidden" }}>{children}</AbsoluteFill>
        {p > 0.01 ? (
          <>
            <div style={{ position: "absolute", right: 30, top: 30, width: 170, height: 200, background: "#fff", border: `6px dashed ${AZ.real}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: p, rotate: "6deg" }}>
              <div style={{ fontSize: 70 }}>🌊</div>
              <div style={{ fontFamily: MONO, fontSize: 18, color: AZ.real }}>ESPAÑA</div>
            </div>
          </>
        ) : null}
      </AbsoluteFill>
      {p > 0.01 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1700, textAlign: "center", fontFamily: SERIF, fontStyle: "italic", fontSize: 88, color: "#fff", opacity: p, textShadow: "0 6px 24px rgba(4,11,31,0.5)" }}>
          Saludos desde <span style={{ fontFamily: FUENTE, fontStyle: "normal", fontWeight: 900, color: VJ.sol }}>A Coruña</span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
