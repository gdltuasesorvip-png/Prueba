"""Detecta caras a lo largo de la línea de tiempo de salida (4 por segundo) y genera src/datos/caras_<id>.ts
Uso: python caras.py video.mp4 datos.ts salida.ts
Las cajas van en coordenadas 1080x1920 del vídeo SIN zoom de cámara.
"""
import sys, re, json, subprocess
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision
src, ts_path, out = sys.argv[1:4]
txt = open(ts_path).read()
seg = json.loads(re.search(r"SEGMENTOS(?:: \w+\[\])? = (\[.*?\]);", txt, re.S).group(1))
dur = float(re.search(r"DURACION_VOZ = ([0-9.]+)", txt).group(1))
FPS = 30
det = vision.FaceDetector.create_from_options(vision.FaceDetectorOptions(base_options=mpt.BaseOptions(model_asset_path="/home/user/models/blaze_face.tflite"), min_detection_confidence=0.45))
def a_origen(t):
    for s in seg:
        vel = s.get("vel", 1.0); d = s["frames"] / FPS if "frames" in s else s["src1"] - s["src0"]
        if s["out0"] - 1e-6 <= t < s["out0"] + d: return s["src0"] + (t - s["out0"]) * vel
    return None
W, H = 540, 960
res = []
t = 0.0
while t < dur:
    ts = a_origen(t)
    cajas = []
    if ts is not None:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{ts:.3f}", "-i", src, "-frames:v", "1", "-vf", f"scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
        if len(raw) == W * H * 3:
            img = np.frombuffer(raw, np.uint8).reshape(H, W, 3)
            # la cara pequeña al fondo necesita más resolución: analiza también en dos mitades
            for (y0, y1) in [(0, H), (0, H // 2 + 120), (H // 2 - 120, H)]:
                sub = np.ascontiguousarray(img[y0:y1])
                r = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=sub))
                for d in r.detections:
                    b = d.bounding_box
                    cajas.append([b.origin_x * 2, (b.origin_y + y0) * 2, (b.origin_x + b.width) * 2, (b.origin_y + y0 + b.height) * 2])
    # fusiona duplicados
    fin = []
    for c in cajas:
        if not any(abs(c[0] - f[0]) < 60 and abs(c[1] - f[1]) < 60 for f in fin): fin.append(c)
    res.append({"t": round(t, 2), "c": [[round(v) for v in c] for c in fin]})
    t += 0.25
open(out, "w").write("// GENERADO por scripts/caras.py\nexport const CARAS: { t: number; c: number[][] }[] = " + json.dumps(res) + ";\n")
print("muestras", len(res), "con caras", sum(1 for r in res if r["c"]))
