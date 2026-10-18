import { Video } from "@remotion/media";
import { AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Escena } from "./componentes/Escenas";
import { PantallaFinal } from "./componentes/Graficos";
import { Subtitulos } from "./componentes/Subtitulos";
import { BLOQUES, CUADERNO, DURACION_TOTAL, DURACION_VOZ, ESCENAS, HUECO_FINAL, PANTALLA_FINAL, PLANOS, SEGMENTOS } from "./datos/edicion";
import { ZOOM } from "./estilo";
import "./fuentes";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const calcularDuracion = () => Math.ceil(DURACION_TOTAL * FPS);

// Push-in lento (+5 % en 3,2 s) en planos de busto alternos (estilo.md §7).
const ZoomBusto: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const plano = PLANOS.find((p) => t >= p.inicio && t < p.fin);
  const escala = plano?.zoom ? 1 + ZOOM.pushIn * interpolate(t, [plano.inicio, plano.inicio + 3.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  return <AbsoluteFill style={{ scale: String(escala) }}>{children}</AbsoluteFill>;
};

export const Borrador: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <ZoomBusto>
        {SEGMENTOS.map((s, i) => (
          <Sequence key={i} name={`Clip ${i + 1}`} from={Math.round(s.out0 * fps)} durationInFrames={Math.max(1, Math.round((s.src1 - s.src0) * fps))}>
            <Video src={staticFile("mi-video.mp4")} trimBefore={Math.round(s.src0 * fps)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </Sequence>
        ))}
      </ZoomBusto>

      {ESCENAS.map((e) => (
        <Sequence key={e.nombre} name={`Gráfico: ${e.nombre}`} from={Math.round(e.inicio * fps)} durationInFrames={Math.round((e.fin - e.inicio) * fps)}>
          <Escena nombre={e.nombre} anclas={e.anclas.map((a) => a - e.inicio)} />
        </Sequence>
      ))}

      <Sequence name="Subtítulos" from={0} durationInFrames={Math.ceil(DURACION_VOZ * fps) + 1}>
        <Subtitulos bloques={BLOQUES} />
      </Sequence>

      <Sequence name="Pantalla final" from={Math.round((DURACION_VOZ + HUECO_FINAL) * fps)} durationInFrames={Math.round(PANTALLA_FINAL * fps)}>
        <PantallaFinal marca="Tu asesor VIP" usuario="@tu.usuario" cta="Sígueme para más" />
      </Sequence>
      {/* CUADERNO se usa solo para documentación del b-roll: {CUADERNO.inicio}-{CUADERNO.fin} */}
    </AbsoluteFill>
  );
};
