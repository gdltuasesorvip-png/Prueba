"""Lista de edición del vídeo v5 (costes de la maternidad, presentación de pie)."""
import json, sys, re
WORDS, SIL, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
FPS = 30
raw = [dict(w, w=w["word"].strip()) for w in json.load(open(WORDS))["words"]]
# une números partidos ("1" + ".100" -> "1.100"; "11" "mil" -> "11.000"; "100" "%" -> "100%")
words = []
for w in raw:
    if words and (re.match(r"^\.\d", w["w"]) or w["w"] == "%") and re.match(r"^\d", words[-1]["w"]):
        p = words[-1]; p["w"] = p["w"] + w["w"]; p["end"] = w["end"]; continue
    if words and w["w"] == "mil" and words[-1]["w"] == "11":
        words[-1]["w"] = "11.000"; words[-1]["end"] = w["end"]; continue
    words.append(dict(w))
for w in words:
    w["w"] = {"congénicas": "congénitas", "3.300.": "3.300.", "11.300.": "11.300."}.get(w["w"], w["w"])
sil = [tuple(map(float, l.split()[:2])) for l in open(SIL) if float(l.split()[2]) > 0.30]
TRAMOS = [(1.05, 7.10, "gancho"), (13.15, 145.60, "principal")]
segs = []
for a, b, et in TRAMOS:
    cur = a
    for s0, s1 in sil:
        x0, x1 = max(s0 + 0.12, a), min(s1 - 0.12, b)
        if x1 <= x0 or x1 <= cur or x0 >= b: continue
        if x0 > cur: segs.append(dict(src0=cur, src1=x0, tramo=et))
        cur = max(cur, x1)
    if cur < b: segs.append(dict(src0=cur, src1=b, tramo=et))
out = 0.0
for s in segs:
    s["src0"] = round(s["src0"] * FPS) / FPS; s["src1"] = round(s["src1"] * FPS) / FPS
    s["out0"] = round(out, 4); out += s["src1"] - s["src0"]
DUR = out
def a_salida(t):
    for s in segs:
        if s["src0"] - 0.02 <= t <= s["src1"] + 0.02: return s["out0"] + min(max(t, s["src0"]), s["src1"]) - s["src0"]
    best = min(segs, key=lambda s: min(abs(s["src0"] - t), abs(s["src1"] - t)))
    e = best["src0"] if abs(best["src0"] - t) < abs(best["src1"] - t) else best["src1"]
    return best["out0"] + e - best["src0"]

usadas = [w for w in words if any(a - 0.1 <= w["start"] < b for a, b, _ in TRAMOS)]
CLAVE = set("venezuela bebé esto embarazada guardados ahorrar consultas mensuales estudios exámenes ciencia adn fetal gastado hospital clínica cesárea parto total complicación terapia intensiva incubadora magia calculadora seguro maternidad proteger bolsillo mercado mensuales anual prepagar complicaciones cubierto médico asegura paso maternidad dm conversamos".split())
limpio = lambda x: re.sub(r"[¿?¡!.,…]", "", x).lower()
bloques, act = [], []
for w in usadas:
    if act:
        p = act[-1]
        if w["start"] - p["end"] > 0.35 or re.search(r"[.?!]$", p["w"]) or len(act) >= 4 or (p["w"].endswith(",") and len(act) >= 2):
            bloques.append(act); act = []
    act.append(w)
if act: bloques.append(act)
res = []
for b in bloques:
    nums = {j for j, w in enumerate(b) if re.match(r"^\d", w["w"])}
    c = [j for j, w in enumerate(b) if limpio(w["w"]) in CLAVE]
    dest = None if nums else (max(c, key=lambda j: len(b[j]["w"])) if c else (0 if len(b) == 1 else None))
    pal = [{"texto": w["w"], "inicio": round(a_salida(w["start"]), 3), "fin": round(a_salida(w["end"]), 3), **({"destacada": True} if (j == dest or j in nums) else {})} for j, w in enumerate(b)]
    res.append({"palabras": pal})
for k, b in enumerate(res): b["inicio"] = b["palabras"][0]["inicio"]
for k, b in enumerate(res):
    last = b["palabras"][-1]["fin"]; sig = res[k + 1]["inicio"] - 2 / FPS if k + 1 < len(res) else last + 0.6
    b["fin"] = round(max(min(sig, last + 0.9), last + 3 / FPS), 3)

def W(txt, desde):
    for w in words:
        if limpio(w["w"]) == limpio(txt) and w["start"] >= desde - 0.01: return w
    raise SystemExit(f"no encontrada {txt} {desde}")
t = lambda txt, desde: round(a_salida(W(txt, desde)["start"]), 3)
tf = lambda txt, desde: round(a_salida(W(txt, desde)["end"]), 3)
T = {
    "vives": t("¿Vives", 1), "bebe": t("bebé?", 3), "no": t("No", 4), "esto0": t("esto.", 6), "ganchoFin": round(a_salida(7.10), 3),
    "tienes": t("¿Tienes", 13), "once": t("11.000", 13), "ahorrar": t("ahorrar", 20), "consultas": t("consultas", 27), "cien": t("100", 30),
    "c1100": t("1.100", 33), "estudios": t("estudios", 38), "c500": t("500", 40), "c1000a": t("1.000", 41), "c2100": t("2.100", 44),
    "ciencia": t("ciencia", 50), "adn": t("ADN", 52), "c1000b": t("1.000", 57), "c1200": t("1.200", 57.5), "c3300": t("3.300.", 60),
    "dime": t("Dime", 63), "hospital": t("hospital", 65), "clinica": t("clínica", 71), "c4000": t("4.000", 72), "c8000": t("8.000", 73.5),
    "total": t("Total", 75), "c6600": t("6.600", 78), "c11300": t("11.300.", 79), "ninguna": t("ninguna", 82),
    "siHay": t("Y", 86), "terapia": t("terapia", 88.5), "incubadora": t("incubadora.", 90.5), "enCuanto": t("¿En", 91.8), "c11300b": t("11.300", 92.9), "dolaresFin": tf("dólares?", 93.5),
    "magia": t("magia.", 96), "calculadora": t("calculadora", 99.5), "proteger": t("proteger", 104), "bolsillo": t("bolsillo", 105.5),
    "mercado": t("mercado,", 110), "c80": t("80", 114), "c100b": t("100", 114.7), "anual": t("anual", 117.4), "c960": t("960", 117.8), "c1200b": t("1.200", 119),
    "prepagar": t("prepagar", 121.9), "riesgos": t("¿Riesgos", 123.6), "c100p": t("100%", 124.8), "cubierto": t("cubierto.", 125.4),
    "entonces": t("Entonces,", 127.3), "c1200c": t("1.200", 130.6), "contra": t("contra", 132.3), "c11300c": t("11.300", 133.2), "sinEl": tf("él.", 136.9),
    "asegura": t("asegura", 139.2), "paso": t("paso.", 141.5), "comenta": t("Comenta", 142), "maternidadC": t("maternidad,", 142.7),
    "escribeme": t("escríbeme", 143.7), "dm": t("DM", 144.1), "conversamos": t("conversamos.", 144.7), "vozFin": round(DUR, 3),
    "iceIni": round(a_salida(84.50), 3), "iceFin": round(a_salida(94.85), 3),
}
CTA = 0.0; FINAL = 4.0
total = DUR + 0.1 + FINAL
ts = lambda v: json.dumps(v, ensure_ascii=False)
open(OUT, "w").write(f"""// GENERADO por scripts/build_v5.py — no editar a mano.
export const DURACION_VOZ = {DUR:.4f};
export const PANTALLA_FINAL = {FINAL};
export const DURACION_TOTAL = {total:.4f};
export const SEGMENTOS = {ts([{k: (round(v, 4) if isinstance(v, float) else v) for k, v in s.items()} for s in segs])};
export const T = {ts(T)};
export type BloqueV5 = {{ palabras: {{ texto: string; inicio: number; fin: number; destacada?: boolean }}[]; inicio: number; fin: number }};
export const BLOQUES: BloqueV5[] = {ts(res)};
""")
print(f"segmentos={len(segs)} bloques={len(res)} voz={DUR:.2f}s total={total:.2f}s")
for b in res[:60]: print(f"[{b['inicio']:6.2f}-{b['fin']:6.2f}] " + " ".join(("*"+p["texto"]+"*") if p.get("destacada") else p["texto"] for p in b["palabras"]))
print(json.dumps(T))
