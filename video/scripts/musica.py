"""Base musical sintetizada (sin derechos de autor): 104 BPM, La menor (Am - F - C - G)."""
import numpy as np, wave, sys
SR = 48000; BPM = 104; DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 54.0
beat = 60 / BPM; n = int(SR * DUR)
L = np.zeros(n); R = np.zeros(n)
rng = np.random.default_rng(7)
def add(sig, t, pan=0.0, g=1.0):
    i = int(t * SR); j = min(n, i + len(sig))
    if i >= n: return
    L[i:j] += sig[:j - i] * g * (1 - max(0, pan)); R[i:j] += sig[:j - i] * g * (1 + min(0, pan))
def env(d, a=0.005, r=0.1):
    t = np.arange(int(d * SR)) / SR
    return np.minimum(1, t / a) * np.exp(-t / r)
def kick():
    t = np.arange(int(0.35 * SR)) / SR
    f = 48 + 90 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
def clap():
    s = rng.normal(0, 1, int(0.18 * SR)); t = np.arange(len(s)) / SR
    e = np.exp(-t * 25) + 0.6 * np.exp(-np.maximum(0, t - 0.012) * 30) * (t > 0.012)
    s = np.convolve(s, [1, -0.9], "same")
    return s * e * 0.35
def hat(open_=False):
    s = rng.normal(0, 1, int((0.18 if open_ else 0.05) * SR))
    s = np.diff(np.concatenate([[0], s]))
    return s * env(len(s) / SR, 0.001, 0.06 if open_ else 0.012) * 0.14
def nota(f, d, tipo="bajo"):
    t = np.arange(int(d * SR)) / SR
    if tipo == "bajo":
        s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)
        return s * env(d, 0.004, d * 0.6) * 0.55
    if tipo == "pluck":
        s = sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, 6))
        return s * env(d, 0.002, 0.12) * 0.18
    # pad: varias sierras desafinadas suavizadas
    s = sum(np.sin(2 * np.pi * f * (1 + dt) * t + p) for dt, p in [(-0.004, 0), (0, 1), (0.004, 2)])
    a = np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.4)
    return s * a * 0.06
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
ACORDES = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [55, 60, 64]), (55, [55, 59, 62])]  # Am F C G
ARP = [0, 2, 1, 2, 0, 2, 1, 2]
compas = 4 * beat
k = 0
t0 = 0.0
while t0 < DUR:
    raiz, acorde = ACORDES[k % 4]
    for b in range(4):
        tb = t0 + b * beat
        add(kick(), tb, 0, 0.9)
        if b in (1, 3): add(clap(), tb, 0.1, 0.8)
        for h in range(2):
            add(hat(open_=(h == 1 and b == 3)), tb + h * beat / 2, -0.3 if h else 0.3, 1.0)
        add(nota(hz(raiz - 12), beat * 0.9), tb + (beat / 2 if b % 2 else 0), 0, 1.0)
    for i, idx in enumerate(ARP):
        add(nota(hz(acorde[idx] + 12), beat / 2, "pluck"), t0 + i * beat / 2, 0.4 if i % 2 else -0.4, 1.0)
    for m in acorde:
        add(nota(hz(m), compas, "pad"), t0, 0, 1.0)
    t0 += compas; k += 1
# bombeo (sidechain) suave al ritmo del bombo
t = np.arange(n) / SR
duck = 1 - 0.35 * np.exp(-((t % beat) / 0.12))
mix = np.stack([L * duck, R * duck], 1)
mix = np.tanh(mix * 0.9)
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.89
with wave.open(sys.argv[1], "w") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print("OK", sys.argv[1], DUR, "s")
