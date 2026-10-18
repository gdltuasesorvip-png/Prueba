import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Tipografías locales (estilo.md §3 y §4). Se cargan antes del primer fotograma.
const cargar = async () => {
  await Promise.all([
    ...["600", "700", "800", "900"].map((weight) =>
      loadFont({ family: "Nunito", url: staticFile(`fonts/nunito-latin-${weight}-normal.woff2`), weight }),
    ),
    ...["700", "800", "900"].map((weight) =>
      loadFont({ family: "Nunito", url: staticFile(`fonts/nunito-latin-ext-${weight}-normal.woff2`), weight }),
    ),
    loadFont({ family: "JetBrains Mono", url: staticFile("fonts/jetbrains-mono-latin-400-normal.woff2"), weight: "400" }),
    loadFont({ family: "JetBrains Mono", url: staticFile("fonts/jetbrains-mono-latin-ext-400-normal.woff2"), weight: "400" }),
    loadFont({ family: "JetBrains Mono", url: staticFile("fonts/jetbrains-mono-latin-600-normal.woff2"), weight: "600" }),
    loadFont({ family: "Instrument Serif", url: staticFile("fonts/instrument-serif-latin-400-italic.woff2"), weight: "400", style: "italic" }),
    loadFont({ family: "Instrument Serif", url: staticFile("fonts/instrument-serif-latin-ext-400-italic.woff2"), weight: "400", style: "italic" }),
  ]);
};

export const fuentesCargadas = cargar();
