"""Estiliza la silueta de una persona de forma natural: estrecha su cuerpo ~6-8 % hacia su eje vertical,
sin tocar la cara, con un campo de desplazamiento suave y estable en el tiempo.
Uso:
  python adelgazar.py entrada.mp4 salida.mp4 [--fuerza 0.07] [--x 0.5]      (x = posición horizontal aprox. de la persona, 0-1)
  python adelgazar.py entrada.mp4 --prueba t1,t2 dir [--fuerza 0.07] [--x 0.5]
"""
import sys, os, json, subprocess, argparse
import numpy as np, cv2
import mediapipe as mp
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision

ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("dst", nargs="?")
ap.add_argument("--prueba"); ap.add_argument("--dir")
ap.add_argument("--fuerza", type=float, default=0.07)
ap.add_argument("--x", type=float, default=None, help="posición horizontal de la persona a estilizar (0-1); por defecto la más grande")
ap.add_argument("--desde", type=float, default=0); ap.add_argument("--hasta", type=float, default=1e9)
a = ap.parse_args()

seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(base_options=mpt.BaseOptions(model_asset_path="/home/user/models/selfie_multiclass.tflite"), output_confidence_masks=True))

def mascaras(rgb):
    r = seg.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb)))
    m = [np.squeeze(np.asarray(c.numpy_view(), dtype=np.float32)) for c in r.confidence_masks]
    h, w = rgb.shape[:2]
    up = lambda x: cv2.resize(x, (w, h), interpolation=cv2.INTER_LINEAR)
    persona = up(1 - m[0]); cara = up(m[3])
    return persona, cara

def objetivo(persona, x_hint):
    """Se queda con el componente conexo de la persona indicada (o la más grande)."""
    b = (persona > 0.5).astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(b, 8)
    if n <= 1: return None
    idx = range(1, n)
    if x_hint is None:
        k = max(idx, key=lambda i: st[i][4])
    else:
        w = persona.shape[1]
        k = min((i for i in idx if st[i][4] > 0.02 * b.size), key=lambda i: abs(cen[i][0] - x_hint * w), default=max(idx, key=lambda i: st[i][4]))
    return (lab == k)

class Estado:
    cx = None; ancho = None
est = Estado()

def campo(rgb, fuerza, x_hint):
    h, w = rgb.shape[:2]
    persona, cara = mascaras(rgb)
    obj = objetivo(persona, x_hint)
    if obj is None:
        return None
    filas = np.where(obj.any(axis=1))[0]
    cx = np.full(h, np.nan); an = np.full(h, np.nan)
    for y in filas:
        xs = np.where(obj[y])[0]
        cx[y] = (xs[0] + xs[-1]) / 2; an[y] = xs[-1] - xs[0]
    # rellena y suaviza el eje y el ancho a lo largo de la altura
    ys = np.arange(h); ok = ~np.isnan(cx)
    if ok.sum() < 20: return None
    cx = np.interp(ys, ys[ok], cx[ok]); an = np.interp(ys, ys[ok], an[ok])
    cx = cv2.GaussianBlur(cx.reshape(-1, 1), (1, 0), sigmaX=1, sigmaY=40).ravel()
    an = cv2.GaussianBlur(an.reshape(-1, 1), (1, 0), sigmaX=1, sigmaY=40).ravel()
    # estabilidad temporal
    if est.cx is not None and abs(float(np.median(cx - est.cx))) < 80 and abs(float(np.median(an - est.ancho))) < 120:
        cx = 0.7 * est.cx + 0.3 * cx; an = 0.7 * est.ancho + 0.3 * an  # sin saltos de plano: suaviza
    est.cx, est.ancho = cx, an
    # peso vertical: 0 en la cabeza (cara/pelo), sube desde el cuello
    cara_filas = np.where(((cara > 0.5) & obj).sum(axis=1) > 3)[0]
    y_cuello = (cara_filas.max() + 0.03 * h) if len(cara_filas) else filas.min() + 0.15 * (filas.max() - filas.min())
    wy = np.clip((ys - y_cuello) / (0.08 * h), 0, 1) * (ys <= filas.max() + 0.05 * h)
    # desplazamiento horizontal: dentro de una ventana 1.6x el ancho del cuerpo, con caída suave
    X = np.arange(w)[None, :].astype(np.float32)
    d = (X - cx[:, None]) / np.maximum(an[:, None] * 0.8, 20)
    ventana = np.clip(1 - np.abs(d) / 1.0, 0, 1) ** 1.5
    dx = fuerza * (X - cx[:, None]) * ventana * wy[:, None]
    mapx = (X + dx).astype(np.float32)
    mapy = np.repeat(ys[:, None], w, axis=1).astype(np.float32)
    return mapx, mapy

def procesar(rgb, fuerza, x_hint):
    c = campo(rgb, fuerza, x_hint)
    if c is None: return rgb
    return cv2.remap(rgb, c[0], c[1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

def dims(src):
    j = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate", "-of", "json", src], capture_output=True, text=True).stdout)["streams"][0]
    return j["width"], j["height"], j["r_frame_rate"]

w, h, fr = dims(a.src)
if a.prueba:
    os.makedirs(a.dir, exist_ok=True)
    for t in a.prueba.split(","):
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", t, "-i", a.src, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
        rgb = np.frombuffer(raw, np.uint8).reshape(h, w, 3)
        est.cx = None
        out = procesar(rgb, a.fuerza, a.x)
        cv2.imwrite(f"{a.dir}/ad_{t}.jpg", cv2.cvtColor(np.hstack([rgb, out]), cv2.COLOR_RGB2BGR))
    sys.exit(0)
num, den = map(int, fr.split("/")); fps = num / den
dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", a.src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-r", fr, "-i", "-", "-i", a.src,
                        "-map", "0:v", "-map", "1:a?", "-c:v", "libx264", "-preset", "fast", "-crf", "16", "-pix_fmt", "yuv420p", "-c:a", "copy", "-shortest", a.dst], stdin=subprocess.PIPE)
i = 0
while True:
    raw = dec.stdout.read(w * h * 3)
    if len(raw) < w * h * 3: break
    rgb = np.frombuffer(raw, np.uint8).reshape(h, w, 3)
    t = i / fps
    enc.stdin.write((procesar(rgb, a.fuerza, a.x) if a.desde <= t <= a.hasta else rgb).tobytes()); i += 1
enc.stdin.close(); enc.wait(); dec.wait(); print("OK", i, "->", a.dst)
