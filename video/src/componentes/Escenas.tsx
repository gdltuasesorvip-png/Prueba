import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, GRAF } from "../estilo";
import { Check, Chip, Cifra, Entra, Etiqueta, Fila, Fondo, Tarjeta } from "./Graficos";

// Cada escena recibe las anclas en segundos RELATIVOS al inicio de la escena.
type Props = { anclas: number[] };

const Centro: React.FC<{ children: React.ReactNode; top?: number }> = ({ children, top = 560 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", flexDirection: "column", alignItems: "center", gap: 36 }}>
    {children}
  </div>
);

const usarT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

// 1. Coste de un parto en clínica tipo A: 6.000 – 10.000 $
export const EscenaCoste: React.FC<Props> = ({ anclas }) => (
  <Fondo>
    <Centro top={600}>
      <Entra desde={0}>
        <Etiqueta>Venezuela · clínica tipo A</Etiqueta>
      </Entra>
      <Entra desde={anclas[0]}>
        <Tarjeta style={{ width: 920, textAlign: "center" }}>
          <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 44, color: COLOR.negro }}>Parto en clínica</div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 28, marginTop: 30, minHeight: 150 }}>
            <Entra desde={anclas[1]}>
              <Cifra valor="6.000 $" color={COLOR.negro} tam={96} />
            </Entra>
            <Entra desde={anclas[2]}>
              <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 40, color: COLOR.gris, paddingBottom: 16 }}>a</div>
            </Entra>
            <Entra desde={anclas[2]}>
              <Cifra valor="10.000 $" color={COLOR.azul} tam={96} />
            </Entra>
          </div>
        </Tarjeta>
      </Entra>
      <Entra desde={anclas[2] + 0.4}>
        <Chip>sin contar complicaciones</Chip>
      </Entra>
    </Centro>
  </Fondo>
);

// 2. Complicaciones: lista que se construye y "la cuenta se dispara"
export const EscenaComplicaciones: React.FC<Props> = ({ anclas }) => {
  const t = usarT();
  const items = ["Cesárea de emergencia", "Incubadora", "Días en terapia intensiva"];
  const disparo = interpolate(t, [anclas[3], anclas[3] + 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Fondo>
      <Centro top={560}>
        <Entra desde={0}>
          <Etiqueta>Complicaciones · mamá o bebé</Etiqueta>
        </Entra>
        <Entra desde={anclas[0]}>
          <Tarjeta style={{ width: 820, display: "flex", flexDirection: "column", gap: 26 }}>
            {items.map((tx, i) => (
              <Entra key={tx} desde={anclas[i]}>
                <Fila n={i + 1} texto={tx} />
              </Entra>
            ))}
          </Tarjeta>
        </Entra>
        <Entra desde={anclas[3]}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Chip oscuro>la cuenta se dispara</Chip>
            <div
              style={{
                fontFamily: "Nunito, sans-serif",
                fontWeight: 900,
                fontSize: 80,
                color: COLOR.azul,
                translate: `0 ${-disparo * 30}px`,
                lineHeight: 1,
              }}
            >
              ↑
            </div>
          </div>
        </Entra>
      </Centro>
    </Fondo>
  );
};

// 3. Cobertura del plan: checklist que se marca al nombrar cada cosa
export const EscenaCobertura: React.FC<Props> = ({ anclas }) => {
  const t = usarT();
  const items: [string, number][] = [
    ["Parto", anclas[0]],
    ["Cesárea", anclas[1]],
    ["Consultas prenatales", anclas[2]],
    ["Ecografías", anclas[4]],
    ["Resto del año: cualquier emergencia", anclas[6]],
  ];
  return (
    <Fondo>
      <Centro top={520}>
        <Entra desde={0}>
          <Chip oscuro>plan de salud · maternidad</Chip>
        </Entra>
        <Entra desde={0}>
          <Tarjeta style={{ width: 860, display: "flex", flexDirection: "column", gap: 26 }}>
            <Etiqueta style={{ textAlign: "left", marginBottom: 6 }}>te cubre</Etiqueta>
            {items.map(([tx, a]) => (
              <Fila key={tx} texto={tx} tipo="check" activo={t >= a} />
            ))}
          </Tarjeta>
        </Entra>
      </Centro>
    </Fondo>
  );
};

// 4. Ahorro: pagas 1.200 → ahorras 8.800, ×8
export const EscenaAhorro: React.FC<Props> = ({ anclas }) => (
  <Fondo>
    <Centro top={600}>
      <Entra desde={0}>
        <Etiqueta>al año</Etiqueta>
      </Entra>
      <div style={{ display: "flex", gap: 30, alignItems: "stretch" }}>
        <Entra desde={anclas[0]}>
          <Tarjeta style={{ width: 400, textAlign: "center" }}>
            <Etiqueta>pagas</Etiqueta>
            <div style={{ height: 18 }} />
            <Cifra valor="1.200 $" color={COLOR.negro} tam={92} />
          </Tarjeta>
        </Entra>
        <Entra desde={anclas[1]}>
          <Tarjeta style={{ width: 440, textAlign: "center", outline: `4px solid ${COLOR.azul}` }}>
            <Etiqueta style={{ color: COLOR.azul }}>te ahorras</Etiqueta>
            <div style={{ height: 18 }} />
            <Cifra valor="8.800 $" color={COLOR.azul} tam={92} />
          </Tarjeta>
        </Entra>
      </div>
      <Entra desde={anclas[2]}>
        <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: 150, color: COLOR.azul, lineHeight: 1 }}>×8</div>
      </Entra>
    </Centro>
  </Fondo>
);

// 5. Plazo de espera: contrata antes del embarazo
export const EscenaPlazo: React.FC<Props> = ({ anclas }) => (
  <Fondo>
    <Centro top={600}>
      <Entra desde={0}>
        <Chip oscuro>
          <span style={{ width: 14, height: 14, borderRadius: 999, background: "#ff5f57", display: "inline-block" }} />
          ojo
        </Chip>
      </Entra>
      <Entra desde={anclas[0]}>
        <Tarjeta style={{ width: 860, display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 44, color: COLOR.negro }}>Plazo de espera</div>
          <div style={{ position: "relative", height: 14, borderRadius: 999, background: "#e9edf7" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "58%", borderRadius: 999, background: COLOR.azul }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: GRAF.mono, fontSize: 22, color: COLOR.gris }}>
            <span>contratas</span>
            <span>cobertura maternidad</span>
          </div>
          <Entra desde={anclas[1]}>
            <Fila texto="Contrata antes del embarazo" tipo="check" activo />
          </Entra>
          <Entra desde={anclas[2]}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 34, color: "#d2322d" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#ffe3e2", color: "#d2322d", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>×</div>
              <span>Ya embarazada: llegaste tarde</span>
            </div>
          </Entra>
        </Tarjeta>
      </Entra>
    </Centro>
  </Fondo>
);

// 6. Llamada a la acción: comentario "maternidad" + escríbeme
export const EscenaComenta: React.FC<Props> = ({ anclas }) => {
  const t = usarT();
  const texto = "maternidad";
  const chars = Math.max(0, Math.min(texto.length, Math.floor((t - anclas[0]) * 18)));
  return (
    <Fondo>
      <Centro top={620}>
        <Entra desde={0}>
          <Etiqueta>comenta</Etiqueta>
        </Entra>
        <Entra desde={0}>
          <Tarjeta style={{ width: 860, display: "flex", alignItems: "center", gap: 22, padding: "26px 30px" }}>
            <div style={{ width: 64, height: 64, borderRadius: 999, background: COLOR.azulClaro, flexShrink: 0 }} />
            <div
              style={{
                flex: 1,
                height: 76,
                borderRadius: 999,
                background: "#f1f3f9",
                display: "flex",
                alignItems: "center",
                padding: "0 28px",
                fontFamily: "Nunito, sans-serif",
                fontWeight: 700,
                fontSize: 36,
                color: chars === 0 ? COLOR.gris : COLOR.negro,
              }}
            >
              {chars === 0 ? "Añade un comentario…" : texto.slice(0, chars)}
            </div>
            <div style={{ width: 64, height: 64, borderRadius: 999, background: chars >= texto.length ? COLOR.azul : "#dfe4f0", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 30, flexShrink: 0 }}>
              ↑
            </div>
          </Tarjeta>
        </Entra>
        <Entra desde={anclas[1]}>
          <div style={{ alignSelf: "flex-end", marginRight: 110, background: COLOR.azul, color: "#fff", fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 34, padding: "20px 32px", borderRadius: "28px 28px 6px 28px" }}>
            Escríbeme
          </div>
        </Entra>
        <Entra desde={anclas[2]}>
          <div style={{ alignSelf: "flex-start", marginLeft: 110, display: "flex", alignItems: "center", gap: 16, background: "#fff", color: COLOR.negro, fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 34, padding: "20px 32px", borderRadius: "28px 28px 28px 6px", boxShadow: GRAF.sombraTarjeta }}>
            <Check activo /> el plan que te conviene
          </div>
        </Entra>
      </Centro>
    </Fondo>
  );
};

export const ESCENA_POR_NOMBRE: Record<string, React.FC<Props>> = {
  coste: EscenaCoste,
  complicaciones: EscenaComplicaciones,
  cobertura: EscenaCobertura,
  ahorro: EscenaAhorro,
  plazo: EscenaPlazo,
  comenta: EscenaComenta,
};

export const Escena: React.FC<{ nombre: string; anclas: number[] }> = ({ nombre, anclas }) => {
  const C = ESCENA_POR_NOMBRE[nombre];
  if (!C) return <AbsoluteFill style={{ background: "magenta" }} />;
  return <C anclas={anclas} />;
};
