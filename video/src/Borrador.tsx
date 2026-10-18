import { AbsoluteFill } from "remotion";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

// Placeholder: se sustituye en el paso 3 (edición de mi-video.mp4).
export const calcularDuracion = () => FPS * 5;

export const Borrador: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #ffffff 0%, #eaf0ff 100%)",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "sans-serif",
        fontSize: 60,
        color: "#111",
      }}
    >
      Proyecto vertical 1080x1920 @ 30 fps
    </AbsoluteFill>
  );
};
