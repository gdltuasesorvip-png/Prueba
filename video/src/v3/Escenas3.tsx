import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Bokeh, Destello, FondoAzul } from "./Fx";
import { Bebe, Calendario, Cruz, Escudo, Hospital, Incubadora, Monitor, Reloj } from "./Ilustraciones";
import { VideoMontado } from "./Montaje";
import { AZ, DEGRADADO, FUENTE, MONO, SERIF } from "./paleta";
import { backOut, easeOut, ip, palabra } from "./util";

export type PropsEscena = { inicio: number; anclas: number[]; offsetFrames: number };

const usarT = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return f / fps;
};

const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// Aparición: rebote + desenfoque + subida.
const Pop: React.FC<{ en: number; children: React.ReactNode; style?: React.CSSProperties; desde?: "abajo" | "arriba" | "izq" | "der" | "rotX" }> = ({ en, children, style, desde = "abajo" }) => {
  const t = usarT();
  if (t < en) return null;
  const p = ip(t, [en, en + 0.35], [0, 1], backOut(1.6));
  const q = ip(t, [en, en + 0.2], [0, 1]);
  const tr: React.CSSProperties =
    desde === "rotX"
      ? { transform: `perspective(1200px) rotateX(${(1 - p) * 85}deg)`, transformOrigin: "50% 0%" }
      : { translate: desde === "abajo" ? `0 ${(1 - p) * 60}px` : desde === "arriba" ? `0 ${(p - 1) * 60}px` : desde === "izq" ? `${(p - 1) * 120}px 0` : `${(1 - p) * 120}px 0` };
  return <div style={{ opacity: q, filter: `blur(${(1 - q) * 8}px)`, scale: desde === "rotX" ? undefined : String(0.85 + 0.15 * p), ...tr, ...style }}>{children}</div>;
};

const Sfx: React.FC<{ n: string; en: number; v?: number }> = ({ n, en, v = 0.35 }) => {
  const { fps } = useVideoConfig();
  return <Audio src={staticFile(`sfx/${n}.wav`)} from={Math.max(0, Math.round(en * fps))} volume={v} />;
};

const Etiq: React.FC<{ children: React.ReactNode; oscuro?: boolean }> = ({ children, oscuro }) => (
  <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: 3, textTransform: "uppercase", color: oscuro ? AZ.cian : AZ.real, display: "flex", alignItems: "center", gap: 14 }}>
    <span style={{ width: 12, height: 12, borderRadius: 99, background: oscuro ? AZ.cian : AZ.real, boxShadow: `0 0 16px ${oscuro ? AZ.cian : AZ.real}` }} />
    {children}
  </div>
);

const Tarjeta: React.FC<{ oscuro?: boolean; children: React.ReactNode; style?: React.CSSProperties }> = ({ oscuro, children, style }) => (
  <div
    style={{
      background: oscuro ? "rgba(16,39,94,0.65)" : "rgba(255,255,255,0.92)",
      border: oscuro ? "1.5px solid rgba(79,209,255,0.25)" : "1.5px solid rgba(14,86,246,0.10)",
      borderRadius: 30,
      boxShadow: oscuro ? "0 30px 80px rgba(0,0,0,0.45)" : "0 24px 70px rgba(14,40,120,0.14)",
      backdropFilter: "blur(12px)",
      padding: 36,
      color: oscuro ? "#fff" : AZ.marino,
      fontFamily: FUENTE,
      ...style,
    }}
  >
    {children}
  </div>
);

// Tu cara en un círculo, sincronizada con el audio (picture-in-picture).
export const Pip: React.FC<{ offsetFrames: number; size?: number; x?: number; y?: number }> = ({ offsetFrames, size = 230, x = 810, y = 110 }) => {
  const f = useCurrentFrame();
  const p = ip(f, [4, 14], [0, 1], backOut(1.8));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: size, height: size, scale: String(p), zIndex: 5 }}>
      <div style={{ position: "absolute", inset: -8, borderRadius: 999, background: `conic-gradient(from ${f * 4}deg, ${AZ.cian}, ${AZ.real}, ${AZ.electrico}, ${AZ.cian})` }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 999, overflow: "hidden", background: AZ.noche }}>
        <div style={{ position: "absolute", inset: 0, scale: "2.1", transformOrigin: "47% 34%" }}>
          <VideoMontado offsetFrames={offsetFrames} muted />
        </div>
      </div>
      <div style={{ position: "absolute", right: -6, bottom: 8, width: 34, height: 34, borderRadius: 99, background: AZ.cian, border: `5px solid ${AZ.noche}` }} />
    </div>
  );
};

const Contador: React.FC<{ tramos: [number, number, number][]; color: string; tam?: number }> = ({ tramos, color, tam = 120 }) => {
  // tramos: [instante, desde, hasta]
  const t = usarT();
  let v = 0;
  for (const [en, a, b] of tramos) if (t >= en) v = ip(t, [en, en + 0.6], [a, b], easeOut);
  return <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: tam, lineHeight: 1, color, letterSpacing: -3, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fmt(v)} $</div>;
};

// 1 · COSTE (claro)
export const Coste3: React.FC<PropsEscena> = ({ inicio, anclas, offsetFrames }) => {
  const t = usarT();
  const r = (x: number) => x - inicio;
  const tClin = r(palabra("clínica", inicio));
  const tCostar = r(palabra("costar", inicio));
  const gauge = t < anclas[1] ? 0 : t < anclas[2] ? ip(t, [anclas[1], anclas[1] + 0.6], [0, 0.6], easeOut) : ip(t, [anclas[2], anclas[2] + 0.6], [0.6, 1], easeOut);
  return (
    <FondoAzul>
      <Sfx n="pop" en={tClin} />
      <Sfx n="sube" en={anclas[1]} v={0.3} />
      <Sfx n="sube" en={anclas[2]} v={0.35} />
      <Pip offsetFrames={offsetFrames} />
      <div style={{ position: "absolute", left: 70, top: 150 }}>
        <Etiq>Venezuela · clínica tipo A</Etiq>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 330, display: "flex", justifyContent: "center" }}>
        <Pop en={Math.max(0, anclas[0] - 0.1)}>
          <Hospital desde={Math.max(0, anclas[0] - 0.1)} size={460} />
        </Pop>
      </div>
      <div style={{ position: "absolute", left: 90, right: 90, top: 820 }}>
        <Pop en={tCostar} desde="rotX">
          <Tarjeta style={{ display: "flex", alignItems: "center", gap: 34 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: 2, color: AZ.gris, textTransform: "uppercase" }}>Un parto puede costar</div>
              <div style={{ marginTop: 14 }}>
                <Contador tramos={[[anclas[1], 0, 6000], [anclas[2], 6000, 10000]]} color={AZ.real} />
              </div>
            </div>
            <div style={{ width: 54, height: 230, borderRadius: 99, background: AZ.hielo, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${gauge * 100}%`, background: `linear-gradient(0deg, ${AZ.real}, ${AZ.cian})`, borderRadius: 99 }} />
            </div>
          </Tarjeta>
        </Pop>
      </div>
    </FondoAzul>
  );
};

// 2 · COMPLICACIONES (oscuro)
export const Complicaciones3: React.FC<PropsEscena> = ({ anclas, offsetFrames }) => {
  const t = usarT();
  const f = useCurrentFrame();
  const items: [string, string, React.FC<{ desde: number; size?: number }>][] = [
    ["Cesárea de emergencia", "quirófano + anestesia", Cruz],
    ["Incubadora", "neonatología", Incubadora],
    ["Terapia intensiva", "días de UCI", Monitor],
  ];
  const disparo = ip(t, [anclas[3], anclas[3] + 0.7], [0, 1], easeOut);
  const temblor = t > anclas[3] && t < anclas[3] + 0.5 ? Math.sin(f * 2.3) * 10 : 0;
  const ecg = "M0 60 H180 L210 20 L240 110 L270 0 L300 60 H520 L550 30 L580 95 L610 10 L640 60 H1080";
  return (
    <FondoAzul oscuro>
      <Bokeh seed={2} n={18} max={0.35} />
      {items.map((_, i) => (
        <Sfx key={i} n="pop" en={anclas[i]} />
      ))}
      <Sfx n="boom" en={anclas[3]} v={0.5} />
      <Pip offsetFrames={offsetFrames} />
      <div style={{ position: "absolute", left: 70, top: 150 }}>
        <Etiq oscuro>complicaciones · mamá o bebé</Etiq>
      </div>
      <svg width="1080" height="140" style={{ position: "absolute", top: 340, left: 0 }} viewBox="0 0 1080 120">
        <path d={ecg} fill="none" stroke={AZ.cian} strokeWidth="6" strokeLinejoin="round" strokeDasharray="700 1600" strokeDashoffset={-((f * 28) % 2300) + 700} style={{ filter: `drop-shadow(0 0 10px ${AZ.cian})` }} />
      </svg>
      <div style={{ position: "absolute", left: 90, right: 90, top: 520, display: "flex", flexDirection: "column", gap: 22, translate: `${temblor}px 0` }}>
        {items.map(([titulo, sub, Icono], i) => (
          <Pop key={titulo} en={anclas[i]} desde="rotX">
            <Tarjeta oscuro style={{ display: "flex", alignItems: "center", gap: 30, padding: "26px 32px" }}>
              <div style={{ width: 120, height: 120, borderRadius: 26, background: "rgba(79,209,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icono desde={anclas[i]} size={100} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 44 }}>{titulo}</div>
                <div style={{ fontFamily: MONO, fontSize: 22, color: AZ.cielo, marginTop: 6 }}>{sub}</div>
              </div>
              <div style={{ fontWeight: 900, fontSize: 40, color: AZ.cian }}>+ $</div>
            </Tarjeta>
          </Pop>
        ))}
      </div>
      {t >= anclas[3] ? (
        <>
          <svg width="1080" height="360" viewBox="0 0 1080 360" style={{ position: "absolute", left: 0, top: 1100, height: 300 }} preserveAspectRatio="none">
            <defs>
              <linearGradient id="sube" x1="0" x2="1">
                <stop offset="0" stopColor={AZ.real} />
                <stop offset="1" stopColor={AZ.cian} />
              </linearGradient>
            </defs>
            <polyline points="90,330 280,300 450,260 620,190 800,90 990,10" fill="none" stroke="url(#sube)" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1300" strokeDashoffset={1300 * (1 - disparo)} style={{ filter: `drop-shadow(0 0 18px ${AZ.cian})` }} />
          </svg>
          <AbsoluteFill style={{ opacity: ip(t, [anclas[3], anclas[3] + 0.5, anclas[3] + 1.2], [0, 1, 0]) }}>
            <Destello duracion={30} seed={7} />
          </AbsoluteFill>
        </>
      ) : null}
    </FondoAzul>
  );
};

// 3 · COBERTURA (claro)
export const Cobertura3: React.FC<PropsEscena> = ({ anclas, offsetFrames }) => {
  const t = usarT();
  const fichas: [string, number, React.ReactNode][] = [
    ["Parto", anclas[0], <Bebe desde={anclas[0]} size={90} color={AZ.real} />],
    ["Cesárea", anclas[1], <Cruz desde={anclas[1]} size={86} color={AZ.real} />],
    ["Consultas prenatales", anclas[3], <Monitor desde={anclas[3]} size={86} color={AZ.real} />],
    ["Ecografías", anclas[4], <Incubadora desde={anclas[4]} size={86} color={AZ.real} />],
  ];
  const anio = ip(t, [anclas[5], anclas[6] + 0.9], [0, 1]);
  return (
    <FondoAzul>
      {fichas.map(([, a], i) => (
        <Sfx key={i} n="ding" en={a} v={0.22} />
      ))}
      <Sfx n="sube" en={anclas[5]} v={0.25} />
      <Pip offsetFrames={offsetFrames} />
      <div style={{ position: "absolute", left: 70, top: 150 }}>
        <Etiq>tu plan te cubre</Etiq>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 230, display: "flex", justifyContent: "center" }}>
        <Escudo desde={0.15} size={250} />
      </div>
      <div style={{ position: "absolute", left: 70, right: 70, top: 560, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {fichas.map(([txt, a, icono], i) => (
          <Pop key={txt} en={a} desde={i % 2 ? "der" : "izq"}>
            <Tarjeta style={{ height: 210, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 28, position: "relative" }}>
              {icono}
              <div style={{ fontWeight: 900, fontSize: 36 }}>{txt}</div>
              <div style={{ position: "absolute", right: 22, top: 22, width: 48, height: 48, borderRadius: 99, background: DEGRADADO, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 30 }}>✓</div>
            </Tarjeta>
          </Pop>
        ))}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1080, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <Pop en={anclas[5]}>
          <Calendario progreso={anio} />
        </Pop>
      </div>
    </FondoAzul>
  );
};

// 4 · AHORRO (oscuro)
export const Ahorro3: React.FC<PropsEscena> = ({ anclas, offsetFrames }) => {
  const t = usarT();
  const f = useCurrentFrame();
  const h1 = ip(t, [anclas[0], anclas[0] + 0.6], [0, 90], easeOut);
  const h2 = ip(t, [anclas[1], anclas[1] + 0.9], [0, 660], easeOut);
  const x8 = ip(t, [anclas[2], anclas[2] + 0.4], [0, 1], backOut(2.2));
  return (
    <FondoAzul oscuro>
      <Bokeh seed={4} n={30} max={0.5} />
      <Sfx n="pop" en={anclas[0]} />
      <Sfx n="sube" en={anclas[1]} v={0.4} />
      <Sfx n="boom" en={anclas[2]} v={0.45} />
      <Pip offsetFrames={offsetFrames} />
      <div style={{ position: "absolute", left: 70, top: 150 }}>
        <Etiq oscuro>al año</Etiq>
      </div>
      {/* rayos detrás del ×8 */}
      <div style={{ position: "absolute", left: 250 - 900, top: 760 - 900, width: 1800, height: 1800, borderRadius: 999, opacity: x8 * 0.35, rotate: `${f * 0.8}deg`, background: `repeating-conic-gradient(${AZ.electrico} 0deg 6deg, transparent 6deg 18deg)`, WebkitMaskImage: "radial-gradient(circle, #000 0%, transparent 60%)" }} />
      <div style={{ position: "absolute", left: 40, width: 420, top: 560, textAlign: "center", fontFamily: SERIF, fontStyle: "italic", fontSize: 300, lineHeight: 1, color: "#fff", scale: String(x8), opacity: Math.min(1, x8), textShadow: `0 0 60px ${AZ.cian}` }}>×8</div>
      <div style={{ position: "absolute", left: 430, right: 40, bottom: 520, display: "flex", justifyContent: "space-around", alignItems: "flex-end", height: 900 }}>
        {[
          ["pagas", h1, 1200, anclas[0], AZ.profundo],
          ["te ahorras", h2, 8800, anclas[1], AZ.real],
        ].map(([lbl, h, val, en, col]) => (
          <div key={lbl as string} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: 270 }}>
            {t >= (en as number) ? <Contador tramos={[[en as number, 0, val as number]]} color={lbl === "pagas" ? "#fff" : AZ.cian} tam={64} /> : null}
            <div style={{ width: 190, height: h as number, borderRadius: "28px 28px 10px 10px", background: lbl === "pagas" ? `linear-gradient(0deg, ${col}, ${AZ.electrico})` : `linear-gradient(0deg, ${AZ.real}, ${AZ.cian})`, boxShadow: lbl === "pagas" ? undefined : `0 0 60px ${AZ.cian}55` }} />
            <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: 2, color: AZ.cielo, textTransform: "uppercase" }}>{lbl as string}</div>
          </div>
        ))}
      </div>
    </FondoAzul>
  );
};

// 5 · PLAZO (claro)
export const Plazo3: React.FC<PropsEscena> = ({ anclas, offsetFrames }) => {
  const t = usarT();
  const f = useCurrentFrame();
  const barra = ip(t, [anclas[0] - 0.4, anclas[0] + 0.8], [0, 1], easeOut);
  const pin = ip(t, [anclas[1], anclas[1] + 0.6], [0, 0.42], easeOut);
  const sello = ip(t, [anclas[2], anclas[2] + 0.25], [0, 1], backOut(2.5));
  const temblor = t > anclas[2] && t < anclas[2] + 0.35 ? Math.sin(f * 2.1) * 12 : 0;
  return (
    <FondoAzul>
      <Sfx n="pop" en={anclas[1]} />
      <Sfx n="boom" en={anclas[2]} v={0.45} />
      <Pip offsetFrames={offsetFrames} />
      <div style={{ position: "absolute", left: 70, top: 150 }}>
        <Etiq>ojo · plazo de espera</Etiq>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 260, display: "flex", justifyContent: "center" }}>
        <Pop en={0.1}>
          <Reloj size={330} vueltas={2} />
        </Pop>
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 700, translate: `${temblor}px 0` }}>
        <Tarjeta style={{ padding: "40px 40px 50px" }}>
          <div style={{ fontWeight: 900, fontSize: 46 }}>Maternidad</div>
          <div style={{ position: "relative", height: 34, marginTop: 34, borderRadius: 99, background: AZ.hielo, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${barra * 62}%`, background: `repeating-linear-gradient(-45deg, ${AZ.cielo} 0 14px, ${AZ.hielo} 14px 28px)` }} />
            <div style={{ position: "absolute", left: "62%", top: 0, bottom: 0, width: `${ip(barra, [0.95, 1], [0, 38])}%`, background: DEGRADADO }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 21, color: AZ.gris, marginTop: 16 }}>
            <span>contratas</span>
            <span>plazo de espera</span>
            <span style={{ color: AZ.real }}>cobertura</span>
          </div>
          {t >= anclas[1] ? (
            <div style={{ position: "relative", height: 90, marginTop: 10 }}>
              <div style={{ position: "absolute", left: `${pin * 100}%`, top: 0, translate: "-50% 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 0, height: 0, borderLeft: "16px solid transparent", borderRight: "16px solid transparent", borderBottom: `22px solid ${AZ.marino}` }} />
                <div style={{ background: AZ.marino, color: "#fff", fontWeight: 800, fontSize: 28, padding: "8px 18px", borderRadius: 14 }}>ya embarazada</div>
              </div>
            </div>
          ) : null}
        </Tarjeta>
        {t >= anclas[2] ? (
          <div style={{ position: "absolute", right: 0, top: 360, rotate: "-8deg", scale: String(0.6 + 0.4 * sello), opacity: Math.min(1, sello), border: `8px solid ${AZ.real}`, color: AZ.real, borderRadius: 18, padding: "10px 26px", fontFamily: FUENTE, fontWeight: 900, fontSize: 58, letterSpacing: 2, background: "rgba(247,250,255,0.9)" }}>
            LLEGASTE TARDE
          </div>
        ) : null}
      </div>
    </FondoAzul>
  );
};

// 6 · COMENTA (oscuro) — el vídeo se encoge dentro de un móvil
export const Comenta3: React.FC<PropsEscena & { duracionFrames: number }> = ({ anclas, offsetFrames, duracionFrames }) => {
  const t = usarT();
  const f = useCurrentFrame();
  const W = 560;
  const H = 1060;
  const escFull = 1920 / H; // escala a la que la pantalla del móvil cubre todo el lienzo
  const entra = ip(f, [0, 14], [1, 0], easeOut);
  const sale = ip(f, [duracionFrames - 9, duracionFrames], [0, 1], (n) => n * n);
  const k = Math.max(entra, sale);
  const escala = 1 + (escFull - 1) * k;
  const ty = (960 - (170 + H / 2)) * k;
  const texto = "maternidad";
  const chars = Math.max(0, Math.min(texto.length, Math.floor((t - anclas[0]) * 18)));
  const enviado = t > anclas[0] + 0.75;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 1 - k }}>
        <FondoAzul oscuro>
          <Bokeh seed={6} n={22} max={0.4} />
        </FondoAzul>
      </AbsoluteFill>
      <Sfx n="pop" en={anclas[0] + 0.75} />
      <Sfx n="pop" en={anclas[1]} />
      <Sfx n="ding" en={anclas[2]} v={0.3} />
      <div style={{ position: "absolute", left: 540 - W / 2, top: 170, width: W, height: H, scale: String(escala), translate: `0 ${ty}px`, borderRadius: 70 * (1 - k), background: AZ.noche, boxShadow: k < 0.5 ? `0 0 0 14px #0b1430, 0 40px 120px rgba(0,0,0,0.6), 0 0 80px ${AZ.real}55` : undefined, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: (W - 1080 * (H / 1920)) / 2, top: 0, width: 1080, height: 1920, scale: String(H / 1920), transformOrigin: "0 0" }}>
          <VideoMontado offsetFrames={offsetFrames} muted />
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - k }}>
          <div style={{ position: "absolute", right: 18, top: 420, display: "flex", flexDirection: "column", gap: 26, alignItems: "center" }}>
            {["♥", "💬", "↗"].map((ic, i) => (
              <div key={i} style={{ width: 62, height: 62, borderRadius: 99, background: "rgba(4,11,31,0.45)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontFamily: FUENTE }}>
                {i === 1 ? "✎" : ic}
              </div>
            ))}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 330, background: "linear-gradient(0deg, rgba(4,11,31,0.95), rgba(4,11,31,0))" }} />
          {enviado ? (
            <div style={{ position: "absolute", left: 22, right: 90, bottom: 120, display: "flex", gap: 14, alignItems: "center", translate: `0 ${(1 - ip(t, [anclas[0] + 0.75, anclas[0] + 1.0], [0, 1], easeOut)) * 40}px` }}>
              <div style={{ width: 50, height: 50, borderRadius: 99, background: DEGRADADO }} />
              <div style={{ fontFamily: FUENTE, color: "#fff" }}>
                <div style={{ fontSize: 20, color: AZ.cielo, fontWeight: 700 }}>tú</div>
                <div style={{ fontSize: 30, fontWeight: 800 }}>maternidad</div>
              </div>
            </div>
          ) : null}
          <div style={{ position: "absolute", left: 18, right: 18, bottom: 26, height: 70, borderRadius: 99, background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", padding: "0 26px", fontFamily: FUENTE, fontWeight: 700, fontSize: 28, color: enviado || chars === 0 ? "rgba(255,255,255,0.5)" : "#fff" }}>
            {enviado || chars === 0 ? "Añade un comentario…" : texto.slice(0, chars)}
            {!enviado && chars > 0 && f % 16 < 8 ? <span style={{ marginLeft: 2 }}>|</span> : null}
          </div>
        </div>
      </div>
      {k < 0.05 ? (
        <>
          <div style={{ position: "absolute", left: 60, top: 300 }}>
            <Pop en={anclas[1]} desde="izq">
              <div style={{ background: DEGRADADO, color: "#fff", fontFamily: FUENTE, fontWeight: 900, fontSize: 38, padding: "22px 34px", borderRadius: "34px 34px 34px 8px", boxShadow: `0 20px 60px ${AZ.real}66` }}>Escríbeme ✉</div>
            </Pop>
          </div>
          <div style={{ position: "absolute", right: 50, top: 930 }}>
            <Pop en={anclas[2]} desde="der">
              <Tarjeta style={{ padding: "22px 28px", display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ width: 46, height: 46, borderRadius: 99, background: DEGRADADO, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 28 }}>✓</div>
                <div style={{ fontWeight: 900, fontSize: 32 }}>el plan que te conviene</div>
              </Tarjeta>
            </Pop>
          </div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};
