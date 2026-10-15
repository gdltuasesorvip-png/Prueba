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
import { Subtitles } from "./Subtitles";
import { CreativeSubtitles } from "./CreativeSubtitles";
import { TRANSCRIPT } from "./transcript";

const CAPTION_IN = 14;
const DETAIL_IN = CAPTION_IN + 22;
const CAPTION_VISIBLE = 165;

export const Clip: React.FC<{
  spec: ClipSpec;
  index: number;
  total: number;
  durationInFrames: number;
  style: "classic" | "creative";
}> = ({ spec, index, total, durationInFrames, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Palabras de este tramo del clip, con tiempos relativos al inicio recortado.
  const base = spec.src.split("/").pop()!.replace(".mp4", "");
  const words = React.useMemo(
    () =>
      (TRANSCRIPT[base] ?? [])
        .filter((w) => w.e > spec.from && w.s < spec.to)
        .map((w) => ({ ...w, s: Math.max(0, w.s - spec.from), e: w.e - spec.from })),
    [base, spec.from, spec.to],
  );

  // Momento en que se dice la palabra clave del capítulo; si no se encuentra, un valor fijo.
  const keyRe = spec.keyword ? new RegExp(spec.keyword) : null;
  const keyWord = keyRe ? words.find((w) => keyRe.test(w.w.toLowerCase())) : undefined;
  const detailAt = keyWord ? Math.round(keyWord.s * fps) : DETAIL_IN;
  // Si la palabra clave llega tarde, el dato se muestra igual a los 3 s; el efecto espera a la palabra.
  const detailShowAt = Math.min(detailAt, DETAIL_IN + 60);

  const chipIn = spring({ frame: frame - CAPTION_IN, fps, config: { damping: 10, stiffness: 200 } });
  const boxIn = spring({ frame: frame - CAPTION_IN - 4, fps, config: { damping: 15, stiffness: 120 } });
  const detailIn = spring({
    frame: frame - detailShowAt,
    fps,
    config: { damping: 9, stiffness: 260, mass: 0.7 },
  });
  // El rótulo se queda hasta que el dato destacado haya estado visible al menos 2,5 s.
  const captionEnd = Math.min(
    Math.max(CAPTION_IN + CAPTION_VISIBLE, detailShowAt + 75),
    durationInFrames - 20,
  );
  const captionOut = interpolate(frame, [captionEnd, captionEnd + 15], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Sacudida breve y flash rojo en el capítulo de alarma.
  const isAlarm = spec.sfx === "boom";
  const shakeT = frame - detailAt;
  const shake = isAlarm && shakeT >= 0 && shakeT < 14 ? Math.sin(shakeT * 2.4) * (14 - shakeT) * 1.2 : 0;
  const glow = 0.35 + 0.35 * Math.sin((frame - detailShowAt) / 6) * (frame > detailShowAt ? 1 : 0);
  const flash = isAlarm && frame >= detailAt
    ? interpolate(frame, [detailAt, detailAt + 10], [0.45, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  // Fundido de audio al inicio y al final para que el corte no suene brusco.
  const volume = (f: number) =>
    spec.gain *
    interpolate(f, [0, 10, durationInFrames - 16, durationInFrames - 1], [0, 1, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  const accent = isAlarm ? COLORS.red : COLORS.lime;

  // Texto gigante de apertura (clips sin voz).
  const overlayIn = spring({ frame: frame - 6, fps, config: { damping: 12, stiffness: 90 } });
  const overlayZoom = 1 + frame * 0.0015;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: FONT }}>
      <OffthreadVideo
        src={staticFile(spec.src)}
        trimBefore={Math.round(spec.from * fps)}
        trimAfter={Math.round(spec.to * fps)}
        volume={volume}
        muted={spec.gain === 0}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translateX(${shake}px) scale(${spec.overlay ? overlayZoom : 1})`,
          filter: spec.overlay ? "saturate(0.6) brightness(0.75)" : undefined,
        }}
      />

      {flash > 0 ? <AbsoluteFill style={{ backgroundColor: COLORS.red, opacity: flash }} /> : null}

      {spec.overlay ? (
        <>
          <Sequence durationInFrames={40}>
            <Audio src={staticFile("audio/riser.mp3")} volume={0.6} />
          </Sequence>
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 70 }}>
            <KineticText
              text={spec.overlay}
              startFrame={6}
              stagger={6}
              style={{
                justifyContent: "center",
                fontSize: 120,
                fontWeight: 900,
                lineHeight: 1,
                textTransform: "uppercase",
                textAlign: "center",
                color: COLORS.white,
                letterSpacing: -3,
                textShadow: `0 0 30px ${COLORS.teal}, 0 0 60px ${COLORS.teal}, 0 6px 20px rgba(0,0,0,0.9)`,
                opacity: overlayIn,
              }}
            />
          </AbsoluteFill>
        </>
      ) : null}

      {spec.chapter ? (
        <>
          {/* Efectos de sonido del rótulo */}
          <Sequence from={CAPTION_IN - 4} durationInFrames={20}>
            <Audio src={staticFile("audio/whoosh.mp3")} volume={0.5} />
          </Sequence>
          <Sequence from={CAPTION_IN + 2} durationInFrames={10}>
            <Audio src={staticFile("audio/pop.mp3")} volume={0.45} />
          </Sequence>
          {spec.sfx && spec.sfx !== "ding" ? (
            <Sequence from={detailAt} durationInFrames={50}>
              <Audio src={staticFile(`audio/${spec.sfx}.mp3`)} volume={0.55} />
            </Sequence>
          ) : null}
        </>
      ) : null}

      {spec.overlay ? null : style === "creative" ? (
        <CreativeSubtitles words={words} accent={accent} />
      ) : (
        <Subtitles words={words} accent={accent} />
      )}

      {/* Barra de progreso por capítulos */}
      <div style={{ position: "absolute", top: 60, left: 50, right: 50, display: "flex", gap: 10 }}>
        {Array.from({ length: total }).map((_, i) => {
          const fill =
            i < index
              ? 1
              : i === index
                ? interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp" })
                : 0;
          return (
            <div
              key={i}
              style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.35)", overflow: "hidden" }}
            >
              <div style={{ width: `${fill * 100}%`, height: "100%", background: COLORS.lime }} />
            </div>
          );
        })}
      </div>

      {/* Rótulo del capítulo */}
      {spec.chapter ? (
        <div style={{ position: "absolute", left: 50, right: 50, bottom: 200, opacity: captionOut }}>
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
            {spec.emoji ? <div style={{ fontSize: 56, lineHeight: 1 }}>{spec.emoji}</div> : null}
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
            {spec.detail ? (
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
            ) : null}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
