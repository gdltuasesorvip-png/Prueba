"""Recorta a la persona (fondo transparente) en los tramos de salida indicados, para poner texto DETRÁS de ella.
Uso: python recorte_persona.py mi-video.mp4 edicion.ts out_dir t0:t1 [t0:t1 ...]   (tiempos de SALIDA en s)
Genera out_dir/f_<frameSalida>.webp (1080x1920, RGBA).
"""
import sys, re, json, subprocess, os
import numpy as np
from PIL import Image, ImageFilter
import mediapipe as mp
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision

src, ts_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
rangos = [tuple(float(x) for x in r.split(":")) for r in sys.argv[4:]]
os.makedirs(out, exist_ok=True)
FPS = 30
seg = json.loads(re.search(r"SEGMENTOS: Segmento\[\] = (\[.*?\]);", open(ts_path).read(), re.S).group(1))

def a_origen(t):
    for s in seg:
        dur = s["src1"] - s["src0"]
        if s["out0"] <= t < s["out0"] + dur:
            return s["src0"] + (t - s["out0"])
    return None

opts = vision.ImageSegmenterOptions(
    base_options=mpt.BaseOptions(model_asset_path="/home/user/models/selfie_multiclass.tflite"),
    output_confidence_masks=True,
)
segm = vision.ImageSegmenter.create_from_options(opts)

def frame_at(t):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.4f}", "-i", src, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(1920, 1080, 3)

n = 0
for t0, t1 in rangos:
    for f in range(int(round(t0 * FPS)), int(round(t1 * FPS))):
        ts = a_origen(f / FPS)
        if ts is None:
            continue
        rgb = frame_at(ts)
        img = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb))
        res = segm.segment(img)
        bg = np.squeeze(np.asarray(res.confidence_masks[0].numpy_view(), dtype=np.float32))  # clase 0 = fondo
        alpha = np.clip(1.0 - bg, 0, 1)
        a = Image.fromarray((alpha * 255).astype(np.uint8)).resize((1080, 1920), Image.BILINEAR).filter(ImageFilter.GaussianBlur(1.2))
        a = np.asarray(a).astype(np.float32) / 255
        a = np.clip((a - 0.35) / 0.3, 0, 1)  # endurecer borde
        rgba = np.dstack([rgb, (a * 255).astype(np.uint8)])
        Image.fromarray(rgba, "RGBA").save(f"{out}/f_{f}.webp", "WEBP", quality=82, method=4)
        n += 1
print("recortes:", n)
