import { Video } from "@remotion/media";
import React from "react";
import { Sequence, staticFile } from "remotion";
import { SEGMENTOS } from "../datos/v4";

// Montaje con velocidad por tramo (cámara rápida) y audio solo en los tramos con voz.
export const Montaje4: React.FC<{ offsetFrames?: number; muted?: boolean }> = ({ offsetFrames = 0, muted = false }) => (
  <Sequence from={-offsetFrames} layout="none" name="Montaje v4">
    {SEGMENTOS.map((s, i) => (
      <Sequence key={i} name={`${s.tramo} x${s.vel}`} from={Math.round(s.out0 * 30)} durationInFrames={s.frames}>
        <Video
          src={staticFile("v4.mp4")}
          trimBefore={Math.round(s.src0 * 30)}
          playbackRate={s.vel}
          muted={muted || !s.audio}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Sequence>
    ))}
  </Sequence>
);
