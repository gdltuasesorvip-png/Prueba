import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile } from "remotion";
import {
  TransitionPresentation,
  TransitionSeries,
  linearTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { z } from "zod";
import { CLIPS, CLIPS2, ClipSpec } from "./clips";
import { Clip } from "./Clip";
import { Intro } from "./Intro";
import { Outro } from "./Outro";

export const FPS = 30;
export const INTRO_FRAMES = 80;
export const OUTRO_FRAMES = 110;
export const TRANSITION_FRAMES = 15;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const presentation = (kind: ClipSpec["enter"]): TransitionPresentation<any> => {
  switch (kind) {
    case "slide":
      return slide({ direction: "from-right" });
    case "slideUp":
      return slide({ direction: "from-bottom" });
    case "wipe":
      return wipe({ direction: "from-left" });
    default:
      return fade();
  }
};

export const PROJECTS = { costos: CLIPS, plan: CLIPS2 } as const;
export type ProjectId = keyof typeof PROJECTS;

export const clipFrames = (c: ClipSpec) => Math.round((c.to - c.from) * FPS);

export const totalFrames = (project: ProjectId, showIntro: boolean) => {
  const clips = PROJECTS[project];
  const body = clips.reduce((sum, c) => sum + clipFrames(c), 0);
  const parts = clips.length + 1 + (showIntro ? 1 : 0);
  return (showIntro ? INTRO_FRAMES : 0) + body + OUTRO_FRAMES - (parts - 1) * TRANSITION_FRAMES;
};

export const reelSchema = z.object({
  project: z.enum(["costos", "plan"]),
  style: z.enum(["classic", "creative"]),
  showIntro: z.boolean(),
  music: z.string(),
  title: z.string(),
  subtitle: z.string(),
  outroHeadline: z.string(),
  cta: z.string(),
  brand: z.string(),
  /** Volumen de la música mientras habla la presentadora (0 a 1). */
  musicUnderVoice: z.number().min(0).max(1),
  /** Volumen de la música en portada y cierre (0 a 1). */
  musicFull: z.number().min(0).max(1),
});

export const Reel: React.FC<z.infer<typeof reelSchema>> = ({
  project,
  style,
  showIntro,
  music,
  title,
  subtitle,
  outroHeadline,
  cta,
  brand,
  musicUnderVoice,
  musicFull,
}) => {
  const clips = PROJECTS[project];
  const total = totalFrames(project, showIntro);
  const clipsStart = showIntro ? INTRO_FRAMES - TRANSITION_FRAMES : 0;
  const outroStart = total - OUTRO_FRAMES;

  // La música baja cuando habla la presentadora y sube en portada y cierre.
  const musicVolume = (f: number) =>
    showIntro
      ? interpolate(
          f,
          [0, 20, clipsStart, clipsStart + TRANSITION_FRAMES, outroStart, outroStart + TRANSITION_FRAMES, total - 30, total - 1],
          [0, musicFull, musicFull, musicUnderVoice, musicUnderVoice, musicFull, musicFull, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )
      : interpolate(
          f,
          [0, 20, outroStart, outroStart + TRANSITION_FRAMES, total - 30, total - 1],
          [0, musicUnderVoice, musicUnderVoice, musicFull, musicFull, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Audio src={staticFile(`audio/${music}`)} volume={musicVolume} loop />
      <TransitionSeries>
        {showIntro ? (
          <TransitionSeries.Sequence durationInFrames={INTRO_FRAMES}>
            <Intro title={title} subtitle={subtitle} />
          </TransitionSeries.Sequence>
        ) : null}
        {clips.map((spec, i) => (
          <React.Fragment key={`${spec.src}-${spec.from}`}>
            {showIntro || i > 0 ? (
              <TransitionSeries.Transition
                presentation={presentation(spec.enter)}
                timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
              />
            ) : null}
            <TransitionSeries.Sequence durationInFrames={clipFrames(spec)}>
              <Clip spec={spec} index={i} total={clips.length} durationInFrames={clipFrames(spec)} style={style} />
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={OUTRO_FRAMES}>
          <Outro headline={outroHeadline} cta={cta} brand={brand} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
