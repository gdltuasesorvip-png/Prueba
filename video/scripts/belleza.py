"""Retoque de belleza natural: suaviza solo la piel (cara y cuello/brazos) conservando textura, y le da un poco de luz.
Uso:
  python belleza.py entrada.mp4 salida.mp4            -> procesa el vídeo completo (copia el audio)
  python belleza.py entrada.mp4 --prueba t1,t2 dir    -> guarda antes/después de esos instantes en dir
Máscara: MediaPipe selfie_multiclass (clases 2 = piel del cuerpo, 3 = piel de la cara).
"""
import sys, subprocess, json, os
import numpy as np, cv2
import mediapipe as mp
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision

FUERZA = 0.75      # mezcla del suavizado sobre la piel
TEXTURA = 0.35     # cuánto detalle fino se devuelve (0 = plástico, 1 = sin efecto)
LUZ = 1.04         # aclarado de la piel
CALIDEZ = 0.0      # 0 = no tocar el tono de piel

seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
    base_options=mpt.BaseOptions(model_asset_path="/home/user/models/selfie_multiclass.tflite"),
    output_confidence_masks=True))

def mascara_piel(rgb):
    res = seg.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb)))
    m = [np.squeeze(np.asarray(c.numpy_view(), dtype=np.float32)) for c in res.confidence_masks]
    piel = np.clip(m[3] + 0.6 * m[2], 0, 1)
    piel = cv2.resize(piel, (rgb.shape[1], rgb.shape[0]), interpolation=cv2.INTER_LINEAR)
    return cv2.GaussianBlur(piel, (0, 0), 6)

def embellecer(rgb, prev_mask=None):
    h, w = rgb.shape[:2]
    mask = mascara_piel(rgb)
    if prev_mask is not None:  # estabiliza la máscara entre fotogramas
        mask = 0.6 * mask + 0.4 * prev_mask
    img = rgb.astype(np.float32)
    peq = cv2.resize(rgb, (w // 2, h // 2), interpolation=cv2.INTER_AREA)
    suave = cv2.bilateralFilter(peq, 9, 38, 9)
    suave = cv2.bilateralFilter(suave, 7, 28, 7)
    suave = cv2.resize(suave, (w, h), interpolation=cv2.INTER_LINEAR).astype(np.float32)
    detalle = img - cv2.GaussianBlur(img, (0, 0), 1.6)
    piel = np.clip(suave + TEXTURA * detalle, 0, 255) * LUZ
    a = (mask * FUERZA)[..., None]
    out = img * (1 - a) + piel * a
    return np.clip(out, 0, 255).astype(np.uint8), mask

def dims(src):
    j = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate", "-of", "json", src], capture_output=True, text=True).stdout)["streams"][0]
    return j["width"], j["height"], j["r_frame_rate"]

def frame_at(src, t, w, h):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", src, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(h, w, 3)

if __name__ == "__main__":
    src = sys.argv[1]
    w, h, fr = dims(src)
    if sys.argv[2] == "--prueba":
        os.makedirs(sys.argv[4], exist_ok=True)
        for t in sys.argv[3].split(","):
            rgb = frame_at(src, float(t), w, h)
            out, _ = embellecer(rgb)
            cv2.imwrite(f"{sys.argv[4]}/antes_{t}.jpg", cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
            cv2.imwrite(f"{sys.argv[4]}/despues_{t}.jpg", cv2.cvtColor(out, cv2.COLOR_RGB2BGR))
        sys.exit(0)
    dst = sys.argv[2]
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-r", fr, "-i", "-", "-i", src,
                            "-map", "0:v", "-map", "1:a?", "-c:v", "libx264", "-preset", "fast", "-crf", "17", "-pix_fmt", "yuv420p", "-c:a", "copy", "-shortest", dst], stdin=subprocess.PIPE)
    n, prev = 0, None
    while True:
        raw = dec.stdout.read(w * h * 3)
        if len(raw) < w * h * 3:
            break
        out, prev = embellecer(np.frombuffer(raw, np.uint8).reshape(h, w, 3), prev)
        enc.stdin.write(out.tobytes())
        n += 1
        if n % 300 == 0:
            print("fotogramas:", n, flush=True)
    enc.stdin.close(); enc.wait(); dec.wait()
    print("OK", n, "fotogramas ->", dst)
