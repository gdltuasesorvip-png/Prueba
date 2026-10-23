"""Lista de edición del vídeo v7 ("los viejitos viajeros" en A Coruña, selfie de viaje).
Uso: python build_v7.py words.json pausas.txt salida.ts
Quita las pausas (huecos entre palabras y silencios por energía que no pisan palabras), salvo el paneo de la vista.
"""
import json, sys, re
WORDS, SIL, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
FPS = 30
words = [dict(w, w=w["word"].strip()) for w in json.load(open(WORDS))["words"]]
ARREGLOS = {"coruña": "Coruña", "coruña.": "Coruña.", "físico": "fotico"}
for w in words: w["w"] = ARREGLOS.get(w["w"], w["w"])

INICIO, FIN = 0.0, 56.45
RESPETAR = [(9.9, 13.1)]  # paneo de la vista: se queda entero
dentro = lambda a, b: any(a < y and x < b for x, y in RESPETAR)
cortes = [(p["end"] + 0.12, n["start"] - 0.10) for p, n in zip(words, words[1:]) if n["start"] - p["end"] > 0.45]
for l in open(SIL):
    a, b = float(l.split()[0]) + 0.08, float(l.split()[1]) - 0.08
    if not any(a < w["end"] - 0.08 and w["start"] + 0.08 < b for w in words): cortes.append((a, b))
cortes = sorted((a, b) for a, b in cortes if b - a > 0.2 and not dentro(a, b) and INICIO < a and b < FIN)
segs, cur = [], INICIO
for a, b in cortes:
    if b <= cur: continue
    if a > cur: segs.append(dict(src0=cur, src1=a))
    cur = max(cur, b)
segs.append(dict(src0=cur, src1=FIN))
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

CLAVE = set("bebés viajeros coruña españa familia vista cuñada fotico hija selfie hermano encapuchado reconozcan sobrina esposa disfrutando excelente comimos tomamos café dieta like campanita suscribirse gracias próxima quiere sintonía".split())
limpio = lambda x: re.sub(r"[¿?¡!.,…]", "", x).lower()
bloques, act = [], []
for w in words:
    if act:
        p = act[-1]
        if w["start"] - p["end"] > 0.45 or re.search(r"[.?!]$", p["w"]) or len(act) >= 4 or (p["w"].endswith(",") and len(act) >= 2):
            bloques.append(act); act = []
    act.append(w)
if act: bloques.append(act)
res = []
for bl in bloques:
    c = [j for j, w in enumerate(bl) if limpio(w["w"]) in CLAVE]
    dest = max(c, key=lambda j: len(bl[j]["w"])) if c else (0 if len(bl) == 1 else None)
    res.append({"palabras": [{"texto": w["w"], "inicio": round(a_salida(w["start"]), 3), "fin": round(a_salida(w["end"]), 3), **({"destacada": True} if j == dest else {})} for j, w in enumerate(bl)]})
for b in res: b["inicio"] = b["palabras"][0]["inicio"]
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
    "bebes": t("bebés,", 2), "viejitos": t("viejitos", 2.7), "viajeros": t("viajeros,", 3.1), "coruna": t("Coruña", 5.5), "espana": t("España.", 6.8),
    "familia": t("familia.", 8.6), "vean": t("Vean", 9.8), "abajo": tf("abajo.", 10.8), "panFin": round(a_salida(13.05), 3),
    "cunada": t("cuñada", 13.7), "fotico": t("fotico", 14.4), "hija": t("hija,", 15.1), "selfie1": t("selfie.", 17),
    "hermano": t("hermano", 18.9), "encapuchado": t("encapuchado,", 19.3), "reconozcan": t("reconozcan.", 21.2),
    "sobrina": t("sobrina", 22.4), "selfie2": t("selfie.", 23.6), "esposa": t("esposa.", 25.4), "disfrutando": t("disfrutando", 26.5), "excelente": t("excelente.", 28.2),
    "comimos": t("comimos,", 29.9), "tomamos": t("tomamos,", 30.6), "cafe": t("café,", 31.5), "dieta": t("dieta.", 35.1), "siempre": t("siempre", 34.7),
    "entonces": t("Entonces", 36.2), "coruna2": t("Coruña.", 39.6), "like": t("like,", 42.2), "campanita": t("campanita,", 44.2), "suscribirse": t("suscribirse,", 45),
    "campanita2": t("campanita.", 46.5), "gracias": t("Gracias,", 47.1), "viejitos2": t("viejitos", 49), "bebes2": t("bebés.", 50.6), "bebes3": t("bebés", 52.4),
    "quiere": t("quiere,", 53.4), "sintonia": t("sintonía.", 55.6), "vozFin": round(DUR, 3),
}
CTA = 3.4; FINAL = 4.0
total = DUR + CTA + FINAL
ts = lambda v: json.dumps(v, ensure_ascii=False)
open(OUT, "w").write(f"""// GENERADO por scripts/build_v7.py — no editar a mano.
export const DURACION_VOZ = {DUR:.4f};
export const CTA = {CTA};
export const PANTALLA_FINAL = {FINAL};
export const DURACION_TOTAL = {total:.4f};
export const SEGMENTOS = {ts([{k: (round(v, 4) if isinstance(v, float) else v) for k, v in s.items()} for s in segs])};
export const T = {ts(T)};
export type BloqueV7 = {{ palabras: {{ texto: string; inicio: number; fin: number; destacada?: boolean }}[]; inicio: number; fin: number }};
export const BLOQUES: BloqueV7[] = {ts(res)};
""")
print(f"segmentos={len(segs)} bloques={len(res)} voz={DUR:.2f}s total={total:.2f}s")
for b in res: print(f"[{b['inicio']:6.2f}-{b['fin']:6.2f}] " + " ".join(("*" + p["texto"] + "*") if p.get("destacada") else p["texto"] for p in b["palabras"]))
print(json.dumps(T))
