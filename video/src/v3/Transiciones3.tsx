import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AZ } from "./paleta";
import { easeIn, easeOut, ip } from "./util";

// Todas las transiciones de superposición cubren la pantalla en la mitad de su duración (donde está el corte).

export const Persianas: React.FC<{ duracion: number; horizontal?: boolean; n?: number }> = ({ duracion, horizontal = false, n = 9 }) => {
  const f = useCurrentFrame();
  const mitad = duracion / 2;
  const colores = [AZ.real, AZ.marino, AZ.electrico, AZ.noche, AZ.cian];
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: n }).map((_, i) => {
        const retraso = i * 0.6;
        const cubre = ip(f, [retraso, mitad], [0, 1], easeOut);
        const descubre = ip(f, [mitad + retraso * 0.5, duracion], [0, 1], easeIn);
        const lado = (horizontal ? 1920 : 1080) / n;
        const base: React.CSSProperties = horizontal
          ? { left: 0, right: 0, top: i * lado - 1, height: lado + 2 }
          : { top: 0, bottom: 0, left: i * lado - 1, width: lado + 2 };
        const escala = f < mitad ? cubre : 1 - descubre;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              ...base,
              background: colores[i % colores.length],
              transformOrigin: horizontal ? (f < mitad ? "left" : "right") : f < mitad ? (i % 2 ? "bottom" : "top") : i % 2 ? "top" : "bottom",
              scale: horizontal ? `${escala} 1` : `1 ${escala}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const Liquido: React.FC<{ duracion: number }> = ({ duracion }) => {
  const f = useCurrentFrame();
  const mitad = duracion / 2;
  const capas: [number, number, string, number][] = [
    [200, 300, AZ.cian, 0],
    [900, 700, AZ.electrico, 1.5],
    [300, 1600, AZ.real, 3],
    [700, 1100, AZ.marino, 4.5],
  ];
  const hueco = ip(f, [mitad + 1, duracion], [0, 2300], easeIn);
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        WebkitMaskImage: hueco > 0 ? `radial-gradient(circle at 50% 40%, transparent ${hueco}px, #000 ${hueco + 2}px)` : undefined,
        maskImage: hueco > 0 ? `radial-gradient(circle at 50% 40%, transparent ${hueco}px, #000 ${hueco + 2}px)` : undefined,
      }}
    >
      {capas.map(([x, y, c, r], i) => {
        const radio = ip(f, [r, mitad], [0, 2400], easeOut);
        return <div key={i} style={{ position: "absolute", left: x - radio, top: y - radio, width: radio * 2, height: radio * 2, borderRadius: 999, background: c }} />;
      })}
    </AbsoluteFill>
  );
};

export const Corte: React.FC<{ duracion: number; inverso?: boolean }> = ({ duracion, inverso = false }) => {
  const f = useCurrentFrame();
  const x = ip(f, [0, duracion], inverso ? [2300, -2300] : [-2300, 2300]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 540 - 1100 + x - 260, top: -600, width: 120, height: 3200, background: AZ.cian, rotate: "18deg" }} />
      <div style={{ position: "absolute", left: 540 - 1100 + x, top: -600, width: 2200, height: 3200, background: `linear-gradient(90deg, ${AZ.real}, ${AZ.marino})`, rotate: "18deg" }} />
      <div style={{ position: "absolute", left: 540 + 1100 + x + 120, top: -600, width: 70, height: 3200, background: AZ.electrico, rotate: "18deg" }} />
    </AbsoluteFill>
  );
};

// Estela azul para el barrido de cámara (whip pan).
export const Estela: React.FC<{ duracion: number }> = ({ duracion }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: Math.sin((f / duracion) * Math.PI) }}>
      {Array.from({ length: 14 }).map((_, i) => (
        <div key={i} style={{ position: "absolute", left: -200, right: -200, top: 80 + i * 135, height: 10 + (i % 3) * 14, background: i % 2 ? AZ.cian : AZ.electrico, opacity: 0.55, filter: "blur(6px)", translate: `${(f * 160 + i * 90) % 400 - 200}px 0` }} />
      ))}
    </AbsoluteFill>
  );
};

// ---- Máscaras de entrada / salida para capas de escena ----
const ESCUDO: [number, number][] = [
  [0, -1], [0.8, -0.7], [0.8, 0.0], [0.7, 0.45], [0.45, 0.78], [0, 1], [-0.45, 0.78], [-0.7, 0.45], [-0.8, 0.0], [-0.8, -0.7],
];

export type Entrada = "corte" | "escudo" | "reloj" | "flip" | "subir";
export type Salida = "corte" | "flip" | "zoom" | "bajar";

export const Capa: React.FC<{ entrada: Entrada; salida: Salida; duracion: number; children: React.ReactNode }> = ({ entrada, salida, duracion, children }) => {
  const f = useCurrentFrame();
  const style: React.CSSProperties = {};
  let fondoFlip = false;
  let manecilla: number | null = null;

  if (entrada === "escudo" && f < 18) {
    const s = ip(f, [0, 18], [0, 2400], easeIn);
    style.clipPath = `polygon(${ESCUDO.map(([x, y]) => `${540 + x * s}px ${860 + y * s}px`).join(",")})`;
  }
  if (entrada === "reloj" && f < 16) {
    const g = ip(f, [0, 16], [0, 360], easeOut);
    style.WebkitMaskImage = `conic-gradient(from 0deg at 50% 45%, #000 ${g}deg, transparent ${g + 0.5}deg)`;
    style.maskImage = style.WebkitMaskImage as string;
    manecilla = g;
  }
  if (entrada === "flip" && f < 9) {
    style.transform = `perspective(2200px) rotateY(${ip(f, [0, 9], [90, 0], easeOut)}deg)`;
    fondoFlip = true;
  }
  if (entrada === "subir" && f < 12) {
    style.translate = `0 ${ip(f, [0, 12], [1920, 0], easeOut)}px`;
  }
  const desdeFin = duracion - f;
  if (salida === "flip" && desdeFin <= 8) {
    style.transform = `perspective(2200px) rotateY(${ip(8 - desdeFin, [0, 8], [0, -90], easeIn)}deg)`;
    fondoFlip = true;
  }
  if (salida === "zoom" && desdeFin <= 9) {
    const p = ip(9 - desdeFin, [0, 9], [0, 1], easeIn);
    style.scale = String(1 + p * 0.6);
    style.filter = `blur(${p * 30}px)`;
    style.opacity = 1 - p;
  }
  if (salida === "bajar" && desdeFin <= 10) {
    style.translate = `0 ${ip(10 - desdeFin, [0, 10], [0, -1920], easeIn)}px`;
  }

  return (
    <AbsoluteFill>
      {fondoFlip ? <AbsoluteFill style={{ background: AZ.noche }} /> : null}
      <AbsoluteFill style={style}>{children}</AbsoluteFill>
      {manecilla !== null ? (
        <div style={{ position: "absolute", left: 538, top: 864 - 1400, width: 6, height: 1400, background: AZ.cian, transformOrigin: "50% 100%", rotate: `${manecilla}deg`, boxShadow: `0 0 30px ${AZ.cian}` }} />
      ) : null}
    </AbsoluteFill>
  );
};
