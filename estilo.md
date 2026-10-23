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

### Vídeos de diálogo o con edición previa (aprendido en el vídeo "Mito vs. realidad")
- Si el bruto trae subtítulos quemados, se borran con `video/scripts/quitar_subtitulos.py` (inpainting) y los
  subtítulos nuevos se colocan en esa misma franja (y 1215 sobre vídeo) para tapar cualquier resto.
- Retoque de belleza en todo el vídeo con `video/scripts/belleza.py` (piel suavizada, textura 35 %, luz +4 %).
- Abrir con un **gancho en frío**: la frase más polémica (1,5 s) en grande, delante de la persona, con lluvia de
  elementos y sello "¿MITO?", y transición de **rebobinado** ("◀◀ UNOS MINUTOS ANTES") al inicio real.
- Tramos en blanco y negro del bruto → duotono azul a pantalla completa (sin franjas negras).
- Subtítulos por hablante: asesoría con píldora de degradado azul, cliente con píldora blanco-hielo.
- **Golpe de impacto** en cada cambio de quien habla: zoom +12 % que cae en 8 fotogramas, temblor, destello de
  5 fotogramas y whoosh.
- Pausa dramática: duotono, zoom lento y burbuja de "escribiendo…".
- Cierre con encuesta animada ("¿Y tú qué prefieres?") y móvil con conversación de DM.

### Vídeos de historia / b-roll (aprendido en el vídeo de la moto)
- **Cámara rápida** en los tramos sin voz (×1,6–2,4) con líneas de velocidad radiales; la voz siempre a tiempo real.
- **Base musical propia** (`video/scripts/musica.py`, 104 BPM, La menor): 0,55–0,62 en b-roll, 0,10–0,14 bajo la voz.
- **Contorno neón** cian alrededor de la persona (recorte + drop-shadow) al presentarla.
- **HUD de cámara** (REC, esquinas, velocímetro, minimapa con ruta a DLB) mientras se desplaza.
- Texto apilado contorno/relleno ("CASI / ME / MATO") detrás de la persona en el gancho.
- Transiciones nuevas: polaroid que sale volando, giro de 180°, paneles verticales, zoom a través de la puerta,
  cristal roto con fragmentos, rayos de luz, pin de ubicación que cae, brochazo azul para el cierre.
- Cierre con pregunta directa al público ("¿Andas en moto?") antes de la pantalla final.

### Regla de oro: NUNCA tapar rostros (pedido explícito del cliente)
- Ningún texto, sticker, pin, icono, grieta ni tarjeta puede pisar una cara, ni la de quien habla ni la de quien
  escucha. Las caras se detectan en todo el vídeo (`video/scripts/caras.py`, 4 veces por segundo) y cada elemento
  elige automáticamente la primera posición candidata libre (`video/src/v4/caras.ts`, margen 36 px, teniendo en
  cuenta el zoom de cámara). Los subtítulos también eligen altura libre (1390 → 1560 → 1690 → 1250 → 1100).
- Excepción permitida: texto gigante DETRÁS de la persona (con su recorte encima); nunca delante de la cara.
- Los momentos en que la persona habla a cámara deben verse limpios: sin grietas, destellos ni chips sobre ella, y
  con subtítulos grandes y legibles.
- Foto de la pantalla final: boca cerrada, mirando a cámara, ojos abiertos (`video/scripts/mejor_foto.py`);
  archivo actual `video/public/marca/avatar.jpg`.

### Adelgazar / estilizar (pedido de la clienta: "me veo muy cuadrada")
- En los planos donde sale **de pie**, estilizar la silueta con `video/scripts/adelgazar.py`
  (`--fuerza 0.10`, `--desde <s>` para no tocar los planos sentada). Afecta solo del cuello hacia abajo y
  únicamente al ancho de su cuerpo: la cara, la TV y el fondo no se deforman. Debe ser sutil y natural.
- Orden del preproceso: quitar marca de agua (delogo) → adelgazar → belleza.

### Vídeos largos explicativos (aprendido en el vídeo de maternidad, ~2 min)
- **Ángulos distintos**: cada frase (~2,2 s o más) cambia de plano: general, medio (×1,34), americano inclinado
  (×1,12, −1,2°), primer plano (×1,62, +1,4°). La cámara se centra en la cara detectada y entra con un
  **barrido (whip)** de 6 fotogramas con desenfoque.
- **Foco en la TV** cuando la diapositiva dice algo clave (zoom ×1,4 a la pantalla).
- **"La cuenta del embarazo"**: un contador fijo que va sumando los gastos con pulso, brillo y ding, junto a
  tarjetas blancas por cada gasto (icono + precio que cuenta hacia arriba).
- Escenas a pantalla completa para los conceptos grandes (**iceberg** "lo que ves / lo que no ves",
  **CON vs SIN seguro** con barras), siempre con su cara en un círculo (PIP) para no perderla.
- Elementos que se "usan": calculadora que teclea los números, caja de comentario que escribe la palabra clave,
  botón de DM con avión de papel, sello "PREPAGADO ✓", anillo 100 % "CUBIERTO".
- Transiciones nuevas: **cristal esmerilado** que barre, **ola** de agua (entrada/salida del iceberg),
  **mosaico** de baldosas que giran, **chispas mágicas** con barrido de luz ("ahora viene la magia").
- Gancho sentada: texto apilado contorno/relleno y un **"NO" gigante detrás de ella**.
- Sin música (la clienta prefiere solo voz + efectos de sonido).

### Testimonios / entrevistas (aprendido en el vídeo de Luisa)
- **Gancho en frío** con la última pregunta y la respuesta más fuerte ("¿Qué es no tener un seguro?" — "Miedo."),
  la palabra gigante DETRÁS de la persona, y **rebobinado VHS** (◀◀ REW + contador que retrocede) al inicio real.
- Cada pregunta de Gabi abre un **capítulo** a pantalla completa ("PREGUNTA 2 DE 4"), cada uno con una entrada
  distinta: corte diagonal, iris, puertas, zoom.
- Píldora azul para Gabi (detrás de cámara) y píldora blanco-hielo para la clienta; chips de presentación
  ("GABI · TU ASESORA DLB", "LUISA · CLIENTA CON PÓLIZA").
- Lo que cuenta la clienta se convierte en **expediente médico** animado (líneas que se suman) con **sello**
  "100% CUBIERTO"; los consejos en pegatinas ✓ y listas que se van marcando.
- Volumen: igualar voces con `dynaudnorm` (la clienta suele quedar mucho más baja que quien graba).
- Cortes de pausas por huecos entre palabras + energía (umbral −34,5 dB); no usar un umbral fijo alto o se
  corta la voz baja.
- En primeros planos donde la cara llena la pantalla, el texto gigante detrás solo funciona si asoma por arriba y
  a los lados (cámara sin zoom fuerte); si no, ponerlo delante, en el pecho, nunca sobre la cara.
- Sin anillos, ondas ni destellos centrados en la cara.
- Cierre: "No dejes que el MIEDO decida por ti" + "Escríbeme y te asesoro".

### Vídeos de viaje / vlog divertidos (aprendido en "los viejitos viajeros")
- Paleta ampliada a pedido: azules de siempre + **turquesa/aguamarina** (#19e3c8, #0fb5d6) como segundo azul y
  **amarillo sol** (#ffc83d) como contraste. Subtítulos con píldora turquesa y píldora sol para los remates.
- Selfies con mucho cielo: todo el grafismo vive ARRIBA, en el cielo; los subtítulos eligen entre abajo del todo
  y el cielo según dónde estén las caras.
- Título gigante en el cielo DETRÁS del sombrero (recorte) al inicio y al final.
- Cada persona presentada lleva un **sello de pasaporte** con apodo divertido (nunca encima de la cara).
- Transiciones viajeras: avión con pancarta, barrido de nubes, efecto **postal** ("Saludos desde…") con sello.
- Botones animados de like, campanita y suscribirse (genéricos, sin logos de marca); confeti al despedirse.
- Vídeos de WhatsApp (360p): reescalar a 1080×1920 con lanczos + nitidez suave y zooms de cámara pequeños (≤ 1,16).
- Cierre suave de marca: "¿Te vas de viaje? Viaja asegurado — Escríbeme y te asesoro".
