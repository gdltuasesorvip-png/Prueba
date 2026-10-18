import { Composition } from "remotion";
import { Borrador, FPS, HEIGHT, WIDTH, calcularDuracion } from "./Borrador";
import { Creativo, calcularDuracionCreativo } from "./Creativo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Borrador" component={Borrador} fps={FPS} width={WIDTH} height={HEIGHT} durationInFrames={calcularDuracion()} />
      <Composition id="Creativo" component={Creativo} fps={FPS} width={WIDTH} height={HEIGHT} durationInFrames={calcularDuracionCreativo()} />
    </>
  );
};
