import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Tema } from "./tema";

const DUR_IN = 12;
const DUR_OUT = 8;

// Envuelve una capa (escena gráfica) con una transición de entrada y salida.
export const Transicion: React.FC<{ tipo: Tema["transicion"]; duracionFrames: number; children: React.ReactNode }> = ({
  tipo,
  duracionFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const pIn = interpolate(frame, [0, DUR_IN], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const pOut = interpolate(frame, [duracionFrames - DUR_OUT, duracionFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  const p = Math.min(pIn, pOut);
  const saliendo = frame > duracionFrames - DUR_OUT;

  let style: React.CSSProperties = {};
  if (tipo === "circulo") {
    style = { clipPath: `circle(${p * 125}% at 50% 50%)` };
  } else if (tipo === "barrido") {
    style = saliendo ? { clipPath: `inset(0 0 0 ${(1 - p) * 100}%)` } : { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` };
  } else if (tipo === "zoomBlur") {
    style = { opacity: p, scale: String(1.35 - 0.35 * p), filter: `blur(${(1 - p) * 24}px)` };
  } else {
    style = { translate: `0 ${(1 - p) * (saliendo ? -100 : 100)}%`, opacity: Math.min(1, p * 1.5) };
  }
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};

// Pequeño "golpe" de escala sobre el vídeo justo cuando entra o sale una escena.
export const golpe = (frame: number, en: number[], fps: number) => {
  let s = 0;
  for (const t of en) {
    const f = frame - t * fps;
    if (f >= -4 && f <= 10) {
      s = Math.max(s, interpolate(f, [-4, 0, 10], [0, 0.08, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    }
  }
  return s;
};
