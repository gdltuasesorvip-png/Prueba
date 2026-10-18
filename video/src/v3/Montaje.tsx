import { Video } from "@remotion/media";
import React, { createContext, useContext } from "react";
import { Sequence, staticFile, useVideoConfig } from "remotion";
import { SEGMENTOS } from "../datos/edicion";

type Seg = { src0: number; src1: number; out0: number };
// Permite reutilizar el montaje con otro vídeo: <FuenteMontaje.Provider value={{ src, segmentos }}>
export const FuenteMontaje = createContext<{ src: string; segmentos: Seg[] }>({ src: "mi-video.mp4", segmentos: SEGMENTOS });

// Reproduce el vídeo montado (todos los cortes) en tiempo ABSOLUTO aunque esté dentro de una Sequence
// que empieza en `offsetFrames`. Sirve para picture-in-picture y la pantalla del móvil, siempre sincronizado.
export const VideoMontado: React.FC<{ offsetFrames?: number; muted?: boolean; style?: React.CSSProperties }> = ({ offsetFrames = 0, muted = false, style }) => {
  const { fps } = useVideoConfig();
  const { src, segmentos } = useContext(FuenteMontaje);
  return (
    <Sequence from={-offsetFrames} layout="none" name="Montaje">
      {segmentos.map((s, i) => (
        <Sequence key={i} name={`Corte ${i + 1}`} from={Math.round(s.out0 * fps)} durationInFrames={Math.max(1, Math.round((s.src1 - s.src0) * fps))}>
          <Video
            src={staticFile(src)}
            trimBefore={Math.round(s.src0 * fps)}
            muted={muted}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style }}
          />
        </Sequence>
      ))}
    </Sequence>
  );
};
