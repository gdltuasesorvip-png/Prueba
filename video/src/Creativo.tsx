import { Audio, Video } from "@remotion/media";
import { AbsoluteFill, Easing, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { PantallaFinal } from "./componentes/Graficos";
import { EscenaCreativa } from "./creativo/EscenasCreativas";
import { SubtitulosCreativos, type BloqueC } from "./creativo/SubtitulosCreativos";
import { Transicion, golpe } from "./creativo/Transicion";
import { TEMAS, TEMA_BUSTO, TEMA_CUADERNO } from "./creativo/tema";
import { BLOQUES, CUADERNO, DURACION_TOTAL, DURACION_VOZ, ESCENAS, HUECO_FINAL, PANTALLA_FINAL, PLANOS, SEGMENTOS } from "./datos/edicion";
import "./fuentes";

export const calcularDuracionCreativo = () => Math.ceil(DURACION_TOTAL * 30);

// Tema de cada bloque de subtítulos según la escena que lo cubre.
const BLOQUES_C: BloqueC[] = BLOQUES.map((b) => {
  const mid = (b.inicio + b.fin) / 2;
  const esc = ESCENAS.find((e) => e.inicio <= mid && mid < e.fin);
  if (esc) return { ...b, tema: TEMAS[esc.nombre], pildora: false };
  if (CUADERNO.inicio <= mid && mid < CUADERNO.fin) return { ...b, tema: TEMA_CUADERNO, pildora: true };
  return { ...b, tema: TEMA_BUSTO, pildora: true };
});

// "Cambios de cámara": dentro de cada plano de busto, cada bloque alterna plano general / plano corto.
const CORTES_CAMARA = (() => {
  const cortes: { inicio: number; fin: number; corto: boolean; dx: number }[] = [];
  let i = 0;
  for (const p of PLANOS) {
    const bloques = BLOQUES.filter((b) => b.inicio >= p.inicio - 0.1 && b.inicio < p.fin);
    let t = p.inicio;
    bloques.forEach((b, j) => {
      const fin = j + 1 < bloques.length ? bloques[j + 1].inicio : p.fin;
      cortes.push({ inicio: t, fin, corto: i % 2 === 1, dx: i % 4 === 3 ? -40 : 0 });
      t = fin;
      i++;
    });
    if (bloques.length === 0) cortes.push({ inicio: p.inicio, fin: p.fin, corto: false, dx: 0 });
  }
  return cortes;
})();

const ENTRADAS = ESCENAS.flatMap((e) => [e.inicio, e.fin]).concat([CUADERNO.inicio, CUADERNO.fin]);

const Camara: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const corte = CORTES_CAMARA.find((c) => t >= c.inicio && t < c.fin);
  const enCuaderno = t >= CUADERNO.inicio && t < CUADERNO.fin;
  let escala = 1;
  let dx = 0;
  if (corte && !enCuaderno) {
    const avance = interpolate(t, [corte.inicio, corte.inicio + 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    escala = (corte.corto ? 1.22 : 1.0) + 0.04 * avance;
    dx = corte.dx;
  } else if (enCuaderno) {
    escala = 1 + 0.06 * interpolate(t, [CUADERNO.inicio, CUADERNO.fin], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  }
  escala += golpe(frame, ENTRADAS, fps);
  // Arranque: el busto dentro de una tarjeta inclinada que se amplía a pantalla completa (estilo.md §5).
  const primera = BLOQUES[0];
  const tAmpliar = primera.palabras[Math.max(0, primera.palabras.length - 2)].inicio; // "saber"
  const amp = interpolate(t, [tAmpliar, tAmpliar + 5 / fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const tarjeta = 1 - amp;
  return (
    <AbsoluteFill style={{ background: tarjeta > 0 ? `linear-gradient(160deg, ${TEMA_BUSTO.acento} 0%, ${TEMA_BUSTO.acento2} 100%)` : "#000" }}>
      <AbsoluteFill
        style={{
          scale: String(escala * (1 - 0.36 * tarjeta)),
          translate: `${dx}px ${-60 * tarjeta}px`,
          rotate: `${-4 * tarjeta}deg`,
          borderRadius: 56 * tarjeta,
          overflow: "hidden",
          transformOrigin: "42% 30%",
          boxShadow: tarjeta > 0 ? "0 40px 100px rgba(0,0,0,0.35)" : undefined,
          filter: "contrast(1.06) saturate(1.18) brightness(1.02)",
        }}
      >
        {children}
      </AbsoluteFill>
      {/* viñeta */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

const Progreso: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = Math.min(1, frame / fps / DURACION_VOZ);
  return <div style={{ position: "absolute", left: 0, bottom: 0, height: 8, width: `${p * 100}%`, background: TEMA_BUSTO.acento, zIndex: 10 }} />;
};

export const Creativo: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Camara>
        {SEGMENTOS.map((s, i) => (
          <Sequence key={i} name={`Clip ${i + 1}`} from={Math.round(s.out0 * fps)} durationInFrames={Math.max(1, Math.round((s.src1 - s.src0) * fps))}>
            <Video src={staticFile("mi-video.mp4")} trimBefore={Math.round(s.src0 * fps)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </Sequence>
        ))}
      </Camara>

      {ESCENAS.map((e) => {
        const dur = Math.round((e.fin - e.inicio) * fps);
        return (
          <Sequence key={e.nombre} name={`Gráfico: ${e.nombre}`} from={Math.round(e.inicio * fps)} durationInFrames={dur}>
            <Audio src={staticFile("sfx/whoosh.wav")} volume={0.35} />
            <Audio src={staticFile("sfx/whoosh.wav")} from={dur - 8} volume={0.3} />
            <Transicion tipo={TEMAS[e.nombre].transicion} duracionFrames={dur}>
              <EscenaCreativa nombre={e.nombre} anclas={e.anclas.map((a) => a - e.inicio)} />
            </Transicion>
          </Sequence>
        );
      })}

      <Sequence name="Subtítulos" from={0} durationInFrames={Math.ceil(DURACION_VOZ * fps) + 1}>
        <SubtitulosCreativos bloques={BLOQUES_C} />
      </Sequence>
      <Sequence name="Progreso" from={0} durationInFrames={Math.ceil(DURACION_VOZ * fps) + 1}>
        <Progreso />
      </Sequence>

      <Sequence name="Pantalla final" from={Math.round((DURACION_VOZ + HUECO_FINAL) * fps)} durationInFrames={Math.round(PANTALLA_FINAL * fps)}>
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.35} />
        <PantallaFinal marca="Tu asesor VIP" usuario="@tu.usuario" cta="Sígueme para más" />
      </Sequence>
    </AbsoluteFill>
  );
};
