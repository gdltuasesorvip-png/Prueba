import { Composition } from "remotion";
import { Borrador, FPS, HEIGHT, WIDTH, calcularDuracion } from "./Borrador";
import { Creativo, calcularDuracionCreativo } from "./Creativo";
import { V3, calcularDuracionV3 } from "./V3";
import { DLB2, calcularDuracionDLB2 } from "./DLB2";
import { V4, calcularDuracionV4 } from "./V4";
import { V5, calcularDuracionV5 } from "./V5";
import { V6, calcularDuracionV6 } from "./V6";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Borrador" component={Borrador} fps={FPS} width={WIDTH} height={HEIGHT} durationInFrames={calcularDuracion()} />
      <Composition id="Creativo" component={Creativo} fps={FPS} width={WIDTH} height={HEIGHT} durationInFrames={calcularDuracionCreativo()} />
      <Composition id="V6" component={V6} fps={FPS} width={WIDTH} height={HEIGHT} durationInFrames={calcularDuracionV6()} />
      <Composition id="V5" component={V5} fps={FPS} width={WIDTH} height={HEIGHT} durationInFrames={calcularDuracionV5()} />
      <Composition id="V4" component={V4} fps={FPS} width={WIDTH} height={HEIGHT} durationInFrames={calcularDuracionV4()} />
      <Composition id="DLB2" component={DLB2} fps={FPS} width={WIDTH} height={HEIGHT} durationInFrames={calcularDuracionDLB2()} />
      <Composition id="V3" component={V3} fps={FPS} width={WIDTH} height={HEIGHT} durationInFrames={calcularDuracionV3()} />
    </>
  );
};
