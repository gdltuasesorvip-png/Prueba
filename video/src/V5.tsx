import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BLOQUES, DURACION_TOTAL, DURACION_VOZ, PANTALLA_FINAL, SEGMENTOS, T } from "./datos/v5";
import { CARAS } from "./datos/caras_v5";
import "./fuentes";
import { Bokeh, Flash, GradoAzul, Grano } from "./v3/Fx";
import { Final3 } from "./v3/Final3";
import { Escudo, Hospital, Incubadora, Monitor } from "./v3/Ilustraciones";
import { FuenteMontaje, VideoMontado } from "./v3/Montaje";
import { AZ, DEGRADADO, FUENTE, MONO, SERIF } from "./v3/paleta";
import { Subs3, type Bloque3 } from "./v3/Subs3";
import { backOut, easeIn, easeOut, ip, rnd } from "./v3/util";
import { elegir, type Rect } from "./v4/caras";
import { ADN, Estrellas, Magia, Mosaico, Ola, Vidrio, fmt } from "./v5/Efectos5";

export const calcularDuracionV5 = () => Math.ceil(DURACION_TOTAL * 30);
const fps = 30;
const F = (s: number) => Math.round(s * fps);
const ORIGEN = [540, 864];

// Escenas a pantalla completa (tapan el vídeo; la voz sigue).
const ICEBERG = [T.iceIni, T.iceFin];
const COMPARA = [T.entonces, T.sinEl + 0.4];
const enEscena = (t: number) => (t >= ICEBERG[0] && t < ICEBERG[1]) || (t >= COMPARA[0] && t < COMPARA[1]);

// ---- Caras: centro medio de la cara principal en una ventana de tiempo ----
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

// ---- Cámara: planos distintos (general / medio / primer plano / foco en la TV) ----
type Plano = { s: number; fy: number; rot: number };
const PLANOS: Plano[] = [
  { s: 1.0, fy: 0, rot: 0 },
  { s: 1.34, fy: 640, rot: 0 },
  { s: 1.12, fy: 700, rot: -1.2 },
  { s: 1.62, fy: 700, rot: 1.4 },
  { s: 1.24, fy: 620, rot: 0 },
];
const SECUENCIA = [1, 0, 3, 2, 4, 1, 3, 0, 2, 3, 4, 1];
// Foco en la pantalla de la TV: [inicio, fin, centroX, centroY, escala]
const TV: [number, number, number, number, number][] = [
  [T.tienes, T.tienes + 2.15, 450, 450, 1.42],
  [T.total, T.c11300 + 1.0, 720, 580, 1.38],
];
const tvEn = (t: number) => TV.find(([a, b]) => t >= a && t < b);

// Grupos de bloques de al menos ~2,2 s: cada grupo es un plano.
type Grupo = { inicio: number; fin: number; plano: Plano; cara: [number, number] | null; k: number };
const GRUPOS: Grupo[] = (() => {
  const out: Grupo[] = [];
  const bs = BLOQUES.filter((b) => b.inicio >= T.tienes - 0.01);
  let ini = T.tienes, k = 0;
  for (let i = 0; i < bs.length; i++) {
    const ult = i === bs.length - 1;
    if (bs[i].fin - ini < 2.2 && !ult) continue;
    const fin = ult ? DURACION_VOZ + 0.5 : bs[i + 1].inicio;
    out.push({ inicio: ini, fin, plano: PLANOS[SECUENCIA[k % SECUENCIA.length]], cara: centroCara(ini, fin), k });
    ini = fin;
    k++;
  }
  return out;
})();

const encuadre = (s: number, px: number, py: number, sx: number, sy: number) => {
  // traslación para que el punto (px,py) del vídeo quede en (sx,sy) de pantalla, sin dejar bordes
  let x = sx - (ORIGEN[0] + (px - ORIGEN[0]) * s);
  let y = sy - (ORIGEN[1] + (py - ORIGEN[1]) * s);
  x = Math.min(ORIGEN[0] * (s - 1), Math.max((1080 - ORIGEN[0]) * (1 - s), x));
  y = Math.min(ORIGEN[1] * (s - 1), Math.max((1920 - ORIGEN[1]) * (1 - s), y));
  return [x, y];
};

export const camara = (t: number, f = Math.round(t * fps)) => {
  let s = 1, r = 0, x = 0, y = 0, blur = 0;
  if (t < T.ganchoFin) {
    s = 1.04 + 0.1 * ip(t, [0, T.ganchoFin], [0, 1]);
    const fn = (t - T.no) * fps;
    if (fn >= 0 && fn < 14) {
      s += ip(fn, [0, 12], [0.14, 0], easeOut);
      x += Math.sin(f * 2.4) * ip(fn, [0, 14], [22, 0]);
    }
    return { s, r, x, y, blur };
  }
  const tv = tvEn(t);
  if (tv) {
    const [a, b, cx, cy, sc] = tv;
    const e = ip(t, [a, a + 0.35], [0, 1], easeOut) * ip(t, [b - 0.3, b], [1, 0], easeIn);
    s = 1 + (sc - 1) * e + 0.04 * ip(t, [a, b], [0, 1]);
    [x, y] = encuadre(s, cx, cy, 540, 620 + 300 * (1 - e));
    return { s, r, x, y, blur };
  }
  const g = GRUPOS.find((gg) => t >= gg.inicio && t < gg.fin);
  if (g) {
    const p = g.plano;
    const fc = (t - g.inicio) * fps;
    s = p.s * (1 + 0.035 * ip(fc, [0, (g.fin - g.inicio) * fps], [0, 1]));
    r = p.rot;
    if (p.s > 1.01 && g.cara) [x, y] = encuadre(s + 0.04, g.cara[0], g.cara[1], 540, p.fy);
    // cambio de ángulo con barrido (whip) en los primeros frames del plano
    if (fc < 6 && g.k > 0) {
      const d = g.k % 2 ? 1 : -1;
      x += d * ip(fc, [0, 6], [120, 0], easeOut);
      blur = ip(fc, [0, 6], [12, 0]);
      s += ip(fc, [0, 6], [0.06, 0], easeOut);
    }
  }
  for (const ti of [T.c11300, T.c3300, T.cubierto]) {
    const fi = (t - ti) * fps;
    if (fi >= 0 && fi < 12) {
      x += Math.sin(f * 2.6) * ip(fi, [0, 12], [20, 0]);
      s += ip(fi, [0, 10], [0.06, 0], easeOut);
    }
  }
  return { s, r, x, y, blur };
};
const CAM = (t: number) => camara(t);
const libre = (a: number, b: number, cands: Rect[]) => elegir(CARAS, a, b, cands, CAM);
const solapan = (a: Rect, b: Rect) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

const Camara: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const { s, r, x, y, blur } = camara(f / fps, f);
  return (
    <AbsoluteFill style={{ background: AZ.noche, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) scale(${s}) rotate(${r}deg)`, transformOrigin: `${ORIGEN[0]}px ${ORIGEN[1]}px`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---- Gancho: texto apilado y un "NO" gigante DETRÁS de ella ----
const Apilado: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / fps;
  const fase = t < T.bebe - 0.8 ? 0 : t < T.no ? 1 : 2;
  const lineas = fase === 0 ? ["¿VIVES EN", "VENEZUELA?"] : ["¿QUIERES", "UN BEBÉ?"];
  const desde = fase === 0 ? 0.05 : T.bebe - 0.8;
  if (fase === 2) {
    const e = ip(t - T.no, [0, 0.3], [0, 1], backOut(2.4));
    return (
      <div style={{ position: "absolute", right: 30, top: 330, fontFamily: FUENTE, fontWeight: 900, fontSize: 640, lineHeight: 0.85, letterSpacing: -30, color: AZ.cian, scale: String(0.3 + 0.7 * e), opacity: Math.min(1, e * 2), textShadow: `0 0 80px ${AZ.real}`, transformOrigin: "70% 60%" }}>
        NO
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", right: 60, top: 200, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      {lineas.map((l, i) => {
        const e = ip(f - desde * fps - i * 4, [0, 8], [0, 1], backOut(1.8));
        const relleno = i === 1;
        return (
          <div key={`${fase}${i}`} style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 132, lineHeight: 0.95, letterSpacing: -4, color: relleno ? AZ.cian : "transparent", WebkitTextStroke: relleno ? undefined : `5px #ffffff`, translate: `${(1 - e) * (i % 2 ? 300 : -300)}px 0`, opacity: Math.min(1, e * 1.5) }}>
            {l}
          </div>
        );
      })}
    </div>
  );
};

const Video5: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / fps;
  return (
    <>
      <AbsoluteFill style={{ filter: "contrast(1.05) saturate(1.06)" }}>
        <VideoMontado />
      </AbsoluteFill>
      {t < T.ganchoFin ? (
        <>
          <Apilado />
          <Img src={staticFile(`recorte_v5/f_${f}.webp`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", filter: "contrast(1.05) saturate(1.06)" }} />
        </>
      ) : null}
    </>
  );
};

// ---- Piezas gráficas ----
const Aparece: React.FC<{ en: number; hasta: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ en, hasta, children, style }) => {
  const f = useCurrentFrame();
  const t = f / fps;
  if (t < en || t > hasta) return null;
  const p = ip(t, [en, en + 0.35], [0, 1], backOut(1.8));
  const q = ip(t, [hasta - 0.2, hasta], [1, 0]);
  return <div style={{ position: "absolute", scale: String(p), opacity: Math.min(1, p * 2) * q, ...style }}>{children}</div>;
};

const Tarjeta: React.FC<{ icono: React.ReactNode; titulo: string; precio?: string; extra?: React.ReactNode; ancho: number }> = ({ icono, titulo, precio, extra, ancho }) => (
  <div style={{ width: ancho, display: "flex", alignItems: "center", gap: 22, background: "rgba(247,250,255,0.95)", borderRadius: 36, padding: "20px 26px", boxShadow: "0 24px 60px rgba(4,11,31,0.45)", border: `3px solid ${AZ.cian}` }}>
    <div style={{ width: 120, height: 120, borderRadius: 28, background: AZ.marino, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>{icono}</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: 2, color: AZ.gris, textTransform: "uppercase" }}>{titulo}</div>
      {precio ? <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 54, color: AZ.real, lineHeight: 1, letterSpacing: -1 }}>{precio}</div> : null}
      {extra}
    </div>
  </div>
);

const Consulta: React.FC = () => (
  <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke={AZ.cian} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3v6a5 5 0 0 0 10 0V3" />
    <path d="M11 14v2a5 5 0 0 0 10 0v-3" />
    <circle cx="21" cy="11" r="2" />
  </svg>
);
const Tubo: React.FC = () => (
  <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke={AZ.cian} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6M10 3v7L5 19a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3L14 10V3" />
    <path d="M7.5 15h9" />
  </svg>
);
const Bebito: React.FC = () => (
  <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke={AZ.cian} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M9 10h.01M15 10h.01M9.5 15a3.5 3.5 0 0 0 5 0M12 3c-1 2 1 3 2 2" />
  </svg>
);

// Valor que gira (cuenta) hacia el siguiente número.
const usarCuenta = (pasos: [number, number][], dur = 0.6) => {
  const t = useCurrentFrame() / fps;
  let v = 0, prev = 0;
  for (const [en, val] of pasos) {
    if (t >= en) {
      v = ip(t, [en, en + dur], [prev, val], easeOut);
      prev = val;
    }
  }
  return v;
};

// "La cuenta del embarazo": contador que sube con cada gasto.
const PASOS_CUENTA: [number, number][] = [[T.c1100, 1100], [T.c2100, 2100], [T.c3300, 3300], [T.c11300, 11300]];
const VENTANAS_CUENTA = [
  [T.consultas, T.c1100],
  [T.c1100, T.c2100],
  [T.c2100, T.c3300],
  [T.c3300, T.total],
  [T.c11300 + 1.0, T.ninguna + 1.0],
];
const CANDS_CUENTA: Rect[] = [[40, 140, 520, 140], [520, 140, 520, 140], [40, 1120, 520, 140], [520, 1120, 520, 140], [40, 300, 520, 140], [520, 300, 520, 140]];
const POS_CUENTA = VENTANAS_CUENTA.map(([a, b]) => libre(a, b, CANDS_CUENTA));
const posCuenta = (t: number): Rect => {
  const i = Math.max(0, VENTANAS_CUENTA.findIndex(([a, b]) => t >= a && t < b));
  return POS_CUENTA[i];
};

const Cuenta: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / fps;
  const v = usarCuenta(PASOS_CUENTA);
  const visible = t >= T.consultas && t < T.ninguna + 1.0 && !tvEn(t);
  if (!visible) return null;
  // posición con deslizamiento suave entre ventanas
  const i = VENTANAS_CUENTA.findIndex(([a, b]) => t >= a && t < b);
  let [x, y] = posCuenta(t);
  if (i > 0) {
    const [px, py] = POS_CUENTA[i - 1];
    const e = ip(t, [VENTANAS_CUENTA[i][0], VENTANAS_CUENTA[i][0] + 0.35], [0, 1], easeOut);
    x = px + (x - px) * e;
    y = py + (y - py) * e;
  }
  const entra = ip(t, [T.consultas, T.consultas + 0.4], [0, 1], backOut(1.8)) * ip(t, [T.ninguna + 0.75, T.ninguna + 1.0], [1, 0]);
  const pulso = PASOS_CUENTA.reduce((acc, [en]) => acc + ip(t - en, [0, 0.1, 0.5], [0, 0.12, 0]), 0);
  const rango = t >= T.c11300;
  const rojo = t >= T.c3300;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 520, scale: String(entra * (1 + pulso)), transformOrigin: "50% 50%" }}>
      <div style={{ background: "rgba(4,11,31,0.82)", border: `2px solid ${AZ.cian}aa`, borderRadius: 34, padding: "16px 28px", boxShadow: `0 20px 60px rgba(4,11,31,0.5), 0 0 ${30 * pulso * 8}px ${AZ.cian}` }}>
        <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: 4, color: AZ.cielo }}>LA CUENTA DEL EMBARAZO</div>
        <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: rango ? 60 : 76, color: rojo ? "#fff" : AZ.cian, letterSpacing: -2, lineHeight: 1.05, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
          {rango ? `6.600 – ${fmt(v)} $` : `${fmt(v)} $`}
        </div>
        <div style={{ height: 10, borderRadius: 9, background: AZ.profundo, marginTop: 8, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(100, (v / 11300) * 100)}%`, background: DEGRADADO }} />
        </div>
      </div>
    </div>
  );
};

// Tarjetas de cada gasto (posiciones que no tapan caras ni el contador)
const CANDS_TARJ: Rect[] = [[40, 330, 640, 170], [400, 330, 640, 170], [40, 1080, 640, 170], [400, 1080, 640, 170], [40, 140, 640, 170], [400, 140, 640, 170], [40, 520, 640, 170], [400, 520, 640, 170]];
const tarjeta = (a: number, b: number) => {
  const cont = VENTANAS_CUENTA.map(([x0, x1], k) => (x0 < b && a < x1 ? POS_CUENTA[k] : null)).filter(Boolean) as Rect[];
  const cands = CANDS_TARJ.filter((r) => !cont.some((c) => solapan(r, c)));
  return libre(a, b, cands.length ? cands : CANDS_TARJ);
};
const P = {
  consultas: tarjeta(T.consultas, 25.6),
  estudios: tarjeta(T.estudios, 35.5),
  adn: tarjeta(T.ciencia, 45.3),
  hospital: tarjeta(T.hospital, 52.25),
  parto: tarjeta(52.33, T.total - 0.05),
  calc: libre(T.calculadora, T.prepagar + 1.0, [[50, 600, 400, 560], [630, 600, 400, 560], [50, 420, 400, 560], [630, 420, 400, 560], [50, 160, 400, 560], [630, 160, 400, 560]]),
  escudo: libre(T.riesgos, T.entonces - 0.05, [[60, 380, 400, 420], [620, 380, 400, 420], [60, 180, 400, 420], [620, 180, 400, 420], [60, 700, 400, 420], [620, 700, 400, 420]]),
  asegura: libre(T.asegura, T.comenta - 0.05, [[60, 160, 960, 260], [60, 360, 960, 260], [60, 1040, 960, 260]]),
  comenta: libre(T.comenta, T.escribeme - 0.05, [[60, 200, 820, 150], [200, 200, 820, 150], [60, 1100, 820, 150], [200, 1100, 820, 150], [60, 400, 820, 150]]),
  dm: libre(T.escribeme, DURACION_VOZ, [[60, 200, 640, 140], [380, 200, 640, 140], [60, 1100, 640, 140], [380, 1100, 640, 140], [60, 400, 640, 140]]),
};

const Rango: React.FC<{ a: [number, number]; b: [number, number] }> = ({ a, b }) => {
  const t = useCurrentFrame() / fps;
  const va = ip(t, [a[0], a[0] + 0.45], [0, a[1]], easeOut);
  const vb = ip(t, [b[0], b[0] + 0.45], [a[1], b[1]], easeOut);
  return <>{t < b[0] ? `${fmt(va)} $` : `${fmt(a[1])} – ${fmt(vb)} $`}</>;
};

// ---- Calculadora: 80–100 $/mes × 12 = 960–1.200 $/año ----
const Calc: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / fps;
  const teclas = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "–", "0", ".", "=", "+"];
  const pulsadas: [number, string][] = [[T.c80, "8"], [T.c80 + 0.15, "0"], [T.c100b, "1"], [T.c100b + 0.12, "0"], [T.c100b + 0.24, "0"], [T.anual, "×"], [T.anual + 0.2, "1"], [T.anual + 0.3, "2"], [T.c960 - 0.05, "="]];
  const activa = pulsadas.find(([en]) => t >= en && t < en + 0.14)?.[1];
  let pantalla = "0";
  let sub = "seguro con maternidad";
  if (t >= T.c80) pantalla = "80";
  if (t >= T.c100b) { pantalla = "80 – 100"; sub = "$ / mes"; }
  if (t >= T.anual) { sub = "80 – 100 × 12 meses"; }
  if (t >= T.c960) pantalla = fmt(ip(t, [T.c960, T.c960 + 0.5], [0, 960], easeOut));
  if (t >= T.c1200b) pantalla = `960 – ${fmt(ip(t, [T.c1200b, T.c1200b + 0.5], [960, 1200], easeOut))}`;
  if (t >= T.c960) sub = "$ / año";
  const sello = ip(t, [T.prepagar, T.prepagar + 0.25], [0, 1], backOut(2.5));
  return (
    <div style={{ position: "relative", width: 400, background: `linear-gradient(160deg, ${AZ.profundo}, ${AZ.noche})`, borderRadius: 48, padding: 26, border: `3px solid ${AZ.cian}`, boxShadow: `0 30px 80px rgba(4,11,31,0.6), 0 0 40px ${AZ.real}66` }}>
      <div style={{ background: AZ.noche, borderRadius: 24, padding: "18px 20px", textAlign: "right", border: `1px solid ${AZ.profundo}` }}>
        <div style={{ fontFamily: MONO, fontSize: 20, color: AZ.cielo, letterSpacing: 1, minHeight: 26 }}>{sub}</div>
        <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: pantalla.length > 7 ? 56 : 74, color: "#fff", lineHeight: 1.1, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
          {pantalla}
          <span style={{ opacity: f % 16 < 8 && t < T.c80 ? 1 : 0, color: AZ.cian }}>▌</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 18 }}>
        {teclas.map((k) => {
          const on = k === activa;
          const op = "÷×–+=".includes(k);
          return (
            <div key={k} style={{ height: 64, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FUENTE, fontWeight: 900, fontSize: 32, color: on ? AZ.noche : "#fff", background: on ? AZ.cian : op ? AZ.real : AZ.marino, scale: on ? "0.9" : "1", boxShadow: on ? `0 0 26px ${AZ.cian}` : undefined }}>
              {k}
            </div>
          );
        })}
      </div>
      {t >= T.prepagar ? (
        <div style={{ position: "absolute", left: 30, top: 150, rotate: "-14deg", scale: String(2.2 - 1.2 * sello), opacity: sello, border: `6px solid ${AZ.cian}`, color: AZ.cian, background: "rgba(4,11,31,0.85)", borderRadius: 18, padding: "8px 22px", fontFamily: FUENTE, fontWeight: 900, fontSize: 52, letterSpacing: 2 }}>
          PREPAGADO ✓
        </div>
      ) : null}
    </div>
  );
};

// ---- Escudo con anillo 100% ----
const Cubierto: React.FC = () => {
  const t = useCurrentFrame() / fps;
  const p = ip(t, [T.c100p, T.c100p + 0.6], [0, 1], easeOut);
  const sello = ip(t, [T.cubierto, T.cubierto + 0.25], [0, 1], backOut(2.5));
  const R = 170, L = 2 * Math.PI * R;
  return (
    <div style={{ position: "relative", width: 400, height: 420 }}>
      <svg width="400" height="400" viewBox="0 0 400 400" style={{ position: "absolute", left: 0, top: 0 }}>
        <circle cx="200" cy="200" r="186" fill="rgba(4,11,31,0.78)" />
        <circle cx="200" cy="200" r={R} fill="none" stroke={AZ.profundo} strokeWidth="18" />
        <circle cx="200" cy="200" r={R} fill="none" stroke={AZ.cian} strokeWidth="18" strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - p)} transform="rotate(-90 200 200)" />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 70, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Escudo desde={0} size={170} />
        <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 68, color: "#fff", lineHeight: 1, marginTop: -6 }}>{Math.round(p * 100)}%</div>
      </div>
      {t >= T.cubierto ? (
        <div style={{ position: "absolute", left: 40, right: 40, bottom: 0, textAlign: "center", rotate: "-6deg", scale: String(2 - sello), opacity: sello, background: DEGRADADO, color: "#fff", borderRadius: 20, padding: "8px 0", fontFamily: FUENTE, fontWeight: 900, fontSize: 50, letterSpacing: 3 }}>
          CUBIERTO
        </div>
      ) : null}
    </div>
  );
};

// ---- Tu cara en un círculo durante las escenas a pantalla completa ----
// Va dentro de una Sequence que empieza en `a` (s).
const Pip5: React.FC<{ a: number; b: number; size?: number; x: number; y: number }> = ({ a, b, size = 250, x, y }) => {
  const f = useCurrentFrame();
  const t = (F(a) + f) / fps;
  const c = centroCara(a, b) ?? [540, 640];
  const k = 0.95;
  const p = ip(t, [a + 0.3, a + 0.65], [0, 1], backOut(1.8)) * ip(t, [b - 0.4, b - 0.2], [1, 0]);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: size, height: size, scale: String(p) }}>
      <div style={{ position: "absolute", inset: -8, borderRadius: 999, background: `conic-gradient(from ${f * 4}deg, ${AZ.cian}, ${AZ.real}, ${AZ.electrico}, ${AZ.cian})` }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 999, overflow: "hidden", background: AZ.noche }}>
        <div style={{ position: "absolute", left: size / 2 - c[0] * k, top: size / 2 - c[1] * k, width: 1080, height: 1920, scale: String(k), transformOrigin: "0 0" }}>
          <VideoMontado muted offsetFrames={F(a)} />
        </div>
      </div>
    </div>
  );
};

// ---- Escena ICEBERG: lo que ves vs lo que no ves ----
const Burbujas: React.FC<{ seed: number }> = ({ seed }) => {
  const f = useCurrentFrame();
  return (
    <>
      {Array.from({ length: 22 }).map((_, i) => {
        const x = rnd(seed + i) * 1080;
        const v = 2 + rnd(seed + i * 3) * 4;
        const y = 1920 - ((f * v + rnd(i + seed * 7) * 1300) % 1300);
        const s = 6 + rnd(i * 5 + seed) * 18;
        return <div key={i} style={{ position: "absolute", left: x + Math.sin(f / 9 + i) * 10, top: y, width: s, height: s, borderRadius: 99, border: `2px solid ${AZ.hielo}88` }} />;
      })}
    </>
  );
};

const Iceberg: React.FC = () => {
  const f = useCurrentFrame();
  const t = ICEBERG[0] + f / fps;
  const agua = 640;
  const ola = (ph: number) => {
    let d = `M 0 ${agua}`;
    for (let x = 0; x <= 1080; x += 30) d += ` L ${x} ${agua + Math.sin(x / 90 + f / 6 + ph) * 10}`;
    return d + " L 1080 1920 L 0 1920 Z";
  };
  const punta = ip(f, [6, 20], [0, 1], backOut(1.6));
  const fondo = ip(t, [T.siHay, T.siHay + 0.8], [0, 1], easeOut);
  const pan = ip(t, [T.terapia - 0.4, T.terapia + 0.4], [0, -40], easeOut);
  const item = (en: number) => ip(t, [en, en + 0.35], [0, 1], backOut(2));
  const misterio = t >= T.enCuanto;
  const loco = misterio ? (t >= T.c11300b ? `11.300 + ¿${fmt(1000 + ((f * 7919) % 9000))}?` : "¿…?") : "";
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${AZ.marino} 0%, ${AZ.profundo} 30%, ${AZ.real} 33.5%, ${AZ.profundo} 55%, ${AZ.noche} 100%)`, overflow: "hidden" }}>
      <AbsoluteFill style={{ translate: `0 ${pan}px` }}>
        <Bokeh seed={71} n={18} max={0.35} />
        {/* masa sumergida */}
        <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
          <defs>
            <linearGradient id="hielo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={AZ.hielo} stopOpacity="0.55" />
              <stop offset="1" stopColor={AZ.cielo} stopOpacity="0.12" />
            </linearGradient>
          </defs>
          <path d={`M 360 ${agua} L 120 900 L 60 1180 L 180 1460 L 420 1640 L 700 1600 L 960 1400 L 1030 1080 L 860 820 L 720 ${agua} Z`} fill="url(#hielo)" stroke={AZ.hielo} strokeWidth="4" strokeDasharray="2400" strokeDashoffset={2400 * (1 - fondo)} />
          <path d={ola(0)} fill={AZ.electrico} opacity="0.28" />
          <path d={`M 360 ${agua} L 470 360 L 520 300 L 560 340 L 610 280 L 720 ${agua} Z`} fill="#fff" stroke={AZ.hielo} strokeWidth="4" style={{ transformOrigin: `540px ${agua}px`, scale: `1 ${punta}` }} />
          <path d={ola(2)} fill="none" stroke={AZ.cian} strokeWidth="5" />
        </svg>
        <Burbujas seed={5} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 100, textAlign: "center", opacity: punta }}>
          <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: 6, color: AZ.cielo }}>LO QUE VES</div>
          <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 120, color: "#fff", letterSpacing: -4, lineHeight: 1 }}>11.300 $</div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 700, textAlign: "center", opacity: fondo }}>
          <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: 6, color: AZ.hielo }}>LO QUE NO VES</div>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 84, color: AZ.cian, lineHeight: 1 }}>una complicación</div>
        </div>
        {[
          { en: T.terapia, y: 900, texto: "Terapia intensiva", icono: <Monitor desde={0} size={110} /> },
          { en: T.incubadora, y: 1080, texto: "Bebé en incubadora", icono: <Incubadora desde={0} size={110} /> },
        ].map((it) =>
          t >= it.en ? (
            <div key={it.texto} style={{ position: "absolute", left: 170, top: it.y, display: "flex", alignItems: "center", gap: 22, scale: String(item(it.en)), transformOrigin: "left center", background: "rgba(4,11,31,0.7)", borderRadius: 30, padding: "14px 30px 14px 18px", border: `2px solid ${AZ.cian}88` }}>
              {it.icono}
              <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 52, color: "#fff" }}>+ {it.texto}</div>
            </div>
          ) : null,
        )}
        {misterio ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1270, textAlign: "center", scale: String(item(T.enCuanto)) }}>
            <div style={{ display: "inline-block", fontFamily: FUENTE, fontWeight: 900, fontSize: 76, color: AZ.noche, background: `linear-gradient(100deg, #fff, ${AZ.hielo})`, padding: "10px 40px", borderRadius: 30, rotate: "-3deg", fontVariantNumeric: "tabular-nums" }}>{loco}</div>
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---- Escena COMPARACIÓN: con seguro vs sin seguro ----
const Compara: React.FC = () => {
  const f = useCurrentFrame();
  const t = COMPARA[0] + f / fps;
  const base = 1330, alto = 780;
  const v1 = ip(t, [T.c1200c, T.c1200c + 0.6], [0, 1200], easeOut);
  const v2 = ip(t, [T.c11300c, T.c11300c + 0.9], [0, 11300], easeOut);
  const col1 = ip(t, [T.entonces + 0.8, T.entonces + 1.2], [0, 1], backOut(1.8));
  const col2 = ip(t, [T.contra - 0.1, T.contra + 0.3], [0, 1], backOut(1.8));
  const ahorro = ip(t, [T.c11300c + 1.4, T.c11300c + 1.8], [0, 1], backOut(2.2));
  const Col: React.FC<{ x: number; v: number; e: number; titulo: string; color: string; icono: React.ReactNode }> = ({ x, v, e, titulo, color, icono }) => (
    <div style={{ position: "absolute", left: x, top: 0, width: 360, height: base + 140, opacity: Math.min(1, e * 2), scale: String(0.6 + 0.4 * e), transformOrigin: `180px ${base}px` }}>
      <div style={{ position: "absolute", left: 40, right: 40, top: base - Math.max(14, (v / 11300) * alto), bottom: 140, borderRadius: "26px 26px 8px 8px", background: color, boxShadow: `0 0 50px ${color}88` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: base - Math.max(14, (v / 11300) * alto) - 96, textAlign: "center", fontFamily: FUENTE, fontWeight: 900, fontSize: 70, color: "#fff", fontVariantNumeric: "tabular-nums", letterSpacing: -2 }}>{fmt(v)} $</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: base + 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
        {icono}
        <div style={{ fontFamily: MONO, fontSize: 30, letterSpacing: 3, color: AZ.hielo }}>{titulo}</div>
      </div>
    </div>
  );
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 30%, ${AZ.profundo}, ${AZ.noche} 75%)`, overflow: "hidden" }}>
      <Bokeh seed={23} n={20} max={0.4} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 150, textAlign: "center" }}>
        <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 92, color: "#fff", letterSpacing: -3, lineHeight: 1 }}>
          CON <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, color: AZ.cian }}>vs</span> SIN
        </div>
        <div style={{ fontFamily: MONO, fontSize: 28, letterSpacing: 6, color: AZ.cielo, marginTop: 10 }}>SEGURO DE MATERNIDAD</div>
      </div>
      <div style={{ position: "absolute", left: 90, right: 90, top: base, height: 4, background: AZ.gris, borderRadius: 4 }} />
      <Col x={120} v={v1} e={col1} titulo="CON SEGURO" color={AZ.cian} icono={<Escudo desde={0} size={46} />} />
      <Col x={600} v={v2} e={col2} titulo="SIN SEGURO" color={AZ.electrico} icono={<span style={{ fontSize: 34 }}>⚠️</span>} />
      {ahorro > 0 ? (
        <div style={{ position: "absolute", left: 90, top: 640, rotate: "-5deg", scale: String(ahorro), background: "#fff", color: AZ.real, borderRadius: 30, padding: "18px 34px", fontFamily: FUENTE, fontWeight: 900, fontSize: 52, boxShadow: `0 20px 60px ${AZ.real}99`, lineHeight: 1.05 }}>
          Te ahorras
          <br />
          <span style={{ fontSize: 86, color: AZ.noche }}>+10.000 $</span>
        </div>
      ) : null}
      {t >= T.c11300c + 1.4 && t < T.c11300c + 2.6 ? (
        <Sequence from={F(T.c11300c + 1.4 - COMPARA[0])} layout="none">
          <div style={{ position: "absolute", left: 120, top: 560 }}><Estrellas n={5} size={56} /></div>
        </Sequence>
      ) : null}
      <Pip5 a={COMPARA[0]} b={COMPARA[1]} x={836} y={36} size={196} />
      <span style={{ display: "none" }}>{f}</span>
    </AbsoluteFill>
  );
};

// ---- Gráficos sobre el vídeo ----
const Graficos: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / fps;
  const comentario = "maternidad";
  const n = Math.max(0, Math.min(comentario.length, Math.floor((t - T.maternidadC) * 18)));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Cuenta />
      <Aparece en={T.consultas} hasta={25.6} style={{ left: P.consultas[0], top: P.consultas[1] }}>
        <Tarjeta ancho={640} icono={<Consulta />} titulo="Consultas mensuales" precio={t < T.c1100 ? "≈ 100 $ / mes" : "1.100 $ en total"} />
      </Aparece>
      <Aparece en={T.estudios} hasta={35.5} style={{ left: P.estudios[0], top: P.estudios[1] }}>
        <Tarjeta ancho={640} icono={<Tubo />} titulo="Estudios y exámenes" precio={t >= T.c500 ? undefined : "…"} extra={t >= T.c500 ? <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 54, color: AZ.real, lineHeight: 1 }}><Rango a={[T.c500, 500]} b={[T.c1000a, 1000]} /></div> : null} />
      </Aparece>
      <Aparece en={T.ciencia} hasta={45.3} style={{ left: P.adn[0], top: P.adn[1] }}>
        <Tarjeta ancho={640} icono={<ADN size={116} />} titulo={t < T.adn ? "La ciencia cuesta" : "ADN fetal"} extra={t >= T.c1000b ? <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 54, color: AZ.real, lineHeight: 1 }}><Rango a={[T.c1000b, 1000]} b={[T.c1200, 1200]} /></div> : <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 44, color: AZ.marino }}>condiciones congénitas</div>} />
      </Aparece>
      <Aparece en={T.hospital} hasta={52.25} style={{ left: P.hospital[0], top: P.hospital[1] }}>
        <Tarjeta ancho={640} icono={<Hospital desde={0} size={110} color={AZ.cian} color2="#fff" />} titulo="¿Hospital público?" precio="¿Seguro?" />
      </Aparece>
      <Aparece en={52.33} hasta={T.total - 0.05} style={{ left: P.parto[0], top: P.parto[1] }}>
        <Tarjeta ancho={640} icono={<Bebito />} titulo={t < T.clinica ? "Cesárea o parto" : "En una buena clínica"} extra={t >= T.c4000 ? <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 54, color: AZ.real, lineHeight: 1 }}><Rango a={[T.c4000, 4000]} b={[T.c8000, 8000]} /></div> : t >= T.clinica ? <Sequence from={F(T.clinica)} layout="none"><Estrellas n={5} size={44} /></Sequence> : null} />
      </Aparece>
      <Aparece en={T.calculadora} hasta={T.prepagar + 1.0} style={{ left: P.calc[0], top: P.calc[1] }}>
        <Calc />
      </Aparece>
      <Aparece en={T.riesgos} hasta={T.entonces - 0.05} style={{ left: P.escudo[0], top: P.escudo[1] }}>
        <Cubierto />
      </Aparece>
      <Aparece en={T.asegura} hasta={T.comenta - 0.05} style={{ left: P.asegura[0], top: P.asegura[1], width: 960 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ background: DEGRADADO, color: "#fff", fontFamily: FUENTE, fontWeight: 900, fontSize: 78, padding: "10px 40px", borderRadius: 30, rotate: "-2deg", letterSpacing: -1, boxShadow: `0 20px 60px ${AZ.real}88` }}>ASEGURA TU MATERNIDAD</div>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 76, color: "#fff", textShadow: "0 4px 20px rgba(4,11,31,0.8)" }}>antes de dar el paso</div>
        </div>
      </Aparece>
      <Aparece en={T.comenta} hasta={T.escribeme - 0.05} style={{ left: P.comenta[0], top: P.comenta[1] }}>
        <div style={{ width: 820, display: "flex", alignItems: "center", gap: 18, background: "rgba(247,250,255,0.96)", borderRadius: 99, padding: "18px 22px", boxShadow: "0 24px 60px rgba(4,11,31,0.45)" }}>
          <div style={{ width: 90, height: 90, borderRadius: 99, background: DEGRADADO, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>💬</div>
          <div style={{ flex: 1, fontFamily: FUENTE, fontWeight: 800, fontSize: 50, color: n ? AZ.marino : AZ.gris }}>
            {n ? comentario.slice(0, n) : "Añade un comentario…"}
            <span style={{ opacity: f % 14 < 7 ? 1 : 0, color: AZ.real }}>|</span>
          </div>
          <div style={{ background: AZ.real, color: "#fff", fontFamily: FUENTE, fontWeight: 900, fontSize: 32, padding: "14px 24px", borderRadius: 99, scale: String(n === comentario.length ? 1 + 0.06 * Math.sin(f / 3) : 0.9), opacity: n === comentario.length ? 1 : 0.4 }}>Publicar</div>
        </div>
      </Aparece>
      <Aparece en={T.escribeme} hasta={DURACION_VOZ} style={{ left: P.dm[0], top: P.dm[1] }}>
        <div style={{ width: 640, display: "flex", alignItems: "center", gap: 20, background: DEGRADADO, borderRadius: 99, padding: "18px 32px", boxShadow: `0 24px 60px ${AZ.real}88` }}>
          <svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" style={{ translate: `${ip(t, [T.dm, T.dm + 0.4], [0, 12], easeOut)}px ${ip(t, [T.dm, T.dm + 0.4], [0, -8], easeOut)}px` }}>
            <path d="M22 3 L2 10.5 L10 13.5 L13 21.5 Z" />
            <path d="M22 3 L10 13.5" />
          </svg>
          <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 48, color: "#fff" }}>Escríbeme al DM</div>
        </div>
      </Aparece>
    </AbsoluteFill>
  );
};

const BLOQUES3: Bloque3[] = BLOQUES.map((b, i) => {
  const enGancho = i < 2;
  const escena = enEscena((b.inicio + b.fin) / 2);
  const r = escena ? ([0, 1595, 0, 0] as Rect) : elegir(CARAS, b.inicio, b.fin, [1390, 1560, 1690, 1250, 1100].map((y) => [100, y - 105, 880, 210] as Rect), CAM);
  return { palabras: b.palabras, inicio: b.inicio, fin: b.fin, fondo: "busto", modo: "video", y: escena ? 1700 : r[1] + 105, oculto: enGancho, pill: "azul" };
});

export const V5: React.FC = () => {
  const { fps: FPS } = useVideoConfig();
  const finVoz = Math.ceil(DURACION_VOZ * FPS);
  const sfx = (n: string, t: number, v = 0.35) => <Sequence key={`${n}${t}`} from={Math.max(0, F(t))} layout="none"><Audio src={staticFile(`sfx/${n}.wav`)} volume={v} /></Sequence>;
  return (
    <FuenteMontaje.Provider value={{ src: "v5.mp4", segmentos: SEGMENTOS }}>
      <AbsoluteFill style={{ background: AZ.noche }}>
        <Camara>
          <Video5 />
          <GradoAzul fuerza={0.55} />
        </Camara>
        <Graficos />
        <Sequence name="Iceberg" from={F(ICEBERG[0])} durationInFrames={F(ICEBERG[1] - ICEBERG[0])}><Iceberg /></Sequence>
        <Sequence name="Comparación" from={F(COMPARA[0])} durationInFrames={F(COMPARA[1] - COMPARA[0])}><Compara /></Sequence>
        {/* transiciones */}
        <Sequence from={F(T.ganchoFin) - 8} durationInFrames={16} layout="none"><Vidrio duracion={16} /></Sequence>
        <Sequence from={F(T.ganchoFin) - 1} durationInFrames={5} layout="none"><Flash duracion={5} /></Sequence>
        <Sequence from={F(ICEBERG[0]) - 12} durationInFrames={24} layout="none"><Ola duracion={24} /></Sequence>
        <Sequence from={F(ICEBERG[1]) - 12} durationInFrames={24} layout="none"><Ola duracion={24} /></Sequence>
        <Sequence from={F(T.magia) - 2} durationInFrames={36} layout="none"><Magia duracion={36} /></Sequence>
        <Sequence from={F(T.magia) - 1} durationInFrames={6} layout="none"><Flash duracion={6} /></Sequence>
        <Sequence from={F(COMPARA[0]) - 12} durationInFrames={24} layout="none"><Mosaico duracion={24} /></Sequence>
        <Sequence from={F(COMPARA[1]) - 12} durationInFrames={24} layout="none"><Mosaico duracion={24} /></Sequence>
        <Sequence from={F(T.c11300)} durationInFrames={5} layout="none"><Flash duracion={5} /></Sequence>
        <Sequence name="Subtítulos" from={0} durationInFrames={finVoz}><Subs3 bloques={BLOQUES3} /></Sequence>
        <Sequence name="Pantalla final" from={finVoz} durationInFrames={F(PANTALLA_FINAL)}>
          <Final3 marca="Tu asesor integral VIP" avatar="marca/avatar.jpg" cuentas={[{ red: "instagram", usuario: "@tuagentedesegurosdlb" }, { red: "tiktok", usuario: "@tuasesorintegralvip" }]} />
        </Sequence>
        <div style={{ position: "absolute", left: 0, top: 0, height: 10, width: `${Math.min(1, useCurrentFrame() / F(DURACION_VOZ)) * 100}%`, background: DEGRADADO }} />
        <Grano opacidad={0.045} />
        {sfx("pop", 0.05, 0.3)}
        {sfx("pop", T.bebe - 0.8, 0.3)}
        {sfx("boom", T.no, 0.55)}
        {sfx("whoosh", T.ganchoFin - 0.25, 0.45)}
        {sfx("pop", T.consultas, 0.28)}
        {sfx("ding", T.c1100, 0.3)}
        {sfx("pop", T.estudios, 0.28)}
        {sfx("ding", T.c2100, 0.3)}
        {sfx("zap", T.ciencia, 0.25)}
        {sfx("ding", T.c3300, 0.32)}
        {sfx("pop", T.hospital, 0.28)}
        {sfx("pop", 52.33, 0.28)}
        {sfx("ding", T.c4000, 0.25)}
        {sfx("whoosh", T.total - 0.2, 0.35)}
        {sfx("boom", T.c11300, 0.5)}
        {sfx("whoosh", ICEBERG[0] - 0.35, 0.5)}
        {sfx("pop", T.terapia, 0.3)}
        {sfx("pop", T.incubadora, 0.3)}
        {sfx("zap", T.enCuanto, 0.3)}
        {sfx("whoosh", ICEBERG[1] - 0.35, 0.45)}
        {sfx("sube", T.magia - 0.1, 0.4)}
        {sfx("pop", T.calculadora, 0.3)}
        {sfx("pop", T.c80, 0.2)}
        {sfx("pop", T.c100b, 0.2)}
        {sfx("ding", T.c960, 0.3)}
        {sfx("zap", T.prepagar, 0.3)}
        {sfx("sube", T.c100p, 0.3)}
        {sfx("boom", T.cubierto, 0.4)}
        {sfx("whoosh", COMPARA[0] - 0.35, 0.45)}
        {sfx("ding", T.c1200c, 0.3)}
        {sfx("sube", T.c11300c, 0.35)}
        {sfx("boom", T.c11300c + 1.4, 0.4)}
        {sfx("whoosh", COMPARA[1] - 0.35, 0.45)}
        {sfx("pop", T.asegura, 0.3)}
        {sfx("pop", T.comenta, 0.3)}
        {sfx("ding", T.escribeme, 0.3)}
        {sfx("whoosh", DURACION_VOZ - 0.1, 0.45)}
      </AbsoluteFill>
    </FuenteMontaje.Provider>
  );
};
