import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, GRAF } from "../estilo";

// Fondo claro con dos manchas radiales y retícula de puntos (estilo.md §5).
export const Fondo: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      backgroundColor: COLOR.blanco,
      backgroundImage: [
        `radial-gradient(circle at 92% 6%, ${COLOR.manchaTR} 0%, rgba(210,223,253,0) 42%)`,
        `radial-gradient(circle at 6% 94%, ${COLOR.manchaBL} 0%, rgba(222,230,250,0) 42%)`,
        "radial-gradient(circle, rgba(227,230,239,0.5) 1.5px, transparent 1.5px)",
      ].join(","),
      backgroundSize: "100% 100%, 100% 100%, 40px 40px",
    }}
  >
    {children}
  </AbsoluteFill>
);

// Entrada de un elemento gráfico: 6 fotogramas, opacidad 0→1, blur 6→0, +24 px → 0.
export const Entra: React.FC<{ desde: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ desde, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - desde * fps;
  if (f < 0) return null;
  const p = interpolate(f, [0, GRAF.framesEntrada], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div
      style={{
        opacity: p,
        filter: `blur(${(1 - p) * GRAF.blurPx}px)`,
        translate: `0 ${(1 - p) * GRAF.desplazamiento}px`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Tarjeta: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      background: "#ffffff",
      borderRadius: GRAF.radioTarjeta,
      boxShadow: GRAF.sombraTarjeta,
      padding: 40,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Etiqueta: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      fontFamily: GRAF.mono,
      fontSize: 22,
      letterSpacing: 2,
      color: COLOR.gris,
      textTransform: "uppercase",
      textAlign: "center",
      ...style,
    }}
  >
    {children}
  </div>
);

export const Chip: React.FC<{ children: React.ReactNode; oscuro?: boolean; style?: React.CSSProperties }> = ({ children, oscuro, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      fontFamily: GRAF.mono,
      fontSize: 26,
      padding: "12px 24px",
      borderRadius: 999,
      background: oscuro ? COLOR.oscuro : "#ffffff",
      color: oscuro ? "#ffffff" : COLOR.negro,
      boxShadow: oscuro ? undefined : GRAF.sombraTarjeta,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Badge: React.FC<{ n: number | string }> = ({ n }) => (
  <div
    style={{
      width: 44,
      height: 44,
      borderRadius: 999,
      background: COLOR.azul,
      color: "#fff",
      fontFamily: "Nunito, sans-serif",
      fontWeight: 800,
      fontSize: 24,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    {n}
  </div>
);

export const Check: React.FC<{ activo: boolean }> = ({ activo }) => (
  <div
    style={{
      width: 36,
      height: 36,
      borderRadius: 10,
      background: activo ? COLOR.azul : "#e9edf7",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    {activo ? (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 12 10 18 20 6" />
      </svg>
    ) : null}
  </div>
);

export const Fila: React.FC<{ n?: number; texto: string; activo?: boolean; tipo?: "badge" | "check"; style?: React.CSSProperties }> = ({
  n = 1,
  texto,
  activo = true,
  tipo = "badge",
  style,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 20,
      fontFamily: "Nunito, sans-serif",
      fontWeight: 700,
      fontSize: 38,
      color: activo ? COLOR.negro : "#b9bec9",
      ...style,
    }}
  >
    {tipo === "badge" ? <Badge n={n} /> : <Check activo={activo} />}
    <span>{texto}</span>
  </div>
);

// Cifra grande con etiqueta pequeña (para primas, sumas, etc.).
export const Cifra: React.FC<{ valor: string; etiqueta?: string; color?: string; tam?: number }> = ({ valor, etiqueta, color = COLOR.azul, tam = 120 }) => (
  <div style={{ textAlign: "center", fontFamily: "Nunito, sans-serif" }}>
    <div style={{ fontWeight: 900, fontSize: tam, lineHeight: 1, color, letterSpacing: -2, whiteSpace: "nowrap" }}>{valor}</div>
    {etiqueta ? <div style={{ fontWeight: 700, fontSize: 28, color: COLOR.gris, marginTop: 10 }}>{etiqueta}</div> : null}
  </div>
);

// Ventana de terminal con texto que se escribe carácter a carácter (≈40 chars/s).
export const Terminal: React.FC<{ lineas: string[]; desde: number; ancho?: number }> = ({ lineas, desde, ancho = 820 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chars = Math.max(0, Math.floor((frame / fps - desde) * 40));
  let restantes = chars;
  return (
    <div style={{ width: ancho, background: COLOR.oscuro, borderRadius: 20, padding: "22px 30px", boxShadow: GRAF.sombraTarjeta }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <div key={c} style={{ width: 16, height: 16, borderRadius: 999, background: c }} />
        ))}
      </div>
      {lineas.map((l, i) => {
        const visible = l.slice(0, Math.max(0, restantes));
        restantes -= l.length + 8;
        return (
          <div key={i} style={{ fontFamily: GRAF.mono, fontSize: 28, color: l.startsWith("✓") ? COLOR.verde : "#e6e8ef", minHeight: 40 }}>
            {visible}
          </div>
        );
      })}
    </div>
  );
};

// Pantalla final: fondo oscuro, marca y usuario que se escribe (estilo.md §6).
export const PantallaFinal: React.FC<{ marca: string; usuario: string; cta?: string }> = ({ marca, usuario, cta }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const logoP = interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.4)) });
  const barraP = interpolate(frame, [6, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const chars = Math.max(0, Math.floor((t - 0.55) * 24));
  const glitch = frame >= 6 && frame < 16 ? (frame % 2 === 0 ? 6 : -6) : 0;
  return (
    <AbsoluteFill style={{ background: COLOR.fondoFinal, alignItems: "center", justifyContent: "center", fontFamily: "Nunito, sans-serif" }}>
      <div style={{ position: "absolute", top: 1920 * 0.34, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ opacity: logoP, scale: String(logoP), color: "#fff", fontWeight: 900, fontSize: 96, letterSpacing: -2 }}>{marca}</div>
        {cta ? <div style={{ opacity: logoP, color: "#9aa0b4", fontWeight: 700, fontSize: 34, marginTop: 6 }}>{cta}</div> : null}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 70, opacity: barraP, scale: `${0.9 + barraP * 0.1} 1` }}>
          <div style={{ position: "relative", width: 720, height: 96 }}>
            <div style={{ position: "absolute", inset: 0, translate: `${glitch}px 0`, background: "#25f4ee", borderRadius: 14, opacity: 0.9 }} />
            <div style={{ position: "absolute", inset: 0, translate: `${-glitch}px 0`, background: "#fe2c55", borderRadius: 14, opacity: 0.9 }} />
            <div
              style={{
                position: "absolute",
                inset: 6,
                background: "#fff",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                gap: 24,
                padding: "0 28px",
                fontSize: 38,
                fontWeight: 700,
                color: COLOR.negro,
              }}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={COLOR.negro} strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="21" y2="21" />
              </svg>
              <span>{usuario.slice(0, chars)}</span>
              <span style={{ opacity: frame % 16 < 8 ? 1 : 0, marginLeft: -16 }}>|</span>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
