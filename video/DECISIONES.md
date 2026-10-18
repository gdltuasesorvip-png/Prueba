# Decisiones del borrador v1 (`out/borrador.mp4`)

Pipeline: `media/mi-video.mp4` (3 clips unidos y escalados a 1080×1920, 30 fps) → Whisper (faster-whisper `small`,
tiempos por palabra) → `scripts/build_edicion.py` (cortes de silencio, bloques, escenas) → `src/datos/edicion.ts`
→ Remotion → `scripts/render.sh` (render + audio a −15 LUFS).

## Montaje
1. **Orden**: clip 1 (despacho) → clip 2 (cuaderno) → clip 3 (despacho).
2. **Toma duplicada descartada**: en el clip 1, de 26,6 s a 50,4 s, repites el tramo "un plan de salud con maternidad…
   pagas 1.200 te ahorras 8.800". Los clips 2 y 3 lo cuentan mejor (cuaderno + "4.000–6.000" + "8 veces"),
   así que ese tramo del clip 1 no se usa. Se conservan 79,6 s de origen.
3. **Silencios**: eliminados todos los huecos > 0,30 s (umbral −35 dB) dejando 0,12 s de aire a cada lado.
   8,0 s cortados. Voz final: 71,5 s. Total con pantalla final: 75,6 s.
4. **Pantalla final**: 4 s, fondo oscuro, marca "Tu asesor VIP" y usuario "@tu.usuario" (placeholder: dime tu
   usuario real y la marca).

## Subtítulos
- Nunito 700 a 46 px / destacada Nunito 900 a 104 px (se reduce si la palabra no cabe en 760 px).
- Arriba (y 190 px) sobre busto en blanco; abajo (y 1480 px) sobre gráficos y sobre el cuaderno en negro con
  la destacada en azul #0e56f6.
- 35 bloques de 2–7 palabras, una destacada por bloque (dos en los bloques de rangos "70 y 100", "840 y 1.200").
- Correcciones a Whisper: "No salgas embarazada sin antes saber esto. ¿Sabías…" (Whisper: "embarazadas … es
  sabías"); "días en terapia intensiva" (Whisper: "vidas en trap intensiva") **[verificar con el audio]**;
  "ecografías" (Whisper: "epografías"); "saquemos la cuenta" (Whisper: "sacamos"); cifras con punto de millar.

## Escenas gráficas (6) — alternan con el busto como en la referencia
| Escena | Cuándo | Contenido |
|---|---|---|
| coste | "¿Sabías que… 10 mil dólares" | tarjeta "Parto en clínica" con 6.000 $ → 10.000 $ |
| complicaciones | "Una cesárea… se dispara" | lista numerada que se construye + chip "la cuenta se dispara ↑" |
| cobertura | "Y ese plan te cubre… emergencia" | checklist que se marca al nombrar cada cobertura |
| ahorro | "Pagas 1.200… invertiste" | tarjetas 1.200 $ / 8.800 $ y "×8" en serif itálica |
| plazo | "Pero ojo… llegaste tarde" | barra de plazo de espera, ✓ antes del embarazo, ✕ ya embarazada |
| comenta | "comenta la palabra… conviene" | caja de comentario que escribe "maternidad" + burbujas |

El cuaderno (clip 2) hace de b-roll real entre 20,5 s y 39,8 s; los subtítulos van abajo en negro.

## Zoom y color
- Push-in del 5 % en 3,2 s en los planos de busto alternos (2.º, 4.º y 6.º). Sin corrección de color.

## Pendiente de tu respuesta
- Usuario y marca de la pantalla final.
- Confirmar "días en terapia intensiva".
- Dato: en el clip 1 dices "entre 6 mil y 10 mil"; en el cuaderno, "entre 4.000 y 6 mil". Lo dejo tal cual.
