import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Pip } from "../v3/Escenas3";
import { Bokeh, Destello, FondoAzul } from "../v3/Fx";
import { Escudo, Cursor } from "../v3/Ilustraciones";
import { AZ, DEGRADADO, FUENTE, MONO, SERIF } from "../v3/paleta";
import { backOut, easeOut, ip } from "../v3/util";
import { Alcancia, Cama, Colchon, Documento, Firma, Hebilla, PinRed } from "./Ilus2";

export type PropsE = { anclas: number[]; offsetFrames: number; duracionFrames: number };
const usarT = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return f / fps;
};
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const Pop: React.FC<{ en: number; children: React.ReactNode; style?: React.CSSProperties; desde?: "abajo" | "izq" | "der" | "rotX" | "zoom" }> = ({ en, children, style, desde = "abajo" }) => {
  const t = usarT();
  if (t < en) return null;
  const p = ip(t, [en, en + 0.35], [0, 1], backOut(1.7));
  const q = ip(t, [en, en + 0.2], [0, 1]);
  const tr: React.CSSProperties =
    desde === "rotX"
      ? { transform: `perspective(1200px) rotateX(${(1 - p) * 85}deg)`, transformOrigin: "50% 0%" }
      : desde === "zoom"
        ? { scale: String(0.2 + 0.8 * p) }
        : { translate: desde === "abajo" ? `0 ${(1 - p) * 60}px` : desde === "izq" ? `${(p - 1) * 140}px 0` : `${(1 - p) * 140}px 0`, scale: String(0.85 + 0.15 * p) };
  return <div style={{ opacity: q, filter: `blur(${(1 - q) * 8}px)`, ...tr, ...style }}>{children}</div>;
};
const Sfx: React.FC<{ n: string; en: number; v?: number }> = ({ n, en, v = 0.35 }) => {
  const { fps } = useVideoConfig();
  return <Audio src={staticFile(`sfx/${n}.wav`)} from={Math.max(0, Math.round(en * fps))} volume={v} />;
};
const Tarjeta: React.FC<{ oscuro?: boolean; children: React.ReactNode; style?: React.CSSProperties }> = ({ oscuro, children, style }) => (
  <div style={{ background: oscuro ? "rgba(16,39,94,0.7)" : "rgba(255,255,255,0.94)", border: oscuro ? "1.5px solid rgba(79,209,255,0.25)" : "1.5px solid rgba(14,86,246,0.10)", borderRadius: 30, boxShadow: oscuro ? "0 30px 80px rgba(0,0,0,0.45)" : "0 24px 70px rgba(14,40,120,0.14)", padding: 34, color: oscuro ? "#fff" : AZ.marino, fontFamily: FUENTE, ...style }}>{children}</div>
);
const Titulo: React.FC<{ children: React.ReactNode; oscuro?: boolean; top?: number }> = ({ children, oscuro, top = 250 }) => (
  <div style={{ position: "absolute", left: 70, right: 330, top, fontFamily: FUENTE, fontWeight: 900, fontSize: 64, lineHeight: 1.02, letterSpacing: -2, color: oscuro ? "#fff" : AZ.marino }}>{children}</div>
);
const Marca: React.FC<{ ok: boolean; t0: number }> = ({ ok, t0 }) => {
  const t = usarT();
  const giro = ok ? ip(t, [t0, t0 + 0.3], [180, 0], easeOut) : 0;
  return (
    <div style={{ width: 64, height: 64, borderRadius: 99, background: ok ? DEGRADADO : AZ.marino, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 38, transform: `perspective(400px) rotateY(${giro}deg)`, flexShrink: 0 }}>{ok ? "✓" : "✕"}</div>
  );
};

// 1 · ¿Por qué un seguro no paga? (claro)
export const Fallas: React.FC<PropsE> = ({ anclas, offsetFrames }) => {
  const t = usarT();
  const [aDoc, aDecl, aClin, aGar, aAses, aPasa] = anclas;
  const items: [string, string, number, React.FC<{ desde: number; size?: number; color?: string }>][] = [
    ["Documentación incompleta", "falta un papel y se cae el reembolso", aDoc, Documento],
    ["Declaraciones omitidas", "no declarar algo en la solicitud", aDecl, Firma],
    ["Clínica fuera de la red", "acudir donde tu póliza no cubre", aClin, PinRed],
  ];
  const sello = ip(t, [aPasa, aPasa + 0.3], [0, 1], backOut(2.4));
  return (
    <FondoAzul>
      {items.map(([, , a], i) => <Sfx key={i} n="pop" en={a} />)}
      <Sfx n="sube" en={aGar} v={0.3} />
      {items.map((_, i) => <Sfx key={`d${i}`} n="ding" en={aAses + i * 0.18} v={0.22} />)}
      <Sfx n="boom" en={aPasa} v={0.45} />
      <Pip offsetFrames={offsetFrames} />
      <div style={{ position: "absolute", left: 70, top: 150, fontFamily: MONO, fontSize: 24, letterSpacing: 3, color: AZ.real }}>● CUANDO UN SEGURO NO PAGA…</div>
      <Titulo>…casi siempre es por <span style={{ color: AZ.real }}>fallas en el proceso</span></Titulo>
      <div style={{ position: "absolute", left: 70, right: 70, top: 520, display: "flex", flexDirection: "column", gap: 22 }}>
        {items.map(([tit, sub, a, Ic], i) => (
          <Pop key={tit} en={a} desde="rotX">
            <Tarjeta style={{ display: "flex", alignItems: "center", gap: 26, padding: "24px 30px" }}>
              <div style={{ width: 110, height: 110, borderRadius: 24, background: AZ.niebla, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ic desde={a} size={92} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 40, textDecoration: t >= aAses + i * 0.18 ? `line-through 5px ${AZ.cian}` : undefined }}>{tit}</div>
                <div style={{ fontFamily: MONO, fontSize: 20, color: AZ.gris, marginTop: 6 }}>{sub}</div>
              </div>
              <Marca ok={t >= aAses + i * 0.18} t0={aAses + i * 0.18} />
            </Tarjeta>
          </Pop>
        ))}
      </div>
      {t >= aGar ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1110, display: "flex", justifyContent: "center", alignItems: "center", gap: 24 }}>
          <Pop en={aGar} desde="zoom">
            <Escudo desde={aGar} size={150} />
          </Pop>
          <Pop en={aGar + 0.15} desde="der">
            <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 46, color: AZ.marino, lineHeight: 1.05 }}>Con buena asesoría<br /><span style={{ color: AZ.real }}>eso no pasa</span></div>
          </Pop>
        </div>
      ) : null}
      {t >= aPasa ? (
        <div style={{ position: "absolute", right: 60, top: 1010, rotate: "-9deg", scale: String(0.5 + 0.5 * sello), opacity: Math.min(1, sello), border: `7px solid ${AZ.real}`, color: AZ.real, borderRadius: 16, padding: "6px 22px", fontFamily: FUENTE, fontWeight: 900, fontSize: 48, background: "rgba(247,250,255,0.92)" }}>GARANTIZADO</div>
      ) : null}
    </FondoAzul>
  );
};

// 2 · ¿Cuánto cuesta una hospitalización? (oscuro)
export const Costo: React.FC<PropsE> = ({ anclas, offsetFrames }) => {
  const t = usarT();
  const f = useCurrentFrame();
  const [aHosp, aVen, a5, a30, aMas] = anclas;
  let v = 0;
  if (t >= a5) v = ip(t, [a5, a5 + 0.6], [0, 5000], easeOut);
  if (t >= a30) v = ip(t, [a30, a30 + 0.7], [5000, 30000], easeOut);
  const barra = v / 30000;
  const mas = ip(t, [aMas, aMas + 0.3], [0, 1], backOut(2.5));
  const temblor = t > aMas && t < aMas + 0.4 ? Math.sin(f * 2.4) * 12 : 0;
  return (
    <FondoAzul oscuro>
      <Bokeh seed={12} n={22} max={0.4} />
      <Sfx n="pop" en={aHosp} />
      <Sfx n="sube" en={a5} v={0.35} />
      <Sfx n="sube" en={a30} v={0.45} />
      <Sfx n="boom" en={aMas} v={0.5} />
      <Pip offsetFrames={offsetFrames} />
      <div style={{ position: "absolute", left: 70, top: 150, fontFamily: MONO, fontSize: 24, letterSpacing: 3, color: AZ.cian }}>● HOSPITALIZACIÓN SERIA</div>
      <Titulo oscuro>¿Cuánto cuesta en <span style={{ color: AZ.cian }}>Venezuela</span>?</Titulo>
      <div style={{ position: "absolute", left: 0, right: 0, top: 470, display: "flex", justifyContent: "center" }}>
        <Pop en={aHosp - 0.05} desde="zoom">
          <Cama desde={aHosp} size={520} />
        </Pop>
      </div>
      <div style={{ position: "absolute", left: 70, right: 70, top: 830, translate: `${temblor}px 0` }}>
        {t >= a5 ? (
          <Tarjeta oscuro style={{ padding: "34px 40px" }}>
            <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: 2, color: AZ.cielo }}>PUEDES GASTAR ENTRE 5.000 Y…</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 150, lineHeight: 1, letterSpacing: -5, color: "#fff", fontVariantNumeric: "tabular-nums", textShadow: `0 0 50px ${AZ.cian}88` }}>{fmt(v)}</div>
              <div style={{ fontWeight: 900, fontSize: 80, color: AZ.cian }}>$</div>
              {t >= aMas ? <div style={{ fontWeight: 900, fontSize: 130, color: AZ.cian, scale: String(mas), marginLeft: 8 }}>+</div> : null}
            </div>
            <div style={{ position: "relative", height: 26, marginTop: 24, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${barra * 100}%`, background: DEGRADADO, boxShadow: `0 0 30px ${AZ.cian}` }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 20, color: AZ.gris, marginTop: 10 }}>
              <span>0</span><span>5.000 $</span><span>30.000 $ o más</span>
            </div>
          </Tarjeta>
        ) : null}
      </div>
      {t >= aMas ? (
        <AbsoluteFill style={{ opacity: ip(t, [aMas, aMas + 0.2, aMas + 1], [0, 1, 0]) }}>
          <Destello duracion={30} seed={13} />
        </AbsoluteFill>
      ) : null}
    </FondoAzul>
  );
};

// 3 · Rumor = no ponerse el cinturón (claro)
export const Cinturon: React.FC<PropsE> = ({ anclas, offsetFrames }) => {
  const t = usarT();
  const [aRumor, aCint, aAcc, aCint2, aProt] = anclas;
  const tachado = ip(t, [aRumor + 0.2, aRumor + 0.6], [0, 1], easeOut);
  const sello = ip(t, [aProt, aProt + 0.3], [0, 1], backOut(2.4));
  return (
    <FondoAzul>
      <Sfx n="whoosh" en={aRumor + 0.2} v={0.3} />
      <Sfx n="boom" en={aCint} v={0.4} />
      <Sfx n="pop" en={aAcc} />
      <Sfx n="ding" en={aProt} v={0.35} />
      <Pip offsetFrames={offsetFrames} />
      <div style={{ position: "absolute", left: 70, top: 150, fontFamily: MONO, fontSize: 24, letterSpacing: 3, color: AZ.real }}>● ES COMO SI…</div>
      <div style={{ position: "absolute", left: 70, right: 70, top: 300 }}>
        <Pop en={aRumor - 0.3} desde="izq">
          <Tarjeta style={{ position: "relative" }}>
            <div style={{ fontFamily: MONO, fontSize: 22, color: AZ.gris, letterSpacing: 2 }}>RUMOR</div>
            <div style={{ fontWeight: 900, fontSize: 52, marginTop: 6 }}>"El seguro no paga"</div>
            <div style={{ position: "absolute", left: 30, top: "58%", height: 8, width: `${tachado * 88}%`, background: AZ.real, borderRadius: 9, rotate: "-3deg" }} />
          </Tarjeta>
        </Pop>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 590, textAlign: "center", fontFamily: SERIF, fontStyle: "italic", fontSize: 120, color: AZ.real, opacity: ip(t, [aRumor + 0.5, aRumor + 0.8], [0, 1]) }}>=</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 760, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <Pop en={aCint - 0.6} desde="zoom">
          <Hebilla clic={aCint2} size={640} />
        </Pop>
        <Pop en={aCint - 0.4}>
          <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 48, color: AZ.marino, textAlign: "center" }}>no ponerte el <span style={{ color: AZ.real }}>cinturón</span></div>
        </Pop>
      </div>
      {t >= aProt ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1150, display: "flex", justifyContent: "center" }}>
          <div style={{ rotate: "-6deg", scale: String(0.5 + 0.5 * sello), opacity: Math.min(1, sello), background: DEGRADADO, color: "#fff", fontFamily: FUENTE, fontWeight: 900, fontSize: 56, padding: "12px 36px", borderRadius: 22, boxShadow: `0 20px 60px ${AZ.real}66` }}>Te protege ✓</div>
        </div>
      ) : null}
    </FondoAzul>
  );
};

// 4 · Encuesta: ¿colchón o patrimonio? (oscuro)
export const Encuesta: React.FC<PropsE> = ({ anclas, offsetFrames, duracionFrames }) => {
  const t = usarT();
  const f = useCurrentFrame();
  const [aPref, aColch, aProt, aPatr] = anclas;
  const toque = aPatr + 0.25;
  const votado = t >= toque;
  const pct = ip(t, [toque, toque + 0.8], [0, 1], easeOut);
  const cx = ip(t, [aProt, toque], [880, 660], easeOut);
  const cy = ip(t, [aProt, toque], [1320, 1010], easeOut);
  const opt = (txt: string, ic: React.ReactNode, gana: boolean, aparece: number, porcentaje: number) => (
    <Pop en={aparece} desde={gana ? "der" : "izq"}>
      <div style={{ position: "relative", height: 150, borderRadius: 34, background: "rgba(255,255,255,0.08)", border: `2px solid ${gana && votado ? AZ.cian : "rgba(255,255,255,0.18)"}`, overflow: "hidden", display: "flex", alignItems: "center", gap: 22, padding: "0 30px" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${votado ? porcentaje * pct : 0}%`, background: gana ? DEGRADADO : "rgba(255,255,255,0.12)" }} />
        <div style={{ position: "relative", width: 110, display: "flex", justifyContent: "center" }}>{ic}</div>
        <div style={{ position: "relative", flex: 1, fontFamily: FUENTE, fontWeight: 900, fontSize: 42, color: "#fff" }}>{txt}</div>
        {votado ? <div style={{ position: "relative", fontFamily: FUENTE, fontWeight: 900, fontSize: 46, color: "#fff" }}>{Math.round(porcentaje * pct)}%</div> : null}
      </div>
    </Pop>
  );
  return (
    <FondoAzul oscuro>
      <Bokeh seed={21} n={24} max={0.45} />
      <Sfx n="pop" en={aColch} />
      <Sfx n="pop" en={aPatr} />
      <Sfx n="ding" en={toque} v={0.4} />
      <Pip offsetFrames={offsetFrames} />
      <div style={{ position: "absolute", left: 70, right: 70, top: 300 }}>
        <Pop en={0.05} desde="zoom">
          <div style={{ borderRadius: 44, padding: "40px 36px", background: "rgba(10,26,63,0.75)", border: `2px solid ${AZ.cian}55`, boxShadow: `0 40px 100px rgba(0,0,0,0.5), 0 0 80px ${AZ.real}44` }}>
            <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: AZ.cian, textAlign: "center" }}>ENCUESTA</div>
            <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 70, color: "#fff", textAlign: "center", margin: "10px 0 34px", scale: String(t >= aPref ? 1 + 0.03 * Math.sin(f / 5) : 1) }}>¿Y tú qué prefieres?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {opt("Guardar el dinero bajo el colchón", <Colchon desde={aColch} size={110} />, false, aColch - 0.1, 9)}
              {opt("Proteger tu patrimonio con un seguro", <Escudo desde={aProt} size={70} />, true, aProt - 0.1, 91)}
            </div>
          </div>
        </Pop>
      </div>
      {t >= aProt && t < toque + 0.8 ? (
        <div style={{ position: "absolute", left: cx, top: cy, scale: t >= toque && t < toque + 0.12 ? "0.85" : "1" }}>
          <Cursor size={100} />
        </div>
      ) : null}
      <span style={{ display: "none" }}>{duracionFrames}</span>
    </FondoAzul>
  );
};

// 5 · DM (oscuro): móvil con conversación
export const DM: React.FC<PropsE & { usuario: string }> = ({ anclas, offsetFrames, usuario }) => {
  const t = usarT();
  const f = useCurrentFrame();
  const [aAses, aCont, aEsc, aConv] = anclas;
  const msg = "Hola, quiero asesoría para mi seguro";
  const n = Math.max(0, Math.min(msg.length, Math.floor((t - aCont) * 30)));
  const enviado = t >= aEsc + 0.2;
  return (
    <FondoAzul oscuro>
      <Bokeh seed={31} n={24} max={0.45} />
      <Sfx n="pop" en={aEsc + 0.2} />
      <Sfx n="ding" en={aConv} v={0.4} />
      <Pip offsetFrames={offsetFrames} x={70} y={130} size={200} />
      <div style={{ position: "absolute", left: 300, top: 160, fontFamily: FUENTE, fontWeight: 900, fontSize: 56, color: "#fff", lineHeight: 1.05 }}>
        Escríbeme<br /><span style={{ color: AZ.cian }}>al DM</span>
      </div>
      <div style={{ position: "absolute", left: 540 - 290, top: 420, width: 580, height: 900, borderRadius: 70, background: AZ.noche, boxShadow: `0 0 0 14px #0b1430, 0 40px 120px rgba(0,0,0,0.6), 0 0 90px ${AZ.real}55`, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "50px 30px 22px", borderBottom: "1.5px solid rgba(255,255,255,0.1)" }}>
          <div style={{ width: 70, height: 70, borderRadius: 99, padding: 4, background: `conic-gradient(from ${f * 4}deg, ${AZ.cian}, ${AZ.real}, ${AZ.cian})` }}>
            <Img src={staticFile("marca/avatar.jpg")} style={{ width: "100%", height: "100%", borderRadius: 99, objectFit: "cover" }} />
          </div>
          <div style={{ fontFamily: FUENTE, color: "#fff" }}>
            <div style={{ fontWeight: 900, fontSize: 30 }}>{usuario}</div>
            <div style={{ fontSize: 22, color: AZ.cielo }}>{t >= aConv - 0.6 && t < aConv ? "escribiendo…" : "activo ahora"}</div>
          </div>
        </div>
        <div style={{ position: "absolute", left: 24, right: 24, top: 180, display: "flex", flexDirection: "column", gap: 18 }}>
          <Pop en={aAses} desde="izq" style={{ alignSelf: "flex-start" }}>
            <div style={{ maxWidth: 420, background: "rgba(255,255,255,0.1)", color: "#fff", fontFamily: FUENTE, fontWeight: 700, fontSize: 30, padding: "18px 24px", borderRadius: "26px 26px 26px 8px" }}>¿Necesitas asesoría con tu seguro?</div>
          </Pop>
          {enviado ? (
            <Pop en={aEsc + 0.2} desde="der" style={{ alignSelf: "flex-end" }}>
              <div style={{ maxWidth: 420, background: DEGRADADO, color: "#fff", fontFamily: FUENTE, fontWeight: 800, fontSize: 30, padding: "18px 24px", borderRadius: "26px 26px 8px 26px" }}>{msg}</div>
            </Pop>
          ) : null}
          <Pop en={aConv} desde="izq" style={{ alignSelf: "flex-start" }}>
            <div style={{ maxWidth: 420, background: "rgba(255,255,255,0.1)", color: "#fff", fontFamily: FUENTE, fontWeight: 800, fontSize: 30, padding: "18px 24px", borderRadius: "26px 26px 26px 8px" }}>¡Conversamos! ✓</div>
          </Pop>
        </div>
        <div style={{ position: "absolute", left: 22, right: 22, bottom: 28, height: 76, borderRadius: 99, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", padding: "0 28px", fontFamily: FUENTE, fontWeight: 700, fontSize: 26, color: n > 0 && !enviado ? "#fff" : "rgba(255,255,255,0.45)" }}>
          {n > 0 && !enviado ? msg.slice(0, n) : "Mensaje…"}
        </div>
      </div>
      <span style={{ display: "none" }}>{offsetFrames}</span>
    </FondoAzul>
  );
};
