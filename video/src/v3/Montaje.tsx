import { Video } from "@remotion/media";
import React from "react";
import { Sequence, staticFile, useVideoConfig } from "remotion";
import { SEGMENTOS } from "../datos/edicion";

// Reproduce el vídeo montado (todos los cortes) en tiempo ABSOLUTO aunque esté dentro de una Sequence
// que empieza en `offsetFrames`. Sirve para picture-in-picture y la pantalla del móvil, siempre sincronizado.
export const VideoMontado: React.FC<{ offsetFrames?: number; muted?: boolean; style?: React.CSSProperties }> = ({ offsetFrames = 0, muted = false, style }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence from={-offsetFrames} layout="none" name="Montaje">
      {SEGMENTOS.map((s, i) => (
        <Sequence key={i} name={`Corte ${i + 1}`} from={Math.round(s.out0 * fps)} durationInFrames={Math.max(1, Math.round((s.src1 - s.src0) * fps))}>
          <Video
            src={staticFile("mi-video.mp4")}
            trimBefore={Math.round(s.src0 * fps)}
            muted={muted}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style }}
          />
        </Sequence>
      ))}
    </Sequence>
  );
};
