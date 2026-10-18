import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Bloque, Palabra } from "../componentes/Subtitulos";
import { AZ, DEGRADADO, FUENTE } from "./paleta";
import { backOut, ip } from "./util";

export type Modo = "video" | "claro" | "oscuro";
export type Bloque3 = Bloque & { modo: Modo; y: number; oculto?: boolean };

const PalabraDestacada: React.FC<{ p: Palabra; modo: Modo; t: number; fps: number; salida: number }> = ({ p, modo, t, fps, salida }) => {
  const f = (t - p.inicio) * fps;
  const tam = Math.min(108, 820 / (0.62 * p.texto.length));
  const enVideo = modo === "video";
  const pill = ip(f, [0, 5], [0, 1], backOut(1.2));
  const color = enVideo ? "#fff" : modo === "claro" ? AZ.real : AZ.cian;
  return (
    <span style={{ position: "relative", display: "inline-block", padding: enVideo ? "4px 26px 10px" : 0, opacity: salida, filter: `blur(${(1 - salida) * 8}px)` }}>
      {enVideo ? (
        <span style={{ position: "absolute", inset: 0, borderRadius: 28, background: DEGRADADO, transformOrigin: "left center", scale: `${pill} 1`, rotate: "-2deg", boxShadow: "0 14px 40px rgba(14,86,246,0.45)" }} />
      ) : null}
      {Array.from(p.texto).map((c, i) => {
        const fl = f - i * 1.1;
        const e = ip(fl, [0, 6], [0, 1], backOut(2.2));
        return (
          <span
            key={i}
            style={{
              position: "relative",
              display: "inline-block",
              fontFamily: FUENTE,
              fontWeight: 900,
              fontSize: tam,
              lineHeight: 1.04,
              letterSpacing: -1,
              color,
              opacity: ip(fl, [0, 2], [0, 1]),
              translate: `0 ${(1 - e) * 46}px`,
              scale: String(0.4 + 0.6 * e),
              textShadow: !enVideo && modo === "oscuro" ? `0 0 30px ${AZ.cian}66` : undefined,
            }}
          >
            {c === " " ? " " : c}
          </span>
        );
      })}
    </span>
  );
};

const Fila: React.FC<{ palabras: Palabra[]; modo: Modo; t: number; fps: number; salida: number }> = ({ palabras, modo, t, fps, salida }) => {
  if (!palabras.length) return null;
  const color = modo === "claro" ? AZ.marino : "#fff";
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: 14, alignItems: "baseline" }}>
      {palabras.map((p, i) => {
        if (t < p.inicio) return null;
        if (p.destacada) return <PalabraDestacada key={i} p={p} modo={modo} t={t} fps={fps} salida={salida} />;
        const f = (t - p.inicio) * fps;
        const prog = Math.min(ip(f, [0, 3], [0, 1]), salida);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              fontFamily: FUENTE,
              fontWeight: 800,
              fontSize: 48,
              lineHeight: 1.08,
              color,
              textShadow: modo === "video" ? "0 3px 16px rgba(4,11,31,0.65)" : undefined,
              opacity: interpolate(prog, [0, 1], [0.3, 1]),
              filter: `blur(${(1 - prog) * 8}px)`,
              translate: `0 ${(1 - ip(f, [0, 4], [0, 1])) * 10}px`,
            }}
          >
            {p.texto}
          </span>
        );
      })}
    </div>
  );
};

export const Subs3: React.FC<{ bloques: Bloque3[] }> = ({ bloques }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const b = bloques.find((x) => t >= x.inicio && t < x.fin);
  if (!b || b.oculto) return null;
  const salida = ip((b.fin - t) * fps, [0, 3], [0, 1]);
  const filas: Palabra[][] = [[]];
  for (const p of b.palabras) {
    if (p.destacada) {
      filas.push([p]);
      filas.push([]);
    } else filas[filas.length - 1].push(p);
  }
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 120, width: 840, top: b.y, translate: "0 -50%", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", rowGap: 4 }}>
        {filas.map((fila, i) => (
          <Fila key={i} palabras={fila} modo={b.modo} t={t} fps={fps} salida={salida} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
