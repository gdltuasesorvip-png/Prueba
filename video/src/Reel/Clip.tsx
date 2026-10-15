import React from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ClipSpec, COLORS, FONT } from "./clips";
import { KineticText } from "./KineticText";

const CAPTION_IN = 14;
const DETAIL_IN = CAPTION_IN + 22;
const CAPTION_VISIBLE = 165;

export const Clip: React.FC<{
  spec: ClipSpec;
  index: number;
  total: number;
  durationInFrames: number;
}> = ({ spec, index, total, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const chipIn = spring({
    frame: frame - CAPTION_IN,
    fps,
    config: { damping: 10, stiffness: 200 },
  });
  const boxIn = spring({
    frame: frame - CAPTION_IN - 4,
    fps,
    config: { damping: 15, stiffness: 120 },
  });
  const detailIn = spring({
    frame: frame - DETAIL_IN,
    fps,
    config: { damping: 9, stiffness: 260, mass: 0.7 },
  });
  const captionOut = interpolate(
    frame,
    [CAPTION_IN + CAPTION_VISIBLE, CAPTION_IN + CAPTION_VISIBLE + 15],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Sacudida breve en el capítulo de complicaciones.
  const isAlarm = spec.sfx === "boom";
  const shakeT = frame - DETAIL_IN;
  const shake =
    isAlarm && shakeT >= 0 && shakeT < 14
      ? Math.sin(shakeT * 2.4) * (14 - shakeT) * 1.2
      : 0;
  // Pulso de brillo en el dato destacado.
  const glow =
    0.35 + 0.35 * Math.sin((frame - DETAIL_IN) / 6) * (frame > DETAIL_IN ? 1 : 0);
  // Flash de pantalla al golpe (solo complicaciones).
  const flash = isAlarm
    ? interpolate(frame, [DETAIL_IN, DETAIL_IN + 10], [0.45, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  // Fundido de audio al inicio y al final para que el corte no suene brusco.
  const volume = (f: number) =>
    spec.gain *
    interpolate(
      f,
      [0, 10, durationInFrames - 16, durationInFrames - 1],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

  const accent = isAlarm ? COLORS.red : COLORS.lime;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: FONT }}>
      <OffthreadVideo
        src={staticFile(spec.src)}
        trimBefore={Math.round(spec.from * fps)}
        trimAfter={Math.round(spec.to * fps)}
        volume={volume}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translateX(${shake}px)`,
        }}
      />

      {flash > 0 ? (
        <AbsoluteFill style={{ backgroundColor: COLORS.red, opacity: flash }} />
      ) : null}

      {/* Efectos de sonido */}
      <Sequence from={CAPTION_IN - 4} durationInFrames={20}>
        <Audio src={staticFile("audio/whoosh.mp3")} volume={0.5} />
      </Sequence>
      <Sequence from={CAPTION_IN + 2} durationInFrames={10}>
        <Audio src={staticFile("audio/pop.mp3")} volume={0.45} />
      </Sequence>
      <Sequence from={DETAIL_IN} durationInFrames={50}>
        <Audio src={staticFile(`audio/${spec.sfx}.mp3`)} volume={0.55} />
      </Sequence>

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
          right: 50,
          bottom: 200,
          opacity: captionOut,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 14,
            transform: `scale(${chipIn}) translateX(${(1 - chipIn) * -80}px)`,
            transformOrigin: "left center",
          }}
        >
          <div
            style={{
              background: accent,
              color: COLORS.bg,
              fontSize: 30,
              fontWeight: 800,
              padding: "10px 22px",
              borderRadius: 10,
              letterSpacing: 2,
            }}
          >
            {index + 1} / {total}
          </div>
          <div style={{ fontSize: 56, lineHeight: 1 }}>{spec.emoji}</div>
        </div>
        <div
          style={{
            background: "rgba(11,17,32,0.84)",
            color: COLORS.white,
            padding: "26px 34px",
            borderRadius: 18,
            maxWidth: 860,
            borderLeft: `12px solid ${isAlarm ? COLORS.red : COLORS.teal}`,
            opacity: boxIn,
            transform: `translateY(${(1 - boxIn) * 50}px)`,
          }}
        >
          <KineticText
            text={spec.chapter}
            startFrame={CAPTION_IN + 6}
            style={{ fontSize: 54, fontWeight: 800, lineHeight: 1.12 }}
          />
          <div
            style={{
              marginTop: 12,
              display: "inline-block",
              fontSize: 40,
              fontWeight: 800,
              color: accent,
              opacity: detailIn,
              transform: `scale(${0.5 + 0.5 * detailIn + (1 - detailIn) * 0.9})`,
              transformOrigin: "left center",
              textShadow: `0 0 ${18 * glow}px ${accent}`,
            }}
          >
            {spec.detail}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
