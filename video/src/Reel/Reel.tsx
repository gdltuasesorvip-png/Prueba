import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { z } from "zod";
import { CLIPS } from "./clips";
import { Clip } from "./Clip";
import { Intro } from "./Intro";
import { Outro } from "./Outro";

export const FPS = 30;
export const INTRO_FRAMES = 80;
export const OUTRO_FRAMES = 110;
export const TRANSITION_FRAMES = 15;

export const clipFrames = (i: number) =>
  Math.round((CLIPS[i].to - CLIPS[i].from) * FPS);

export const totalFrames = () => {
  const clips = CLIPS.reduce((sum, _, i) => sum + clipFrames(i), 0);
  const transitions = (CLIPS.length + 1) * TRANSITION_FRAMES;
  return INTRO_FRAMES + clips + OUTRO_FRAMES - transitions;
};

export const reelSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  outroHeadline: z.string(),
  cta: z.string(),
  brand: z.string(),
});

export const Reel: React.FC<z.infer<typeof reelSchema>> = ({
  title,
  subtitle,
  outroHeadline,
  cta,
  brand,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={INTRO_FRAMES}>
          <Intro title={title} subtitle={subtitle} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        {CLIPS.map((spec, i) => (
          <React.Fragment key={spec.src}>
            <TransitionSeries.Sequence durationInFrames={clipFrames(i)}>
              <Clip
                spec={spec}
                index={i}
                total={CLIPS.length}
                durationInFrames={clipFrames(i)}
              />
            </TransitionSeries.Sequence>
            <TransitionSeries.Transition
              presentation={fade()}
              timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
            />
          </React.Fragment>
        ))}
        <TransitionSeries.Sequence durationInFrames={OUTRO_FRAMES}>
          <Outro headline={outroHeadline} cta={cta} brand={brand} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
