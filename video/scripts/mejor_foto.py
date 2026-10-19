"""Elige el mejor fotograma para avatar: boca cerrada, sonrisa, ojos abiertos, cara frontal y nítida."""
import sys, subprocess, numpy as np, cv2
import mediapipe as mp
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision
src, t0, t1, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
lm = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(base_options=mpt.BaseOptions(model_asset_path="/home/user/models/face_landmarker.task"), output_face_blendshapes=True, num_faces=3))
W, H = 1080, 1920
best = None
t = t0
while t < t1:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", src, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    img = np.frombuffer(raw, np.uint8).reshape(H, W, 3)
    r = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(img)))
    for k in range(len(r.face_blendshapes)):
        b = {c.category_name: c.score for c in r.face_blendshapes[k]}
        pts = np.array([[p.x * W, p.y * H] for p in r.face_landmarks[k]])
        x0, y0 = pts.min(0); x1, y1 = pts.max(0)
        rec = img[max(0, int(y0)):max(1, int(y1)), max(0, int(x0)):max(1, int(x1))]
        nitidez = cv2.Laplacian(cv2.cvtColor(rec, cv2.COLOR_RGB2GRAY), cv2.CV_64F).var() if rec.size > 100 else 0
        yaw = abs(pts[1][0] - (x0 + x1) / 2) / max(1, x1 - x0)
        tam = min(1.0, (x1 - x0) / 300)
        score = (2.5 * (b["mouthSmileLeft"] + b["mouthSmileRight"]) / 2 - 6.0 * b["jawOpen"] - 2.0 * b.get("mouthClose", 0) * 0 + 1.2 * tam - 1.5 * (b["eyeBlinkLeft"] + b["eyeBlinkRight"]) / 2
                 - 2.0 * yaw + 0.002 * min(nitidez, 300) - 1.0 * b["mouthFunnel"] - 1.0 * b["mouthPucker"])
        if best is None or score > best[0]:
            best = (score, t, (x0, y0, x1, y1), b["jawOpen"], (b["mouthSmileLeft"] + b["mouthSmileRight"]) / 2)
            print(f"  candidato t={t:.2f} score={score:.2f} boca={b['jawOpen']:.2f} sonrisa={(b['mouthSmileLeft']+b['mouthSmileRight'])/2:.2f} cara={x0:.0f},{y0:.0f}", flush=True)
    t += float(sys.argv[5]) if len(sys.argv) > 5 else 0.2
s, t, (x0, y0, x1, y1), jaw, smile = best
cx, cy = (x0 + x1) / 2, (y0 + y1) / 2 - 0.05 * (y1 - y0)
lado = int(max(x1 - x0, y1 - y0) * 1.9)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", src, "-frames:v", "1", "-vf",
                f"crop={lado}:{lado}:{max(0, int(cx - lado / 2))}:{max(0, int(cy - lado / 2))},scale=480:480", "-q:v", "2", out])
print(f"mejor t={t:.2f} score={s:.2f} boca={jaw:.2f} sonrisa={smile:.2f} -> {out}")
