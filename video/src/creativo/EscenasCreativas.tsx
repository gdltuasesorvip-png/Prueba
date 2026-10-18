import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { staticFile } from "remotion";
import { Check, Entra, Etiqueta } from "../componentes/Graficos";
import { GRAF } from "../estilo";
import { FondoVivo } from "./FondoVivo";
import { TEMAS, TEXTO_CLARO, TEXTO_OSCURO, Tema } from "./tema";

type Props = { anclas: number[] };

const usarT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

const Centro: React.FC<{ children: React.ReactNode; top?: number }> = ({ children, top = 560 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", flexDirection: "column", alignItems: "center", gap: 36 }}>{children}</div>
);

const TarjetaC: React.FC<{ tema: Tema; children: React.ReactNode; style?: React.CSSProperties; inclinar?: number }> = ({ tema, children, style, inclinar = 0 }) => (
  <div
    style={{
      background: tema.claro ? "#ffffff" : "#1b1e2e",
      color: tema.claro ? TEXTO_CLARO : TEXTO_OSCURO,
      borderRadius: GRAF.radioTarjeta,
      boxShadow: tema.claro ? GRAF.sombraTarjeta : "0 30px 80px rgba(0,0,0,0.45)",
      padding: 40,
      rotate: `${inclinar}deg`,
      ...style,
    }}
  >
    {children}
  </div>
);

const FilaC: React.FC<{ tema: Tema; texto: string; activo?: boolean; n?: number; tipo?: "badge" | "check" }> = ({ tema, texto, activo = true, n = 1, tipo = "badge" }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 20, fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 38, color: activo ? (tema.claro ? TEXTO_CLARO : TEXTO_OSCURO) : "#8a8f9c" }}>
    {tipo === "badge" ? (
      <div style={{ width: 44, height: 44, borderRadius: 999, background: tema.acento, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 24, flexShrink: 0 }}>{n}</div>
    ) : (
      <div style={{ width: 36, height: 36, borderRadius: 10, background: activo ? tema.acento : "rgba(138,143,156,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {activo ? <Check activo /> : null}
      </div>
    )}
    <span>{texto}</span>
  </div>
);

const formatear = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// Cifra que cuenta desde 0 hasta el valor en 0,7 s.
const Contador: React.FC<{ valor: number; desde: number; sufijo?: string; color: string; tam?: number }> = ({ valor, desde, sufijo = " $", color, tam = 96 }) => {
  const t = usarT();
  const p = interpolate(t, [desde, desde + 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const v = Math.round(valor * p);
  return (
    <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: tam, lineHeight: 1, color, letterSpacing: -2, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
      {formatear(v)}
      {sufijo}
    </div>
  );
};

const Sfx: React.FC<{ nombre: "pop" | "ding" | "whoosh"; en: number; volumen?: number }> = ({ nombre, en, volumen = 0.35 }) => {
  const { fps } = useVideoConfig();
  return <Audio src={staticFile(`sfx/${nombre}.wav`)} trimBefore={0} from={Math.max(0, Math.round(en * fps))} volume={volumen} />;
};

export const CosteC: React.FC<Props> = ({ anclas }) => {
  const tema = TEMAS.coste;
  return (
    <FondoVivo tema={tema}>
      <Sfx nombre="pop" en={anclas[1]} />
      <Sfx nombre="pop" en={anclas[2]} />
      <Centro top={560}>
        <Entra desde={0}>
          <Etiqueta>Venezuela · clínica tipo A</Etiqueta>
        </Entra>
        <Entra desde={anclas[0]}>
          <TarjetaC tema={tema} inclinar={-2} style={{ width: 920, textAlign: "center" }}>
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 44 }}>Parto en clínica</div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 28, marginTop: 30, minHeight: 130 }}>
              <Entra desde={anclas[1]}>
                <Contador valor={6000} desde={anclas[1]} color={TEXTO_CLARO} />
              </Entra>
              <Entra desde={anclas[2]}>
                <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 40, color: "#8a8f9c", paddingBottom: 14 }}>a</div>
              </Entra>
              <Entra desde={anclas[2]}>
                <Contador valor={10000} desde={anclas[2]} color={tema.acento} />
              </Entra>
            </div>
          </TarjetaC>
        </Entra>
      </Centro>
    </FondoVivo>
  );
};

export const ComplicacionesC: React.FC<Props> = ({ anclas }) => {
  const tema = TEMAS.complicaciones;
  const t = usarT();
  const items = ["Cesárea de emergencia", "Incubadora", "Días en terapia intensiva"];
  const disparo = interpolate(t, [anclas[3], anclas[3] + 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const temblor = t >= anclas[3] && t < anclas[3] + 0.4 ? Math.sin(t * 90) * 6 : 0;
  return (
    <FondoVivo tema={tema}>
      {items.map((_, i) => (
        <Sfx key={i} nombre="pop" en={anclas[i]} />
      ))}
      <Sfx nombre="whoosh" en={anclas[3] - 0.1} volumen={0.4} />
      <Centro top={520}>
        <Entra desde={0}>
          <Etiqueta style={{ color: tema.acento2 }}>Complicaciones · mamá o bebé</Etiqueta>
        </Entra>
        <Entra desde={anclas[0]}>
          <TarjetaC tema={tema} inclinar={1.5} style={{ width: 860, display: "flex", flexDirection: "column", gap: 26, translate: `${temblor}px 0` }}>
            {items.map((tx, i) => (
              <Entra key={tx} desde={anclas[i]}>
                <FilaC tema={tema} n={i + 1} texto={tx} />
              </Entra>
            ))}
          </TarjetaC>
        </Entra>
        <Entra desde={anclas[3]}>
          <div style={{ position: "relative", width: 860, height: 220 }}>
            <svg width="860" height="220" viewBox="0 0 860 220">
              <polyline
                points="20,200 180,170 340,150 500,110 660,60 840,10"
                fill="none"
                stroke={tema.acento}
                strokeWidth="14"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="1400"
                strokeDashoffset={1400 * (1 - disparo)}
              />
            </svg>
            <div style={{ position: "absolute", right: 0, top: 20, fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 48, color: tema.acento, opacity: disparo }}>
              $$$
            </div>
          </div>
        </Entra>
      </Centro>
    </FondoVivo>
  );
};

export const CoberturaC: React.FC<Props> = ({ anclas }) => {
  const tema = TEMAS.cobertura;
  const t = usarT();
  const items: [string, number][] = [
    ["Parto", anclas[0]],
    ["Cesárea", anclas[1]],
    ["Consultas prenatales", anclas[2]],
    ["Ecografías", anclas[4]],
    ["Resto del año: cualquier emergencia", anclas[6]],
  ];
  return (
    <FondoVivo tema={tema}>
      {items.map(([, a], i) => (
        <Sfx key={i} nombre="ding" en={a} volumen={0.25} />
      ))}
      <Centro top={500}>
        <Entra desde={0}>
          <div style={{ fontFamily: GRAF.mono, fontSize: 26, padding: "12px 24px", borderRadius: 999, background: tema.acento, color: "#fff" }}>plan de salud · maternidad</div>
        </Entra>
        <Entra desde={0}>
          <TarjetaC tema={tema} inclinar={-1.5} style={{ width: 880, display: "flex", flexDirection: "column", gap: 26 }}>
            <Etiqueta style={{ textAlign: "left", marginBottom: 6 }}>te cubre</Etiqueta>
            {items.map(([tx, a]) => (
              <div key={tx} style={{ scale: t >= a && t < a + 0.25 ? String(1 + 0.06 * Math.sin(((t - a) / 0.25) * Math.PI)) : "1", transformOrigin: "left center" }}>
                <FilaC tema={tema} texto={tx} tipo="check" activo={t >= a} />
              </div>
            ))}
          </TarjetaC>
        </Entra>
      </Centro>
    </FondoVivo>
  );
};

export const AhorroC: React.FC<Props> = ({ anclas }) => {
  const tema = TEMAS.ahorro;
  const t = usarT();
  const x8 = interpolate(t, [anclas[2], anclas[2] + 0.35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)) });
  return (
    <FondoVivo tema={tema}>
      <Sfx nombre="pop" en={anclas[0]} />
      <Sfx nombre="pop" en={anclas[1]} />
      <Sfx nombre="ding" en={anclas[2]} volumen={0.4} />
      <Centro top={600}>
        <Entra desde={0}>
          <Etiqueta style={{ color: tema.acento2 }}>al año</Etiqueta>
        </Entra>
        <div style={{ display: "flex", gap: 30, alignItems: "stretch" }}>
          <Entra desde={anclas[0]}>
            <TarjetaC tema={tema} inclinar={-3} style={{ width: 400, textAlign: "center" }}>
              <Etiqueta>pagas</Etiqueta>
              <div style={{ height: 18 }} />
              <Contador valor={1200} desde={anclas[0]} color={TEXTO_OSCURO} tam={88} />
            </TarjetaC>
          </Entra>
          <Entra desde={anclas[1]}>
            <TarjetaC tema={tema} inclinar={3} style={{ width: 440, textAlign: "center", outline: `4px solid ${tema.acento}` }}>
              <Etiqueta style={{ color: tema.acento }}>te ahorras</Etiqueta>
              <div style={{ height: 18 }} />
              <Contador valor={8800} desde={anclas[1]} color={tema.acento} tam={88} />
            </TarjetaC>
          </Entra>
        </div>
        <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: 190, color: tema.acento2, lineHeight: 1, scale: String(x8), opacity: x8, rotate: "-6deg" }}>×8</div>
      </Centro>
    </FondoVivo>
  );
};

export const PlazoC: React.FC<Props> = ({ anclas }) => {
  const tema = TEMAS.plazo;
  const t = usarT();
  const barra = interpolate(t, [anclas[0], anclas[0] + 1.2], [0, 58], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <FondoVivo tema={tema}>
      <Sfx nombre="pop" en={anclas[0]} />
      <Sfx nombre="ding" en={anclas[1]} volumen={0.25} />
      <Sfx nombre="whoosh" en={anclas[2] - 0.05} volumen={0.3} />
      <Centro top={600}>
        <Entra desde={0}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, fontFamily: GRAF.mono, fontSize: 26, padding: "12px 24px", borderRadius: 999, background: "#151821", color: "#fff" }}>
            <span style={{ width: 14, height: 14, borderRadius: 999, background: tema.acento, display: "inline-block", opacity: Math.floor(t * 3) % 2 === 0 ? 1 : 0.3 }} />
            ojo
          </div>
        </Entra>
        <Entra desde={anclas[0]}>
          <TarjetaC tema={tema} inclinar={-2} style={{ width: 880, display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 44 }}>Plazo de espera</div>
            <div style={{ position: "relative", height: 14, borderRadius: 999, background: "#e9edf7" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${barra}%`, borderRadius: 999, background: tema.acento }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: GRAF.mono, fontSize: 22, color: "#8a8f9c" }}>
              <span>contratas</span>
              <span>cobertura maternidad</span>
            </div>
            <Entra desde={anclas[1]}>
              <FilaC tema={tema} texto="Contrata antes del embarazo" tipo="check" activo />
            </Entra>
            <Entra desde={anclas[2]}>
              <div style={{ display: "flex", alignItems: "center", gap: 20, fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 38, color: "#d2322d" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#ffe3e2", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>×</div>
                <span>Ya embarazada: llegaste tarde</span>
              </div>
            </Entra>
          </TarjetaC>
        </Entra>
      </Centro>
    </FondoVivo>
  );
};

export const ComentaC: React.FC<Props> = ({ anclas }) => {
  const tema = TEMAS.comenta;
  const t = usarT();
  const texto = "maternidad";
  const chars = Math.max(0, Math.min(texto.length, Math.floor((t - anclas[0]) * 18)));
  return (
    <FondoVivo tema={tema}>
      <Sfx nombre="pop" en={anclas[1]} />
      <Sfx nombre="ding" en={anclas[2]} volumen={0.3} />
      <Centro top={620}>
        <Entra desde={0}>
          <Etiqueta style={{ color: tema.acento2 }}>comenta</Etiqueta>
        </Entra>
        <Entra desde={0}>
          <TarjetaC tema={tema} style={{ width: 880, display: "flex", alignItems: "center", gap: 22, padding: "26px 30px" }}>
            <div style={{ width: 64, height: 64, borderRadius: 999, background: `linear-gradient(135deg, ${tema.acento}, ${tema.acento2})`, flexShrink: 0 }} />
            <div style={{ flex: 1, height: 76, borderRadius: 999, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", padding: "0 28px", fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 36, color: chars === 0 ? "#8a8f9c" : "#fff" }}>
              {chars === 0 ? "Añade un comentario…" : texto.slice(0, chars)}
            </div>
            <div style={{ width: 64, height: 64, borderRadius: 999, background: chars >= texto.length ? tema.acento : "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 30, flexShrink: 0 }}>↑</div>
          </TarjetaC>
        </Entra>
        <Entra desde={anclas[1]}>
          <div style={{ alignSelf: "flex-end", marginRight: 110, background: tema.acento, color: "#fff", fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 34, padding: "20px 32px", borderRadius: "28px 28px 6px 28px" }}>Escríbeme</div>
        </Entra>
        <Entra desde={anclas[2]}>
          <div style={{ alignSelf: "flex-start", marginLeft: 110, display: "flex", alignItems: "center", gap: 16, background: "#fff", color: TEXTO_CLARO, fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 34, padding: "20px 32px", borderRadius: "28px 28px 28px 6px" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: tema.acento, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Check activo />
            </div>
            el plan que te conviene
          </div>
        </Entra>
      </Centro>
    </FondoVivo>
  );
};

const POR_NOMBRE: Record<string, React.FC<Props>> = { coste: CosteC, complicaciones: ComplicacionesC, cobertura: CoberturaC, ahorro: AhorroC, plazo: PlazoC, comenta: ComentaC };

export const EscenaCreativa: React.FC<{ nombre: string; anclas: number[] }> = ({ nombre, anclas }) => {
  const C = POR_NOMBRE[nombre];
  if (!C) return <AbsoluteFill style={{ background: "magenta" }} />;
  return <C anclas={anclas} />;
};
