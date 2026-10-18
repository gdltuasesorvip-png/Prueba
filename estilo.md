# estilo.md — guía de edición extraída de `media/referencia.mp4`

Fuente del análisis: 93 fotogramas a 2/s + 22 cambios de plano detectados con ffmpeg (umbral 0,15), audio
extraído y transcrito con Whisper (196 palabras), medidas en píxeles sobre el original (576×1024) y
convertidas a 1080×1920. Todo lo que no se pudo medir va marcado como **[SUPOSICIÓN]**.

## 1. Formato
- Vertical 9:16, 1080×1920, 30 fps. H.264 + AAC estéreo 44,1 kHz.
- Duración de la referencia: 46,8 s (42,1 s de voz + 0,6 s + 4,0 s de tarjeta final).

## 2. Ritmo de cortes
- 19 planos, 18 cortes. Plano medio 2,4 s.
- Alternancia estricta BUSTO ↔ GRÁFICO: nunca dos planos de busto seguidos.
- Busto: 0,8–2,4 s por plano (mediana 2,0 s). Gráfico: 1,4–7,5 s (mediana 2,9 s); el gráfico largo (7,5 s) es
  la pantalla del prompt, que se queda fija para que el espectador pause y capture.
- Cada corte cae en el inicio de una frase o de un bloque de subtítulo, nunca a mitad de palabra.
- Sin cortes de salto (jump cuts) dentro de un plano de busto.
- Estructura narrativa: gancho 0–5,4 s ("Este vídeo está editado con IA" ×3 con 3 ejemplos) → promesa
  5,4–6,8 s ("son 2 pasos") → pasos 6,8–41,5 s → cierre 41,9 s ("De nada") → tarjeta final 4,0 s.
- Silencios: no hay ningún hueco entre palabras > 0,30 s; 13 huecos de 0,15–0,30 s. Velocidad 279 palabras/min
  (las pausas se recortan de forma agresiva).

## 3. Subtítulos
- Tipografía: sans redondeada con la "t" en gancho y la "g" de un piso. **[SUPOSICIÓN]** Nunito (Google Fonts).
  Peso 700 en palabras normales, 800/900 en la palabra destacada.
- Tamaño (a 1080 px de ancho): palabra normal 46 px; palabra destacada 104 px (≈2,25×).
- Color sobre gráfico claro: normal #131215, destacada azul #0e56f6. Sobre busto: ambas blancas #fbfafd, la
  destacada solo cambia de tamaño/peso. Sin caja, sin borde, sin sombra (sobre busto hay una sombra muy
  suave **[SUPOSICIÓN]** 0 2px 12px rgba(0,0,0,0.35)).
- Alineación centrada. Ancho máximo del bloque ≈ 70 % (760 px). Interlineado 1,05.
- Posición:
  - Sobre busto: bloque arriba, centro vertical del bloque a y ≈ 10 % (190 px). Primera línea a ~150 px.
  - Sobre gráfico: debajo del gráfico, centro a y ≈ 77 % (1480 px); si el gráfico ocupa la mitad inferior,
    arriba a y ≈ 10 %.
- Bloques: 2–6 palabras (media 4), 1–3 líneas. Línea 1 = palabras normales, línea 2 = palabra destacada,
  línea 3 = palabras normales que vienen después (ej. "este vídeo está / **editado** / con IA,").
  Si la palabra destacada es la última, el bloque tiene 2 líneas.
- Un bloque = una unidad de sentido (sintagma de 1–2 s). Se vacía al terminar la frase; el siguiente
  bloque empieza vacío.
- Acumulación palabra a palabra: cada palabra aparece en su `start` de Whisper y se queda hasta que el
  bloque se vacía.
- Animación de entrada de cada palabra: 3 fotogramas (100 ms), desenfoque 8 px → 0 px y opacidad 0,4 → 1,
  sin desplazamiento ni escala. La destacada igual pero con escala 0,92 → 1 **[SUPOSICIÓN]**.
- Salida del bloque: todas las palabras a la vez, 3 fotogramas, desenfoque 0 → 8 px y opacidad 1 → 0.
  Entre la salida de un bloque y la primera palabra del siguiente hay 0–2 fotogramas vacíos.
- Palabra destacada: exactamente 1 por bloque (a veces 0 en bloques de relleno como "y", "pues").
  Es la que lleva la carga semántica: verbo o sustantivo clave (editado, viendo, fácil, primero, referencia,
  edición, creador, pegar, estilos, ritmo, textos, colores, tipografía, color, branding, pídeselo, está,
  Remotion, editar, exactamente, iteraciones, gusta, recopile, replicar, nada). Nunca artículos,
  preposiciones ni pronombres.
- Variantes de la destacada (usar con moderación, 2–3 veces por vídeo): serif itálica azul ("pasos", "Sol")
  **[SUPOSICIÓN]** Instrument Serif itálica; y relleno degradado gris oscuro "metálico" (#2b2d33 → #6b6e78)
  en 1 palabra-logo ("Remotion", "2").
- Puntuación: se mantienen comas y puntos tal como se dicen. Minúsculas salvo inicio de frase y nombres.
- Números: en cifra ("2 pasos").

## 4. Textos en pantalla (aparte de subtítulos)
- Etiquetas de metadatos en monoespaciada 22 px gris #8a8f9c, mayúsculas con separador "·":
  "VÍDEO 1 · EDITADO CON IA", "PROMPT · EDITOR DE VÍDEO", "referencia.mp4 · fotograma a fotograma".
  **[SUPOSICIÓN]** JetBrains Mono.
- Píldora oscura #151821 con icono + texto blanco 30 px semibold: "HAZ CAPTURA" con punto rojo parpadeante.
- Barra de progreso azul #0e56f6, 6 px de alto, con cuenta atrás "pausa o haz captura · 4 s" debajo.
- Chips blancos con nombre de archivo en monoespaciada: "referencia.mp4", "estilo.md", "SKILL.md".

## 5. B-roll / gráficos
- No hay metraje externo. Todo el b-roll son mockups planos generados (estilo UI) sobre fondo claro.
- Fondo: #fbfafd con dos manchas radiales azul claro (#d2dffd arriba-derecha, #dee6fa abajo-izquierda) y
  una retícula de puntos muy tenue (#e3e6ef, paso 40 px, opacidad 0,5 **[SUPOSICIÓN]**).
- Elementos recurrentes:
  - Móvil: marco negro #131215, radio 56 px, borde 14 px, ancho 36 % (390 px), centrado a y ≈ 38 %.
    Corchetes azules #0e56f6 en las 4 esquinas (grosor 6 px, 60 px de brazo) cuando se "selecciona".
  - Tarjetas blancas, radio 28 px, sombra 0 20px 60px rgba(20,30,80,0.10), padding 40 px.
  - Lista numerada: badge circular azul 40 px con número blanco + texto 34 px.
  - Checklist: casilla 36 px azul con tick blanco; los ítems se marcan uno a uno al decirlos.
  - Terminal: fondo #151821, radio 20 px, 3 puntos de semáforo, texto monoespaciada 28 px, se escribe
    carácter a carácter (≈ 40 chars/s) y la línea "✓ …" aparece en verde #4ade80.
  - Tira de película con 6 fotogramas y cabezal azul que avanza.
  - Logos: Claude (asterisco naranja #d97757), Remotion (triángulo azul), OpenAI.
  - Tarjeta tipografía "Aa" 220 px + 4 muestras de color 100×100 radio 24.
  - 3 miniaturas de móvil "v1 v2 v3" en abanico (rotación −8°, 0°, +8°).
  - Árbol SKILL.md → 3 vídeos con conectores de puntos y badges ✓.
- Construcción: la escena gráfica empieza VACÍA (solo fondo) y cada elemento entra en el `start` de la
  palabra que ilustra. Entrada: 6 fotogramas (200 ms), opacidad 0 → 1, desenfoque 6 → 0, desplazamiento
  +24 px → 0 hacia arriba, ease-out. Los elementos se acumulan; no salen hasta el corte.
- Un gráfico puede contener el propio busto en una tarjeta (ej. "el vídeo que estás viendo") que luego
  se amplía a pantalla completa en 4 fotogramas (130 ms) con ease-out.

## 6. Transiciones
- Todo son cortes secos. Única excepción: un fundido de 2 fotogramas a 41,9 s (no merece replicarse).
- Antes de cortar de gráfico a busto, el bloque de subtítulo sale (3 fotogramas) y el gráfico se mantiene
  1–2 fotogramas sin texto.
- Corte de busto a gráfico: directo al fondo vacío; los elementos se construyen después.
- Tarjeta final: corte seco a fondo #0e0e1a, logo TikTok + wordmark centrado a y ≈ 40 %, barra de
  búsqueda con el usuario que se "escribe" en 0,5 s con glitch de separación RGB cian/rojo. Dura 4,0 s.
  Sustituir el usuario por el del cliente.

## 7. Zooms y encuadre del busto
- Encuadre: pecho arriba, cara centrada, coronilla a ≈ 22 % de la altura (mucho aire arriba para el
  subtítulo). Si el bruto viene en 16:9 o más abierto: recortar a 9:16 centrado en la cara con escala 1,0.
- Zoom: push-in lento del 5 % en 3,2 s (escala 1,00 → 1,05, lineal) en la mitad de los planos de busto;
  el resto estáticos (medido: 34,4→37,6 s +5 %; 38,8→41,9 s 0 %). **[SUPOSICIÓN]** alternar estático /
  push-in de forma regular. Nunca punch-in de salto.

## 8. Color
- Busto: grading natural, sin LUT visible, ligeramente cálido. **[SUPOSICIÓN]** no tocar; solo
  exposición +0 y saturación 1,0.
- Paleta UI: azul #0e56f6 (acción/destacado), negro #131215, gris #8a8f9c, azul claro #dbe6ff,
  blanco #fbfafd, oscuro #151821, verde #4ade80, naranja #d97757 (solo logo Claude).

## 9. Sonido
- Solo voz. Sin música de fondo (silencio a −66 dB RMS en la tarjeta final; sin cama musical).
- Voz: −15,4 LUFS integrado, LRA 3,5 LU (muy comprimida), picos ≈ −1 dBTP **[SUPOSICIÓN]**.
  Objetivo: normalizar a −15 LUFS, compresión 3:1, high-pass 80 Hz.
- Sin efectos de sonido en las apariciones de texto **[SUPOSICIÓN]** (no se detectan transitorios fuera de la voz).
- Los huecos > 0,30 s se eliminan; se mantiene 0,10–0,15 s de aire en cada corte para que no suene cortado.

## 10. Reglas aprendidas con el cliente
Aprobado por el cliente (2026-10-18): la **v3** (`video/src/V3.tsx`, `video/src/v3/`) es el estilo de referencia.
Estas reglas mandan sobre las secciones 1–9 cuando choquen.

### Paleta (solo azules)
- noche #040b1f · marino #0a1a3f · profundo #10275e · real #0e56f6 · eléctrico #2f7bff · cielo #58a6ff ·
  cian #4fd1ff · hielo #dbe9ff · niebla #eef4ff · blanco #f7faff · gris #7d8bb0.
- Degradado de marca: 100°, real → eléctrico → cian.
- Escenas alternando fondo claro (blanco→niebla) y oscuro (marino→noche), con dos manchas azules que derivan y
  retícula de 72 px que se desplaza.
- Vídeo: tinte real en soft-light al 20 %, sombras marino al 32 %, viñeta marino; grano de película al 6 %.

### Texto detrás de la persona
- En el gancho y en el remate final, la palabra clave en mayúsculas gigantes (150–250 px, Nunito 900, azul real)
  aparece DETRÁS de la persona, letra a letra cayendo desde arriba (1,3 fotogramas entre letras).
- Se hace con `video/scripts/recorte_persona.py` (MediaPipe selfie multiclass). En esos planos, encuadre abierto
  (escala 1,0) para que el texto quepa.

### Cámara
- Cada frase de busto = un "plano" distinto, en ciclo: 1,0 / 1,28 (−1,2°) / 1,12 (+1°) / 1,36. Avance lento del
  3,5 % en 3 s. Golpe de zoom del 7 % en cada corte; en cortes alternos, deslizamiento de 90 px con desenfoque.
- Barrido (whip pan) con estela azul al pasar a b-roll; sacudida de 0,45 s en el momento cumbre.

### Transiciones (nunca repetir la misma dos veces seguidas)
- Persianas verticales/horizontales, corte diagonal, círculos líquidos, zoom + light leak azul (hueShift 185),
  escudo que se abre, giro 3D, reloj que barre la pantalla, vídeo que se encoge dentro de un móvil, glitch final.
- Elegir la forma por el tema: escudo para coberturas, reloj para plazos, móvil para llamadas a la acción.

### Escenas gráficas
- Tu cara en un círculo (230 px, arriba a la derecha) con anillo de degradado giratorio, siempre sincronizada.
- Ilustraciones de línea que se dibujan solas (trazo 7–10 px), tarjetas que caen en 3D o rebotan, cifras que
  cuentan hacia arriba en 0,6 s, sellos inclinados (−6 a −10°) para remates ("¿BUEN TRATO?", "LLEGASTE TARDE").
- Sobre b-roll real, un elemento que acompañe lo que se dice (p. ej. ticket que se imprime con las cifras).
- Un momento "espectáculo" por vídeo ligado a una expresión coloquial (p. ej. ¡JONRÓN! con pelota y rayos).

### Subtítulos
- Normales: Nunito 800, 48 px; blanco con sombra marino sobre vídeo, marino sobre claro, blanco sobre oscuro.
- Destacada: Nunito 900 hasta 108 px, letra a letra con rebote; sobre vídeo, dentro de una píldora con el
  degradado de marca inclinada −2°; cian sobre oscuro, azul real sobre claro.
- Posición: pecho (y 1390) sobre busto, y 1500–1520 sobre gráficos/b-roll.

### Sonido
- Whoosh en cada transición, pop al aparecer elementos, ding en checks, golpe grave en los remates, subida en
  contadores, interferencia en la pantalla final. Voz a −15 LUFS. Sin música salvo que el cliente aporte pista.

### Pantalla final
- Fondo noche con suelo de retícula en perspectiva, avatar con anillo giratorio, buscador que escribe el usuario y
  botón "Sígueme para más" pulsante. Entra con glitch y light leak.
- Cuentas del cliente (siempre las dos, una debajo de otra, con icono genérico en cian):
  Instagram **@tuagentedesegurosdlb** · TikTok **@tuasesorintegralvip**.
- Título: "Tu asesor integral VIP" (tomado del usuario de TikTok) y subtítulo "seguros de salud · maternidad"
  **[SUPOSICIÓN: confirmar nombre de marca]**.
