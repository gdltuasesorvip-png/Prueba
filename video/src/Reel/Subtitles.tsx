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
import { Word } from "./transcript";
import { chunkWords, findAmounts, findEmojis, isKeyword } from "./speech";

/** Subtítulos tipo karaoke, emojis por palabra clave y montos en grande sincronizados con la voz. */
export const Subtitles: React.FC<{ words: Word[]; accent: string }> = ({
  words,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const chunks = React.useMemo(() => chunkWords(words), [words]);
  const amounts = React.useMemo(() => findAmounts(words), [words]);
  const emojis = React.useMemo(() => findEmojis(words), [words]);

  const chunk = chunks.find((c) => t >= c.start - 0.05 && t <= c.end + 0.35);

  return (
    <AbsoluteFill style={{ fontFamily: FONT, pointerEvents: "none" }}>
      {/* Subtítulo actual */}
      {chunk ? (
        <div
          style={{
            position: "absolute",
            left: 60,
            right: 60,
            top: "58%",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "0 0.3em",
            textAlign: "center",
            fontSize: 64,
            fontWeight: 900,
            lineHeight: 1.15,
            textTransform: "uppercase",
            letterSpacing: -1,
          }}
        >
          {chunk.words.map((w, i) => {
            const startF = Math.round(w.s * fps);
            const s = spring({
              frame: frame - startF,
              fps,
              config: { damping: 11, stiffness: 260, mass: 0.5 },
            });
            const said = t >= w.s;
            const key = isKeyword(w.w);
            return (
              <span
                key={`${w.s}-${i}`}
                style={{
                  display: "inline-block",
                  color: said ? (key ? accent : COLORS.white) : "rgba(255,255,255,0.55)",
                  transform: `scale(${said ? 0.85 + 0.15 * s : 0.85})`,
                  WebkitTextStroke: "2px rgba(0,0,0,0.85)",
                  textShadow: "0 4px 14px rgba(0,0,0,0.8)",
                  paintOrder: "stroke fill",
                }}
              >
                {w.w}
              </span>
            );
          })}
        </div>
      ) : null}

      {/* Emojis que saltan con palabras clave */}
      {emojis.map((e) => {
        const f0 = Math.round(e.start * fps);
        const local = frame - f0;
        if (local < 0 || local > 36) return null;
        const pop = spring({ frame: local, fps, config: { damping: 8, stiffness: 220 } });
        const rise = interpolate(local, [0, 36], [0, -140]);
        const fade = interpolate(local, [22, 36], [1, 0], { extrapolateLeft: "clamp" });
        const x = 50 + ((Math.round(e.start * 7) % 5) - 2) * 9; // posición pseudoaleatoria
        return (
          <div
            key={e.start}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: "49%",
              fontSize: 120,
              transform: `translate(-50%, ${rise}px) scale(${pop}) rotate(${(1 - pop) * 20}deg)`,
              opacity: fade,
              filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.5))",
            }}
          >
            {e.emoji}
          </div>
        );
      })}

      {/* Montos en grande + timbre cuando se dicen */}
      {amounts.map((a) => {
        const f0 = Math.round(a.start * fps);
        const local = frame - f0;
        const hold = Math.max(40, Math.round((a.end - a.start) * fps) + 30);
        if (local < 0 || local > hold + 12) return null;
        const pop = spring({ frame: local, fps, config: { damping: 9, stiffness: 240 } });
        const out = interpolate(local, [hold, hold + 12], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const wobble = Math.sin(local / 3) * 2 * (local < 15 ? 1 : 0);
        return (
          <React.Fragment key={a.start}>
            <Sequence from={f0} durationInFrames={40}>
              <Audio src={staticFile("audio/ding.mp3")} volume={0.5} />
            </Sequence>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "33%",
                display: "flex",
                justifyContent: "center",
                opacity: out,
                transform: `scale(${pop}) rotate(${wobble}deg)`,
              }}
            >
              <div
                style={{
                  background: accent,
                  color: COLORS.bg,
                  fontSize: 96,
                  fontWeight: 900,
                  padding: "14px 44px",
                  borderRadius: 24,
                  boxShadow: `0 0 50px ${accent}`,
                  letterSpacing: -2,
                }}
              >
                💸 {a.text}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
