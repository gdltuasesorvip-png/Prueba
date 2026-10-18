"""Borra subtítulos quemados (texto blanco con contorno oscuro) por inpainting, fotograma a fotograma.
Uso:
  python quitar_subtitulos.py entrada.mp4 salida.mp4                -> vídeo completo (copia audio)
  python quitar_subtitulos.py entrada.mp4 --prueba t1,t2,... dir    -> antes/después/máscara
"""
import sys, os, json, subprocess
import numpy as np, cv2

def mascara_texto(bgr):
    h, w = bgr.shape[:2]
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    v, s = hsv[..., 2], hsv[..., 1]
    # trazos finos más brillantes que su entorno (top-hat), casi blancos y poco saturados
    tophat = cv2.morphologyEx(v, cv2.MORPH_TOPHAT, cv2.getStructuringElement(cv2.MORPH_RECT, (31, 31)))
    cand = ((tophat > 38) & (v > 200) & (s < 60)).astype(np.uint8)
    # sobre fondos claros: letra blanca con sombra desplazada abajo-derecha
    vi = v.astype(np.int16)
    sombra = np.zeros_like(vi); sombra[:-3, :-3] = vi[3:, 3:]
    cand |= ((v > 228) & (s < 40) & ((vi - sombra) > 26)).astype(np.uint8)
    zona = np.zeros_like(cand)
    zona[int(h * 0.55):int(h * 0.71), int(w * 0.05):int(w * 0.95)] = 1   # rótulo central
    zona[int(h * 0.40):int(h * 0.58), :int(w * 0.80)] = 1                # rótulo del tramo con franjas
    cand = cand & zona
    grupos = cv2.morphologyEx(cand, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (31, 13)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(grupos, 8)
    m = np.zeros_like(cand)
    for i in range(1, n):
        x, y, ww, hh, area = st[i]
        dens = cand[y:y + hh, x:x + ww].mean()
        cx = x + ww / 2
        central = y > h * 0.53 and abs(cx - w / 2) < w * 0.22
        izquierda = y < h * 0.58 and x < w * 0.15
        if (central or izquierda) and 18 <= hh <= 140 and ww >= 20 and ww / hh > 0.6 and 0.12 < dens < 0.97:
            m[y:y + hh, x:x + ww] |= cand[y:y + hh, x:x + ww]
    # incluye el halo/sombra alrededor de las letras
    return cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))

def mascara_franja(bgr):
    """Los rótulos van siempre centrados en la misma franja (61-66 % de la altura): busca su contorno oscuro."""
    h, w = bgr.shape[:2]
    y0, y1 = int(h * 0.600), int(h * 0.660)
    hsv = cv2.cvtColor(bgr[y0:y1], cv2.COLOR_BGR2HSV)
    v, s = hsv[..., 2].astype(np.int16), hsv[..., 1]
    blanco = (v > 222) & (s < 50)
    oscuro = v < 110
    k = np.ones((5, 5), np.uint8)
    borde = blanco & cv2.dilate(oscuro.astype(np.uint8), k).astype(bool)
    col = borde.sum(axis=0)
    hay = col >= 3
    # cierra huecos entre letras y busca el tramo que pasa por el centro
    hay = cv2.morphologyEx(hay.astype(np.uint8)[None, :], cv2.MORPH_CLOSE, np.ones((1, 22), np.uint8))[0].astype(bool)
    c = w // 2
    best = None
    x = 0
    while x < w:
        if hay[x]:
            a = x
            while x < w and hay[x]:
                x += 1
            b = x
            if b - a > 18 and (a - 40 <= c <= b + 40) and (best is None or b - a > best[1] - best[0]):
                best = (a, b)
        x += 1
    m = np.zeros((h, w), np.uint8)
    if best is None or borde[:, best[0]:best[1]].sum() < 120:
        return m
    a, b = max(0, best[0] - 10), min(w, best[1] + 10)
    filas = np.where(borde[:, best[0]:best[1]].sum(axis=1) >= 2)[0]
    r0, r1 = max(0, filas.min() - 6), min(y1 - y0, filas.max() + 8)
    m[y0 + r0:y0 + r1, a:b] = 1
    return m

def limpiar(bgr):
    m = mascara_texto(bgr) | mascara_franja(bgr)
    if m.sum() == 0:
        return bgr, m
    return cv2.inpaint(bgr, m * 255, 11, cv2.INPAINT_NS), m

def dims(src):
    j = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate", "-of", "json", src], capture_output=True, text=True).stdout)["streams"][0]
    return j["width"], j["height"], j["r_frame_rate"]

if __name__ == "__main__":
    src = sys.argv[1]
    w, h, fr = dims(src)
    if sys.argv[2] == "--prueba":
        d = sys.argv[4]; os.makedirs(d, exist_ok=True)
        for t in sys.argv[3].split(","):
            raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", t, "-i", src, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
            bgr = np.frombuffer(raw, np.uint8).reshape(h, w, 3).copy()
            out, m = limpiar(bgr)
            vis = bgr.copy(); vis[m > 0] = (0, 0, 255)
            cv2.imwrite(f"{d}/c_{float(t):06.1f}.jpg", np.hstack([bgr, vis, out]))
        sys.exit(0)
    dst = sys.argv[2]
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{w}x{h}", "-r", fr, "-i", "-", "-i", src,
                            "-map", "0:v", "-map", "1:a?", "-c:v", "libx264", "-preset", "fast", "-crf", "16", "-pix_fmt", "yuv420p", "-c:a", "copy", "-shortest", dst], stdin=subprocess.PIPE)
    n = 0
    while True:
        raw = dec.stdout.read(w * h * 3)
        if len(raw) < w * h * 3:
            break
        out, _ = limpiar(np.frombuffer(raw, np.uint8).reshape(h, w, 3).copy())
        enc.stdin.write(out.tobytes()); n += 1
    enc.stdin.close(); enc.wait(); dec.wait()
    print("OK", n, "->", dst)
