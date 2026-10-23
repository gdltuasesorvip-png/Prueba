import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BLOQUES, CTA, DURACION_TOTAL, DURACION_VOZ, PANTALLA_FINAL, SEGMENTOS, T } from "./datos/v7";
import { CARAS } from "./datos/caras_v7";
import "./fuentes";
import { Bokeh, Flash, Grano } from "./v3/Fx";
import { Final3 } from "./v3/Final3";
import { Escudo } from "./v3/Ilustraciones";
import { FuenteMontaje, VideoMontado } from "./v3/Montaje";
import { AZ, FUENTE, MONO, SERIF } from "./v3/paleta";
import { Subs3, type Bloque3 } from "./v3/Subs3";
import { backOut, easeIn, easeOut, ip } from "./v3/util";
import { elegir, type Rect } from "./v4/caras";
import { Brochazo, PinCae } from "./v4/Efectos4";
import { Confeti } from "./dlb2/Ilus2";
import { Estrellas } from "./v5/Efectos5";
import { AvionPancarta, BotonLike, Campanita, Corazones, DEG_AGUA, DEG_SOL, MarcoPostal, Nubes, Pasaporte, Suscribirse, VJ } from "./v7/Viaje";

export const calcularDuracionV7 = () => Math.ceil(DURACION_TOTAL * 30);
const fps = 30;
const F = (s: number) => Math.round(s * fps);
const ORIGEN = [540, 864];

// ---- Cámara: planos suaves (el vídeo viene de 360p, sin zooms grandes) ----
const PLANOS = [1.0, 1.1, 1.05, 1.16, 1.08];
const CORTES = [0, T.coruna - 0.1, T.familia, T.vean, T.panFin, T.hermano - 0.4, T.sobrina - 0.3, T.esposa - 0.9, T.disfrutando, T.comimos, T.entonces, T.like - 0.5, T.gracias, T.viejitos2 - 0.3, T.quiere];
const IMPACTOS = [T.viajeros, T.coruna, T.dieta, T.gracias, T.bebes3];
const POSTAL: [number, number] = [T.entonces, T.like - 0.6];

export const camara = (t: number, f = Math.round(t * fps)) => {
  let s = 1, r = 0, x = 0, blur = 0;
  let k = 0;
  for (let i = 0; i < CORTES.length; i++) if (t >= CORTES[i]) k = i;
  const c0 = CORTES[k];
  const fc = (t - c0) * fps;
  s = PLANOS[k % PLANOS.length] + 0.03 * ip(fc, [0, 120], [0, 1]);
  r = k % 3 === 2 ? -1 : k % 3 === 1 ? 0.8 : 0;
  if (k > 0 && fc < 6) {
    x += (k % 2 ? 1 : -1) * ip(fc, [0, 6], [90, 0], easeOut);
    blur = ip(fc, [0, 5], [6, 0]);
  }
  for (const ti of IMPACTOS) {
    const fi = (t - ti) * fps;
    if (fi >= 0 && fi < 12) {
      x += Math.sin(f * 2.6) * ip(fi, [0, 12], [16, 0]);
      s += ip(fi, [0, 10], [0.07, 0], easeOut);
    }
  }
  return { s, r, x, blur };
};
const CAM = (t: number) => camara(t);
const libre = (a: number, b: number, cands: Rect[]) => elegir(CARAS, a, b, cands, CAM);

const Camara: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const { s, r, x, blur } = camara(f / fps, f);
  return (
    <AbsoluteFill style={{ background: AZ.noche, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${x}px, 0px) scale(${s}) rotate(${r}deg)`, transformOrigin: `${ORIGEN[0]}px ${ORIGEN[1]}px`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---- Título gigante en el cielo, DETRÁS de ellos ----
const RECORTES: [number, number][] = [[0, 4.45], [43.45, 47.95]];
const enRecorte = (t: number) => RECORTES.some(([a, b]) => t >= a && t < b);
const Titulo: React.FC<{ arriba: string; abajo: string; desde: number }> = ({ arriba, abajo, desde }) => {
  const f = useCurrentFrame() - desde * 30;
  const l = (i: number) => ip(f - i * 5, [0, 10], [0, 1], backOut(1.8));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 150, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 150, lineHeight: 0.95, letterSpacing: -5, color: "transparent", WebkitTextStroke: "6px #fff", translate: `${(1 - l(0)) * -500}px 0`, opacity: Math.min(1, l(0) * 1.5) }}>{arriba}</div>
      <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 210, lineHeight: 0.95, letterSpacing: -9, color: VJ.turquesa, textShadow: `8px 8px 0 ${VJ.sol}, 0 0 60px ${AZ.real}`, translate: `${(1 - l(1)) * 500}px 0`, opacity: Math.min(1, l(1) * 1.5) }}>{abajo}</div>
    </div>
  );
};

const Video7: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / fps;
  const filtro = "contrast(1.08) saturate(1.16)";
  return (
    <>
      <AbsoluteFill style={{ filter: filtro }}>
        <VideoMontado />
      </AbsoluteFill>
      {enRecorte(t) ? (
        <>
          {t < 5 ? <Titulo arriba="LOS VIEJITOS" abajo="VIAJEROS" desde={0.1} /> : <Titulo arriba="LOS BEBÉS" abajo="VIAJEROS" desde={RECORTES[1][0]} />}
          <Img src={staticFile(`recorte_v7/f_${f}.webp`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", filter: filtro }} />
        </>
      ) : null}
    </>
  );
};

// ---- Piezas ----
const Aparece: React.FC<{ en: number; hasta: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ en, hasta, children, style }) => {
  const f = useCurrentFrame();
  const t = f / fps;
  if (t < en || t > hasta) return null;
  const p = ip(t, [en, en + 0.35], [0, 1], backOut(1.8));
  const q = ip(t, [hasta - 0.2, hasta], [1, 0]);
  return (
    <Sequence from={F(en)} layout="none">
      <div style={{ position: "absolute", scale: String(p), opacity: Math.min(1, p * 2) * q, ...style }}>{children}</div>
    </Sequence>
  );
};
const Chip: React.FC<{ children: React.ReactNode; fondo?: string; color?: string }> = ({ children, fondo = "rgba(4,11,31,0.78)", color = "#fff" }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: fondo, color, fontFamily: FUENTE, fontWeight: 900, fontSize: 40, padding: "12px 28px", borderRadius: 99, boxShadow: "0 14px 36px rgba(4,11,31,0.35)", whiteSpace: "nowrap" }}>{children}</div>
);
const EnVivo: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Chip>
      <span style={{ width: 20, height: 20, borderRadius: 99, background: VJ.sol, opacity: f % 30 < 18 ? 1 : 0.3, boxShadow: `0 0 16px ${VJ.sol}` }} />
      <span style={{ fontFamily: MONO, fontWeight: 400, fontSize: 30, letterSpacing: 4 }}>EN VIVO · A CORUÑA</span>
    </Chip>
  );
};
// Va dentro de <Aparece en={T.comimos}>: el tiempo local se pasa a absoluto.
const Lista: React.FC = () => {
  const t = T.comimos + useCurrentFrame() / fps;
  const items = [
    { en: T.comimos, e: "🍽️", x: "Comimos" },
    { en: T.tomamos, e: "🥂", x: "Tomamos" },
    { en: T.cafe, e: "☕", x: "Café" },
  ];
  return (
    <div style={{ position: "relative", width: 470, background: "rgba(247,250,255,0.96)", borderRadius: 34, padding: "20px 28px", boxShadow: "0 22px 60px rgba(4,11,31,0.4)", borderTop: `10px solid ${VJ.turquesa}` }}>
      <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: 4, color: AZ.gris }}>PLAN DE LA TARDE</div>
      {items.map((it) => (t >= it.en ? (
        <div key={it.x} style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10, scale: String(ip(t, [it.en, it.en + 0.25], [0.4, 1], backOut(2))), transformOrigin: "left center" }}>
          <div style={{ fontSize: 50 }}>{it.e}</div>
          <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 52, color: AZ.marino }}>{it.x}</div>
          <div style={{ marginLeft: "auto", width: 54, height: 54, borderRadius: 99, background: DEG_AGUA, color: "#fff", fontSize: 34, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</div>
        </div>
      ) : null))}
      {t >= T.dieta ? (
        <div style={{ position: "absolute", right: -40, bottom: -70 }}>
          <Sequence from={F(T.dieta - T.comimos)} layout="none"><Pasaporte titulo="A DIETA 😇" sub="SIEMPRE" color={AZ.real} rot={-12} /></Sequence>
        </div>
      ) : null}
      {t >= T.dieta + 0.55 ? <div style={{ position: "absolute", left: 10, bottom: -64, fontFamily: SERIF, fontStyle: "italic", fontSize: 46, color: "#fff", textShadow: "0 3px 12px rgba(4,11,31,0.8)", opacity: ip(t, [T.dieta + 0.55, T.dieta + 0.8], [0, 1]) }}>(…sí, claro 😅)</div> : null}
    </div>
  );
};
const Sol: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "relative", width: 300, height: 300 }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{ position: "absolute", left: 140, top: 10, width: 20, height: 70, borderRadius: 10, background: VJ.sol, transformOrigin: "10px 140px", rotate: `${i * 30 + f * 2}deg` }} />
      ))}
      <div style={{ position: "absolute", left: 60, top: 60, width: 180, height: 180, borderRadius: 999, background: DEG_SOL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 90, boxShadow: `0 0 60px ${VJ.sol}` }}>😎</div>
    </div>
  );
};

// Posiciones: todo arriba, en el cielo, sin tapar caras.
const R = (x: number, y: number, w: number, h: number): Rect => [x, y, w, h];
const ARRIBA = (w: number, h: number): Rect[] => [R(60, 150, w, h), R(1020 - w, 150, w, h), R(60, 360, w, h), R(1020 - w, 360, w, h), R(540 - w / 2, 150, w, h), R(60, 560, w, h), R(1020 - w, 560, w, h)];
const P = {
  vivo: libre(0.3, 4.4, [R(40, 40, 560, 70), R(480, 40, 560, 70)]),
  pin: libre(T.coruna - 0.05, T.familia + 0.5, ARRIBA(300, 420)),
  vista: libre(T.vean + 1.6, T.panFin, ARRIBA(420, 150)),
  cunada: libre(T.cunada, T.hermano - 0.45, ARRIBA(430, 230)),
  hermano: libre(T.hermano, T.sobrina - 0.35, ARRIBA(500, 230)),
  sobrina: libre(T.sobrina, T.esposa - 0.95, ARRIBA(430, 230)),
  esposa: libre(T.esposa - 0.9, T.disfrutando, ARRIBA(450, 230)),
  sol: libre(T.disfrutando, T.comimos - 0.1, ARRIBA(300, 300)),
  lista: libre(T.comimos, T.entonces, ARRIBA(470, 420)),
  redes: libre(T.like, T.gracias, [R(60, 200, 960, 220), R(60, 420, 960, 220), R(60, 120, 960, 220)]),
  gracias: libre(T.gracias, T.viejitos2 - 0.3, ARRIBA(700, 220)),
  sintonia: libre(T.quiere, T.vozFin, ARRIBA(640, 90)),
};

const Graficos: React.FC = () => {
  const t = useCurrentFrame() / fps;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Aparece en={0.3} hasta={4.4} style={{ left: P.vivo[0], top: P.vivo[1] }}><EnVivo /></Aparece>
      <Aparece en={T.bebes} hasta={4.4} style={{ left: 640, top: 700, rotate: "8deg" }}>
        <Chip fondo={DEG_SOL} color={AZ.marino}>👶 los bebés</Chip>
      </Aparece>
      <Aparece en={T.coruna - 0.05} hasta={T.familia + 0.5} style={{ left: P.pin[0], top: P.pin[1] }}>
        <PinCae etiqueta="A Coruña · España" />
      </Aparece>
      <Aparece en={T.vean + 1.6} hasta={T.panFin} style={{ left: P.vista[0], top: P.vista[1] }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, background: "rgba(4,11,31,0.75)", borderRadius: 30, padding: "16px 30px" }}>
          <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 54, color: "#fff" }}>VISTA <span style={{ color: VJ.sol }}>10/10</span></div>
          <Estrellas n={5} size={44} />
        </div>
      </Aparece>
      <Aparece en={T.cunada} hasta={T.hermano - 0.45} style={{ left: P.cunada[0], top: P.cunada[1] }}>
        <Pasaporte titulo={"LA CUÑADA\n+ SU HIJA"} sub="📸 FOTICO" color={AZ.real} rot={-7} />
      </Aparece>
      <Aparece en={T.hermano} hasta={T.sobrina - 0.35} style={{ left: P.hermano[0], top: P.hermano[1] }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start" }}>
          <Pasaporte titulo="MI HERMANO" sub="🕵️ MODO INCÓGNITO" color={AZ.marino} rot={6} />
          {t >= T.reconozcan ? <Chip fondo={DEG_SOL} color={AZ.marino}>identidad: ██████</Chip> : null}
        </div>
      </Aparece>
      <Aparece en={T.sobrina} hasta={T.esposa - 0.95} style={{ left: P.sobrina[0], top: P.sobrina[1] }}>
        <Pasaporte titulo="LA SOBRINA" sub="🤳 SELFIE" color={VJ.agua} rot={-5} />
      </Aparece>
      <Aparece en={T.esposa - 0.9} hasta={T.disfrutando} style={{ left: P.esposa[0], top: P.esposa[1] }}>
        <div style={{ position: "relative" }}>
          <Pasaporte titulo={"MI SEÑORA\nESPOSA"} sub="💙 LA JEFA" color={AZ.real} rot={5} />
          <div style={{ position: "absolute", left: 0, top: -260 }}><Corazones desde={0.3} ancho={450} alto={260} /></div>
        </div>
      </Aparece>
      <Aparece en={T.disfrutando} hasta={T.comimos - 0.1} style={{ left: P.sol[0], top: P.sol[1] }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Sol />
          <Chip fondo={DEG_SOL} color={AZ.marino}>tarde excelente</Chip>
        </div>
      </Aparece>
      <Aparece en={T.comimos} hasta={T.entonces} style={{ left: P.lista[0], top: P.lista[1] }}><Lista /></Aparece>
      <Aparece en={T.like} hasta={T.gracias} style={{ left: P.redes[0], top: P.redes[1], width: 960 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 26 }}>
          <BotonLike desde={0} />
          <Campanita desde={T.campanita - T.like} repique={T.campanita2 - T.like} />
          <Suscribirse desde={T.suscribirse - T.like} />
        </div>
      </Aparece>
      <Aparece en={T.gracias} hasta={T.viejitos2 - 0.3} style={{ left: P.gracias[0], top: P.gracias[1], width: 700 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 120, color: VJ.sol, letterSpacing: -4, textShadow: `6px 6px 0 ${AZ.real}` }}>¡GRACIAS!</div>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 64, color: "#fff", textShadow: "0 4px 16px rgba(4,11,31,0.7)" }}>nos vemos en la próxima 👋</div>
        </div>
      </Aparece>
      <Sequence from={F(T.gracias)} durationInFrames={70} layout="none"><Confeti desde={0} n={50} cx={540} cy={330} /></Sequence>
      <Aparece en={T.quiere} hasta={T.vozFin} style={{ left: P.sintonia[0], top: P.sintonia[1] }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <Chip>💙 se les quiere</Chip>
          {t >= T.sintonia ? <Chip fondo={DEG_AGUA}>📡 seguimos en sintonía</Chip> : null}
        </div>
      </Aparece>
    </AbsoluteFill>
  );
};

// ---- Postal ("Saludos desde A Coruña") ----
const ConPostal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useCurrentFrame() / fps;
  const p = ip(t, [POSTAL[0], POSTAL[0] + 0.5], [0, 1], easeOut) * ip(t, [POSTAL[1] - 0.4, POSTAL[1]], [1, 0], easeIn);
  return <MarcoPostal p={p}>{children}</MarcoPostal>;
};

// ---- Cierre ----
const EscenaCTA: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Brochazo duracion={16}>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${AZ.cielo} 0%, ${VJ.agua} 45%, ${AZ.real} 100%)` }}>
        <Bokeh seed={77} n={18} max={0.4} color="#ffffff" />
        <div style={{ position: "absolute", left: 0, right: 0, top: 330, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
          <div style={{ fontFamily: FUENTE, fontWeight: 900, fontSize: 104, color: "#fff", letterSpacing: -3, textShadow: `5px 5px 0 ${AZ.real}`, opacity: ip(f, [4, 12], [0, 1]) }}>¿Te vas de viaje?</div>
          <div style={{ position: "relative", scale: String(ip(f, [10, 22], [0.3, 1], backOut(2))) }}>
            <div style={{ fontSize: 210, translate: `${ip(f, [10, 60], [-40, 40])}px 0` }}>✈️</div>
            <div style={{ position: "absolute", right: -70, bottom: -10 }}><Escudo desde={0.6} size={150} color="#fff" color2={VJ.sol} /></div>
          </div>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 96, color: "#fff", opacity: ip(f, [18, 28], [0, 1]) }}>viaja <span style={{ color: VJ.sol }}>asegurado</span></div>
          <div style={{ background: DEG_SOL, color: AZ.marino, fontFamily: FUENTE, fontWeight: 900, fontSize: 50, padding: "20px 46px", borderRadius: 99, boxShadow: "0 20px 60px rgba(4,11,31,0.35)", scale: String(ip(f, [30, 40], [0, 1], backOut(2)) * (1 + 0.03 * Math.sin(f / 4))) }}>Escríbeme y te asesoro 💬</div>
        </div>
      </AbsoluteFill>
    </Brochazo>
  );
};

const SOL_PALABRAS = /viajeros|bebés|dieta|café|like|campanita|gracias|excelente|selfie|fotico/i;
const enPostal = (t: number) => t >= POSTAL[0] && t < POSTAL[1];
const BLOQUES3: Bloque3[] = BLOQUES.map((b) => {
  const postal = enPostal((b.inicio + b.fin) / 2);
  const r = postal ? R(0, 1495, 0, 0) : elegir(CARAS, b.inicio, b.fin, [1770, 1620, 600, 430].map((y) => [100, y - 105, 880, 210] as Rect), CAM);
  const sol = b.palabras.some((p) => p.destacada && SOL_PALABRAS.test(p.texto));
  return { palabras: b.palabras, inicio: b.inicio, fin: b.fin, fondo: "busto", modo: "video", y: r[1] + 105, oculto: b.inicio < 4.3, pill: sol ? "sol" : "aqua" };
});

export const V7: React.FC = () => {
  const { fps: FPS } = useVideoConfig();
  const finVoz = Math.ceil(DURACION_VOZ * FPS);
  const sfx = (n: string, t: number, v = 0.35) => <Sequence key={`${n}${t}`} from={Math.max(0, F(t))} layout="none"><Audio src={staticFile(`sfx/${n}.wav`)} volume={v} /></Sequence>;
  return (
    <FuenteMontaje.Provider value={{ src: "v7.mp4", segmentos: SEGMENTOS }}>
      <AbsoluteFill style={{ background: AZ.noche }}>
        <ConPostal>
          <Camara>
            <Video7 />
          </Camara>
          <Graficos />
        </ConPostal>
        {/* transiciones */}
        <Sequence from={F(T.vean)} durationInFrames={F(2.4)} layout="none"><AvionPancarta duracion={F(2.4)} texto="VEAN LA VISTA" y={260} /></Sequence>
        <Sequence from={F(T.panFin) - 10} durationInFrames={20} layout="none"><Nubes duracion={20} /></Sequence>
        <Sequence from={F(T.viejitos2 - 0.3) - 10} durationInFrames={20} layout="none"><Nubes duracion={20} /></Sequence>
        <Sequence from={F(T.selfie2)} durationInFrames={5} layout="none"><Flash duracion={5} color="#ffffff" /></Sequence>
        <Sequence from={F(T.selfie1)} durationInFrames={5} layout="none"><Flash duracion={5} color="#ffffff" /></Sequence>
        <Sequence from={F(T.viajeros)} durationInFrames={5} layout="none"><Flash duracion={5} color="#e8fffb" /></Sequence>
        <Sequence name="Subtítulos" from={0} durationInFrames={finVoz}><Subs3 bloques={BLOQUES3} /></Sequence>
        <Sequence name="CTA" from={finVoz} durationInFrames={F(CTA)}><EscenaCTA /></Sequence>
        <Sequence name="Pantalla final" from={finVoz + F(CTA)} durationInFrames={F(PANTALLA_FINAL)}>
          <Final3 marca="Tu asesor integral VIP" avatar="marca/avatar.jpg" cuentas={[{ red: "instagram", usuario: "@tuagentedesegurosdlb" }, { red: "tiktok", usuario: "@tuasesorintegralvip" }]} />
        </Sequence>
        <div style={{ position: "absolute", left: 0, top: 0, height: 10, width: `${Math.min(1, useCurrentFrame() / F(DURACION_VOZ)) * 100}%`, background: `linear-gradient(90deg, ${AZ.real}, ${VJ.turquesa}, ${VJ.sol})` }} />
        <Grano opacidad={0.04} />
        {sfx("whoosh", 0.05, 0.35)}
        {sfx("pop", 0.3, 0.25)}
        {sfx("boom", T.viajeros, 0.45)}
        {sfx("pop", T.bebes, 0.3)}
        {sfx("boom", T.coruna, 0.4)}
        {sfx("whoosh", T.vean, 0.5)}
        {sfx("ding", T.vean + 1.6, 0.3)}
        {sfx("whoosh", T.panFin - 0.3, 0.4)}
        {sfx("boom", T.cunada, 0.35)}
        {sfx("zap", T.selfie1, 0.3)}
        {sfx("boom", T.hermano, 0.35)}
        {sfx("pop", T.reconozcan, 0.3)}
        {sfx("boom", T.sobrina, 0.35)}
        {sfx("zap", T.selfie2, 0.3)}
        {sfx("boom", T.esposa - 0.9, 0.35)}
        {sfx("sube", T.esposa - 0.6, 0.3)}
        {sfx("ding", T.disfrutando, 0.3)}
        {sfx("pop", T.comimos, 0.3)}
        {sfx("pop", T.tomamos, 0.3)}
        {sfx("pop", T.cafe, 0.3)}
        {sfx("boom", T.dieta, 0.45)}
        {sfx("whoosh", T.entonces - 0.1, 0.4)}
        {sfx("whoosh", POSTAL[1] - 0.4, 0.4)}
        {sfx("pop", T.like, 0.35)}
        {sfx("ding", T.campanita, 0.35)}
        {sfx("pop", T.suscribirse + 0.45, 0.35)}
        {sfx("ding", T.campanita2, 0.35)}
        {sfx("boom", T.gracias, 0.4)}
        {sfx("whoosh", T.viejitos2 - 0.4, 0.4)}
        {sfx("boom", T.bebes3, 0.4)}
        {sfx("sube", T.quiere, 0.3)}
        {sfx("whoosh", DURACION_VOZ - 0.1, 0.45)}
        {sfx("boom", DURACION_VOZ + 0.4, 0.4)}
      </AbsoluteFill>
    </FuenteMontaje.Provider>
  );
};
