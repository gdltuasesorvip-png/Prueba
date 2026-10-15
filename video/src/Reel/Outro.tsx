import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT } from "./clips";
import { KineticText } from "./KineticText";

export const Outro: React.FC<{
  headline: string;
  cta: string;
  brand: string;
}> = ({ headline, cta, brand }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });
  const pill = spring({
    frame: frame - 22,
    fps,
    config: { damping: 11, stiffness: 150 },
  });
  const pulse = 1 + 0.03 * Math.sin((frame - 22) / 5) * (frame > 40 ? 1 : 0);
  const brandIn = interpolate(frame, [36, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: "center",
        alignItems: "center",
        padding: 90,
        fontFamily: FONT,
        opacity: fadeIn,
      }}
    >
      <Sequence from={22} durationInFrames={45}>
        <Audio src={staticFile("audio/sparkle.mp3")} volume={0.55} />
      </Sequence>
      <div
        style={{
          position: "absolute",
          top: -240,
          left: -200,
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: COLORS.lime,
          opacity: 0.18,
        }}
      />
      <KineticText
        text={headline}
        startFrame={4}
        stagger={5}
        style={{
          justifyContent: "center",
          color: COLORS.white,
          fontSize: 92,
          fontWeight: 800,
          lineHeight: 1.08,
          textAlign: "center",
          letterSpacing: -2,
        }}
      />
      <div
        style={{
          marginTop: 70,
          transform: `scale(${Math.max(pill, 0) * pulse})`,
          background: COLORS.lime,
          color: COLORS.bg,
          fontSize: 46,
          fontWeight: 800,
          padding: "28px 56px",
          borderRadius: 999,
          textAlign: "center",
          boxShadow: `0 0 40px rgba(212,242,58,0.45)`,
        }}
      >
        💬 {cta}
      </div>
      {brand ? (
        <div
          style={{
            position: "absolute",
            bottom: 140,
            opacity: brandIn,
            color: COLORS.teal,
            fontSize: 38,
            fontWeight: 600,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          {brand}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
