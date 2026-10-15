import { Composition } from "remotion";
import { FPS, Reel, reelSchema, totalFrames } from "./Reel/Reel";

// Cada <Composition> es una entrada en la barra lateral de Remotion Studio.

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      // Para renderizar: npx remotion render Reel out/reel.mp4
      id="Reel"
      component={Reel}
      schema={reelSchema}
      durationInFrames={totalFrames()}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{
        title: "¿Cuánto cuesta tener un bebé?",
        subtitle: "Los costos reales del embarazo, paso a paso",
        outroHeadline: "Protege lo que más importa",
        cta: "Escríbenos por WhatsApp",
        brand: "",
      }}
    />
  );
};
