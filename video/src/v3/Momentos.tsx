import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CUADERNO, PLANOS } from "../datos/edicion";
import { Destello } from "./Fx";
import { Bebe, Calculadora, Cursor, Familia, Pelota, Reloj } from "./Ilustraciones";
import { AZ, DEGRADADO, FUENTE, MONO, SERIF } from "./paleta";
import { backOut, easeOut, ip, palabra } from "./util";

const usarT = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return f / fps;
};

// Tiempos clave (s, línea de salida)
export const T = {
  no: palabra("No"),
  embarazada: palabra("embarazada"),
  sin: palabra("sin"),
  mama: palabra("mamá"),
  bebe: palabra("bebé."),
  cuenta: palabra("cuenta."),
  l70: palabra("70"),
  l840: palabra("840"),
  l4000: palabra("4.000"),
  trato: palabra("trato"),
  jonron: palabra("jonrón."),
  porEso: palabra("Por"),
  ahora: palabra("ahora."),
  familia: palabra("familia,"),
  sigueme: palabra("Sígueme"),
};
export const PLANO_GANCHO = PLANOS[0];
export const PLANO_MAMA = PLANOS[1];
export const PLANO_CUENTA = PLANOS[2];
export const PLANO_JONRON = PLANOS[3];
export const PLANO_AHORA = PLANOS[4];
export const PLANO_SIGUEME = PLANOS[5];

const Letras: React.FC<{ texto: string; en: number; tam: number; color: string; style?: React.CSSProperties; trazo?: string }> = ({ texto, en, tam, color, style, trazo }) => {
  const t = usarT();
  const { fps } = useVideoConfig();
  if (t < en) return null;
  const f = (t - en) * fps;
  return (
    <div style={{ display: "flex", justifyContent: "center", ...style }}>
      {Array.from(texto).map((c, i) => {
        const e = ip(f - i * 1.3, [0, 7], [0, 1], backOut(2));
        return (
          <span key={i} style={{ display: "inline-block", fontFamily: FUENTE, fontWeight: 900, fontSize: tam, lineHeight: 0.9, letterSpacing: -4, color, WebkitTextStroke: trazo, opacity: ip(f - i * 1.3, [0, 2], [0, 1]), translate: `0 ${(1 - e) * -120}px`, scale: String(0.3 + 0.7 * e) }}>
            {c}
          </span>
        );
      })}
    </div>
  );
};

// Recorte de la persona (fotograma exacto) para poner texto DETRÁS de ella.
const Recorte: React.FC = () => {
  const f = useCurrentFrame();
  return <Img src={staticFile(`recorte/f_${f}.webp`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
};

// Capas que van DENTRO de la cámara (se escalan con el vídeo): texto detrás + recorte.
export const DetrasDePersona: React.FC = () => {
  const { fps } = useVideoConfig();
  const g0 = 0;
  const g1 = Math.round(PLANO_GANCHO.fin * fps);
  const a0 = Math.round(PLANO_AHORA.inicio * fps);
  const a1 = Math.round(PLANO_AHORA.fin * fps);
  return (
    <>
      <Sequence from={g0} durationInFrames={g1 - g0} layout="none" name="Gancho detrás">
        <AbsoluteFill>
          <div style={{ position: "absolute", left: -40, right: -40, top: 470 }}>
            <Letras texto="EMBARAZADA" en={T.embarazada} tam={148} color={AZ.real} />
          </div>
        </AbsoluteFill>
        <Recorte />
      </Sequence>
      <Sequence from={a0} durationInFrames={a1 - a0} layout="none" name="Ahora detrás">
        <AhoraDetras desde={a0 / fps} />
        <RecorteDesde base={a0} />
      </Sequence>
    </>
  );
};

const RecorteDesde: React.FC<{ base: number }> = ({ base }) => {
  const f = useCurrentFrame();
  return <Img src={staticFile(`recorte/f_${f + base}.webp`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
};

const AhoraDetras: React.FC<{ desde: number }> = ({ desde }) => {
  const t = usarT() + desde;
  const sale = ip(t, [T.familia - 0.6, T.familia - 0.3], [1, 0]);
  return (
    <AbsoluteFill style={{ opacity: sale }}>
      <div style={{ position: "absolute", left: -60, right: -60, top: 430 }}>
        <Letras texto="AHORA" en={T.ahora - desde} tam={250} color={AZ.real} />
      </div>
    </AbsoluteFill>
  );
};

const Sfx: React.FC<{ n: string; en: number; v?: number }> = ({ n, en, v = 0.35 }) => {
  const { fps } = useVideoConfig();
  return <Audio src={staticFile(`sfx/${n}.wav`)} from={Math.max(0, Math.round(en * fps))} volume={v} />;
};

const Chip: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "rgba(4,11,31,0.72)", color: "#fff", fontFamily: MONO, fontSize: 26, letterSpacing: 3, padding: "12px 24px", borderRadius: 99, border: `1.5px solid ${AZ.cian}66`, ...style }}>
    <span style={{ width: 12, height: 12, borderRadius: 99, background: AZ.cian }} />
    {children}
  </div>
);

// Todo lo que va ENCIMA del vídeo en los planos de busto/cuaderno. Tiempos absolutos.
export const Momentos: React.FC = () => {
  const t = usarT();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out: React.ReactNode[] = [];

  // Gancho: "NO SALGAS" + "sin antes saber esto."
  if (t < PLANO_GANCHO.fin) {
    const p = ip(t, [T.no, T.no + 0.3], [0, 1], backOut(1.8));
    out.push(
      <div key="nosalgas" style={{ position: "absolute", left: 0, right: 0, top: 360, display: "flex", justifyContent: "center", opacity: Math.min(1, p * 2) }}>
        <div style={{ background: AZ.noche, color: "#fff", fontFamily: FUENTE, fontWeight: 900, fontSize: 64, padding: "10px 34px", borderRadius: 22, rotate: "-3deg", scale: String(p) }}>NO SALGAS</div>
      </div>,
    );
  }

  // Mamá / bebé: pantalla partida
  if (t >= T.mama && t < PLANO_MAMA.fin + 0.05) {
    const p = ip(t, [T.mama, T.mama + 0.3], [0, 1], easeOut);
    const b = ip(t, [T.bebe, T.bebe + 0.3], [0, 1], backOut(2));
    out.push(
      <AbsoluteFill key="split">
        <div style={{ position: "absolute", left: 0, right: 0, top: 960, bottom: 0, translate: `0 ${(1 - p) * 960}px`, background: `linear-gradient(180deg, ${AZ.marino}, ${AZ.noche})`, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 230, display: "flex", justifyContent: "center", scale: String(0.6 + 0.4 * b), opacity: 0.35 + 0.65 * b }}>
            <Bebe desde={T.mama + 0.1} size={420} />
          </div>
          <div style={{ position: "absolute", left: 60, bottom: 80 }}>
            <Chip>BEBÉ</Chip>
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 956, height: 8, background: DEGRADADO, boxShadow: `0 0 30px ${AZ.cian}`, scale: `${p} 1` }} />
        <div style={{ position: "absolute", left: 60, top: 840, opacity: p }}>
          <Chip>MAMÁ</Chip>
        </div>
      </AbsoluteFill>,
    );
  }

  // "saquemos la cuenta." → calculadora
  if (t >= T.cuenta - 0.15 && t < PLANO_CUENTA.fin) {
    const p = ip(t, [T.cuenta - 0.15, T.cuenta + 0.2], [0, 1], backOut(1.8));
    out.push(
      <div key="calc" style={{ position: "absolute", right: 70, top: 620, rotate: `${(1 - p) * 40 - 10}deg`, scale: String(p), filter: `drop-shadow(0 30px 50px rgba(4,11,31,0.6))` }}>
        <Calculadora size={260} />
      </div>,
    );
  }

  // Cuaderno: ticket que se imprime con las cifras + "¿buen trato?"
  if (t >= CUADERNO.inicio && t < CUADERNO.fin) {
    const lineas: [number, string, string][] = [
      [T.l70, "Plan · mes", "70–100 $"],
      [T.l840, "Plan · año", "840–1.200 $"],
      [T.l4000, "Parto", "4.000–6.000 $"],
    ];
    const visibles = lineas.filter(([en]) => t >= en);
    const alto = 120 + visibles.length * 92 + (t >= T.trato ? 120 : 0);
    const altoAnim = ip(t, [Math.max(...visibles.map(([en]) => en), CUADERNO.inicio), Math.max(...visibles.map(([en]) => en), CUADERNO.inicio) + 0.3], [alto - 92, alto], easeOut);
    const sello = ip(t, [T.trato, T.trato + 0.25], [0, 1], backOut(2.5));
    if (visibles.length) {
      out.push(
        <div key="ticket" style={{ position: "absolute", right: 40, top: 120, width: 560, height: altoAnim, overflow: "hidden", rotate: "2deg", filter: "drop-shadow(0 30px 40px rgba(4,11,31,0.45))" }}>
          <div style={{ position: "absolute", inset: 0, background: "#fbfdff", clipPath: `polygon(0 0, 100% 0, 100% calc(100% - 18px), ${Array.from({ length: 21 }).map((_, i) => `${100 - i * 5}% ${i % 2 ? "100%" : "calc(100% - 18px)"}`).join(", ")}, 0 calc(100% - 18px))` }} />
          <div style={{ position: "relative", padding: "30px 34px", fontFamily: MONO, color: AZ.marino }}>
            <div style={{ fontSize: 22, letterSpacing: 3, color: AZ.gris, borderBottom: `2px dashed ${AZ.hielo}`, paddingBottom: 14 }}>SAQUEMOS LA CUENTA</div>
            {visibles.map(([en, a, b]) => (
              <div key={a} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 26, opacity: ip(t, [en, en + 0.2], [0, 1]) }}>
                <span style={{ fontSize: 24 }}>{a}</span>
                <span style={{ fontSize: 32, fontWeight: 600, color: AZ.real, whiteSpace: "nowrap" }}>{b}</span>
              </div>
            ))}
            {t >= T.trato ? (
              <div style={{ marginTop: 30, display: "flex", justifyContent: "center" }}>
                <div style={{ border: `5px solid ${AZ.real}`, color: AZ.real, borderRadius: 14, padding: "8px 18px", fontFamily: FUENTE, fontWeight: 900, fontSize: 40, rotate: "-6deg", scale: String(0.5 + 0.5 * sello), opacity: Math.min(1, sello) }}>¿BUEN TRATO?</div>
              </div>
            ) : null}
          </div>
        </div>,
      );
    }
    if (t >= T.trato) {
      const q = ip(t, [T.trato, T.trato + 0.4], [0, 1], backOut(2));
      out.push(
        <div key="q" style={{ position: "absolute", left: 40, top: 520, fontFamily: SERIF, fontStyle: "italic", fontSize: 520, lineHeight: 1, color: "#fff", textShadow: `0 0 50px ${AZ.real}`, rotate: `${(1 - q) * -40 - 8}deg`, scale: String(q), opacity: Math.min(1, q) * 0.95 }}>?</div>,
      );
    }
  }

  // Jonrón
  if (t >= T.jonron - 0.35 && t < PLANO_JONRON.fin) {
    const v = ip(t, [T.jonron - 0.35, T.jonron + 0.6], [0, 1]);
    const x = -120 + v * 1350;
    const y = 1500 - Math.sin(v * Math.PI * 0.85) * 1450 - v * 300;
    const s = ip(t, [T.jonron, T.jonron + 0.3], [0, 1], backOut(2.6));
    out.push(
      <AbsoluteFill key="jonron">
        <div style={{ position: "absolute", left: 540 - 1000, top: 760 - 1000, width: 2000, height: 2000, borderRadius: 999, opacity: s * 0.5, rotate: `${f * 1.2}deg`, background: `repeating-conic-gradient(${AZ.real} 0deg 7deg, transparent 7deg 20deg)`, WebkitMaskImage: "radial-gradient(circle, #000 5%, transparent 62%)" }} />
        {Array.from({ length: 7 }).map((_, i) => {
          const vv = Math.max(0, v - i * 0.03);
          return (
            <div key={i} style={{ position: "absolute", left: -120 + vv * 1350 - 80, top: 1500 - Math.sin(vv * Math.PI * 0.85) * 1450 - vv * 300 - 80, opacity: (1 - i / 7) * 0.4, scale: String(1 - i * 0.08), filter: "blur(4px)" }}>
              <div style={{ width: 160, height: 160, borderRadius: 99, background: AZ.cian }} />
            </div>
          );
        })}
        <div style={{ position: "absolute", left: x - 80, top: y - 80 }}>
          <Pelota size={160} />
        </div>
        {t >= T.jonron ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 640, display: "flex", justifyContent: "center" }}>
            <div style={{ rotate: "-8deg", scale: String(s), background: DEGRADADO, color: "#fff", fontFamily: FUENTE, fontWeight: 900, fontSize: 150, letterSpacing: -4, padding: "6px 46px 16px", borderRadius: 36, boxShadow: `0 30px 90px ${AZ.real}88, 0 0 0 10px #fff` }}>¡JONRÓN!</div>
          </div>
        ) : null}
      </AbsoluteFill>,
    );
  }

  // Ahora: "Por eso es el momento" arriba + reloj
  if (t >= PLANO_AHORA.inicio && t < T.familia - 0.3) {
    const p = ip(t, [T.porEso, T.porEso + 0.3], [0, 1], backOut(1.6));
    const sale = ip(t, [T.familia - 0.6, T.familia - 0.3], [1, 0]);
    out.push(
      <div key="poreso" style={{ position: "absolute", left: 0, right: 0, top: 330, display: "flex", justifyContent: "center", opacity: Math.min(p, sale) }}>
        <div style={{ background: AZ.noche, color: "#fff", fontFamily: FUENTE, fontWeight: 900, fontSize: 54, padding: "10px 30px", borderRadius: 20, rotate: "2deg", scale: String(p) }}>por eso es el momento</div>
      </div>,
    );
    if (t >= T.ahora) {
      const r = ip(t, [T.ahora, T.ahora + 0.35], [0, 1], backOut(2));
      out.push(
        <div key="reloj" style={{ position: "absolute", left: 70, top: 840, scale: String(r), opacity: sale, filter: "drop-shadow(0 20px 40px rgba(4,11,31,0.5))", background: "#fff", borderRadius: 999, padding: 16 }}>
          <Reloj size={170} vueltas={4} />
        </div>,
      );
    }
  }

  // Familia
  if (t >= T.familia - 0.1 && t < PLANO_AHORA.fin) {
    out.push(
      <div key="familia" style={{ position: "absolute", left: 40, top: 300, padding: 30, borderRadius: 40, background: "rgba(4,11,31,0.55)", border: `2px solid ${AZ.cian}55` }}>
        <Familia desde={T.familia - 0.1} size={340} />
      </div>,
    );
  }

  // Sígueme: botón + cursor
  if (t >= T.sigueme && t < PLANO_SIGUEME.fin + 0.1) {
    const p = ip(t, [T.sigueme, T.sigueme + 0.25], [0, 1], backOut(2));
    const toque = T.sigueme + 0.45;
    const cx = ip(t, [T.sigueme, toque], [900, 640], easeOut);
    const cy = ip(t, [T.sigueme, toque], [1300, 1060], easeOut);
    const hecho = t >= toque;
    const press = t >= toque && t < toque + 0.12 ? 0.92 : 1;
    out.push(
      <AbsoluteFill key="seguir">
        <div style={{ position: "absolute", left: 0, right: 0, top: 980, display: "flex", justifyContent: "center", scale: String(p * press) }}>
          <div style={{ background: hecho ? "#fff" : DEGRADADO, color: hecho ? AZ.real : "#fff", fontFamily: FUENTE, fontWeight: 900, fontSize: 56, padding: "22px 60px", borderRadius: 99, boxShadow: `0 20px 60px ${AZ.real}77` }}>{hecho ? "Siguiendo ✓" : "+ Seguir"}</div>
        </div>
        <div style={{ position: "absolute", left: cx, top: cy }}>
          <Cursor size={90} />
        </div>
      </AbsoluteFill>,
    );
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {out}
      <Sequence from={Math.round(T.mama * fps)} durationInFrames={20} layout="none">
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.3} />
      </Sequence>
      <Sfx n="pop" en={T.no} v={0.3} />
      <Sfx n="boom" en={T.embarazada} v={0.35} />
      <Sfx n="pop" en={T.bebe} v={0.3} />
      <Sfx n="pop" en={T.cuenta} v={0.3} />
      <Sfx n="pop" en={T.l70} v={0.25} />
      <Sfx n="pop" en={T.l840} v={0.25} />
      <Sfx n="pop" en={T.l4000} v={0.25} />
      <Sfx n="boom" en={T.trato} v={0.3} />
      <Sfx n="whoosh" en={T.jonron - 0.35} v={0.45} />
      <Sfx n="boom" en={T.jonron} v={0.5} />
      <Sfx n="boom" en={T.ahora} v={0.4} />
      <Sfx n="ding" en={T.familia} v={0.3} />
      <Sfx n="ding" en={T.sigueme + 0.45} v={0.35} />
      <Sequence from={Math.round(T.jonron * fps)} durationInFrames={30} layout="none">
        <Destello duracion={30} seed={9} />
      </Sequence>
    </AbsoluteFill>
  );
};
