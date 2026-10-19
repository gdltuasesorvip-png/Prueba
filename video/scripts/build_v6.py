"""Lista de edición del vídeo v6 (testimonio: Gabi entrevista a Luisa).
Uso: python build_v6.py words.json salida.ts
Gancho en frío con la última pregunta ("¿qué es no tener un seguro?" — "Miedo."), rebobinado y entrevista completa
sin pausas, y cierre con el "Miedo. Gracias Luisa." Los cortes salen de los huecos entre palabras (la voz de Luisa es
muy baja para detectar silencios por volumen).
"""
import json, sys, re
WORDS, OUT = sys.argv[1], sys.argv[2]
SIL = sys.argv[3] if len(sys.argv) > 3 else None  # pausas por energía (inicio fin), opcional
FPS = 30
raw = [dict(w, w=w["word"].strip()) for w in json.load(open(WORDS))["words"]]
words = []
for w in raw:
    if words and w["w"] == "%" and re.match(r"^\d", words[-1]["w"]):
        words[-1]["w"] += "%"; words[-1]["end"] = w["end"]; continue
    if words and w["w"] == "mil" and words[-1]["w"] == "4":
        words[-1]["w"] = "4.000"; words[-1]["end"] = w["end"]; continue
    words.append(dict(w))
ARREGLOS = {"urologio": "Urológico", "versión.": "operación.", "fissura": "fisura", "operárselo.": "operárselo."}
for w in words:
    w["w"] = ARREGLOS.get(w["w"], w["w"])
# Correcciones escuchadas con large-v3: (desde, hasta, textos nuevos) reparte los textos entre las palabras de la ventana
CORREGIR = [
    (60.6, 61.3, ["100%."]),
    (86.3, 87.7, ["la", "compañía", "de", "seguro", "no"]),
]
for a, b, nuevos in CORREGIR:
    ws = [w for w in words if a <= w["start"] < b]
    for k, w in enumerate(ws):
        if k < len(nuevos): w["w"] = nuevos[k]
        if k == len(nuevos) - 1: w["end"] = ws[-1]["end"]
    for w in ws[len(nuevos):]: words.remove(w)

# Quién habla: Gabi (asesora, detrás de la cámara) o Luisa (clienta, en cámara)
GABI = [(0, 2.3), (4.0, 12.0), (26.1, 29.2), (30.2, 34.6), (52.2, 55.2), (61.8, 73.9), (95.2, 96.15), (104.3, 108.2), (119.5, 123.2), (133.2, 148.6), (181.3, 187.8), (189.8, 191.5)]
hablante = lambda t: "gabi" if any(a <= t < b for a, b in GABI) else "luisa"

TRAMOS = [(181.30, 189.45, "gancho"), (0.0, 181.05, "principal"), (189.60, 191.40, "cierre")]
segs = []
for a, b, et in TRAMOS:
    ws = [w for w in words if a - 0.05 <= w["start"] < b]
    cortes = [(p["end"] + 0.14, n["start"] - 0.10) for p, n in zip(ws, ws[1:]) if n["start"] - p["end"] > 0.45]
    if SIL:
        cortes += [(float(l.split()[0]) + 0.10, float(l.split()[1]) - 0.10) for l in open(SIL)]
    cortes = sorted((max(x0, a), min(x1, b)) for x0, x1 in cortes if min(x1, b) - max(x0, a) > 0.2)
    cur = a
    for x0, x1 in cortes:
        if x1 <= cur: continue
        if x0 > cur: segs.append(dict(src0=cur, src1=x0, tramo=et))
        cur = max(cur, x1)
    if cur < b: segs.append(dict(src0=cur, src1=b, tramo=et))
out = 0.0
for s in segs:
    s["src0"] = round(s["src0"] * FPS) / FPS; s["src1"] = round(s["src1"] * FPS) / FPS
    s["out0"] = round(out, 4); out += s["src1"] - s["src0"]
segs = [s for s in segs if s["src1"] - s["src0"] > 0.05]
DUR = out

def a_salida(t, tramo=None):
    for s in segs:
        if tramo and s["tramo"] != tramo: continue
        if s["src0"] - 0.02 <= t <= s["src1"] + 0.02: return s["out0"] + min(max(t, s["src0"]), s["src1"]) - s["src0"]
    cand = [s for s in segs if not tramo or s["tramo"] == tramo]
    best = min(cand, key=lambda s: min(abs(s["src0"] - t), abs(s["src1"] - t)))
    e = best["src0"] if abs(best["src0"] - t) < abs(best["src1"] - t) else best["src1"]
    return best["out0"] + e - best["src0"]

CLAVE = set("seguro médico garantía tranquilidad necesitar póliza operaste operación intervenciones columna lumbar excelente urológico cubrió intervención segunda catarata cobertura caída costo fractura cadera negociaron confianza cirugía insumo nuevamente fisura hombro venezuela padres exterior edad recomendarías seguro salud complicado costos hospitales emergencia absolutamente insumos pagar palabra miedo luisa".split())
limpio = lambda x: re.sub(r"[¿?¡!.,…]", "", x).lower()
res = []
for a, b, et in TRAMOS:
    usadas = [w for w in words if a - 0.05 <= w["start"] < b]
    bloques, act = [], []
    for w in usadas:
        if act:
            p = act[-1]
            if w["start"] - p["end"] > 0.45 or re.search(r"[.?!]$", p["w"]) or len(act) >= 4 or (p["w"].endswith(",") and len(act) >= 2) or hablante(w["start"]) != hablante(p["start"]):
                bloques.append(act); act = []
        act.append(w)
    if act: bloques.append(act)
    for bl in bloques:
        nums = {j for j, w in enumerate(bl) if re.match(r"^\d", w["w"])}
        c = [j for j, w in enumerate(bl) if limpio(w["w"]) in CLAVE]
        dest = None if nums else (max(c, key=lambda j: len(bl[j]["w"])) if c else (0 if len(bl) == 1 else None))
        pal = [{"texto": w["w"], "inicio": round(a_salida(w["start"], et), 3), "fin": round(a_salida(w["end"], et), 3), **({"destacada": True} if (j == dest or j in nums) else {})} for j, w in enumerate(bl)]
        res.append({"palabras": pal, "hablante": hablante(bl[0]["start"]), "tramo": et})
res.sort(key=lambda b: b["palabras"][0]["inicio"])
for b in res: b["inicio"] = b["palabras"][0]["inicio"]
for k, b in enumerate(res):
    last = b["palabras"][-1]["fin"]; sig = res[k + 1]["inicio"] - 2 / FPS if k + 1 < len(res) else last + 0.6
    b["fin"] = round(max(min(sig, last + 0.9), last + 3 / FPS), 3)

def W(txt, desde):
    for w in words:
        if limpio(w["w"]) == limpio(txt) and w["start"] >= desde - 0.01: return w
    raise SystemExit(f"no encontrada {txt} {desde}")
t = lambda txt, desde, tr="principal": round(a_salida(W(txt, desde)["start"], tr), 3)
tf = lambda txt, desde, tr="principal": round(a_salida(W(txt, desde)["end"], tr), 3)
T = {
    "palabra": t("palabra", 182.5, "gancho"), "queEs": t("¿qué", 185, "gancho"), "miedo": t("Miedo.", 188.5, "gancho"), "ganchoFin": round(a_salida(189.45, "gancho"), 3),
    "hola": t("Hola", 0), "q1": t("Bien,", 4), "garantia": t("garantía,", 15), "tranquilidad": t("tranquilidad,", 16), "suceder": t("suceder", 20.5), "necesitar": t("necesitar.", 25),
    "q2": t("Y", 26), "poliza": t("póliza,", 28), "operaste": t("operaste,", 31), "dos": t("dos", 35.5), "columna": t("columna", 40.5), "urologico": t("Urológico", 45.5),
    "cubrio": t("cubrió", 48.3), "c100": t("100%", 48.7), "segunda": t("segunda", 54), "catarata": t("catarata", 56.5), "cobertura": t("cobertura", 60),
    "q3": t("Y", 61.8), "caida": t("caída", 67.4), "costo": t("costo?", 73.3), "cayo": t("cayó", 77.2), "fractura": t("fractura", 79.5), "urologico2": t("Urológico", 82.9),
    "convenida": t("convenida", 90.7), "negociaron": t("Negociaron,", 95.2), "confianza": t("confianza.", 103.2), "cuantoCosto": t("¿Qué", 104.3), "c4000": t("4.000", 116),
    "insumo": t("insumo,", 118), "nuevamente": t("nuevamente", 121.8), "fisura": t("fisura", 129.4), "hombro": t("hombro", 130.5), "fisuraFin": tf("operárselo.", 131.7),
    "q4": t("Ok.", 133.2), "venezuela": t("Venezuela", 138.5), "padres": t("padres", 141.6), "edadQ": t("edad,", 145), "noHay": t("no", 150.4), "edad": t("edad", 150.9),
    "todos": t("Todos,", 152.8), "complicado": t("complicado.", 159), "estado": t("Estado", 164.8), "hospital": t("hospital", 170), "emergencia": t("emergencia,", 170.8),
    "comprar": t("comprar", 174), "absolutamente": t("absolutamente", 174.4), "insumos": t("insumo,", 176.3), "masQue": t("más", 178.7), "pagarSeguro": t("pagar", 180.2), "principalFin": round(a_salida(181.05, "principal"), 3),
    "miedo2": t("Miedo.", 189.8, "cierre"), "gracias": t("Gracias", 190.6, "cierre"), "vozFin": round(DUR, 3),
}
CTA = 3.6; FINAL = 4.0
total = DUR + CTA + FINAL
ts = lambda v: json.dumps(v, ensure_ascii=False)
open(OUT, "w").write(f"""// GENERADO por scripts/build_v6.py — no editar a mano.
export const DURACION_VOZ = {DUR:.4f};
export const CTA = {CTA};
export const PANTALLA_FINAL = {FINAL};
export const DURACION_TOTAL = {total:.4f};
export const SEGMENTOS = {ts([{k: (round(v, 4) if isinstance(v, float) else v) for k, v in s.items()} for s in segs])};
export const T = {ts(T)};
export type BloqueV6 = {{ palabras: {{ texto: string; inicio: number; fin: number; destacada?: boolean }}[]; inicio: number; fin: number; hablante: "gabi" | "luisa"; tramo: string }};
export const BLOQUES: BloqueV6[] = {ts(res)};
""")
print(f"segmentos={len(segs)} bloques={len(res)} voz={DUR:.2f}s total={total:.2f}s")
for b in res: print(f"[{b['inicio']:6.2f}-{b['fin']:6.2f}] {b['hablante'][:1]} " + " ".join(("*" + p["texto"] + "*") if p.get("destacada") else p["texto"] for p in b["palabras"]))
print(json.dumps(T))
