import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ClipSpec, COLORS, FONT } from "./clips";

const CAPTION_IN = 18;
const CAPTION_VISIBLE = 150;

export const Clip: React.FC<{
  spec: ClipSpec;
  index: number;
  total: number;
  durationInFrames: number;
}> = ({ spec, index, total, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const captionIn = spring({
    frame: frame - CAPTION_IN,
    fps,
    config: { damping: 15, stiffness: 120 },
  });
  const captionOut = interpolate(
    frame,
    [CAPTION_IN + CAPTION_VISIBLE, CAPTION_IN + CAPTION_VISIBLE + 15],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const captionX = (1 - captionIn) * -120;

  // Fundido de audio al inicio y al final para que el corte no suene brusco.
  const volume = (f: number) =>
    spec.gain *
    interpolate(
      f,
      [0, 10, durationInFrames - 16, durationInFrames - 1],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: FONT }}>
      <OffthreadVideo
        src={staticFile(spec.src)}
        trimBefore={Math.round(spec.from * fps)}
        trimAfter={Math.round(spec.to * fps)}
        volume={volume}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* Barra de progreso por capítulos */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 50,
          right: 50,
          display: "flex",
          gap: 10,
        }}
      >
        {Array.from({ length: total }).map((_, i) => {
          const fill =
            i < index
              ? 1
              : i === index
                ? interpolate(frame, [0, durationInFrames], [0, 1], {
                    extrapolateRight: "clamp",
                  })
                : 0;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                background: "rgba(255,255,255,0.35)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${fill * 100}%`,
                  height: "100%",
                  background: COLORS.lime,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Rótulo del capítulo */}
      <div
        style={{
          position: "absolute",
          left: 50,
          bottom: 200,
          transform: `translateX(${captionX}px)`,
          opacity: Math.min(captionIn, captionOut),
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: COLORS.lime,
            color: COLORS.bg,
            fontSize: 30,
            fontWeight: 800,
            padding: "10px 22px",
            borderRadius: 10,
            marginBottom: 12,
            letterSpacing: 2,
          }}
        >
          {index + 1} / {total}
        </div>
        <div
          style={{
            background: "rgba(11,17,32,0.82)",
            color: COLORS.white,
            padding: "26px 34px",
            borderRadius: 18,
            maxWidth: 820,
            borderLeft: `12px solid ${COLORS.teal}`,
          }}
        >
          <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1 }}>
            {spec.chapter}
          </div>
          <div
            style={{
              fontSize: 38,
              fontWeight: 600,
              color: COLORS.lime,
              marginTop: 10,
            }}
          >
            {spec.detail}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
