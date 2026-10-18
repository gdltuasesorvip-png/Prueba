import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Bokeh, Destello, Glitch } from "./Fx";
import { AZ, DEGRADADO, FUENTE } from "./paleta";
import { backOut, easeOut, ip } from "./util";

export const Final3: React.FC<{ marca: string; usuario: string }> = ({ marca, usuario }) => {
  const f = useCurrentFrame();
  const g = ip(f, [0, 8], [1, 0]);
  const av = ip(f, [4, 16], [0, 1], backOut(1.8));
  const nom = ip(f, [10, 20], [0, 1], easeOut);
  const barra = ip(f, [16, 26], [0, 1], easeOut);
  const chars = Math.max(0, Math.floor((f - 26) / 2.2));
  const boton = ip(f, [40, 50], [0, 1], backOut(2));
  const pulso = 1 + 0.04 * Math.sin(f / 4);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, ${AZ.profundo} 0%, ${AZ.noche} 70%)` }}>
      <Audio src={staticFile("sfx/zap.wav")} volume={0.4} />
      <Audio src={staticFile("sfx/ding.wav")} from={40} volume={0.3} />
      {/* suelo de retícula en perspectiva */}
      <div style={{ position: "absolute", left: -600, right: -600, top: 1150, height: 1400, transform: "perspective(700px) rotateX(62deg)", transformOrigin: "50% 0%", backgroundImage: `linear-gradient(${AZ.electrico}88 2px, transparent 2px), linear-gradient(90deg, ${AZ.electrico}88 2px, transparent 2px)`, backgroundSize: "120px 120px", backgroundPosition: `0 ${(f * 4) % 120}px`, WebkitMaskImage: "linear-gradient(180deg, #000 0%, transparent 85%)" }} />
      <Bokeh seed={8} n={30} max={0.6} />
      <Glitch fuerza={g}>
        <AbsoluteFill>
          <div style={{ position: "absolute", left: 540 - 170, top: 420, width: 340, height: 340, scale: String(av) }}>
            <div style={{ position: "absolute", inset: -14, borderRadius: 999, background: `conic-gradient(from ${f * 5}deg, ${AZ.cian}, ${AZ.real}, ${AZ.electrico}, ${AZ.cian})`, boxShadow: `0 0 80px ${AZ.real}` }} />
            <Img src={staticFile("v3/avatar.jpg")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: 999, objectFit: "cover", border: `8px solid ${AZ.noche}` }} />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 820, textAlign: "center", opacity: nom, translate: `0 ${(1 - nom) * 30}px` }}>
            <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 92, color: "#fff", letterSpacing: -2 }}>{marca}</div>
            <div style={{ fontFamily: FUENTE, fontWeight: 700, fontSize: 36, color: AZ.cielo, marginTop: 6 }}>seguros de salud · maternidad</div>
          </div>
          <div style={{ position: "absolute", left: 140, right: 140, top: 1060, height: 100, borderRadius: 99, background: "rgba(255,255,255,0.08)", border: `2px solid ${AZ.cian}88`, display: "flex", alignItems: "center", padding: "0 36px", gap: 22, scale: `${barra} 1`, opacity: barra }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={AZ.cian} strokeWidth="2.6" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
            <span style={{ fontFamily: FUENTE, fontWeight: 800, fontSize: 44, color: "#fff" }}>{usuario.slice(0, chars)}</span>
            <span style={{ fontFamily: FUENTE, fontSize: 44, color: AZ.cian, opacity: f % 16 < 8 ? 1 : 0, marginLeft: -14 }}>|</span>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 1230, display: "flex", justifyContent: "center", scale: String(boton * pulso) }}>
            <div style={{ background: DEGRADADO, color: "#fff", fontFamily: FUENTE, fontWeight: 900, fontSize: 52, padding: "22px 70px", borderRadius: 99, boxShadow: `0 20px 70px ${AZ.real}99` }}>Sígueme para más</div>
          </div>
        </AbsoluteFill>
      </Glitch>
      <AbsoluteFill style={{ opacity: ip(f, [0, 30], [1, 0]) }}>
        <Destello duracion={40} seed={11} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
