"""Lista de edición del vídeo 'DLB 2' (diálogo asesoría / cliente).
Genera src/datos/dlb2.ts: segmentos (cortes de silencio + teaser), bloques de subtítulos con hablante,
escenas gráficas y tiempos clave.
"""
import json, sys, re
WORDS, SIL, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
FPS = 30; AIRE = 0.12; MIN_SIL = 0.30
words = json.load(open(WORDS))["words"]
for w in words:
    w["w"] = w["word"].strip()

# ---------- correcciones (verificadas con los rótulos originales) ----------
for w in words:
    if w["w"] == "hablando": w["w"] = "ahorrando"
for i, w in enumerate(words):
    if w["w"] == "el" and i + 1 < len(words) and words[i + 1]["w"] == "DM": w["w"] = "al"
merged = []
i = 0
while i < len(words):
    w = words[i]
    if w["w"] in ("cinco", "treinta") and i + 1 < len(words) and words[i + 1]["w"].startswith("mil"):
        merged.append({**w, "w": "5.000" if w["w"] == "cinco" else "30.000", "end": words[i + 1]["end"]}); i += 2; continue
    merged.append(w); i += 1
words = merged

# ---------- segmentos ----------
TEASER = (19.36, 20.90)          # "asegurarse es botar el dinero"
TRAMO = (2.95, 106.45)
sil = [tuple(map(float, l.split()[:2])) for l in open(SIL) if float(l.split()[2]) > MIN_SIL]
segs = [{"src0": TEASER[0], "src1": TEASER[1], "teaser": True}]
cur = TRAMO[0]
for a, b in sil:
    a2, b2 = max(a + AIRE, TRAMO[0]), min(b - AIRE, TRAMO[1])
    if b2 <= a2 or b2 <= cur or a2 >= TRAMO[1]: continue
    if a2 > cur: segs.append({"src0": cur, "src1": a2, "teaser": False})
    cur = max(cur, b2)
if cur < TRAMO[1]: segs.append({"src0": cur, "src1": TRAMO[1], "teaser": False})
out = 0.0
for s in segs:
    s["src0"] = round(s["src0"] * FPS) / FPS; s["src1"] = round(s["src1"] * FPS) / FPS
    s["out0"] = out; out += s["src1"] - s["src0"]
DUR = out

def a_salida(t, teaser=False):
    best = None
    for s in segs:
        if s["teaser"] != teaser: continue
        if s["src0"] <= t <= s["src1"]: return s["out0"] + t - s["src0"]
        for e in (s["src0"], s["src1"]):
            if best is None or abs(e - t) < best[0]: best = (abs(e - t), s["out0"] + e - s["src0"])
    return best[1]

# ---------- hablantes (por tramos de origen) ----------
CLIENTE = [(14.5, 25.9), (42.8, 46.1), (87.9, 91.2)]
def hablante(t): return "cliente" if any(a <= t < b for a, b in CLIENTE) else "asesoria"

# ---------- bloques ----------
CLAVE = set("""hola asegurarte verdad dinero pasa estás bien plata platica colchón seguro paga proceso documentación declaraciones clínica red garantizo
asesoría ahorros guardaditos difiero hospitalización venezuela 5.000 30.000 más emergencia aliado proteger reunir rumor cinturón seguridad
accidente protege patrimonio razón cuidar decisión prefieres médico contáctame escríbeme dm conversamos fallas omitidas incompleta""".split())
NO = set("de la el los las un una y o que en por para con es a mi tu tus te me se lo eso yo tú ahí".split())
def limpio(x): return re.sub(r"[¿?¡!.,…]", "", x).lower()

bloques = []
act = []
for i, w in enumerate(words):
    if w["start"] < TRAMO[0] - 0.1: continue
    if act:
        prev = act[-1]
        corte = (w["start"] - prev["end"] > 0.35 or re.search(r"[.?!…]$", prev["w"]) or len(act) >= 5
                 or (prev["w"].endswith(",") and len(act) >= 3) or hablante(w["start"]) != hablante(act[0]["start"]))
        if corte: bloques.append(act); act = []
    act.append(w)
if act: bloques.append(act)

res = []
for b in bloques:
    cands = [j for j, w in enumerate(b) if limpio(w["w"]) in CLAVE]
    if not cands:
        cands = [j for j, w in enumerate(b) if len(limpio(w["w"])) >= 6 and limpio(w["w"]) not in NO]
    dest = max(cands, key=lambda j: (limpio(b[j]["w"]) in CLAVE, len(b[j]["w"]))) if cands else None
    if len(b) <= 1 and dest is None: dest = 0
    nums = {j for j, w in enumerate(b) if re.match(r"^\d", w["w"])}
    if nums: dest = None
    pal = []
    for j, w in enumerate(b):
        d = j == dest or j in nums
        pal.append({"texto": w["w"], "inicio": round(a_salida(w["start"]), 3), "fin": round(a_salida(w["end"]), 3), **({"destacada": True} if d else {})})
    res.append({"palabras": pal, "hablante": hablante(b[0]["start"]), "src": b[0]["start"]})
for k, b in enumerate(res):
    b["inicio"] = b["palabras"][0]["inicio"]
for k, b in enumerate(res):
    sig = res[k + 1]["inicio"] - 2 / FPS if k + 1 < len(res) else b["palabras"][-1]["fin"] + 0.5
    b["fin"] = round(max(sig if sig - b["palabras"][-1]["fin"] < 1.2 else b["palabras"][-1]["fin"] + 0.6, b["palabras"][-1]["fin"] + 3 / FPS), 3)

# ---------- tiempos clave (origen -> salida) ----------
def W(txt, desde=0.0):
    for w in words:
        if limpio(w["w"]) == limpio(txt) and w["start"] >= desde - 0.01: return w
    raise SystemExit(f"no encontrada {txt} {desde}")
def t(txt, desde=0.0): return round(a_salida(W(txt, desde)["start"]), 3)
def tf(txt, desde=0.0): return round(a_salida(W(txt, desde)["end"]), 3)

T = {
    "hola": t("Hola"), "asegurarte": t("asegurarte"), "no": t("no.", 17), "dicho": t("dicho"), "botar": t("botar", 19.9),
    "plata": t("plata"), "colchon": t("colchón"), "flashFin": round(a_salida(25.8), 3), "flashIni": round(a_salida(17.40), 3),
    "seguroNoPaga": t("seguro", 28), "guardaditos": t("guardaditos"), "ahorros1": t("ahorros", 44), "difiero": t("difiero"),
    "dime": t("Dime"), "emergencia": t("emergencia"), "pausaIni": round(a_salida(62.15), 3), "pausaFin": round(a_salida(64.05), 3),
    "aliado1": t("aliado", 67), "ahorros2": t("ahorros", 68), "patrimonio1": t("patrimonio", 82), "razon1": t("razón", 86),
    "razon2": t("razón", 88.5), "decision": t("decisión", 93.5), "teaserFin": round(TEASER[1] - TEASER[0], 3),
}

def esc(nombre, ini, fin, anclas, colchon_fin=0.35):
    return {"nombre": nombre, "inicio": round(ini - 2 / FPS, 3), "fin": round(fin + colchon_fin, 3), "anclas": [round(a, 3) for a in anclas]}
ESC = [
    esc("fallas", t("fallas"), tf("pasa."), [t("documentación"), t("declaraciones"), t("clínica"), t("garantizo"), t("asesoría", 39.9), t("pasa.")]),
    esc("costo", t("¿cuánto"), tf("más?"), [t("hospitalización"), t("Venezuela?"), t("5.000"), t("30.000"), t("más?")]),
    esc("cinturon", t("Eso", 71.3), tf("persona."), [t("rumor"), t("cinturón"), t("accidente"), t("cinturón", 79), t("protege")]),
    esc("encuesta", t("¿Y", 95.6), tf("médico?"), [t("prefieres?"), t("colchón", 98.5), t("proteger", 99.5), t("patrimonio", 100), t("médico?")], 0.2),
    esc("dm", t("Para", 102.9), round(DUR, 3) - 0.35, [t("asesoría", 103), t("contáctame"), t("escríbeme"), t("conversamos.")]),
]
# fondo de cada bloque
for b in res:
    mid = (b["inicio"] + b["fin"]) / 2
    e = next((e for e in ESC if e["inicio"] <= mid < e["fin"]), None)
    b["escena"] = e["nombre"] if e else None

PANT_FINAL = 4.0; HUECO = 0.1
total = DUR + HUECO + PANT_FINAL
ts = lambda v: json.dumps(v, ensure_ascii=False)
open(OUT, "w").write(f"""// GENERADO por scripts/build_dlb2.py — no editar a mano.
export const FPS = {FPS};
export const DURACION_VOZ = {DUR:.4f};
export const DURACION_TOTAL = {total:.4f};
export const PANTALLA_FINAL = {PANT_FINAL};
export const HUECO_FINAL = {HUECO};
export const SEGMENTOS = {ts([{k: (round(v, 4) if isinstance(v, float) else v) for k, v in s.items()} for s in segs])};
export const T = {ts(T)};
export type EscenaD = {{ nombre: string; inicio: number; fin: number; anclas: number[] }};
export const ESCENAS: EscenaD[] = {ts(ESC)};
export type PalabraD = {{ texto: string; inicio: number; fin: number; destacada?: boolean }};
export type BloqueD = {{ palabras: PalabraD[]; inicio: number; fin: number; hablante: "asesoria" | "cliente"; escena: string | null }};
export const BLOQUES: BloqueD[] = {ts([{k: b[k] for k in ("palabras", "inicio", "fin", "hablante", "escena")} for b in res])};
""")
print(f"segmentos={len(segs)} bloques={len(res)} voz={DUR:.2f}s total={total:.2f}s")
for b in res:
    print(f"[{b['inicio']:6.2f}-{b['fin']:6.2f}] {b['hablante'][:3]} {b['escena'] or '':9s} " + " ".join(("*" + p["texto"] + "*") if p.get("destacada") else p["texto"] for p in b["palabras"]))
print(json.dumps(T)); [print(e) for e in ESC]
