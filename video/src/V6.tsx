import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BLOQUES, CTA, DURACION_TOTAL, DURACION_VOZ, PANTALLA_FINAL, SEGMENTOS, T } from "./datos/v6";
import { CARAS } from "./datos/caras_v6";
import "./fuentes";
import { Bokeh, Flash, FondoAzul, GradoAzul, Grano } from "./v3/Fx";
import { Final3 } from "./v3/Final3";
import { Cruz, Escudo, Hospital, Monitor } from "./v3/Ilustraciones";
import { FuenteMontaje, VideoMontado } from "./v3/Montaje";
import { AZ, DEGRADADO, FUENTE, MONO, SERIF } from "./v3/paleta";
import { Subs3, type Bloque3 } from "./v3/Subs3";
import { backOut, easeIn, easeOut, ip } from "./v3/util";
import { elegir, type Rect } from "./v4/caras";
import { Brochazo } from "./v4/Efectos4";
import { Vidrio } from "./v5/Efectos5";
import { Capitulo, RebobinarVHS, Sello, type Forma } from "./v6/Efectos6";

export const calcularDuracionV6 = () => Math.ceil(DURACION_TOTAL * 30);
const fps = 30;
const F = (s: number) => Math.round(s * fps);
const ORIGEN = [540, 864];

// ---- Caras ----
const centroCara = (a: number, b: number): [number, number] | null => {
  let sx = 0, sy = 0, n = 0;
  for (const m of CARAS) {
    if (m.t < a || m.t > b || !m.c.length) continue;
    const c = m.c.reduce((g, k) => ((k[2] - k[0]) * (k[3] - k[1]) > (g[2] - g[0]) * (g[3] - g[1]) ? k : g));
    sx += (c[0] + c[2]) / 2;
    sy += (c[1] + c[3]) / 2;
    n++;
  }
  return n ? [sx / n, sy / n] : null;
};

// ---- Capítulos (una pregunta de Gabi = un capítulo) ----
const CAPS: { t: number; forma: Forma; texto: string }[] = [
  { t: T.q1, forma: "diagonal", texto: "¿Por qué nunca estarías sin seguro médico?" },
  { t: T.q2, forma: "iris", texto: "¿Has usado tu póliza?" },
  { t: T.q3, forma: "puertas", texto: "Una caída en casa… ¿cuánto costó?" },
  { t: T.q4, forma: "zoom", texto: "¿Qué le recomiendas a los venezolanos?" },
];
const DUR_CAP = 1.5;
const enCapitulo = (t: number) => CAPS.some((c) => t >= c.t && t < c.t + DUR_CAP);

// ---- Cámara: planos distintos por frase, golpes de impacto ----
type Plano = { s: number; fy: number; rot: number };
const PLANOS: Plano[] = [
  { s: 1.0, fy: 0, rot: 0 },
  { s: 1.3, fy: 620, rot: 0 },
  { s: 1.12, fy: 640, rot: -1.2 },
  { s: 1.58, fy: 660, rot: 1.2 },
  { s: 1.22, fy: 600, rot: 0 },
];
const SECUENCIA = [1, 0, 3, 2, 4, 1, 3, 0, 2, 3, 4, 1];
type Grupo = { inicio: number; fin: number; plano: Plano; cara: [number, number] | null; k: number };
const GRUPOS: Grupo[] = (() => {
  const out: Grupo[] = [];
  const bs = BLOQUES.filter((b) => b.inicio >= T.hola - 0.01);
  let ini = T.hola, k = 0;
  for (let i = 0; i < bs.length; i++) {
    const ult = i === bs.length - 1;
    // cambio de plano al cambiar de hablante o cada ~2,4 s
    const cambia = !ult && (bs[i + 1].hablante !== bs[i].hablante || bs[i].fin - ini >= 2.4);
    if (!cambia && !ult) continue;
    const fin = ult ? DURACION_VOZ + 0.5 : bs[i + 1].inicio;
    if (fin - ini < 1.2 && !ult) continue;
    out.push({ inicio: ini, fin, plano: PLANOS[SECUENCIA[k % SECUENCIA.length]], cara: centroCara(ini, fin), k });
    ini = fin;
    k++;
  }
  return out;
})();
const IMPACTOS = [T.miedo, T.c100, T.c4000, T.noHay, T.masQue, T.miedo2];

const encuadre = (s: number, px: number, py: number, sx: number, sy: number) => {
  let x = sx - (ORIGEN[0] + (px - ORIGEN[0]) * s);
  let y = sy - (ORIGEN[1] + (py - ORIGEN[1]) * s);
  x = Math.min(ORIGEN[0] * (s - 1), Math.max((1080 - ORIGEN[0]) * (1 - s), x));
  y = Math.min(ORIGEN[1] * (s - 1), Math.max((1920 - ORIGEN[1]) * (1 - s), y));
  return [x, y];
};

export const camara = (t: number, f = Math.round(t * fps)) => {
  let s = 1, r = 0, x = 0, y = 0, blur = 0;
  if (t < T.ganchoFin) {
    // gancho: acercamiento lento hacia su cara hasta el "Miedo."
    const c = centroCara(0, T.ganchoFin) ?? [540, 600];
    s = 1.04 + 0.16 * ip(t, [0, T.miedo], [0, 1], easeIn);
    [x, y] = encuadre(s, c[0], c[1], 540, 780);
  } else {
    const g = GRUPOS.find((gg) => t >= gg.inicio && t < gg.fin);
    if (g) {
      const p = g.plano;
      const fc = (t - g.inicio) * fps;
      s = p.s * (1 + 0.035 * ip(fc, [0, (g.fin - g.inicio) * fps], [0, 1]));
      r = p.rot;
      if (p.s > 1.01 && g.cara) [x, y] = encuadre(s + 0.04, g.cara[0], g.cara[1], 540, p.fy);
      if (fc < 6 && g.k > 0) {
        const d = g.k % 2 ? 1 : -1;
        x += d * ip(fc, [0, 6], [110, 0], easeOut);
        blur = ip(fc, [0, 5], [7, 0]);
        s += ip(fc, [0, 6], [0.06, 0], easeOut);
      }
    }
  }
  for (const ti of IMPACTOS) {
    const fi = (t - ti) * fps;
    if (fi >= 0 && fi < 14) {
      x += Math.sin(f * 2.6) * ip(fi, [0, 14], [24, 0]);
      s += ip(fi, [0, 10], [0.1, 0], easeOut);
    }
  }
  return { s, r, x, y, blur };
};
const CAM = (t: number) => camara(t);
const libre = (a: number, b: number, cands: Rect[]) => elegir(CARAS, a, b, cands, CAM);

const Camara: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const { s, r, x, y, blur } = camara(f / fps, f);
  return (
    <AbsoluteFill style={{ background: AZ.noche, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) scale(${s}) rotate(${r}deg)`, transformOrigin: `${ORIGEN[0]}px ${ORIGEN[1]}px`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---- Texto gigante DETRÁS de ella (con su recorte encima) ----
const RECORTES: [number, number][] = [[T.miedo - 0.1, T.ganchoFin], [T.miedo2 - 0.1, T.vozFin]];
const enRecorte = (t: number) => RECORTES.some(([a, b]) => t >= a && t < b);

const Gigante: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / fps;
  const miedo = (t0: number) => {
    const e = ip(t - t0, [0, 0.25], [0, 1], backOut(2.2));
    const g = ip(t - t0, [0, 0.35], [1, 0]);
    const d = g * 22 * (f % 2 ? 1 : -1);
    return (
      <div style={{ position: "absolute", left: -40, right: -40, top: 70, textAlign: "center", fontFamily: FUENTE, fontWeight: 900, fontSize: 300, letterSpacing: -12, lineHeight: 1, color: AZ.cian, scale: String(0.4 + 0.6 * e), opacity: Math.min(1, e * 2), textShadow: `${d}px 0 #fff, ${-d}px 0 ${AZ.real}, 0 0 90px ${AZ.real}` }}>
        MIEDO
      </div>
    );
  };
  if (t >= T.miedo - 0.1 && t < T.ganchoFin) return miedo(T.miedo);
  if (t >= T.miedo2 - 0.1 && t < T.vozFin) return miedo(T.miedo2);
  return null;
};

const Video6: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / fps;
  return (
    <>
      <AbsoluteFill style={{ filter: "contrast(1.1) saturate(1.12) brightness(0.97)" }}>
        <VideoMontado />
      </AbsoluteFill>
      {enRecorte(t) ? (
        <>
          <Gigante />
          <Img src={staticFile(`recorte_v6/f_${f}.webp`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", filter: "contrast(1.1) saturate(1.12) brightness(0.97)" }} />
        </>
      ) : null}
    </>
  );
};

// ---- Piezas ----
const Aparece: React.FC<{ en: number; hasta: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ en, hasta, children, style }) => {
  const f = useCurrentFrame();
  const t = f / fps;
  if (t < en || t > hasta) return null;
  const p = ip(t, [en, en + 0.35], [0, 1], backOut(1.8));
  const q = ip(t, [hasta - 0.2, hasta], [1, 0]);
  return <div style={{ position: "absolute", scale: String(p), opacity: Math.min(1, p * 2) * q, ...style }}>{children}</div>;
};

const Chip: React.FC<{ children: React.ReactNode; claro?: boolean }> = ({ children, claro }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: claro ? "rgba(247,250,255,0.95)" : "rgba(4,11,31,0.8)", color: claro ? AZ.marino : "#fff", fontFamily: MONO, fontSize: 26, letterSpacing: 3, padding: "12px 24px", borderRadius: 99, border: `1.5px solid ${AZ.cian}88`, whiteSpace: "nowrap" }}>
    <span style={{ width: 12, height: 12, borderRadius: 99, background: AZ.cian }} />
    {children}
  </div>
);

const Pegatina: React.FC<{ texto: string; rot: number }> = ({ texto, rot }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 14, rotate: `${rot}deg`, background: "#fff", color: AZ.real, fontFamily: FUENTE, fontWeight: 900, fontSize: 58, padding: "10px 30px", borderRadius: 26, boxShadow: `0 18px 50px rgba(4,11,31,0.45), 0 0 0 5px ${AZ.cian}` }}>
    <span style={{ width: 52, height: 52, borderRadius: 99, background: DEGRADADO, color: "#fff", fontSize: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>
    {texto}
  </div>
);

// Expediente médico: una ficha que va sumando líneas.
type Linea = { en: number; icono: string; texto: string; fuerte?: boolean };
const Expediente: React.FC<{ titulo: string; lineas: Linea[]; ancho?: number; sello?: { en: number; texto: string } }> = ({ titulo, lineas, ancho = 600, sello }) => {
  const t = useCurrentFrame() / fps;
  return (
    <div style={{ position: "relative", width: ancho, background: "rgba(247,250,255,0.96)", borderRadius: 34, padding: sello ? "22px 28px 70px" : "22px 28px 26px", boxShadow: "0 26px 70px rgba(4,11,31,0.5)", borderTop: `10px solid ${AZ.real}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: 4, color: AZ.gris }}>{titulo}</div>
        <div style={{ width: 46, height: 46 }}><Cruz desde={0} size={46} color={AZ.real} /></div>
      </div>
      {lineas.map((l) => {
        if (t < l.en) return null;
        const e = ip(t, [l.en, l.en + 0.3], [0, 1], backOut(1.8));
        return (
          <div key={l.texto} style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14, opacity: Math.min(1, e * 2), translate: `${(1 - e) * 60}px 0` }}>
            <div style={{ width: 54, height: 54, borderRadius: 16, background: l.fuerte ? DEGRADADO : AZ.niebla, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, flexShrink: 0 }}>{l.icono}</div>
            <div style={{ fontFamily: FUENTE, fontWeight: l.fuerte ? 900 : 800, fontSize: l.fuerte ? 50 : 40, color: l.fuerte ? AZ.real : AZ.marino, lineHeight: 1.05 }}>{l.texto}</div>
          </div>
        );
      })}
      {sello && t >= sello.en ? (
        <div style={{ position: "absolute", right: -30, bottom: -40 }}>
          <Sello texto={sello.texto} desde={sello.en} />
        </div>
      ) : null}
    </div>
  );
};

// Lista de compra en una emergencia de hospital público.
const ITEMS = ["Guantes", "Jeringas", "Gasas", "Medicinas", "Insumos"];
const ListaEmergencia: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / fps;
  const paso = (T.insumos + 0.3 - T.comprar) / ITEMS.length;
  const caro = t >= T.masQue;
  return (
    <div style={{ width: 560, background: "rgba(4,11,31,0.86)", borderRadius: 34, padding: "22px 28px", border: `2px solid ${AZ.cian}88`, boxShadow: "0 26px 70px rgba(4,11,31,0.5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 70, height: 70 }}><Hospital desde={0} size={70} color={AZ.cian} color2="#fff" /></div>
        <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: AZ.cielo, lineHeight: 1.3 }}>EMERGENCIA EN<br />HOSPITAL PÚBLICO</div>
      </div>
      <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 40, color: "#fff", margin: "12px 0 6px" }}>Tienes que comprar:</div>
      {ITEMS.map((it, i) => {
        const en = T.comprar + i * paso;
        const e = ip(t, [en, en + 0.25], [0, 1], backOut(2));
        return (
          <div key={it} style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8, opacity: t >= en ? 1 : 0.25 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, border: `3px solid ${AZ.cian}`, display: "flex", alignItems: "center", justifyContent: "center", color: AZ.cian, fontWeight: 900, fontSize: 28 }}>
              <span style={{ scale: String(e) }}>{t >= en ? "✓" : ""}</span>
            </div>
            <div style={{ fontFamily: FUENTE, fontWeight: 800, fontSize: 38, color: "#fff" }}>{it}</div>
            <div style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 30, color: AZ.cielo, opacity: e }}>$$</div>
          </div>
        );
      })}
      {caro ? (
        <div style={{ marginTop: 18, background: "#fff", borderRadius: 22, padding: "12px 18px", display: "flex", alignItems: "center", gap: 14, scale: String(ip(t, [T.masQue, T.masQue + 0.3], [0.4, 1], backOut(2))) }}>
          <Escudo desde={0} size={70} />
          <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 38, color: AZ.real, lineHeight: 1.05 }}>Te sale MÁS CARO<br /><span style={{ color: AZ.marino, fontSize: 32 }}>que pagar un seguro</span></div>
        </div>
      ) : null}
    </div>
  );
};

// Posiciones elegidas para no tapar su cara
const R = (x: number, y: number, w: number, h: number): Rect => [x, y, w, h];
const P = {
  gabi: libre(T.hola, T.hola + 2.6, [R(60, 170, 620, 72), R(60, 1130, 620, 72), R(400, 170, 620, 72)]),
  luisa: libre(T.hola + 2.7, T.hola + 5.4, [R(60, 170, 640, 72), R(60, 1130, 640, 72), R(380, 170, 640, 72)]),
  garantia: libre(T.garantia, T.necesitar + 0.6, [R(60, 760, 560, 230), R(460, 760, 560, 230), R(60, 160, 560, 230), R(460, 160, 560, 230), R(60, 1050, 560, 230), R(460, 1050, 560, 230)]),
  op1: libre(T.dos, T.segunda - 0.2, [R(40, 760, 600, 420), R(440, 760, 600, 420), R(40, 150, 600, 420), R(440, 150, 600, 420), R(40, 900, 600, 420), R(440, 900, 600, 420)]),
  op2: libre(T.segunda, T.q3 - 0.05, [R(40, 760, 600, 300), R(440, 760, 600, 300), R(40, 150, 600, 300), R(440, 150, 600, 300), R(40, 980, 600, 300), R(440, 980, 600, 300)]),
  amiga: libre(T.cayo, T.fisuraFin + 0.3, [R(40, 700, 620, 560), R(420, 700, 620, 560), R(40, 140, 620, 560), R(420, 140, 620, 560), R(40, 780, 620, 560), R(420, 780, 620, 560)]),
  pregunta4: libre(T.venezuela, T.noHay - 0.2, [R(60, 760, 960, 120), R(60, 150, 960, 120), R(60, 1120, 960, 120)]),
  noHay: libre(T.noHay - 0.05, T.todos, [R(140, 1000, 800, 420), R(140, 1100, 800, 420), R(140, 120, 800, 420)]),
  todos: libre(T.todos, T.complicado + 1.2, [R(60, 760, 600, 300), R(420, 760, 600, 300), R(60, 150, 600, 300), R(420, 150, 600, 300), R(60, 960, 600, 300), R(420, 960, 600, 300)]),
  lista: libre(T.hospital, T.principalFin, [R(40, 720, 560, 640), R(480, 720, 560, 640), R(40, 120, 560, 640), R(480, 120, 560, 640)]),
  gracias: libre(T.gracias, T.vozFin, [R(60, 1150, 620, 72), R(400, 1150, 620, 72), R(60, 170, 620, 72)]),
};

const Graficos: React.FC = () => {
  const t = useCurrentFrame() / fps;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Aparece en={T.hola} hasta={T.hola + 2.6} style={{ left: P.gabi[0], top: P.gabi[1] }}>
        <Chip>🎙 GABI · TU ASESORA DLB</Chip>
      </Aparece>
      <Aparece en={T.hola + 2.7} hasta={T.hola + 5.4} style={{ left: P.luisa[0], top: P.luisa[1] }}>
        <Chip claro>LUISA · CLIENTA CON PÓLIZA</Chip>
      </Aparece>
      <Aparece en={T.garantia} hasta={T.necesitar + 0.6} style={{ left: P.garantia[0], top: P.garantia[1], width: P.garantia[2] }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 26, alignItems: "flex-start" }}>
          <Pegatina texto="Garantía" rot={-4} />
          {t >= T.tranquilidad ? <Sequence from={F(T.tranquilidad)} layout="none"><div style={{ scale: String(ip(t, [T.tranquilidad, T.tranquilidad + 0.3], [0.3, 1], backOut(2))) }}><Pegatina texto="Tranquilidad" rot={3} /></div></Sequence> : null}
        </div>
      </Aparece>
      <Aparece en={T.dos} hasta={T.segunda - 0.2} style={{ left: P.op1[0], top: P.op1[1] }}>
        <Expediente
          titulo="INTERVENCIÓN 1 DE 2"
          lineas={[
            { en: T.dos + 0.6, icono: "💉", texto: "Bloqueo lumbar" },
            { en: T.urologico, icono: "📍", texto: "Urológico San Román" },
            { en: T.cubrio, icono: "🛡️", texto: "El seguro cubrió", fuerte: true },
          ]}
          sello={{ en: T.c100, texto: "100% CUBIERTO" }}
        />
      </Aparece>
      <Aparece en={T.segunda} hasta={T.q3 - 0.05} style={{ left: P.op2[0], top: P.op2[1] }}>
        <Expediente
          titulo="INTERVENCIÓN 2 DE 2"
          lineas={[{ en: T.catarata, icono: "👀", texto: "Cirugía de cataratas" }]}
          sello={{ en: T.cobertura + 0.35, texto: "COBERTURA 100%" }}
        />
      </Aparece>
      <Aparece en={T.cayo} hasta={T.fisuraFin + 0.3} style={{ left: P.amiga[0], top: P.amiga[1] }}>
        <Expediente
          titulo="CASO DE UNA AMIGA"
          ancho={620}
          lineas={[
            { en: T.cayo, icono: "🏠", texto: "Caída en casa" },
            { en: T.fractura, icono: "💥", texto: "Fractura de cadera" },
            { en: T.urologico2, icono: "📍", texto: "Urológico San Román" },
            { en: T.negociaron, icono: "🤝", texto: "Seguro y clínica negociaron" },
            { en: T.c4000, icono: "💵", texto: "Insumos ≈ 4.000 $", fuerte: true },
            { en: T.fisura, icono: "➕", texto: "Ahora: fisura en el hombro" },
          ]}
        />
      </Aparece>
      <Aparece en={T.venezuela} hasta={T.noHay - 0.2} style={{ left: P.pregunta4[0], top: P.pregunta4[1], width: 960, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { en: T.venezuela, x: "🇻🇪 En Venezuela" },
            { en: T.padres, x: "✈️ Padres en el exterior" },
            { en: T.edadQ, x: "👵👴 Toda edad" },
          ].map((c) => (t >= c.en ? <div key={c.x} style={{ scale: String(ip(t, [c.en, c.en + 0.3], [0.3, 1], backOut(2))) }}><Chip claro>{c.x}</Chip></div> : null))}
        </div>
      </Aparece>
      <Aparece en={T.noHay - 0.05} hasta={T.todos - 0.05} style={{ left: P.noHay[0], top: P.noHay[1], width: P.noHay[2] }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", rotate: "-3deg" }}>
          <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 120, lineHeight: 0.95, letterSpacing: -5, color: "transparent", WebkitTextStroke: "5px #fff", filter: "drop-shadow(0 6px 20px rgba(4,11,31,0.7))" }}>NO HAY</div>
          <div style={{ background: DEGRADADO, color: "#fff", fontFamily: FUENTE, fontWeight: 900, fontSize: 150, lineHeight: 1, letterSpacing: -6, padding: "0 34px 10px", borderRadius: 30, boxShadow: `0 20px 60px ${AZ.real}99` }}>EDAD</div>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 64, color: "#fff", textShadow: "0 4px 18px rgba(4,11,31,0.8)" }}>para tener un seguro</div>
        </div>
      </Aparece>
      <Aparece en={T.todos} hasta={T.complicado + 1.2} style={{ left: P.todos[0], top: P.todos[1] }}>
        <div style={{ width: 600, display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start" }}>
          <div style={{ background: DEGRADADO, color: "#fff", fontFamily: FUENTE, fontWeight: 900, fontSize: 64, padding: "10px 30px", borderRadius: 26, rotate: "-3deg", boxShadow: `0 20px 50px ${AZ.real}88` }}>TODOS necesitamos uno</div>
          {t >= T.complicado ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(4,11,31,0.85)", borderRadius: 26, padding: "12px 24px", scale: String(ip(t, [T.complicado, T.complicado + 0.3], [0.3, 1], backOut(2))) }}>
              <div style={{ width: 70, height: 70 }}><Monitor desde={0} size={70} /></div>
              <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 40, color: "#fff", lineHeight: 1.05 }}>Salud en Venezuela:<br /><span style={{ color: AZ.cian }}>muy complicada</span></div>
            </div>
          ) : null}
        </div>
      </Aparece>
      <Aparece en={T.hospital} hasta={T.principalFin} style={{ left: P.lista[0], top: P.lista[1] }}>
        <ListaEmergencia />
      </Aparece>
      <Aparece en={T.gracias} hasta={T.vozFin} style={{ left: P.gracias[0], top: P.gracias[1] }}>
        <Chip claro>💙 GRACIAS, LUISA</Chip>
      </Aparece>
    </AbsoluteFill>
  );
};

// ---- Llamada a la acción ----
const EscenaCTA: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Brochazo duracion={16}>
      <FondoAzul oscuro>
        <Bokeh seed={52} n={26} max={0.5} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 340, display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
          <div style={{ fontFamily: MONO, fontSize: 32, letterSpacing: 8, color: AZ.cielo, opacity: ip(f, [4, 12], [0, 1]) }}>NO DEJES QUE EL</div>
          <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 190, color: "#fff", letterSpacing: -8, lineHeight: 0.9, textDecoration: "line-through", textDecorationColor: AZ.cian, textDecorationThickness: 16, scale: String(ip(f, [6, 16], [0.4, 1], backOut(2))) }}>MIEDO</div>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 96, color: AZ.cian, opacity: ip(f, [14, 24], [0, 1]) }}>decida por ti</div>
          <div style={{ scale: String(ip(f, [20, 32], [0.3, 1], backOut(2))) }}><Escudo desde={0.6} size={220} /></div>
          <div style={{ background: DEGRADADO, color: "#fff", fontFamily: FUENTE, fontWeight: 900, fontSize: 50, padding: "20px 46px", borderRadius: 99, boxShadow: `0 20px 60px ${AZ.real}88`, scale: String(ip(f, [34, 44], [0, 1], backOut(2)) * (1 + 0.03 * Math.sin(f / 4))) }}>Escríbeme y te asesoro 💬</div>
        </div>
      </FondoAzul>
    </Brochazo>
  );
};

const BLOQUES3: Bloque3[] = BLOQUES.map((b) => {
  const r = elegir(CARAS, b.inicio, b.fin, [1420, 1580, 1700, 1260].map((y) => [100, y - 105, 880, 210] as Rect), CAM);
  return { palabras: b.palabras, inicio: b.inicio, fin: b.fin, fondo: "busto", modo: "video", y: r[1] + 105, oculto: (enCapitulo(b.inicio + 0.2) && enCapitulo(b.fin - 0.05)) || (b.inicio >= T.noHay - 0.6 && b.fin <= T.todos + 0.3), pill: b.hablante === "gabi" ? "azul" : "hielo" };
});

export const V6: React.FC = () => {
  const { fps: FPS } = useVideoConfig();
  const finVoz = Math.ceil(DURACION_VOZ * FPS);
  const sfx = (n: string, t: number, v = 0.35) => <Sequence key={`${n}${t}`} from={Math.max(0, F(t))} layout="none"><Audio src={staticFile(`sfx/${n}.wav`)} volume={v} /></Sequence>;
  return (
    <FuenteMontaje.Provider value={{ src: "v6.mp4", segmentos: SEGMENTOS }}>
      <AbsoluteFill style={{ background: AZ.noche }}>
        <Camara>
          <Video6 />
          <GradoAzul fuerza={0.5} />
        </Camara>
        <Graficos />
        {/* golpes */}
        {IMPACTOS.map((ti) => (
          <Sequence key={`f${ti}`} from={F(ti)} durationInFrames={5} layout="none"><Flash duracion={5} /></Sequence>
        ))}
        {/* transiciones */}
        <Sequence from={F(T.ganchoFin) - 10} durationInFrames={22} layout="none"><RebobinarVHS duracion={22} desde={189} hasta={0} /></Sequence>
        {CAPS.map((c, i) => (
          <Sequence key={i} name={`Pregunta ${i + 1}`} from={F(c.t)} durationInFrames={F(DUR_CAP)} layout="none">
            <Capitulo duracion={F(DUR_CAP)} forma={c.forma} numero={i + 1} total={CAPS.length} texto={c.texto} />
          </Sequence>
        ))}
        <Sequence from={F(T.cayo) - 8} durationInFrames={16} layout="none"><Vidrio duracion={16} /></Sequence>
        <Sequence from={F(T.hospital) - 8} durationInFrames={16} layout="none"><Vidrio duracion={16} /></Sequence>
        <Sequence name="Subtítulos" from={0} durationInFrames={finVoz}><Subs3 bloques={BLOQUES3} /></Sequence>
        <Sequence name="CTA" from={finVoz} durationInFrames={F(CTA)}><EscenaCTA /></Sequence>
        <Sequence name="Pantalla final" from={finVoz + F(CTA)} durationInFrames={F(PANTALLA_FINAL)}>
          <Final3 marca="Tu asesor integral VIP" avatar="marca/avatar.jpg" cuentas={[{ red: "instagram", usuario: "@tuagentedesegurosdlb" }, { red: "tiktok", usuario: "@tuasesorintegralvip" }]} />
        </Sequence>
        <div style={{ position: "absolute", left: 0, top: 0, height: 10, width: `${Math.min(1, useCurrentFrame() / F(DURACION_VOZ)) * 100}%`, background: DEGRADADO }} />
        <Grano opacidad={0.045} />
        {sfx("whoosh", T.palabra, 0.25)}
        {sfx("boom", T.miedo, 0.6)}
        {sfx("zap", T.ganchoFin - 0.3, 0.45)}
        {sfx("ding", T.hola + 0.1, 0.25)}
        {CAPS.map((c) => sfx("whoosh", c.t - 0.05, 0.45))}
        {CAPS.map((c) => sfx("boom", c.t + 0.3, 0.25))}
        {sfx("pop", T.garantia, 0.3)}
        {sfx("pop", T.tranquilidad, 0.3)}
        {sfx("pop", T.dos, 0.28)}
        {sfx("boom", T.c100, 0.45)}
        {sfx("pop", T.segunda, 0.28)}
        {sfx("boom", T.cobertura + 0.35, 0.4)}
        {sfx("whoosh", T.cayo - 0.25, 0.4)}
        {sfx("pop", T.fractura, 0.25)}
        {sfx("pop", T.urologico2, 0.25)}
        {sfx("ding", T.negociaron, 0.25)}
        {sfx("boom", T.c4000, 0.45)}
        {sfx("pop", T.fisura, 0.28)}
        {sfx("pop", T.venezuela, 0.25)}
        {sfx("pop", T.padres, 0.25)}
        {sfx("pop", T.edadQ, 0.25)}
        {sfx("boom", T.noHay, 0.5)}
        {sfx("sube", T.todos, 0.3)}
        {sfx("whoosh", T.hospital - 0.25, 0.4)}
        {sfx("pop", T.comprar, 0.25)}
        {sfx("zap", T.masQue, 0.35)}
        {sfx("boom", T.miedo2, 0.55)}
        {sfx("ding", T.gracias, 0.3)}
        {sfx("whoosh", DURACION_VOZ - 0.1, 0.45)}
        {sfx("boom", DURACION_VOZ + 0.4, 0.4)}
      </AbsoluteFill>
    </FuenteMontaje.Provider>
  );
};
