"""Lista de edición del vídeo v4 (la moto). Tramos con velocidad propia + cortes de silencio en el diálogo."""
import json, sys, re
WORDS, SIL, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
FPS = 30
words = [dict(w, w=w["word"].strip()) for w in json.load(open(WORDS))["words"]]
sil = [tuple(map(float, l.split()[:2])) for l in open(SIL) if float(l.split()[2]) > 0.30]

# (src0, src1, velocidad, audio, etiqueta)
TRAMOS = [
    (19.42, 20.80, 1.0, True, "gancho"),      # "casi me mato"
    (1.00, 6.55, 2.2, False, "llegada"),      # entra en moto (clip 1)
    (6.62, 15.40, 2.0, False, "aparca"),      # se acerca y aparca (clip 2)
    (15.40, 17.60, 1.7, False, "casco0"),     # se pelea con el casco (acelerado)
    (17.60, 22.10, 1.0, True, "casco"),       # "¡Uf! Gracias a Dios, casi me mato."
    (34.95, 38.60, 1.0, True, "aqui"),        # "¿Verdad? ¡Claro, es aquí! ¡Vamos!"
    (38.60, 42.25, 2.4, False, "camina"),
    (42.30, 46.05, 2.0, False, "pasillo"),    # clip 4
    (46.10, 48.15, 1.6, False, "puerta"),     # clip 5: abre la puerta
    (48.15, 70.70, 1.0, True, "dialogo"),     # conversación (con cortes de silencio)
]
segs = []
for a, b, v, aud, et in TRAMOS:
    if et != "dialogo":
        segs.append(dict(src0=a, src1=b, vel=v, audio=aud, tramo=et)); continue
    cur = a
    for s0, s1 in sil:
        x0, x1 = max(s0 + 0.12, a), min(s1 - 0.12, b)
        if x1 <= x0 or x1 <= cur or x0 >= b: continue
        if x0 > cur: segs.append(dict(src0=cur, src1=x0, vel=1.0, audio=True, tramo=et))
        cur = max(cur, x1)
    if cur < b: segs.append(dict(src0=cur, src1=b, vel=1.0, audio=True, tramo=et))
out = 0.0
for s in segs:
    s["src0"] = round(s["src0"] * FPS) / FPS; s["src1"] = round(s["src1"] * FPS) / FPS
    s["frames"] = max(1, round((s["src1"] - s["src0"]) / s["vel"] * FPS))
    s["out0"] = round(out, 4); out += s["frames"] / FPS
DUR = out

def a_salida(t, tramo=None):
    for s in segs:
        if tramo and s["tramo"] != tramo: continue
        if s["src0"] - 0.02 <= t <= s["src1"] + 0.02:
            return s["out0"] + (min(max(t, s["src0"]), s["src1"]) - s["src0"]) / s["vel"]
    best = min((s for s in segs if not tramo or s["tramo"] == tramo), key=lambda s: min(abs(s["src0"] - t), abs(s["src1"] - t)))
    e = best["src0"] if abs(best["src0"] - t) < abs(best["src1"] - t) else best["src1"]
    return best["out0"] + (e - best["src0"]) / best["vel"]

def tramo_de(t):
    for a, b, v, aud, et in TRAMOS[1:]:
        if a - 0.05 <= t <= b + 0.05: return et
    return None

# Hablantes: asesoría (Gabriela) / cliente
ASESORIA = [(48.0, 49.3), (50.45, 53.57), (55.3, 56.5)]
def hablante(t): return "asesoria" if any(a <= t < b for a, b in ASESORIA) else "cliente"

CLAVE = set("mato dios aquí vamos adelante gaby estás recibirte atenderme pasó moto carro tumba gabriela protegió nada asesoría producto conviene accidentes".split())
def limpio(x): return re.sub(r"[¿?¡!.,…]", "", x).lower()

usadas = [w for w in words if tramo_de(w["start"]) in ("casco", "aqui", "dialogo") and w["start"] > 17.0]
bloques, act = [], []
for w in usadas:
    if act:
        p = act[-1]
        if (w["start"] - p["end"] > 0.35 or re.search(r"[.?!]$", p["w"]) or len(act) >= 4 or (p["w"].endswith(",") and len(act) >= 2)
                or hablante(w["start"]) != hablante(act[0]["start"])):
            bloques.append(act); act = []
    act.append(w)
if act: bloques.append(act)
res = []
for b in bloques:
    tr = tramo_de(b[0]["start"])
    c = [j for j, w in enumerate(b) if limpio(w["w"]) in CLAVE]
    dest = max(c, key=lambda j: len(b[j]["w"])) if c else (0 if len(b) == 1 else None)
    pal = [{"texto": w["w"], "inicio": round(a_salida(w["start"], tr), 3), "fin": round(a_salida(w["end"], tr), 3), **({"destacada": True} if j == dest else {})} for j, w in enumerate(b)]
    res.append({"palabras": pal, "hablante": hablante(b[0]["start"]), "tramo": tr})
for k, b in enumerate(res):
    b["inicio"] = b["palabras"][0]["inicio"]
for k, b in enumerate(res):
    last = b["palabras"][-1]["fin"]
    sig = res[k + 1]["inicio"] - 2 / FPS if k + 1 < len(res) else last + 0.6
    b["fin"] = round(max(min(sig, last + 0.9), last + 3 / FPS), 3)

def W(txt, desde):
    for w in words:
        if limpio(w["w"]) == limpio(txt) and w["start"] >= desde - 0.01: return w
    raise SystemExit(f"no encontrada {txt}")
def t(txt, desde, tramo=None): return round(a_salida(W(txt, desde)["start"], tramo or tramo_de(W(txt, desde)["start"])), 3)

ini = {s["tramo"]: s["out0"] for s in reversed(segs)}
fin = {}
for s in segs: fin[s["tramo"]] = round(s["out0"] + s["frames"] / FPS, 3)
T = {
    "ganchoFin": fin["gancho"], "llegada": ini["llegada"], "aparca": ini["aparca"], "casco0": ini["casco0"], "casco": ini["casco"], "aqui": ini["aqui"],
    "camina": ini["camina"], "pasillo": ini["pasillo"], "puerta": ini["puerta"], "dialogo": ini["dialogo"],
    "uf": t("¡Uf!", 17), "mato": t("mato.", 19.9, "casco"), "claro": t("¡Claro,", 36), "vamos": t("¡Vamos!", 37),
    "adelante": t("¡Adelante,", 48), "hola": t("¡Hola,", 49.5), "cuentame": t("Cuéntame,", 55), "moto": t("moto", 58),
    "carro": t("carro", 59), "tumba": t("tumba,", 59.5), "gabriela": t("Gabriela.", 60), "protegio": t("protegió", 62),
    "nada": t("nada.", 64.5), "asesoria": t("asesoría,", 65.4), "producto": t("producto", 67.7), "accidentes": t("accidentes", 69.4),
    "motoFin": t("moto.", 70.1), "vozFin": round(DUR, 3),
}
CTA = 3.2; FINAL = 4.0
total = DUR + CTA + FINAL
ts = lambda v: json.dumps(v, ensure_ascii=False)
open(OUT, "w").write(f"""// GENERADO por scripts/build_v4.py — no editar a mano.
export const DURACION_VOZ = {DUR:.4f};
export const CTA = {CTA};
export const PANTALLA_FINAL = {FINAL};
export const DURACION_TOTAL = {total:.4f};
export type SegV4 = {{ src0: number; src1: number; vel: number; audio: boolean; tramo: string; frames: number; out0: number }};
export const SEGMENTOS: SegV4[] = {ts(segs)};
export const T = {ts(T)};
export type BloqueV4 = {{ palabras: {{ texto: string; inicio: number; fin: number; destacada?: boolean }}[]; inicio: number; fin: number; hablante: "asesoria" | "cliente"; tramo: string | null }};
export const BLOQUES: BloqueV4[] = {ts(res)};
""")
print(f"segmentos={len(segs)} voz={DUR:.2f}s total={total:.2f}s")
for s in segs: print(f"  {s['tramo']:8s} src {s['src0']:6.2f}-{s['src1']:6.2f} x{s['vel']} out {s['out0']:6.2f} ({s['frames']} f)")
for b in res: print(f"[{b['inicio']:6.2f}-{b['fin']:6.2f}] {b['hablante'][:3]} {b['tramo']:8s} " + " ".join(("*"+p["texto"]+"*") if p.get("destacada") else p["texto"] for p in b["palabras"]))
print(json.dumps(T))
