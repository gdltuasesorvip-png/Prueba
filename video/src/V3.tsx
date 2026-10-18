import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BLOQUES, CUADERNO, DURACION_TOTAL, DURACION_VOZ, ESCENAS, HUECO_FINAL, PANTALLA_FINAL, PLANOS } from "./datos/edicion";
import "./fuentes";
import { Ahorro3, Cobertura3, Comenta3, Complicaciones3, Coste3, Plazo3, type PropsEscena } from "./v3/Escenas3";
import { Destello, Flash, GradoAzul, Grano } from "./v3/Fx";
import { Final3 } from "./v3/Final3";
import { DetrasDePersona, Momentos, T } from "./v3/Momentos";
import { VideoMontado } from "./v3/Montaje";
import { AZ, DEGRADADO } from "./v3/paleta";
import { Subs3, type Bloque3 } from "./v3/Subs3";
import { Capa, Corte, Estela, Liquido, Persianas, type Entrada, type Salida } from "./v3/Transiciones3";
import { easeIn, easeOut, ip } from "./v3/util";

export const calcularDuracionV3 = () => Math.ceil(DURACION_TOTAL * 30);

const E = Object.fromEntries(ESCENAS.map((e) => [e.nombre, e]));
const OSCURAS = new Set(["complicaciones", "ahorro", "comenta"]);

// ---------- Subtítulos ----------
const BLOQUES3: Bloque3[] = BLOQUES.map((b, i) => {
  const mid = (b.inicio + b.fin) / 2;
  const esc = ESCENAS.find((e) => e.inicio <= mid && mid < e.fin);
  const enCuaderno = CUADERNO.inicio <= mid && mid < CUADERNO.fin;
  const modo = esc ? (OSCURAS.has(esc.nombre) ? "oscuro" : "claro") : "video";
  let y = esc ? 1520 : enCuaderno ? 1500 : 1390;
  let palabras = b.palabras;
  let oculto = false;
  if (i === 0) palabras = b.palabras.filter((p) => p.inicio >= T.sin - 0.01); // "sin antes saber esto." (el resto va en grande)
  if (b.palabras.some((p) => p.texto === "mamá")) y = 960;
  if (b.palabras.some((p) => p.texto === "ahora.")) oculto = true;
  return { ...b, palabras, modo, y, oculto };
});

// ---------- Cámara ----------
type CorteCam = { inicio: number; fin: number; k: number };
const CORTES: CorteCam[] = (() => {
  const out: CorteCam[] = [];
  let k = 0;
  for (const p of PLANOS) {
    const bs = BLOQUES.filter((b) => b.inicio >= p.inicio - 0.1 && b.inicio < p.fin);
    let t = p.inicio;
    bs.forEach((b, j) => {
      const fin = j + 1 < bs.length ? bs[j + 1].inicio : p.fin;
      out.push({ inicio: t, fin, k: k++ });
      t = fin;
    });
  }
  return out;
})();
const ENCUADRES = [
  { s: 1.0, r: 0, x: 0 },
  { s: 1.28, r: -1.2, x: 0 },
  { s: 1.12, r: 1.0, x: -30 },
  { s: 1.36, r: 0, x: 20 },
];

const Camara: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  let s = 1;
  let r = 0;
  let x = 0;
  let blur = 0;
  const enCuaderno = t >= CUADERNO.inicio && t < CUADERNO.fin;
  const c = CORTES.find((cc) => t >= cc.inicio && t < cc.fin);
  // En los planos con texto DETRÁS de la persona, encuadre abierto para que el texto quepa.
  const textoDetras = t < PLANOS[0].fin || (t >= PLANOS[4].inicio && t < T.familia - 0.3);
  if (c && !enCuaderno) {
    const e = textoDetras ? ENCUADRES[0] : ENCUADRES[c.k % ENCUADRES.length];
    const fc = (t - c.inicio) * fps;
    s = e.s + 0.035 * ip(fc, [0, 90], [0, 1]) + ip(fc, [0, 6], [0.07, 0], easeOut);
    r = e.r;
    x = e.x;
    if (c.k % 2 === 1 && fc < 5 && !textoDetras) {
      x += ip(fc, [0, 5], [90, 0], easeOut);
      blur = ip(fc, [0, 5], [10, 0]);
    }
  } else if (enCuaderno) {
    s = 1.02 + 0.08 * ip(t, [CUADERNO.inicio, CUADERNO.fin], [0, 1]);
    s += ip(t, [T.trato, T.trato + 0.12, T.trato + 0.8], [0, 0.12, 0.06]);
  }
  // Barrido de cámara (whip pan) al entrar al cuaderno
  const fw = (t - CUADERNO.inicio) * fps;
  if (fw > -6 && fw < 0) {
    x += ip(fw, [-6, 0], [0, -700], easeIn);
    blur = Math.max(blur, ip(fw, [-6, 0], [0, 24]));
  } else if (fw >= 0 && fw < 7) {
    x += ip(fw, [0, 7], [700, 0], easeOut);
    blur = Math.max(blur, ip(fw, [0, 7], [24, 0]));
  }
  // Sacudida en el jonrón
  if (t > T.jonron && t < T.jonron + 0.45) {
    x += Math.sin(frame * 2.5) * 16;
    s += 0.05;
  }
  return (
    <AbsoluteFill style={{ background: AZ.noche, overflow: "hidden" }}>
      <AbsoluteFill style={{ scale: String(s), rotate: `${r}deg`, translate: `${x}px 0`, transformOrigin: "48% 36%", filter: blur > 0.2 ? `blur(${blur}px)` : undefined }}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- Escenas ----------
const ESCENAS3: { nombre: string; C: React.FC<PropsEscena & { duracionFrames: number }>; entrada: Entrada; salida: Salida }[] = [
  { nombre: "coste", C: Coste3, entrada: "corte", salida: "corte" },
  { nombre: "complicaciones", C: Complicaciones3, entrada: "corte", salida: "zoom" },
  { nombre: "cobertura", C: Cobertura3, entrada: "escudo", salida: "flip" },
  { nombre: "ahorro", C: Ahorro3, entrada: "flip", salida: "corte" },
  { nombre: "plazo", C: Plazo3, entrada: "reloj", salida: "corte" },
  { nombre: "comenta", C: Comenta3, entrada: "corte", salida: "corte" },
];

// ---------- Transiciones superpuestas (centradas en el corte) ----------
type Sup = { centro: number; dur: number; nodo: (d: number) => React.ReactNode; sfx?: string };
const SUPERPUESTAS: Sup[] = [
  { centro: 0, dur: 16, nodo: (d) => <Persianas duracion={d} /> },
  { centro: E.coste.inicio, dur: 16, nodo: (d) => <Persianas duracion={d} />, sfx: "whoosh" },
  { centro: E.coste.fin, dur: 14, nodo: (d) => <Corte duracion={d} />, sfx: "whoosh" },
  { centro: E.complicaciones.inicio, dur: 18, nodo: (d) => <Liquido duracion={d} />, sfx: "whoosh" },
  { centro: E.complicaciones.fin, dur: 26, nodo: (d) => <Destello duracion={d} seed={5} />, sfx: "whoosh" },
  { centro: CUADERNO.inicio, dur: 12, nodo: (d) => <Estela duracion={d} />, sfx: "whoosh" },
  { centro: E.cobertura.inicio + 0.25, dur: 1, nodo: () => null, sfx: "whoosh" },
  { centro: E.ahorro.inicio, dur: 1, nodo: () => null, sfx: "whoosh" },
  { centro: E.ahorro.fin, dur: 14, nodo: (d) => <Corte duracion={d} inverso />, sfx: "whoosh" },
  { centro: E.plazo.inicio + 0.25, dur: 1, nodo: () => null, sfx: "whoosh" },
  { centro: E.plazo.fin, dur: 16, nodo: (d) => <Persianas duracion={d} horizontal />, sfx: "whoosh" },
  { centro: E.comenta.inicio + 0.2, dur: 1, nodo: () => null, sfx: "whoosh" },
  { centro: E.comenta.fin, dur: 10, nodo: (d) => <Flash duracion={d} />, sfx: "whoosh" },
];

const Progreso: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <div style={{ position: "absolute", left: 0, top: 0, height: 10, width: `${Math.min(1, frame / fps / DURACION_VOZ) * 100}%`, background: DEGRADADO, boxShadow: `0 0 20px ${AZ.cian}` }} />;
};

export const V3: React.FC = () => {
  const { fps } = useVideoConfig();
  const finVoz = Math.ceil(DURACION_VOZ * fps);
  return (
    <AbsoluteFill style={{ backgroundColor: AZ.noche }}>
      <Camara>
        <VideoMontado />
        <DetrasDePersona />
        <GradoAzul fuerza={0.9} />
      </Camara>

      <Momentos />

      {ESCENAS3.map(({ nombre, C, entrada, salida }) => {
        const e = E[nombre];
        const desde = Math.round(e.inicio * fps);
        const dur = Math.round((e.fin - e.inicio) * fps);
        return (
          <Sequence key={nombre} name={`Escena: ${nombre}`} from={desde} durationInFrames={dur}>
            <Capa entrada={entrada} salida={salida} duracion={dur}>
              <C inicio={e.inicio} anclas={e.anclas.map((a) => a - e.inicio)} offsetFrames={desde} duracionFrames={dur} />
            </Capa>
          </Sequence>
        );
      })}

      {SUPERPUESTAS.map((s, i) => {
        const desde = Math.round(s.centro * fps - s.dur / 2);
        return (
          <Sequence key={i} name={`Transición ${i + 1}`} from={desde} durationInFrames={s.dur} layout="none">
            <AbsoluteFill>{s.nodo(s.dur)}</AbsoluteFill>
            {s.sfx ? <Audio src={staticFile(`sfx/${s.sfx}.wav`)} volume={0.32} /> : null}
          </Sequence>
        );
      })}

      <Sequence name="Subtítulos" from={0} durationInFrames={finVoz + 1}>
        <Subs3 bloques={BLOQUES3} />
      </Sequence>
      <Sequence name="Progreso" from={0} durationInFrames={finVoz + 1}>
        <Progreso />
      </Sequence>

      <Sequence name="Pantalla final" from={Math.round((DURACION_VOZ + HUECO_FINAL) * fps)} durationInFrames={Math.round(PANTALLA_FINAL * fps)}>
        <Final3
          marca="Tu asesor integral VIP"
          cuentas={[
            { red: "instagram", usuario: "@tuagentedesegurosdlb" },
            { red: "tiktok", usuario: "@tuasesorintegralvip" },
          ]}
        />
      </Sequence>
      <Grano opacidad={0.06} />
    </AbsoluteFill>
  );
};
