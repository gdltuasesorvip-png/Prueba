import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT } from "./clips";

export const Intro: React.FC<{ title: string; subtitle: string }> = ({
  title,
  subtitle,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const pop = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const subIn = spring({
    frame: frame - 12,
    fps,
    config: { damping: 16, stiffness: 100 },
  });
  const lineW = interpolate(frame, [8, 30], [0, 320], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: "center",
        alignItems: "center",
        padding: 90,
        fontFamily: FONT,
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -200,
          right: -200,
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: COLORS.teal,
          opacity: 0.25,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -260,
          left: -220,
          width: 640,
          height: 640,
          borderRadius: "50%",
          background: COLORS.lime,
          opacity: 0.18,
        }}
      />
      <div
        style={{
          transform: `scale(${pop})`,
          color: COLORS.white,
          fontSize: 104,
          fontWeight: 800,
          lineHeight: 1.05,
          textAlign: "center",
          letterSpacing: -2,
        }}
      >
        {title}
      </div>
      <div
        style={{
          width: lineW,
          height: 10,
          borderRadius: 5,
          background: COLORS.lime,
          marginTop: 40,
          marginBottom: 40,
        }}
      />
      <div
        style={{
          opacity: subIn,
          transform: `translateY(${(1 - subIn) * 30}px)`,
          color: COLORS.teal,
          fontSize: 44,
          fontWeight: 600,
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        {subtitle}
      </div>
    </AbsoluteFill>
  );
};
