"""Genera src/datos/edicion.ts a partir de la transcripción (Whisper) y los silencios (ffmpeg).

Reglas (estilo.md): se eliminan los silencios > 0,30 s dejando 0,12 s de aire a cada lado;
los subtítulos se agrupan en bloques de 2-6 palabras con una palabra destacada.
"""
import json, re, sys

WORDS = sys.argv[1]; SIL = sys.argv[2]; OUT = sys.argv[3]
FPS = 30
AIRE = 0.12
MIN_SIL = 0.30

words = json.load(open(WORDS))["words"]
for w in words:
    w["word"] = w["word"].strip()

# ---- 1. Tramos de origen que se conservan (descartando la toma duplicada del clip 1) ----
# (inicio, fin) en segundos del archivo mi-video.mp4
TRAMOS = [(3.90, 25.80), (50.70, 74.55), (78.40, 112.20)]

# ---- 2. Silencios > 0,30 s dentro de los tramos -> cortes ----
sil = []
for line in open(SIL):
    a, b, d = (float(x) for x in line.split())
    if d > MIN_SIL:
        sil.append((a + AIRE, b - AIRE))  # parte que se elimina

segmentos = []  # [{src0, src1}]
for t0, t1 in TRAMOS:
    cur = t0
    for a, b in sil:
        if b <= t0 or a >= t1:
            continue
        a2, b2 = max(a, t0), min(b, t1)
        if b2 - a2 <= 0.02:
            continue
        if a2 > cur:
            segmentos.append({"src0": cur, "src1": a2})
        cur = b2
    if t1 > cur:
        segmentos.append({"src0": cur, "src1": t1})

# cuantizar a fotogramas y asignar posición de salida
out = 0
for s in segmentos:
    s["src0"] = round(s["src0"] * FPS) / FPS
    s["src1"] = round(s["src1"] * FPS) / FPS
    s["out0"] = out
    out += s["src1"] - s["src0"]
DUR_VOZ = out

def a_salida(t):
    """Tiempo de origen -> tiempo de salida (None si está en una parte cortada)."""
    for s in segmentos:
        if s["src0"] <= t <= s["src1"]:
            return s["out0"] + (t - s["src0"])
    return None

def a_salida_cerca(t):
    r = a_salida(t)
    if r is not None:
        return r
    # cae en una parte eliminada: usar el borde más próximo
    mejor = None
    for s in segmentos:
        for borde in (s["src0"], s["src1"]):
            d = abs(borde - t)
            if mejor is None or d < mejor[0]:
                mejor = (d, s["out0"] + (borde - s["src0"]))
    return mejor[1]

# ---- 3. Guion de bloques: texto corregido (mismo nº de tokens que Whisper), *palabra* = destacada ----
# ~serif~ y ^metal^ marcan variantes de la destacada. Cada línea es un bloque.
GUION = """
No salgas *embarazada* sin antes saber esto.
¿Sabías que hoy en *Venezuela*
un *parto* en una clínica tipo A
puede *costar* entre los
*6 mil* y los *10 mil* dólares
y eso sin contar con *complicaciones*
de la mamá o el *bebé.*
Una *cesárea* de emergencia,
una *incubadora,*
días en terapia *intensiva*
y esa cuenta se *dispara.*
Ahora, saquemos la *cuenta.*
|
Un plan de *salud* con maternidad
ronda entre los *70* y los *100* dólares mensuales.
Esto da un *valor* de entre
los *840* y los *1.200* dólares anuales.
¿Cuánto *cuesta* una cesárea o un parto?
entre los *4.000* y los *6 mil* dólares.
¿Es un buen *trato* o no lo es?
|
Y ese plan te *cubre*
*parto,* cesárea, consultas, prenatales, ecografías
y además te sigue *cubriendo*
el resto del *año* para cualquier emergencia.
Pagas *1.200*
te ahorras hasta *8.800* o más.
Es *8 veces* lo que invertiste.
Eso en criollo se llama meter un *jonrón.*
Pero ojo, la maternidad tiene plazo de *espera.*
Si contratas cuando ya estás *embarazada*
llegaste *tarde.*
Por eso es el momento *ahora.*
Si estás pensando en agrandar tu *familia,*
comenta la palabra *maternidad,*
escríbeme y te digo qué *plan* te conviene.
*Sígueme* para más.
"""

# índices de Whisper por tramo
def indices_tramo(t0, t1):
    return [i for i, w in enumerate(words) if w["start"] >= t0 - 0.3 and w["start"] < t1]

tramos_idx = [indices_tramo(*t) for t in TRAMOS]
# tramo 1 termina en "cuenta." (25.68); tramo 2 incluye "Un plan" que Whisper partió entre clips
# Whisper: Un@49.48 plan@50.08-51.18 -> los asignamos al tramo 2 (clip del cuaderno empieza en 50.75)
tramos_idx[0] = [i for i in tramos_idx[0] if words[i]["start"] < 26.0]
tramos_idx[1] = [i for i in range(len(words)) if words[i]["word"] in ("Un", "plan") and 49.4 < words[i]["start"] < 50.2] + [i for i in tramos_idx[1] if words[i]["start"] >= 51.0]

bloques_txt = [[]]
for linea in GUION.strip().splitlines():
    linea = linea.strip()
    if linea == "|":
        bloques_txt.append([])
    elif linea:
        bloques_txt[-1].append(linea)

def token_info(tok):
    # "*6 mil*" se escribe como un token con espacio protegido: se pasa como "6_mil"
    dest = tok.startswith("*") and tok.endswith("*")
    serif = tok.startswith("~") and tok.endswith("~")
    metal = tok.startswith("^") and tok.endswith("^")
    texto = tok.strip("*~^")
    return texto, dest or serif or metal, ("serif" if serif else "metal" if metal else None)

# tokens multi-palabra en el guion (un token visual, varias palabras Whisper)
MULTI = {"6 mil": 2, "10 mil": 2, "8 veces": 2}

bloques = []
for tramo_i, lineas in enumerate(bloques_txt):
    idx = list(tramos_idx[tramo_i])
    pos = 0
    for linea in lineas:
        toks = re.findall(r"\*[^*]+\*|~[^~]+~|\^[^^]+\^|\S+", linea)
        palabras = []
        for tok in toks:
            texto, dest, var = token_info(tok)
            n = MULTI.get(texto.rstrip(",.?!"), 1)
            ws = [words[idx[pos + k]] for k in range(n)]
            pos += n
            palabras.append({
                "texto": texto,
                "inicio": a_salida_cerca(ws[0]["start"]),
                "fin": a_salida_cerca(ws[-1]["end"]),
                "destacada": dest,
                "variante": var,
                "srcStart": ws[0]["start"],
            })
        bloques.append({"palabras": palabras})
    if pos != len(idx):
        faltan = [words[i]["word"] for i in idx[pos:]]
        print(f"AVISO tramo {tramo_i}: {len(idx)-pos} palabras de Whisper sin usar: {faltan}", file=sys.stderr)

# inicio/fin de bloque: empieza en su primera palabra, acaba 2 fotogramas antes de la primera palabra del siguiente
for b in bloques:
    b["inicio"] = b["palabras"][0]["inicio"]
for i, b in enumerate(bloques):
    if i + 1 < len(bloques):
        b["fin"] = bloques[i + 1]["inicio"] - 2 / FPS
    else:
        b["fin"] = b["palabras"][-1]["fin"] + 0.5
    b["fin"] = max(b["fin"], b["palabras"][-1]["fin"] + 3 / FPS)

# ---- 4. Escenas gráficas: (nombre, texto palabra inicio, texto palabra fin, anclas) ----
# Las anclas son palabras cuyo tiempo de salida se pasa al componente.
ESCENAS = [
    ("coste", "¿Sabías", "dólares", ["parto", "6 mil", "10 mil"]),
    ("complicaciones", "Una", "dispara.", ["cesárea", "incubadora,", "intensiva", "dispara."]),
    ("cobertura", "Y", "emergencia.", ["parto,", "cesárea,", "consultas,", "prenatales,", "ecografías", "cubriendo", "año"]),
    ("ahorro", "Pagas", "invertiste.", ["1.200", "8.800", "8 veces"]),
    ("plazo", "Pero", "tarde.", ["espera.", "embarazada", "tarde."]),
    ("comenta", "comenta", "conviene.", ["maternidad,", "escríbeme", "plan"]),
]
todas = [p for b in bloques for p in b["palabras"]]

def buscar(texto, desde=0.0):
    for p in todas:
        if p["texto"] == texto and p["inicio"] >= desde - 0.02:
            return p
    raise SystemExit(f"palabra no encontrada: {texto} desde {desde}")

escenas = []
cursor = 0.0
for nombre, ini, fin, anclas in ESCENAS:
    p0 = buscar(ini, cursor)
    p1 = buscar(fin, p0["inicio"])
    # la escena empieza 2 fotogramas antes de la palabra y acaba 2 fotogramas antes del bloque siguiente
    t0 = p0["inicio"] - 2 / FPS
    b_fin = next(b for b in bloques if any(p is p1 for p in b["palabras"]))
    t1 = b_fin["fin"] + 2 / FPS
    a = []
    c = t0
    for tx in anclas:
        pa = buscar(tx, c)
        a.append(round(pa["inicio"], 3))
        c = pa["inicio"]
    escenas.append({"nombre": nombre, "inicio": round(t0, 3), "fin": round(t1, 3), "anclas": a})
    cursor = t1

# fondo de cada bloque según escena / b-roll del cuaderno
CUADERNO = (a_salida_cerca(TRAMOS[1][0]), a_salida_cerca(TRAMOS[1][1]))
for b in bloques:
    mid = (b["inicio"] + b["fin"]) / 2
    en_graf = any(e["inicio"] <= mid < e["fin"] for e in escenas)
    en_cuad = CUADERNO[0] <= mid < CUADERNO[1]
    b["fondo"] = "grafico" if (en_graf or en_cuad) else "busto"
    b["posicion"] = "abajo" if (en_graf or en_cuad) else "arriba"

# ---- 5. Planos de busto y zoom alterno ----
planos = []
limites = sorted([(e["inicio"], e["fin"]) for e in escenas] + [CUADERNO])
c = 0.0
for a, b in limites:
    if a > c + 0.2:
        planos.append({"inicio": round(c, 3), "fin": round(a, 3)})
    c = max(c, b)
if DUR_VOZ > c + 0.2:
    planos.append({"inicio": round(c, 3), "fin": round(DUR_VOZ, 3)})
for i, p in enumerate(planos):
    p["zoom"] = i % 2 == 1  # alterno: estático / push-in

PANTALLA_FINAL = 4.0
HUECO_FINAL = 0.1
dur_total = DUR_VOZ + HUECO_FINAL + PANTALLA_FINAL

def ts(v):
    return json.dumps(v, ensure_ascii=False)

ts_out = f"""// GENERADO por scripts/build_edicion.py — no editar a mano (edita el guion en el script).
import type {{ Bloque }} from "../componentes/Subtitulos";

export const FPS = {FPS};
export const DURACION_VOZ = {DUR_VOZ:.4f};
export const DURACION_TOTAL = {dur_total:.4f};
export const PANTALLA_FINAL = {PANTALLA_FINAL};
export const HUECO_FINAL = {HUECO_FINAL};
export const CUADERNO = {ts({"inicio": round(CUADERNO[0],3), "fin": round(CUADERNO[1],3)})};

export type Segmento = {{ src0: number; src1: number; out0: number }};
export const SEGMENTOS: Segmento[] = {ts([{k: round(v,4) for k,v in s.items()} for s in segmentos])};

export type Escena = {{ nombre: string; inicio: number; fin: number; anclas: number[] }};
export const ESCENAS: Escena[] = {ts(escenas)};

export type Plano = {{ inicio: number; fin: number; zoom: boolean }};
export const PLANOS: Plano[] = {ts(planos)};

export const BLOQUES: Bloque[] = {ts([{
    "inicio": round(b["inicio"],3), "fin": round(b["fin"],3), "fondo": b["fondo"], "posicion": b["posicion"],
    "palabras": [{"texto": p["texto"], "inicio": round(p["inicio"],3), "fin": round(p["fin"],3),
                  **({"destacada": True} if p["destacada"] else {}),
                  **({"variante": p["variante"]} if p["variante"] else {})} for p in b["palabras"]]
} for b in bloques])};
"""
open(OUT, "w").write(ts_out)
print(f"segmentos={len(segmentos)} bloques={len(bloques)} escenas={len(escenas)} planos={len(planos)}")
print(f"voz={DUR_VOZ:.2f}s total={dur_total:.2f}s (origen conservado {sum(t1-t0 for t0,t1 in TRAMOS):.2f}s, cortado {sum(t1-t0 for t0,t1 in TRAMOS)-DUR_VOZ:.2f}s de silencio)")
for b in bloques:
    print(f"[{b['inicio']:6.2f}-{b['fin']:6.2f}] {b['fondo']:7s} " + " ".join(("*"+p["texto"]+"*") if p["destacada"] else p["texto"] for p in b["palabras"]))
for e in escenas: print("escena", e)
for p in planos: print("plano", p)
