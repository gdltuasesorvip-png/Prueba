import { Composition } from "remotion";
import { Borrador, FPS, HEIGHT, WIDTH, calcularDuracion } from "./Borrador";
import { Creativo, calcularDuracionCreativo } from "./Creativo";
import { V3, calcularDuracionV3 } from "./V3";
import { DLB2, calcularDuracionDLB2 } from "./DLB2";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Borrador" component={Borrador} fps={FPS} width={WIDTH} height={HEIGHT} durationInFrames={calcularDuracion()} />
      <Composition id="Creativo" component={Creativo} fps={FPS} width={WIDTH} height={HEIGHT} durationInFrames={calcularDuracionCreativo()} />
      <Composition id="DLB2" component={DLB2} fps={FPS} width={WIDTH} height={HEIGHT} durationInFrames={calcularDuracionDLB2()} />
      <Composition id="V3" component={V3} fps={FPS} width={WIDTH} height={HEIGHT} durationInFrames={calcularDuracionV3()} />
    </>
  );
};
