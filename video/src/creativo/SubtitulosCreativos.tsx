import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Bloque, Palabra } from "../componentes/Subtitulos";
import { SUB } from "../estilo";
import { TEXTO_CLARO, TEXTO_OSCURO, Tema } from "./tema";

export type BloqueC = Bloque & { tema: Tema; pildora?: boolean };

const Fila: React.FC<{ palabras: Palabra[]; bloque: BloqueC; t: number; fps: number; salida: number }> = ({ palabras, bloque, t, fps, salida }) => {
  if (palabras.length === 0) return null;
  const { tema } = bloque;
  const sobreVideo = bloque.fondo === "busto";
  const claro = sobreVideo ? false : tema.claro;
  const colorNormal = claro ? TEXTO_CLARO : TEXTO_OSCURO;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: 14 }}>
      {palabras.map((p, i) => {
        if (t < p.inicio) return null;
        const f = (t - p.inicio) * fps;
        const esDest = !!p.destacada;
        const entrada = interpolate(f, [0, esDest ? 7 : 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: esDest ? Easing.out(Easing.back(1.8)) : Easing.linear });
        const prog = Math.min(interpolate(f, [0, 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), salida);
        const tam = esDest ? Math.min(SUB.tamDestacada, SUB.anchoMax / (0.6 * p.texto.length)) : SUB.tamNormal;
        const pildora = esDest && (bloque.pildora ?? sobreVideo);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              fontFamily: SUB.fuente,
              fontWeight: esDest ? 900 : 700,
              fontSize: tam,
              lineHeight: 1.05,
              color: esDest ? (pildora ? "#fff" : tema.acento) : colorNormal,
              background: pildora ? tema.acento : undefined,
              padding: pildora ? "0 0.22em" : undefined,
              borderRadius: pildora ? 22 : undefined,
              rotate: pildora ? "-2deg" : undefined,
              textShadow: sobreVideo && !pildora ? SUB.sombraBusto : undefined,
              opacity: Math.min(interpolate(prog, [0, 1], [0.4, 1]), salida),
              filter: `blur(${interpolate(prog, [0, 1], [SUB.blurPx, 0])}px)`,
              scale: esDest ? String(interpolate(entrada, [0, 1], [0.5, 1])) : undefined,
            }}
          >
            {p.texto}
          </span>
        );
      })}
    </div>
  );
};

export const SubtitulosCreativos: React.FC<{ bloques: BloqueC[] }> = ({ bloques }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const bloque = bloques.find((b) => t >= b.inicio && t < b.fin);
  if (!bloque) return null;
  const salida = interpolate((bloque.fin - t) * fps, [0, SUB.framesSalida], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const filas: Palabra[][] = [[]];
  for (const p of bloque.palabras) {
    if (p.destacada) {
      filas.push([p]);
      filas.push([]);
    } else filas[filas.length - 1].push(p);
  }
  const posicion = bloque.posicion ?? (bloque.fondo === "busto" ? "arriba" : "abajo");
  // Sobre busto, en la versión creativa el bloque va algo más bajo (sobre el pecho) para no pisar la cara.
  const centroY = posicion === "arriba" ? (bloque.fondo === "busto" ? 1380 : SUB.yBusto) : SUB.yGraficoAbajo;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: (1080 - SUB.anchoMax) / 2,
          width: SUB.anchoMax,
          top: centroY,
          translate: "0 -50%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          rowGap: 6,
        }}
      >
        {filas.map((fila, i) => (
          <Fila key={i} palabras={fila} bloque={bloque} t={t} fps={fps} salida={salida} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
