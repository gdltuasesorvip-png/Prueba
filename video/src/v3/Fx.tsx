import { lightLeak } from "@remotion/effects/light-leak";
import React from "react";
import { AbsoluteFill, Solid, interpolate, useCurrentFrame } from "remotion";
import { AZ, HUE_LEAK } from "./paleta";
import { ip, rnd } from "./util";

// Light leak azul que entra y sale en `duracion` fotogramas.
export const Destello: React.FC<{ seed?: number; duracion: number; hue?: number; opacidad?: number }> = ({ seed = 3, duracion, hue = HUE_LEAK, opacidad = 0.9 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", opacity: opacidad, pointerEvents: "none" }}>
      <Solid width={1080} height={1920} color="#00000000" effects={[lightLeak({ seed, hueShift: hue, progress: ip(f, [0, duracion - 1], [0, 1]) })]} />
    </AbsoluteFill>
  );
};

// Flash blanco-azulado de 2-4 fotogramas.
export const Flash: React.FC<{ duracion?: number; color?: string }> = ({ duracion = 5, color = "#e8f1ff" }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: color, opacity: interpolate(f, [0, 1, duracion], [0, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />;
};

// Partículas tipo bokeh que flotan hacia arriba.
export const Bokeh: React.FC<{ n?: number; color?: string; seed?: number; max?: number }> = ({ n = 26, color = AZ.cian, seed = 1, max = 0.55 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: n }).map((_, i) => {
        const r = 8 + rnd(seed * 100 + i) * 46;
        const x = rnd(seed * 200 + i) * 1080;
        const vel = 0.6 + rnd(seed * 300 + i) * 1.8;
        const y = 1980 - ((f * vel * 3 + rnd(seed * 400 + i) * 2100) % 2100);
        const op = (0.15 + rnd(seed * 500 + i) * 0.85) * max;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + Math.sin((f + i * 20) / 30) * 20,
              top: y,
              width: r,
              height: r,
              borderRadius: 999,
              background: `radial-gradient(circle, ${color} 0%, ${color}00 70%)`,
              opacity: op,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Grano de película sutil.
export const Grano: React.FC<{ opacidad?: number }> = ({ opacidad = 0.07 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: opacidad, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="1080" height="1920">
        <filter id={`g${f % 6}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={f % 6} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="1080" height="1920" filter={`url(#g${f % 6})`} />
      </svg>
    </AbsoluteFill>
  );
};

// Etalonaje azul para el vídeo: tinte soft-light, sombras marino, viñeta.
export const GradoAzul: React.FC<{ fuerza?: number }> = ({ fuerza = 1 }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill style={{ background: AZ.real, mixBlendMode: "soft-light", opacity: 0.22 * fuerza }} />
    <AbsoluteFill style={{ background: AZ.marino, mixBlendMode: "lighten", opacity: 0.35 * fuerza }} />
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 42%, rgba(4,11,31,0) 50%, rgba(4,11,31,${0.55 * fuerza}) 100%)` }} />
  </AbsoluteFill>
);

// Duotono azul vía CSS (gris + multiplicar + aclarar).
export const Duotono: React.FC<{ children: React.ReactNode; claro?: string; oscuro?: string }> = ({ children, claro = AZ.cielo, oscuro = AZ.noche }) => (
  <AbsoluteFill>
    <AbsoluteFill style={{ filter: "grayscale(1) contrast(1.25) brightness(1.05)" }}>{children}</AbsoluteFill>
    <AbsoluteFill style={{ background: claro, mixBlendMode: "multiply" }} />
    <AbsoluteFill style={{ background: oscuro, mixBlendMode: "lighten" }} />
  </AbsoluteFill>
);

// Fondo de escena: claro (hielo) u oscuro (noche) con manchas azules que derivan y retícula.
export const FondoAzul: React.FC<{ oscuro?: boolean; children?: React.ReactNode }> = ({ oscuro = false, children }) => {
  const f = useCurrentFrame();
  const dx = Math.sin(f / 40) * 80;
  const dy = Math.cos(f / 31) * 60;
  return (
    <AbsoluteFill style={{ background: oscuro ? `linear-gradient(170deg, ${AZ.marino} 0%, ${AZ.noche} 100%)` : `linear-gradient(170deg, ${AZ.blanco} 0%, ${AZ.niebla} 100%)`, overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 1200, height: 1200, left: 380 + dx, top: -520 + dy, borderRadius: 999, background: `radial-gradient(circle, ${oscuro ? AZ.electrico : AZ.cielo} 0%, transparent 65%)`, opacity: oscuro ? 0.55 : 0.45 }} />
      <div style={{ position: "absolute", width: 1100, height: 1100, left: -520 - dx, top: 1150 - dy, borderRadius: 999, background: `radial-gradient(circle, ${oscuro ? AZ.cian : AZ.hielo} 0%, transparent 65%)`, opacity: oscuro ? 0.35 : 0.9 }} />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${oscuro ? "rgba(79,209,255,0.07)" : "rgba(14,86,246,0.06)"} 1px, transparent 1px), linear-gradient(90deg, ${oscuro ? "rgba(79,209,255,0.07)" : "rgba(14,86,246,0.06)"} 1px, transparent 1px)`,
          backgroundSize: "72px 72px",
          backgroundPosition: `0 ${(f * 0.6) % 72}px`,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

// Aberración cromática CSS: tres copias desplazadas (cian/azul) para glitches.
export const Glitch: React.FC<{ children: React.ReactNode; fuerza: number }> = ({ children, fuerza }) => {
  const f = useCurrentFrame();
  if (fuerza <= 0.01) return <AbsoluteFill>{children}</AbsoluteFill>;
  const d = fuerza * 18 * (f % 2 === 0 ? 1 : -1);
  const corte = Math.floor(rnd(f) * 1600);
  return (
    <AbsoluteFill>
      <AbsoluteFill>{children}</AbsoluteFill>
      <AbsoluteFill style={{ translate: `${d}px 0`, mixBlendMode: "screen", opacity: 0.7 }}>
        <AbsoluteFill style={{ filter: "grayscale(1)" }}>{children}</AbsoluteFill>
        <AbsoluteFill style={{ background: AZ.cian, mixBlendMode: "multiply" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(${corte}px 0 ${1920 - corte - 90}px 0)`, translate: `${-d * 2}px 0` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
