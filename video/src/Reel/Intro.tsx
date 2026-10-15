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

export const Intro: React.FC<{ title: string; subtitle: string }> = ({
  title,
  subtitle,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const subIn = spring({
    frame: frame - 22,
    fps,
    config: { damping: 16, stiffness: 100 },
  });
  const lineW = interpolate(frame, [14, 36], [0, 320], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const drift = frame * 0.6;

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
      <Sequence durationInFrames={40}>
        <Audio src={staticFile("audio/riser.mp3")} volume={0.5} />
      </Sequence>
      <Sequence from={30} durationInFrames={40}>
        <Audio src={staticFile("audio/ding.mp3")} volume={0.5} />
      </Sequence>
      <div
        style={{
          position: "absolute",
          top: -200 + drift,
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
          bottom: -260 + drift * 0.5,
          left: -220,
          width: 640,
          height: 640,
          borderRadius: "50%",
          background: COLORS.lime,
          opacity: 0.18,
        }}
      />
      <KineticText
        text={title}
        startFrame={4}
        stagger={5}
        style={{
          justifyContent: "center",
          color: COLORS.white,
          fontSize: 108,
          fontWeight: 800,
          lineHeight: 1.05,
          textAlign: "center",
          letterSpacing: -2,
        }}
      />
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
