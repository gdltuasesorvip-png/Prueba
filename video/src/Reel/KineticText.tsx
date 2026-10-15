import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Texto que aparece palabra por palabra con un pequeño rebote.
 * `startFrame` indica cuándo arranca y `stagger` los fotogramas entre palabras.
 */
export const KineticText: React.FC<{
  text: string;
  startFrame: number;
  stagger?: number;
  style?: React.CSSProperties;
}> = ({ text, startFrame, stagger = 4, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0 0.28em", ...style }}>
      {words.map((word, i) => {
        const s = spring({
          frame: frame - startFrame - i * stagger,
          fps,
          config: { damping: 12, stiffness: 180, mass: 0.6 },
        });
        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: "inline-block",
              opacity: s,
              transform: `translateY(${(1 - s) * 40}px) scale(${0.7 + 0.3 * s}) rotate(${(1 - s) * -6}deg)`,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
