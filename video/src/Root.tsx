import { Composition } from "remotion";
import { Borrador, FPS, HEIGHT, WIDTH, calcularDuracion } from "./Borrador";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Borrador"
      component={Borrador}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      durationInFrames={calcularDuracion()}
    />
  );
};
