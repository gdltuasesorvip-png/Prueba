import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { T } from "../datos/dlb2";
import { Destello } from "../v3/Fx";
import { Escudo } from "../v3/Ilustraciones";
import { AZ, DEGRADADO, FUENTE, MONO, SERIF } from "../v3/paleta";
import { backOut, easeOut, ip } from "../v3/util";
import { Alcancia, Colchon, Confeti, LluviaBilletes, Sirena } from "./Ilus2";

const usarT = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return f / fps;
};

// Tramos (s de salida)
export const DUO: [number, number][] = [
  [0, T.teaserFin],
  [T.flashIni, T.flashFin],
  [T.pausaIni, T.pausaFin],
];
export const BANDAS: [number, number][] = [
  [0, T.teaserFin],
  [T.flashIni, T.flashFin],
];
export const RECORTES: [number, number][] = [
  [T.no - 0.1, T.no + 0.75],
  [T.patrimonio1 - 0.15, T.patrimonio1 + 1.5],
];
export const enTramo = (t: number, tr: [number, number][]) => tr.some(([a, b]) => t >= a && t < b);

const Letras: React.FC<{ texto: string; en: number; tam: number; color: string; t: number; fps: number }> = ({ texto, en, tam, color, t, fps }) => {
  if (t < en) return null;
  const f = (t - en) * fps;
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      {Array.from(texto).map((c, i) => {
        const e = ip(f - i * 1.2, [0, 7], [0, 1], backOut(2));
        return (
          <span key={i} style={{ display: "inline-block", fontFamily: FUENTE, fontWeight: 900, fontSize: tam, lineHeight: 0.92, letterSpacing: -4, color, opacity: ip(f - i * 1.2, [0, 2], [0, 1]), translate: `0 ${(1 - e) * -120}px`, scale: String(0.3 + 0.7 * e), whiteSpace: "pre" }}>
            {c}
          </span>
        );
      })}
    </div>
  );
};

// Dentro de la cámara: texto gigante detrás de las personas + recorte encima.
export const Detras: React.FC<{ banda: React.CSSProperties }> = ({ banda }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const recorte = enTramo(t, RECORTES);
  let texto: React.ReactNode = null;
  if (false) {
  } else if (t >= T.no - 0.1 && t < T.no + 0.75) {
    texto = (
      <div style={{ position: "absolute", left: 0, right: 0, top: 300 }}>
        <Letras texto="NO" en={T.no} tam={420} color="#ffffff" t={t} fps={fps} />
      </div>
    );
  } else if (t >= T.patrimonio1 - 0.15 && t < T.patrimonio1 + 1.5) {
    texto = (
      <div style={{ position: "absolute", left: -60, right: -60, top: 170, opacity: ip(t, [T.patrimonio1 + 1.2, T.patrimonio1 + 1.5], [1, 0]) }}>
        <Letras texto="PATRIMONIO" en={T.patrimonio1} tam={124} color={AZ.real} t={t} fps={fps} />
      </div>
    );
  }
  return (
    <>
      {texto}
      {recorte ? (
        <AbsoluteFill style={banda}>
          <Img src={staticFile(`recorte_dlb2/f_${f}.webp`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", filter: enTramo(t, DUO) ? "grayscale(1) contrast(1.25) brightness(1.18)" : "contrast(1.05) saturate(1.06)" }} />
        </AbsoluteFill>
      ) : null}
    </>
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
const Sello: React.FC<{ en: number; t: number; children: React.ReactNode; rot?: number; style?: React.CSSProperties; claro?: boolean }> = ({ en, t, children, rot = -8, style, claro }) => {
  const s = ip(t, [en, en + 0.28], [0, 1], backOut(2.5));
  return (
    <div style={{ rotate: `${rot}deg`, scale: String(0.4 + 0.6 * s), opacity: Math.min(1, s * 1.5), border: `8px solid ${claro ? "#fff" : AZ.cian}`, color: claro ? "#fff" : AZ.cian, background: "rgba(4,11,31,0.55)", borderRadius: 18, padding: "6px 26px", fontFamily: FUENTE, fontWeight: 900, fontSize: 64, letterSpacing: 2, ...style }}>{children}</div>
  );
};
const Aparece: React.FC<{ en: number; t: number; hasta?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ en, t, hasta = 1e9, children, style }) => {
  if (t < en || t > hasta) return null;
  const p = ip(t, [en, en + 0.35], [0, 1], backOut(1.8));
  const sale = ip(t, [hasta - 0.2, hasta], [1, 0]);
  return <div style={{ position: "absolute", scale: String(p), opacity: Math.min(1, p * 2) * sale, ...style }}>{children}</div>;
};

// Encima del vídeo (fuera de la cámara). Tiempos absolutos.
export const Momentos: React.FC = () => {
  const t = usarT();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Teaser */}
      {t < T.teaserFin ? (
        <>
          <LluviaBilletes desde={0.45} n={12} />
          <div style={{ position: "absolute", left: -40, right: -40, top: 520, filter: "drop-shadow(0 10px 30px rgba(4,11,31,0.7))" }}>
            <Letras texto="¿BOTAR" en={0.05} tam={190} color="#ffffff" t={t} fps={fps} />
            <Letras texto="EL DINERO?" en={0.3} tam={130} color={AZ.cian} t={t} fps={fps} />
          </div>
          <div style={{ position: "absolute", left: 70, top: 1180 }}>
            <Sello en={0.6} t={t} rot={-10}>¿MITO?</Sello>
          </div>
        </>
      ) : null}
      {/* Título */}
      <Aparece en={T.hola - 0.2} t={t} hasta={T.hola + 3.2} style={{ left: 0, right: 0, top: 150, display: "flex", justifyContent: "center" }}>
        <Chip>MITO VS. REALIDAD · SEGUROS</Chip>
      </Aparece>
      <Aparece en={T.asegurarte} t={t} hasta={T.asegurarte + 1.4} style={{ right: 70, top: 300 }}>
        <div style={{ background: "#fff", borderRadius: 999, padding: 22, boxShadow: "0 20px 50px rgba(4,11,31,0.45)" }}>
          <Escudo desde={T.asegurarte} size={130} />
        </div>
      </Aparece>
      {/* Flashback */}
      {t >= T.flashIni && t < T.flashFin ? (
        <>
          <div style={{ position: "absolute", left: 60, top: 150 }}>
            <Chip>LO QUE ME DIJERON…</Chip>
          </div>
          <div style={{ position: "absolute", right: 60, top: 300 }}>
            <Sello en={T.dicho} t={t} rot={8} claro>MITO</Sello>
          </div>
          {t >= T.botar ? <Sequence from={Math.round(T.botar * fps)} layout="none"><LluviaBilletes desde={0} n={16} /></Sequence> : null}
          <Aparece en={T.colchon - 0.1} t={t} style={{ left: 0, right: 0, top: 820, display: "flex", justifyContent: "center" }}>
            <Colchon desde={0} size={460} />
          </Aparece>
        </>
      ) : null}
      {/* ¿Por qué no paga? */}
      <Aparece en={T.seguroNoPaga} t={t} hasta={T.seguroNoPaga + 2.7} style={{ left: 0, right: 0, top: 380, display: "flex", justifyContent: "center" }}>
        <div style={{ background: DEGRADADO, color: "#fff", fontFamily: FUENTE, fontWeight: 900, fontSize: 64, padding: "10px 36px", borderRadius: 24, rotate: "-3deg", boxShadow: `0 20px 60px ${AZ.real}77` }}>¿Por qué no paga?</div>
      </Aparece>
      {/* Ahorros guardaditos */}
      <Aparece en={T.ahorros1 - 0.1} t={t} hasta={T.guardaditos + 1.3} style={{ right: 50, top: 330 }}>
        <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: 40, padding: "20px 24px 12px", boxShadow: "0 20px 60px rgba(4,11,31,0.45)", rotate: "4deg" }}>
          <Alcancia desde={0} size={230} />
          <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 30, color: AZ.marino, textAlign: "center" }}>"guardaditos"</div>
        </div>
      </Aparece>
      {/* ¿Tienes eso guardado? */}
      <Aparece en={T.dime} t={t} hasta={T.pausaIni} style={{ left: 30, top: 300 }}>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 460, lineHeight: 1, color: "#fff", textShadow: `0 0 60px ${AZ.real}`, rotate: "-10deg" }}>?</div>
      </Aparece>
      <Aparece en={T.emergencia} t={t} hasta={T.pausaIni} style={{ right: 70, top: 330 }}>
        <Sirena size={190} />
      </Aparece>
      {/* Pausa dramática */}
      {t >= T.pausaIni && t < T.pausaFin ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 420, display: "flex", justifyContent: "center" }}>
          <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: 60, padding: "26px 48px", display: "flex", gap: 22, boxShadow: "0 20px 60px rgba(4,11,31,0.45)" }}>
            {[0, 1, 2].map((k) => (
              <div key={k} style={{ width: 34, height: 34, borderRadius: 99, background: AZ.real, translate: `0 ${Math.sin(f / 4 - k) * 10}px`, opacity: 0.5 + 0.5 * Math.sin(f / 4 - k) }} />
            ))}
          </div>
        </div>
      ) : null}
      {/* Aliado */}
      <Aparece en={T.aliado1 - 0.1} t={t} hasta={T.ahorros2 + 1.6} style={{ right: 50, top: 300 }}>
        <div style={{ background: "rgba(255,255,255,0.96)", borderRadius: 36, padding: "22px 26px", boxShadow: "0 20px 60px rgba(4,11,31,0.45)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Escudo desde={0} size={110} />
            <div style={{ marginLeft: -24 }}>
              <Alcancia desde={0} size={150} />
            </div>
          </div>
          <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 34, color: AZ.real }}>tu aliado</div>
        </div>
      </Aparece>
      {/* Tienes toda la razón */}
      {t >= T.razon2 ? <Sequence from={Math.round(T.razon2 * fps)} durationInFrames={70} layout="none"><Confeti desde={0} cx={540} cy={760} n={46} /></Sequence> : null}
      <Aparece en={T.razon2} t={t} hasta={T.razon2 + 2.2} style={{ left: 0, right: 0, top: 360, display: "flex", justifyContent: "center" }}>
        <Sello en={T.razon2} t={t} rot={-6} claro>✓ DE ACUERDO</Sello>
      </Aparece>
      {/* La mejor decisión */}
      <Aparece en={T.decision - 0.1} t={t} hasta={T.decision + 1.0} style={{ left: 0, right: 0, top: 360, display: "flex", justifyContent: "center" }}>
        <div style={{ background: "#fff", color: AZ.marino, fontFamily: FUENTE, fontWeight: 900, fontSize: 52, padding: "18px 38px", borderRadius: 26, boxShadow: `0 20px 60px rgba(4,11,31,0.45)`, display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ width: 56, height: 56, borderRadius: 99, background: DEGRADADO, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>✓</span>
          la mejor decisión
        </div>
      </Aparece>

      <Sfx n="boom" en={0.05} v={0.45} />
      <Sfx n="whoosh" en={0.45} v={0.35} />
      <Sfx n="pop" en={0.6} v={0.3} />
      <Sfx n="pop" en={T.asegurarte} v={0.25} />
      <Sfx n="boom" en={T.no} v={0.5} />
      <Sfx n="pop" en={T.dicho} v={0.3} />
      <Sfx n="whoosh" en={T.botar} v={0.35} />
      <Sfx n="pop" en={T.colchon} v={0.3} />
      <Sfx n="pop" en={T.seguroNoPaga} v={0.3} />
      <Sfx n="pop" en={T.ahorros1} v={0.3} />
      <Sfx n="ding" en={T.ahorros1 + 0.4} v={0.25} />
      <Sfx n="boom" en={T.dime} v={0.35} />
      <Sfx n="zap" en={T.emergencia} v={0.25} />
      <Sfx n="boom" en={T.pausaIni} v={0.45} />
      <Sfx n="pop" en={T.aliado1} v={0.3} />
      <Sfx n="boom" en={T.patrimonio1} v={0.45} />
      <Sfx n="ding" en={T.razon2} v={0.4} />
      <Sfx n="pop" en={T.decision} v={0.3} />
      <Sequence from={Math.round(T.no * fps)} durationInFrames={24} layout="none"><Destello duracion={24} seed={4} /></Sequence>
      <Sequence from={Math.round(T.patrimonio1 * fps)} durationInFrames={28} layout="none"><Destello duracion={28} seed={14} /></Sequence>
    </AbsoluteFill>
  );
};
