import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BLOQUES, DURACION_TOTAL, DURACION_VOZ, ESCENAS, HUECO_FINAL, PANTALLA_FINAL, SEGMENTOS, T } from "./datos/dlb2";
import { Cinturon, Costo, DM, Encuesta, Fallas, type PropsE } from "./dlb2/Escenas";
import { BANDAS, DUO, Detras, Momentos, enTramo } from "./dlb2/Momentos";
import "./fuentes";
import { Destello, Flash, GradoAzul, Grano } from "./v3/Fx";
import { Final3 } from "./v3/Final3";
import { FuenteMontaje, VideoMontado } from "./v3/Montaje";
import { AZ, DEGRADADO, FUENTE } from "./v3/paleta";
import { Subs3, type Bloque3 } from "./v3/Subs3";
import { Capa, Corte, Liquido, Persianas, type Entrada, type Salida } from "./v3/Transiciones3";
import { easeOut, ip } from "./v3/util";

export const calcularDuracionDLB2 = () => Math.ceil(DURACION_TOTAL * 30);
const FUENTE_VIDEO = { src: "dlb2.mp4", segmentos: SEGMENTOS };
const E = Object.fromEntries(ESCENAS.map((e) => [e.nombre, e]));
const OSCURAS = new Set(["costo", "encuesta", "dm"]);

const BLOQUES3: Bloque3[] = BLOQUES.map((b) => ({
  palabras: b.palabras,
  inicio: b.inicio,
  fin: b.fin,
  fondo: b.escena ? "grafico" : "busto",
  modo: b.escena ? (OSCURAS.has(b.escena) ? "oscuro" : "claro") : "video",
  y: b.escena ? 1520 : 1215,
  pill: b.hablante === "cliente" ? "hielo" : "azul",
  oculto: b.palabras.length === 1 && b.palabras[0].texto === "no.",
}));

// Golpes de impacto: cada cambio de quien habla (fuera de escenas) + entradas/salidas de escena.
const IMPACTOS: number[] = (() => {
  const out: number[] = [];
  BLOQUES.forEach((b, i) => {
    if (i > 0 && b.hablante !== BLOQUES[i - 1].hablante && !b.escena) out.push(b.inicio);
  });
  return out;
})();
const CORTES_CAM = BLOQUES.filter((b) => !b.escena).map((b, k) => ({ inicio: b.inicio, fin: b.fin, k }));
const ENCUADRES = [
  { s: 1.0, r: 0 },
  { s: 1.16, r: -0.8 },
  { s: 1.08, r: 0.8 },
  { s: 1.24, r: 0 },
];

const Camara: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const banda = enTramo(t, BANDAS);
  const duo = enTramo(t, DUO);
  const quieto = banda || t >= T.no - 0.1 && t < T.no + 0.75 || t >= T.patrimonio1 - 0.15 && t < T.patrimonio1 + 1.5;
  let s = 1;
  let r = 0;
  let x = 0;
  let blur = 0;
  const c = CORTES_CAM.find((cc) => t >= cc.inicio && t < cc.fin + 0.07);
  if (c && !quieto) {
    const e = ENCUADRES[c.k % ENCUADRES.length];
    const fc = (t - c.inicio) * fps;
    s = e.s + 0.03 * ip(fc, [0, 90], [0, 1]) + ip(fc, [0, 6], [0.05, 0], easeOut);
    r = e.r;
  }
  if (duo && !banda) s = 1.05 + 0.12 * ip(t, [T.pausaIni, T.pausaFin], [0, 1]); // pausa: zoom lento dramático
  for (const ti of IMPACTOS) {
    const fi = (t - ti) * fps;
    if (fi >= 0 && fi < 8) {
      s += ip(fi, [0, 8], [0.12, 0], easeOut);
      x += fi < 4 ? (frame % 2 ? 14 : -14) : 0;
      blur = Math.max(blur, ip(fi, [0, 5], [6, 0]));
    }
  }
  // rebobinado tras el teaser
  const fr = (t - T.teaserFin) * fps;
  if (fr > -8 && fr < 6) {
    x += Math.sin(frame * 3) * 30;
    blur = Math.max(blur, 10 - Math.abs(fr));
  }
  return (
    <AbsoluteFill style={{ background: AZ.noche, overflow: "hidden" }}>
      <AbsoluteFill style={{ scale: String(s), rotate: `${r}deg`, translate: `${x}px 0`, transformOrigin: "50% 40%", filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const VideoGrado: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const duo = enTramo(t, DUO);
  const banda: React.CSSProperties = { scale: enTramo(t, BANDAS) ? "1.6" : "1", transformOrigin: "50% 49.6%" };
  return (
    <>
      <AbsoluteFill style={{ ...banda, filter: duo ? "grayscale(1) contrast(1.25) brightness(1.18)" : "contrast(1.05) saturate(1.06)" }}>
        <VideoMontado />
      </AbsoluteFill>
      <Detras banda={banda} />
      {duo ? (
        <>
          <AbsoluteFill style={{ background: "#8fc0ff", mixBlendMode: "multiply" }} />
          <AbsoluteFill style={{ background: AZ.marino, mixBlendMode: "lighten", opacity: 0.8 }} />
        </>
      ) : null}
    </>
  );
};

const Rebobinar: React.FC<{ duracion: number }> = ({ duracion }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: Math.sin((f / duracion) * Math.PI) }}>
      {Array.from({ length: 22 }).map((_, i) => (
        <div key={i} style={{ position: "absolute", left: 0, right: 0, top: ((i * 97 + f * 140) % 1920), height: 6 + (i % 4) * 5, background: i % 3 ? "rgba(255,255,255,0.35)" : AZ.cian, opacity: 0.6 }} />
      ))}
      <div style={{ position: "absolute", left: 0, right: 0, top: 860, textAlign: "center", fontFamily: FUENTE, fontWeight: 900, fontSize: 110, color: "#fff", letterSpacing: -6, textShadow: `0 0 40px ${AZ.cian}` }}>◀◀</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 990, textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 34, letterSpacing: 6, color: "#fff" }}>UNOS MINUTOS ANTES</div>
    </AbsoluteFill>
  );
};

const ESC: { nombre: string; C: React.FC<PropsE & { usuario: string }>; entrada: Entrada; salida: Salida }[] = [
  { nombre: "fallas", C: Fallas, entrada: "corte", salida: "corte" },
  { nombre: "costo", C: Costo, entrada: "corte", salida: "zoom" },
  { nombre: "cinturon", C: Cinturon, entrada: "escudo", salida: "bajar" },
  { nombre: "encuesta", C: Encuesta, entrada: "corte", salida: "flip" },
  { nombre: "dm", C: DM, entrada: "flip", salida: "corte" },
];

type Sup = { centro: number; dur: number; nodo: (d: number) => React.ReactNode; sfx?: string };
const SUP: Sup[] = [
  { centro: 0, dur: 14, nodo: (d) => <Persianas duracion={d} /> },
  { centro: T.teaserFin, dur: 16, nodo: (d) => <Rebobinar duracion={d} />, sfx: "zap" },
  { centro: E.fallas.inicio, dur: 16, nodo: (d) => <Persianas duracion={d} />, sfx: "whoosh" },
  { centro: E.fallas.fin, dur: 14, nodo: (d) => <Corte duracion={d} />, sfx: "whoosh" },
  { centro: E.costo.inicio, dur: 18, nodo: (d) => <Liquido duracion={d} />, sfx: "whoosh" },
  { centro: E.costo.fin, dur: 26, nodo: (d) => <Destello duracion={d} seed={6} />, sfx: "whoosh" },
  { centro: E.cinturon.inicio + 0.25, dur: 1, nodo: () => null, sfx: "whoosh" },
  { centro: E.cinturon.fin - 0.15, dur: 1, nodo: () => null, sfx: "whoosh" },
  { centro: E.encuesta.inicio, dur: 16, nodo: (d) => <Persianas duracion={d} horizontal />, sfx: "whoosh" },
  { centro: E.dm.inicio, dur: 1, nodo: () => null, sfx: "whoosh" },
  ...IMPACTOS.map((ti) => ({ centro: ti + 2 / 30, dur: 5, nodo: (d: number) => <Flash duracion={d} color="#cfe3ff" />, sfx: "whoosh" })),
];

const Progreso: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <div style={{ position: "absolute", left: 0, top: 0, height: 10, width: `${Math.min(1, frame / fps / DURACION_VOZ) * 100}%`, background: DEGRADADO, boxShadow: `0 0 20px ${AZ.cian}` }} />;
};

export const DLB2: React.FC = () => {
  const { fps } = useVideoConfig();
  const finVoz = Math.ceil(DURACION_VOZ * fps);
  return (
    <FuenteMontaje.Provider value={FUENTE_VIDEO}>
      <AbsoluteFill style={{ backgroundColor: AZ.noche }}>
        <Camara>
          <VideoGrado />
          <GradoAzul fuerza={0.8} />
        </Camara>
        <Momentos />
        {ESC.map(({ nombre, C, entrada, salida }) => {
          const e = E[nombre];
          const desde = Math.round(e.inicio * fps);
          const dur = Math.round((e.fin - e.inicio) * fps);
          return (
            <Sequence key={nombre} name={`Escena: ${nombre}`} from={desde} durationInFrames={dur}>
              <Capa entrada={entrada} salida={salida} duracion={dur}>
                <C anclas={e.anclas.map((a) => a - e.inicio)} offsetFrames={desde} duracionFrames={dur} usuario="@tuagentedesegurosdlb" />
              </Capa>
            </Sequence>
          );
        })}
        {SUP.map((s, i) => (
          <Sequence key={i} name={`Transición ${i + 1}`} from={Math.max(0, Math.round(s.centro * fps - s.dur / 2))} durationInFrames={s.dur} layout="none">
            <AbsoluteFill>{s.nodo(s.dur)}</AbsoluteFill>
            {s.sfx ? <Audio src={staticFile(`sfx/${s.sfx}.wav`)} volume={0.3} /> : null}
          </Sequence>
        ))}
        <Sequence name="Subtítulos" from={0} durationInFrames={finVoz + 1}>
          <Subs3 bloques={BLOQUES3} />
        </Sequence>
        <Sequence name="Progreso" from={0} durationInFrames={finVoz + 1}>
          <Progreso />
        </Sequence>
        <Sequence name="Pantalla final" from={Math.round((DURACION_VOZ + HUECO_FINAL) * fps)} durationInFrames={Math.round(PANTALLA_FINAL * fps)}>
          <Final3
            marca="Tu asesor integral VIP"
            avatar="marca/avatar.jpg"
            cuentas={[
              { red: "instagram", usuario: "@tuagentedesegurosdlb" },
              { red: "tiktok", usuario: "@tuasesorintegralvip" },
            ]}
          />
        </Sequence>
        <Grano opacidad={0.05} />
      </AbsoluteFill>
    </FuenteMontaje.Provider>
  );
};
