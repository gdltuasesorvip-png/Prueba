import { Composition } from "remotion";
import { FPS, Reel, reelSchema, totalFrames } from "./Reel/Reel";

// Cada <Composition> es una entrada en la barra lateral de Remotion Studio.

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        // Reel 1: "¿Cuánto cuesta tener un bebé?"  →  npx remotion render Reel out/reel.mp4
        id="Reel"
        component={Reel}
        schema={reelSchema}
        durationInFrames={totalFrames("costos", true)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          project: "costos" as const,
          style: "classic" as const,
          showIntro: true,
          music: "music.mp3",
          title: "¿Cuánto cuesta tener un bebé?",
          subtitle: "Los costos reales del embarazo, paso a paso",
          outroHeadline: "Protege lo que más importa",
          cta: "Escríbenos por WhatsApp",
          brand: "",
          musicUnderVoice: 0.25,
          musicFull: 0.55,
        }}
      />
      <Composition
        // Reel 2: "¿Cuánto cuesta un parto hoy?"  →  npx remotion render Reel2 out/reel2.mp4
        id="Reel2"
        component={Reel}
        schema={reelSchema}
        durationInFrames={totalFrames("plan", false)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          project: "plan" as const,
          style: "creative" as const,
          showIntro: false,
          music: "music2.mp3",
          title: "",
          subtitle: "",
          outroHeadline: "Comenta MATERNIDAD",
          cta: "Te digo qué plan te conviene",
          brand: "",
          musicUnderVoice: 0.22,
          musicFull: 0.55,
        }}
      />
    </>
  );
};
