import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BLOQUES, CTA, DURACION_TOTAL, DURACION_VOZ, PANTALLA_FINAL, SEGMENTOS, T } from "./datos/v4";
import "./fuentes";
import { Bokeh, Destello, Flash, FondoAzul, GradoAzul, Grano } from "./v3/Fx";
import { Final3 } from "./v3/Final3";
import { Escudo } from "./v3/Ilustraciones";
import { AZ, DEGRADADO, FUENTE, MONO, SERIF } from "./v3/paleta";
import { Subs3, type Bloque3 } from "./v3/Subs3";
import { backOut, easeIn, easeOut, ip } from "./v3/util";
import { Brochazo, Fragmentos, Grietas, HUD, LineasVelocidad, Neon, Paneles, PinCae, Polaroid, Rayos } from "./v4/Efectos4";
import { Montaje4 } from "./v4/Montaje4";
import { CARAS } from "./datos/caras_v4";
import { elegir, type Rect } from "./v4/caras";

export const calcularDuracionV4 = () => Math.ceil(DURACION_TOTAL * 30);
const fps = 30;
const F = (s: number) => Math.round(s * fps);
const rapido = (t: number) => SEGMENTOS.some((s) => s.vel > 1.2 && t >= s.out0 && t < s.out0 + s.frames / fps);
const IMPACTO = [T.tumba];

const CORTES = BLOQUES.filter((b) => b.tramo === "dialogo").map((b, k) => ({ inicio: b.inicio, fin: b.fin, k }));
const ENC = [1.0, 1.14, 1.06, 1.22];

export const camara = (t: number, f = Math.round(t * fps)) => {
  let s = 1, r = 0, x = 0, blur = 0;
  const c = CORTES.find((cc) => t >= cc.inicio && t < cc.fin + 0.07);
  if (c && !(t >= T.hola - 0.1 && t < T.hola + 1.8)) {
    const fc = (t - c.inicio) * fps;
    s = ENC[c.k % ENC.length] + 0.03 * ip(fc, [0, 90], [0, 1]) + ip(fc, [0, 6], [0.05, 0], easeOut);
  }
  if (t < T.ganchoFin) s = 1.04 + 0.08 * ip(t, [0, T.ganchoFin], [0, 1]);
  const fs = (t - T.aparca) * fps;
  if (fs > -7 && fs < 7) {
    r = fs < 0 ? ip(fs, [-7, 0], [0, 180], easeIn) : ip(fs, [0, 7], [-180, 0], easeOut);
    blur = Math.max(blur, 14 - Math.abs(fs) * 2);
    s *= 1 + 0.25 * (1 - Math.abs(fs) / 7);
  }
  const fp = (t - T.dialogo) * fps;
  if (fp > -12 && fp < 0) {
    s *= ip(fp, [-12, 0], [1, 2.8], easeIn);
    blur = Math.max(blur, ip(fp, [-12, 0], [0, 18]));
  } else if (fp >= 0 && fp < 8) {
    s *= ip(fp, [0, 8], [1.35, 1], easeOut);
    blur = Math.max(blur, ip(fp, [0, 8], [12, 0]));
  }
  for (const ti of IMPACTO) {
    const fi = (t - ti) * fps;
    if (fi >= 0 && fi < 12) {
      x += Math.sin(f * 2.6) * ip(fi, [0, 12], [26, 0]);
      s += ip(fi, [0, 10], [0.1, 0], easeOut);
    }
  }
  return { s, r, x, blur };
};
const CAM = (t: number) => camara(t);
const libre = (a: number, b: number, cands: Rect[]) => elegir(CARAS, a, b, cands, CAM);

const Camara: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const { s, r, x, blur } = camara(f / fps, f);
  return (
    <AbsoluteFill style={{ background: AZ.noche, overflow: "hidden" }}>
      <AbsoluteFill style={{ scale: String(s), rotate: `${r}deg`, translate: `${x}px 0`, transformOrigin: "50% 45%", filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// Texto apilado contorno/relleno (nuevo estilo) detrás de la persona en el gancho.
const Apilado: React.FC<{ lineas: string[]; desde: number; tam: number; top: number }> = ({ lineas, desde, tam, top }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 0, right: 110, top, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      {lineas.map((l, i) => {
        const e = ip(f - desde * fps - i * 4, [0, 8], [0, 1], backOut(1.8));
        const relleno = i % 2 === 0;
        return (
          <div key={i} style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: tam, lineHeight: 0.9, letterSpacing: -4, color: relleno ? AZ.cian : "transparent", WebkitTextStroke: relleno ? undefined : `6px #ffffff`, translate: `${(1 - e) * (i % 2 ? 300 : -300)}px 0`, opacity: Math.min(1, e * 1.5) }}>
            {l}
          </div>
        );
      })}
    </div>
  );
};

const Video4: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / fps;
  return (
    <>
      <AbsoluteFill style={{ filter: "contrast(1.06) saturate(1.08)" }}>
        <Montaje4 />
      </AbsoluteFill>
      {t < T.ganchoFin + 0.05 ? (
        <>
          <Apilado lineas={["CASI", "ME", "MATO"]} desde={0.05} tam={176} top={210} />
          <Img src={staticFile(`recorte_v4/f_${f}.webp`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", filter: "contrast(1.06) saturate(1.08)" }} />
        </>
      ) : null}
      <Sequence from={F(T.uf - 0.05)} durationInFrames={F(1.7)} layout="none">
        <Neon base={F(T.uf - 0.05)} en={0} dur={1.65} />
      </Sequence>
      <Sequence from={F(T.hola - 0.05)} durationInFrames={F(1.8)} layout="none">
        <Neon base={F(T.hola - 0.05)} en={0} dur={1.75} />
      </Sequence>
    </>
  );
};

// ---- Iconos ----
const Moto: React.FC<{ size?: number; color?: string }> = ({ size = 260, color = AZ.real }) => (
  <svg width={size} height={size * 0.62} viewBox="0 0 260 160" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="55" cy="115" r="36" fill="none" stroke={color} strokeWidth="11" />
    <circle cx="205" cy="115" r="36" fill="none" stroke={color} strokeWidth="11" />
    <circle cx="55" cy="115" r="8" fill={color} />
    <circle cx="205" cy="115" r="8" fill={color} />
    <path d="M70 108 L110 70 H165 L190 92 L205 115" fill="none" stroke={color} strokeWidth="10" />
    <path d="M95 72 Q105 48 140 50 L170 54 Q182 58 176 72 Z" fill={color} />
    <path d="M100 60 H60 Q48 62 52 72 L70 80" fill="none" stroke={color} strokeWidth="9" />
    <path d="M168 54 L182 26 M174 30 H200" fill="none" stroke={color} strokeWidth="9" />
    <circle cx="200" cy="58" r="9" fill={color} />
  </svg>
);
const Carro: React.FC<{ size?: number }> = ({ size = 360 }) => (
  <svg width={size} height={size * 0.5} viewBox="0 0 300 150">
    <path d="M20 100 L40 60 Q50 40 75 40 H190 Q215 40 230 60 L260 95 Q285 100 285 115 V125 H15 V112 Q15 100 20 100 Z" fill={AZ.marino} stroke="#fff" strokeWidth="6" />
    <path d="M70 55 H130 V90 H55 Z M145 55 H200 L225 90 H145 Z" fill={AZ.cielo} />
    <circle cx="80" cy="125" r="24" fill={AZ.noche} stroke="#fff" strokeWidth="6" />
    <circle cx="225" cy="125" r="24" fill={AZ.noche} stroke="#fff" strokeWidth="6" />
  </svg>
);

const Aparece: React.FC<{ en: number; hasta: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ en, hasta, children, style }) => {
  const f = useCurrentFrame();
  const t = f / fps;
  if (t < en || t > hasta) return null;
  const p = ip(t, [en, en + 0.35], [0, 1], backOut(1.8));
  const q = ip(t, [hasta - 0.2, hasta], [1, 0]);
  return <div style={{ position: "absolute", scale: String(p), opacity: Math.min(1, p * 2) * q, ...style }}>{children}</div>;
};
const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "rgba(4,11,31,0.75)", color: "#fff", fontFamily: MONO, fontSize: 26, letterSpacing: 3, padding: "12px 24px", borderRadius: 99, border: `1.5px solid ${AZ.cian}88` }}>
    <span style={{ width: 12, height: 12, borderRadius: 99, background: AZ.cian }} />
    {children}
  </div>
);
const Maquina: React.FC<{ texto: string; desde: number; cps?: number; style?: React.CSSProperties }> = ({ texto, desde, cps = 28, style }) => {
  const f = useCurrentFrame();
  const n = Math.max(0, Math.min(texto.length, Math.floor((f / fps - desde) * cps)));
  if (n === 0) return null;
  return <div style={{ fontFamily: MONO, color: "#fff", textShadow: "0 3px 14px rgba(0,0,0,0.7)", ...style }}>{texto.slice(0, n)}<span style={{ opacity: f % 14 < 7 ? 1 : 0 }}>▌</span></div>;
};

// Posiciones elegidas para no tapar rostros
const P = {
  maq1: libre(T.llegada + 0.3, T.aparca - 0.2, [[80, 740, 920, 90], [80, 1100, 920, 90], [80, 520, 920, 90], [80, 1450, 920, 90]]),
  maq2: libre(T.aparca + 0.6, T.casco - 0.2, [[80, 740, 920, 90], [80, 1100, 920, 90], [80, 520, 920, 90], [80, 1450, 920, 90]]),
  chipUf: libre(T.uf, T.uf + 2.2, [[60, 170, 760, 72], [60, 1730, 760, 72], [260, 170, 760, 72], [260, 1730, 760, 72]]),
  pin: libre(T.claro + 0.45, T.vamos + 0.9, [[700, 240, 300, 430], [720, 640, 300, 430], [60, 240, 300, 430], [720, 1040, 300, 430], [60, 1040, 300, 430]]),
  chipGab: libre(T.hola + 0.9, T.hola + 3.4, [[60, 170, 660, 72], [60, 1730, 660, 72], [360, 170, 660, 72]]),
  burbuja: libre(T.cuentame, T.moto - 0.1, [[610, 300, 420, 130], [60, 300, 420, 130], [610, 1080, 420, 130], [60, 1080, 420, 130], [330, 170, 420, 130]]),
  moto: libre(T.moto - 0.05, T.tumba + 0.4, [[60, 320, 280, 200], [740, 320, 280, 200], [60, 1060, 280, 200], [740, 1060, 280, 200], [400, 170, 280, 200]]),
  carro: libre(T.carro - 0.25, T.tumba + 0.2, [[0, 560, 1080, 200], [0, 1160, 1080, 200], [0, 250, 1080, 200], [0, 1500, 1080, 200]]),
  grieta: libre(T.tumba, T.tumba + 0.9, [[580, 220, 420, 420], [80, 220, 420, 420], [580, 1180, 420, 420], [80, 1180, 420, 420]]),
  nada: libre(T.nada - 0.1, T.asesoria - 0.05, [[290, 300, 500, 90], [290, 170, 500, 90], [290, 1730, 500, 90], [290, 1080, 500, 90]]),
  escudo: libre(T.asesoria - 0.05, T.producto, [[826, 300, 184, 184], [70, 300, 184, 184], [826, 1080, 184, 184], [70, 1080, 184, 184]]),
  buscador: libre(T.producto - 0.1, DURACION_VOZ + 0.1, [[70, 300, 940, 270], [70, 160, 940, 270], [70, 1080, 940, 270], [70, 1500, 940, 270]]),
};

const Momentos: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / fps;
  const carroX = ip(t, [T.carro - 0.25, T.tumba + 0.15], [-500, 1200], easeIn);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {rapido(t) ? <LineasVelocidad fuerza={0.55} /> : null}
      <Sequence from={F(T.llegada)} durationInFrames={F(T.casco - T.llegada)} layout="none">
        <HUD duracion={F(T.casco - T.llegada)} />
      </Sequence>
      {t >= T.llegada + 0.3 && t < T.aparca - 0.2 ? <Maquina texto="Un día cualquiera en moto…" desde={T.llegada + 0.3} style={{ position: "absolute", left: P.maq1[0], top: P.maq1[1], fontSize: 46 }} /> : null}
      {t >= T.aparca + 0.6 && t < T.casco - 0.2 ? <Maquina texto="…hasta que casi pasa lo peor." desde={T.aparca + 0.6} style={{ position: "absolute", left: P.maq2[0], top: P.maq2[1], fontSize: 46 }} /> : null}
      <Aparece en={T.uf} hasta={T.uf + 2.2} style={{ left: P.chipUf[0], top: P.chipUf[1] }}>
        <Chip>LLEGÓ EN MOTO · Y CASI NO LA CUENTA</Chip>
      </Aparece>
      <Aparece en={T.claro + 0.45} hasta={T.vamos + 0.9} style={{ left: P.pin[0], top: P.pin[1] }}>
        <PinCae etiqueta="DLB · Asesoría" />
      </Aparece>
      <Aparece en={T.hola + 0.9} hasta={T.hola + 3.4} style={{ left: P.chipGab[0], top: P.chipGab[1] }}>
        <Chip>GABRIELA · ASESORÍA DLB</Chip>
      </Aparece>
      <Aparece en={T.cuentame} hasta={T.moto - 0.1} style={{ left: P.burbuja[0], top: P.burbuja[1] }}>
        <div style={{ position: "relative", background: "#fff", color: AZ.marino, fontFamily: FUENTE, fontWeight: 900, fontSize: 54, padding: "20px 34px", borderRadius: 40 }}>
          ¿Qué te pasó?
          <div style={{ position: "absolute", left: 60, bottom: -26, width: 0, height: 0, borderLeft: "20px solid transparent", borderRight: "20px solid transparent", borderTop: "30px solid #fff" }} />
        </div>
      </Aparece>
      <Aparece en={T.moto - 0.05} hasta={T.tumba + 0.4} style={{ left: P.moto[0], top: P.moto[1] }}>
        <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: 34, padding: "20px 26px", boxShadow: "0 20px 50px rgba(4,11,31,0.45)" }}>
          <Moto size={220} />
        </div>
      </Aparece>
      {t >= T.carro - 0.25 && t < T.tumba + 0.2 ? (
        <div style={{ position: "absolute", left: carroX, top: P.carro[1], filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.5))" }}>
          <Carro size={380} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ position: "absolute", right: 380 + i * 30, top: 30 + i * 22, width: 160 - i * 20, height: 8, borderRadius: 9, background: "#fff", opacity: 0.6 }} />
          ))}
        </div>
      ) : null}
      <Sequence from={F(T.tumba)} durationInFrames={F(0.9)} layout="none"><Grietas cx={P.grieta[0] + 210} cy={P.grieta[1] + 210} seed={9} largo={360} /></Sequence>
      <Sequence from={F(T.tumba + 0.9)} durationInFrames={F(0.6)} layout="none"><Fragmentos duracion={F(0.6)} /></Sequence>
      <Sequence from={F(T.protegio - 0.1)} durationInFrames={F(2.4)} layout="none"><Rayos duracion={F(2.4)} /></Sequence>
      <Aparece en={T.nada - 0.1} hasta={T.asesoria - 0.05} style={{ left: P.nada[0], top: P.nada[1] }}>
        <div style={{ background: DEGRADADO, color: "#fff", fontFamily: FUENTE, fontWeight: 900, fontSize: 56, padding: "12px 36px", borderRadius: 24, rotate: "-3deg" }}>✓ como si nada</div>
      </Aparece>
      <Aparece en={T.asesoria - 0.05} hasta={T.producto} style={{ left: P.escudo[0], top: P.escudo[1] }}>
        <div style={{ background: "#fff", borderRadius: 999, padding: 22 }}><Escudo desde={0} size={140} /></div>
      </Aparece>
      <Aparece en={T.producto - 0.1} hasta={DURACION_VOZ + 0.1} style={{ left: P.buscador[0], width: P.buscador[2], top: P.buscador[1] }}>
        <div style={{ background: "rgba(255,255,255,0.96)", borderRadius: 40, padding: "26px 30px", boxShadow: "0 30px 80px rgba(4,11,31,0.5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, background: AZ.niebla, borderRadius: 99, padding: "16px 26px" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={AZ.real} strokeWidth="2.6" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></svg>
            <Maquina texto="seguro para accidentes en moto" desde={T.producto + 0.1} cps={24} style={{ color: AZ.marino, textShadow: "none", fontSize: 34, fontFamily: FUENTE, fontWeight: 800 }} />
          </div>
          {t >= T.accidentes ? (
            <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 22, opacity: ip(t, [T.accidentes, T.accidentes + 0.3], [0, 1]) }}>
              <div style={{ position: "relative" }}>
                <Moto size={150} />
                <div style={{ position: "absolute", right: -20, bottom: -10 }}><Escudo desde={T.accidentes} size={70} /></div>
              </div>
              <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 40, color: AZ.marino, lineHeight: 1.05 }}>¿Cuál te conviene?<br /><span style={{ color: AZ.real }}>Te asesoro</span></div>
            </div>
          ) : null}
        </div>
      </Aparece>
    </AbsoluteFill>
  );
};

const EscenaCTA: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / fps;
  return (
    <Brochazo duracion={16}>
      <FondoAzul oscuro>
        <Bokeh seed={41} n={26} max={0.5} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 360, display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
          <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 104, color: "#fff", letterSpacing: -3, translate: `0 ${(1 - ip(f, [6, 18], [0, 1], easeOut)) * 60}px`, opacity: ip(f, [6, 14], [0, 1]) }}>¿Andas en moto?</div>
          <div style={{ position: "relative", scale: String(ip(f, [12, 24], [0.3, 1], backOut(2))) }}>
            <Moto size={420} color={AZ.cian} />
            <div style={{ position: "absolute", right: -60, top: -60 }}><Escudo desde={0.5} size={190} /></div>
          </div>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 92, color: AZ.cian, opacity: ip(f, [20, 30], [0, 1]) }}>protégete antes del susto</div>
          <div style={{ background: DEGRADADO, color: "#fff", fontFamily: FUENTE, fontWeight: 900, fontSize: 48, padding: "20px 46px", borderRadius: 99, boxShadow: `0 20px 60px ${AZ.real}88`, scale: String(ip(f, [34, 44], [0, 1], backOut(2)) * (1 + 0.03 * Math.sin(f / 4))) }}>Escríbeme y te digo cuál te conviene</div>
        </div>
        <span style={{ display: "none" }}>{t}</span>
      </FondoAzul>
    </Brochazo>
  );
};

// Volumen de la música según el tramo.
const volMusica = (fr: number) => {
  const t = fr / fps;
  return interpolate(t, [0, T.ganchoFin - 0.1, T.ganchoFin + 0.1, T.casco - 0.3, T.casco + 0.2, T.aqui + 3.6, T.camina, T.dialogo - 0.2, T.dialogo + 0.5, DURACION_VOZ - 0.3, DURACION_VOZ + 0.3, DURACION_TOTAL - 0.8, DURACION_TOTAL], [0.18, 0.18, 0.62, 0.62, 0.14, 0.14, 0.55, 0.55, 0.1, 0.1, 0.55, 0.55, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
};

const BLOQUES3: Bloque3[] = BLOQUES.map((b) => {
  const r = elegir(CARAS, b.inicio, b.fin, [1390, 1560, 1690, 1250, 1100].map((y) => [100, y - 105, 880, 210] as Rect), (t) => camara(t));
  return { palabras: b.palabras, inicio: b.inicio, fin: b.fin, fondo: "busto", modo: "video", y: r[1] + 105, pill: b.hablante === "cliente" ? "hielo" : "azul" };
});

export const V4: React.FC = () => {
  const { fps: FPS } = useVideoConfig();
  const finVoz = Math.ceil(DURACION_VOZ * FPS);
  const sfx = (n: string, t: number, v = 0.35) => <Sequence key={`${n}${t}`} from={Math.max(0, F(t))} layout="none"><Audio src={staticFile(`sfx/${n}.wav`)} volume={v} /></Sequence>;
  return (
    <AbsoluteFill style={{ background: AZ.noche }}>
      <Audio src={staticFile("v4/musica.wav")} volume={volMusica} />
      <Camara>
        <Video4 />
        <GradoAzul fuerza={0.7} />
      </Camara>
      <Momentos />
      {/* transiciones */}
      <Sequence from={F(T.ganchoFin) - 1} durationInFrames={20} layout="none"><Polaroid src="v4/polaroid.jpg" duracion={20} /></Sequence>
      <Sequence from={F(T.camina + (T.pasillo - T.camina)) - 8} durationInFrames={16} layout="none"><Paneles duracion={16} /></Sequence>
      <Sequence from={F(T.dialogo) - 2} durationInFrames={7} layout="none"><Flash duracion={7} /></Sequence>
      <Sequence from={F(T.tumba)} durationInFrames={6} layout="none"><Flash duracion={6} /></Sequence>
      <Sequence from={F(T.tumba)} durationInFrames={26} layout="none"><Destello duracion={26} seed={17} /></Sequence>
      <Sequence name="Subtítulos" from={0} durationInFrames={finVoz}><Subs3 bloques={BLOQUES3} /></Sequence>
      <Sequence name="CTA" from={finVoz} durationInFrames={F(CTA)}><EscenaCTA /></Sequence>
      <Sequence name="Pantalla final" from={finVoz + F(CTA)} durationInFrames={F(PANTALLA_FINAL)}>
        <Final3 marca="Tu asesor integral VIP" avatar="marca/avatar.jpg" cuentas={[{ red: "instagram", usuario: "@tuagentedesegurosdlb" }, { red: "tiktok", usuario: "@tuasesorintegralvip" }]} />
      </Sequence>
      <div style={{ position: "absolute", left: 0, top: 0, height: 10, width: `${Math.min(1, useCurrentFrame() / F(DURACION_VOZ)) * 100}%`, background: DEGRADADO }} />
      <Grano opacidad={0.05} />
      {sfx("boom", 0.05, 0.5)}
      {sfx("whoosh", T.ganchoFin - 0.1, 0.45)}
      {sfx("whoosh", T.aparca - 0.2, 0.4)}
      {sfx("boom", T.mato, 0.5)}
      {sfx("pop", T.uf, 0.3)}
      {sfx("whoosh", T.claro + 0.4, 0.3)}
      {sfx("boom", T.claro + 0.75, 0.35)}
      {sfx("whoosh", T.pasillo - 0.25, 0.4)}
      {sfx("whoosh", T.dialogo - 0.35, 0.45)}
      {sfx("ding", T.hola, 0.3)}
      {sfx("pop", T.cuentame, 0.3)}
      {sfx("pop", T.moto, 0.3)}
      {sfx("whoosh", T.carro - 0.25, 0.5)}
      {sfx("boom", T.tumba, 0.6)}
      {sfx("zap", T.tumba + 0.05, 0.3)}
      {sfx("sube", T.protegio, 0.3)}
      {sfx("ding", T.nada, 0.35)}
      {sfx("pop", T.asesoria, 0.3)}
      {sfx("pop", T.producto, 0.3)}
      {sfx("ding", T.accidentes, 0.3)}
      {sfx("whoosh", DURACION_VOZ - 0.1, 0.45)}
      {sfx("boom", DURACION_VOZ + 0.4, 0.4)}
    </AbsoluteFill>
  );
};
