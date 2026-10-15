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
import { EMPHASIS, WIN, chunkWords, findAmounts, findEmojis, isKeyword } from "./speech";

const STYLES = ["hero", "stack", "ghost", "tag", "type", "hero", "stack", "tag"] as const;
type Style = (typeof STYLES)[number];
const RANDOM_SFX = ["click", "blip", "tick", "swoosh", "pop"];

/** Pseudoaleatorio determinista: mismo resultado en cada fotograma y render. */
const rnd = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const clean = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}$.]/gu, "");
const glow = (c: string) => `0 0 18px ${c}, 0 0 40px ${c}, 0 4px 12px rgba(0,0,0,0.8)`;
const stroke: React.CSSProperties = {
  WebkitTextStroke: "2px rgba(0,0,0,0.85)",
  paintOrder: "stroke fill",
  textShadow: "0 4px 14px rgba(0,0,0,0.8)",
};

/**
 * Subtítulos creativos: cada bloque de palabras usa un estilo distinto
 * (gigante con brillo, apilado, palabra fantasma detrás, etiquetas, máquina de escribir),
 * con emojis y sonidos sincronizados a la voz.
 */
export const CreativeSubtitles: React.FC<{ words: Word[]; accent: string }> = ({
  words,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const chunks = React.useMemo(() => chunkWords(words, 3, 0.6), [words]);
  const amounts = React.useMemo(() => findAmounts(words), [words]);
  const emojis = React.useMemo(() => findEmojis(words), [words]);

  const chunkIdx = chunks.findIndex((c) => t >= c.start - 0.05 && t <= c.end + 0.3);
  const chunk = chunkIdx >= 0 ? chunks[chunkIdx] : null;

  const styleOf = (i: number, c: { words: Word[] }): Style => {
    const hasAmount = c.words.some((w) => /\d/.test(w.w));
    const hasEmphasis = c.words.some((w) => EMPHASIS.test(clean(w.w)));
    if (hasAmount || hasEmphasis) return "hero";
    return STYLES[Math.floor(rnd(i + 1) * STYLES.length)];
  };

  const wordSpring = (w: Word, extra = 0) =>
    spring({
      frame: frame - Math.round(w.s * fps) - extra,
      fps,
      config: { damping: 10, stiffness: 240, mass: 0.5 },
    });

  const renderChunk = () => {
    if (!chunk) return null;
    const style = styleOf(chunkIdx, chunk);
    const key = chunk.words.find((w) => isKeyword(w.w)) ?? chunk.words[chunk.words.length - 1];
    const tilt = (rnd(chunkIdx + 7) - 0.5) * 6;
    const since = frame - Math.round(chunk.start * fps);

    if (style === "hero") {
      return (
        <div
          style={{
            position: "absolute",
            left: 40,
            right: 40,
            top: "50%",
            transform: `translateY(-50%) rotate(${tilt}deg)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}
        >
          {chunk.words.map((w, i) => {
            const s = wordSpring(w);
            const said = t >= w.s;
            const isKey = w === key;
            const emph = EMPHASIS.test(clean(w.w));
            const jitter = emph && said && frame - Math.round(w.s * fps) < 12 ? (rnd(frame) - 0.5) * 16 : 0;
            return (
              <div
                key={i}
                style={{
                  fontSize: isKey ? 150 : 60,
                  fontWeight: 900,
                  lineHeight: 1,
                  textTransform: "uppercase",
                  letterSpacing: isKey ? -4 : 0,
                  color: isKey ? accent : COLORS.white,
                  opacity: said ? 1 : 0.35,
                  transform: `scale(${said ? 0.7 + 0.3 * s : 0.7}) translateX(${jitter}px)`,
                  textShadow: isKey ? glow(accent) : stroke.textShadow,
                  WebkitTextStroke: isKey ? "0" : stroke.WebkitTextStroke,
                  paintOrder: "stroke fill",
                }}
              >
                {isKey ? w.w.replace(/[,.;:!?]+$/, "") : w.w}
              </div>
            );
          })}
        </div>
      );
    }

    if (style === "stack") {
      return (
        <div
          style={{
            position: "absolute",
            left: 80,
            top: "52%",
            transform: `translateY(-50%) rotate(-3deg)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          {chunk.words.map((w, i) => {
            const s = wordSpring(w);
            const said = t >= w.s;
            return (
              <div
                key={i}
                style={{
                  fontSize: i % 2 === 0 ? 104 : 58,
                  fontWeight: 900,
                  lineHeight: 1.05,
                  textTransform: "uppercase",
                  color: isKeyword(w.w) ? accent : COLORS.white,
                  opacity: said ? 1 : 0,
                  transform: `translateX(${(1 - s) * -200}px)`,
                  ...stroke,
                }}
              >
                {w.w}
              </div>
            );
          })}
        </div>
      );
    }

    if (style === "ghost") {
      const ghostIn = interpolate(since, [0, 10], [0, 0.16], { extrapolateRight: "clamp" });
      return (
        <>
          <div
            style={{
              position: "absolute",
              left: -60,
              right: -60,
              top: "30%",
              textAlign: "center",
              fontSize: 300,
              fontWeight: 900,
              textTransform: "uppercase",
              color: COLORS.white,
              opacity: ghostIn,
              letterSpacing: -10,
              lineHeight: 1,
              transform: `scale(${1 + since * 0.004})`,
              whiteSpace: "nowrap",
            }}
          >
            {clean(key.w).replace(/[^\p{L}\p{N}]/gu, "")}
          </div>
          <div
            style={{
              position: "absolute",
              left: 60,
              right: 60,
              top: "56%",
              display: "flex",
              justifyContent: "center",
              gap: "0 0.3em",
              flexWrap: "wrap",
              fontSize: 66,
              fontWeight: 900,
              textTransform: "uppercase",
            }}
          >
            {chunk.words.map((w, i) => {
              const s = wordSpring(w);
              const said = t >= w.s;
              return (
                <span
                  key={i}
                  style={{
                    color: isKeyword(w.w) ? accent : COLORS.white,
                    opacity: said ? 1 : 0.4,
                    display: "inline-block",
                    transform: `translateY(${(1 - s) * 30}px)`,
                    ...stroke,
                  }}
                >
                  {w.w}
                </span>
              );
            })}
          </div>
        </>
      );
    }

    if (style === "tag") {
      return (
        <div
          style={{
            position: "absolute",
            left: 50,
            right: 50,
            top: "54%",
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          {chunk.words.map((w, i) => {
            const s = wordSpring(w);
            const said = t >= w.s;
            const isKey = isKeyword(w.w);
            return (
              <div
                key={i}
                style={{
                  fontSize: 58,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  padding: "10px 26px",
                  borderRadius: 16,
                  background: isKey ? accent : "rgba(255,255,255,0.95)",
                  color: COLORS.bg,
                  opacity: said ? 1 : 0,
                  transform: `scale(${s}) rotate(${(rnd(i + chunkIdx) - 0.5) * 10}deg)`,
                  boxShadow: isKey ? `0 0 30px ${accent}` : "0 6px 16px rgba(0,0,0,0.5)",
                }}
              >
                {w.w}
              </div>
            );
          })}
        </div>
      );
    }

    // type: máquina de escribir
    const full = chunk.words.map((w) => w.w).join(" ").toUpperCase();
    let visible = 0;
    chunk.words.forEach((w, i) => {
      const prefix = chunk.words.slice(0, i).map((x) => x.w).join(" ").length + (i ? 1 : 0);
      const dur = Math.max(0.12, w.e - w.s);
      const p = Math.min(1, Math.max(0, (t - w.s) / dur));
      if (t >= w.s) visible = prefix + Math.round(p * w.w.length);
    });
    const cursorOn = Math.floor(frame / 8) % 2 === 0;
    return (
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: "56%",
          textAlign: "center",
          fontFamily: "'DejaVu Sans Mono', 'Courier New', monospace",
          fontSize: 54,
          fontWeight: 700,
          letterSpacing: 2,
          color: COLORS.white,
          background: "rgba(11,17,32,0.75)",
          padding: "16px 24px",
          borderRadius: 12,
          borderLeft: `10px solid ${accent}`,
        }}
      >
        {full.slice(0, visible)}
        <span style={{ color: accent, opacity: cursorOn ? 1 : 0 }}>▌</span>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ fontFamily: FONT, pointerEvents: "none" }}>
      {/* Sonidos: uno aleatorio por bloque, y uno destacado por palabra especial */}
      {chunks.map((c, i) => {
        const f0 = Math.round(c.start * fps);
        const sfx = RANDOM_SFX[Math.floor(rnd(i + 3) * RANDOM_SFX.length)];
        return (
          <Sequence key={`c${i}`} from={f0} durationInFrames={20}>
            <Audio src={staticFile(`audio/${sfx}.mp3`)} volume={0.28} />
          </Sequence>
        );
      })}
      {words.map((w, i) => {
        const c = clean(w.w);
        const special = WIN.test(c) ? "cash" : EMPHASIS.test(c) ? "hit" : null;
        if (!special) return null;
        const prev = words.slice(0, i).reverse().find((x) => WIN.test(clean(x.w)) || EMPHASIS.test(clean(x.w)));
        if (prev && w.s - prev.s < 1.2) return null;
        return (
          <Sequence key={`w${i}`} from={Math.round(w.s * fps)} durationInFrames={40}>
            <Audio src={staticFile(`audio/${special}.mp3`)} volume={special === "hit" ? 0.5 : 0.45} />
          </Sequence>
        );
      })}
      {amounts.map((a) => (
        <Sequence key={`a${a.start}`} from={Math.round(a.start * fps)} durationInFrames={40}>
          <Audio src={staticFile("audio/ding.mp3")} volume={0.45} />
        </Sequence>
      ))}

      {renderChunk()}

      {/* Emojis que saltan con palabras clave */}
      {emojis.map((e) => {
        const f0 = Math.round(e.start * fps);
        const local = frame - f0;
        if (local < 0 || local > 40) return null;
        const pop = spring({ frame: local, fps, config: { damping: 7, stiffness: 240 } });
        const rise = interpolate(local, [0, 40], [0, -120]);
        const fade = interpolate(local, [26, 40], [1, 0], { extrapolateLeft: "clamp" });
        // Siempre en un lateral de la mitad inferior, alternando lado, para no tapar el rostro.
        const x = rnd(e.start * 10) < 0.5 ? 13 : 87;
        return (
          <div
            key={e.start}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: "66%",
              fontSize: 140,
              transform: `translate(-50%, ${rise}px) scale(${pop}) rotate(${(1 - pop) * 30}deg)`,
              opacity: fade,
              filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.5))",
            }}
          >
            {e.emoji}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
