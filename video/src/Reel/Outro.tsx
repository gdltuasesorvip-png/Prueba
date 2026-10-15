import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT } from "./clips";

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
  const head = spring({ frame, fps, config: { damping: 14, stiffness: 110 } });
  const pill = spring({
    frame: frame - 14,
    fps,
    config: { damping: 12, stiffness: 140 },
  });
  const brandIn = interpolate(frame, [30, 45], [0, 1], {
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
      <div
        style={{
          transform: `translateY(${(1 - head) * 60}px)`,
          opacity: head,
          color: COLORS.white,
          fontSize: 92,
          fontWeight: 800,
          lineHeight: 1.08,
          textAlign: "center",
          letterSpacing: -2,
        }}
      >
        {headline}
      </div>
      <div
        style={{
          marginTop: 70,
          transform: `scale(${Math.max(pill, 0)})`,
          background: COLORS.lime,
          color: COLORS.bg,
          fontSize: 46,
          fontWeight: 800,
          padding: "28px 56px",
          borderRadius: 999,
          textAlign: "center",
        }}
      >
        {cta}
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
