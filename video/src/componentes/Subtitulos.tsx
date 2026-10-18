import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, SUB } from "../estilo";

export type Palabra = {
  texto: string;
  inicio: number; // segundos en la línea de tiempo de salida
  fin: number;
  destacada?: boolean;
  variante?: "serif" | "metal"; // variantes de la palabra destacada (estilo.md §3)
};

export type Bloque = {
  palabras: Palabra[];
  inicio: number;
  fin: number; // momento en que el bloque desaparece
  fondo: "busto" | "grafico";
  posicion?: "arriba" | "abajo";
};

const Linea: React.FC<{ palabras: Palabra[]; fondo: Bloque["fondo"]; t: number; fps: number; salida: number }> = ({
  palabras,
  fondo,
  t,
  fps,
  salida,
}) => {
  if (palabras.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: 14, rowGap: 0 }}>
      {palabras.map((p, i) => {
        if (t < p.inicio) return null;
        const f = (t - p.inicio) * fps;
        const entrada = interpolate(f, [0, SUB.framesEntrada], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const prog = Math.min(entrada, salida);
        const esDest = !!p.destacada;
        const colorNormal = fondo === "busto" ? COLOR.blanco : COLOR.negro;
        const colorDest = fondo === "busto" ? COLOR.blanco : COLOR.azul;
        const estiloVariante: React.CSSProperties =
          esDest && p.variante === "serif"
            ? { fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400, fontSize: SUB.tamDestacada * 1.08 }
            : esDest && p.variante === "metal"
              ? {
                  backgroundImage: "linear-gradient(180deg, #2b2d33 0%, #6b6e78 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }
              : {};
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              fontFamily: SUB.fuente,
              fontWeight: esDest ? SUB.pesoDestacada : SUB.pesoNormal,
              fontSize: esDest ? Math.min(SUB.tamDestacada, SUB.anchoMax / (0.58 * p.texto.length)) : SUB.tamNormal,
              lineHeight: SUB.interlineado,
              color: esDest ? colorDest : colorNormal,
              textShadow: fondo === "busto" ? SUB.sombraBusto : undefined,
              opacity: interpolate(prog, [0, 1], [0.4, 1]),
              filter: `blur(${interpolate(prog, [0, 1], [SUB.blurPx, 0])}px)`,
              scale: esDest ? String(interpolate(entrada, [0, 1], [0.92, 1])) : undefined,
              ...estiloVariante,
            }}
          >
            {p.texto}
          </span>
        );
      })}
    </div>
  );
};

export const Subtitulos: React.FC<{ bloques: Bloque[] }> = ({ bloques }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const bloque = bloques.find((b) => t >= b.inicio && t < b.fin);
  if (!bloque) return null;

  const framesHastaFin = (bloque.fin - t) * fps;
  const salida = interpolate(framesHastaFin, [0, SUB.framesSalida], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Filas: las palabras normales se agrupan; cada destacada va en su propia fila (estilo.md §3).
  const filas: Palabra[][] = [[]];
  for (const p of bloque.palabras) {
    if (p.destacada) {
      filas.push([p]);
      filas.push([]);
    } else {
      filas[filas.length - 1].push(p);
    }
  }

  const posicion = bloque.posicion ?? (bloque.fondo === "busto" ? "arriba" : "abajo");
  const centroY = posicion === "arriba" ? SUB.yBusto : SUB.yGraficoAbajo;

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
        }}
      >
        {filas.map((fila, i) => (
          <Linea key={i} palabras={fila} fondo={bloque.fondo} t={t} fps={fps} salida={salida} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
