import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FONDO_CLARO, FONDO_OSCURO, Tema } from "./tema";

// Fondo con dos manchas de color que derivan lentamente + retícula de puntos.
export const FondoVivo: React.FC<{ tema: Tema; children?: React.ReactNode }> = ({ tema, children }) => {
  const f = useCurrentFrame();
  const dx = Math.sin(f / 37) * 60;
  const dy = Math.cos(f / 29) * 50;
  const op = tema.claro ? 0.55 : 0.6;
  return (
    <AbsoluteFill style={{ backgroundColor: tema.claro ? FONDO_CLARO : FONDO_OSCURO, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 1100,
          height: 1100,
          borderRadius: 999,
          left: 420 + dx,
          top: -420 + dy,
          background: `radial-gradient(circle, ${tema.acento} 0%, transparent 62%)`,
          opacity: op,
          filter: "blur(30px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1000,
          height: 1000,
          borderRadius: 999,
          left: -420 - dx,
          top: 1180 - dy,
          background: `radial-gradient(circle, ${tema.acento2} 0%, transparent 62%)`,
          opacity: op,
          filter: "blur(30px)",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle, ${tema.claro ? "rgba(19,18,21,0.10)" : "rgba(255,255,255,0.10)"} 1.5px, transparent 1.5px)`,
          backgroundSize: "40px 40px",
        }}
      />
      {children}
    </AbsoluteFill>
  );
};
