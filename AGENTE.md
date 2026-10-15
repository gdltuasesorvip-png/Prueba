# Tu primer agente: el Asistente del cotizador

Este documento explica qué es el agente que vive en `app/agente.py`, cómo funciona por dentro y cómo
hacerlo crecer. Está pensado para leerse de principio a fin la primera vez.

## 1. ¿Qué diferencia a un agente de lo que ya hacía la app?

Hasta ahora la app usaba Claude con **llamadas sueltas**: le entrega un PDF y recibe los datos; le
entrega las cotizaciones y recibe un análisis. Una pregunta, una respuesta, y el código decide qué
preguntar.

Un **agente** invierte eso. Tú le das a Claude una meta ("¿cuál es la comparativa más barata de Juan
Pérez?") y un conjunto de **herramientas** (funciones de Python que puede pedir que ejecutemos). Claude
decide por sí mismo qué herramienta usar, con qué datos, lee el resultado y vuelve a decidir, hasta que
tiene lo necesario para responder. Ese ciclo es lo que lo convierte en agente:

```
   pregunta del asesor
          │
          ▼
   ┌─────────────┐   "necesito buscar al cliente"   ┌──────────────────────┐
   │   Claude    │ ───────────────────────────────▶ │ buscar_clientes(...) │  ← función Python
   │  (piensa)   │ ◀─────────────────────────────── │  devuelve JSON       │
   └─────────────┘        resultado                 └──────────────────────┘
          │  "ahora necesito sus comparativas"  →  listar_comparativas(...)  → resultado
          │  "ya tengo todo"
          ▼
   respuesta final en texto
```

Cada vuelta de ese ciclo es una llamada a la API. El SDK de Anthropic trae el ciclo ya hecho
(`client.beta.messages.tool_runner`): nosotros solo escribimos las herramientas y el prompt.

## 2. Qué puede hacer este agente

Tiene seis herramientas, todas de **solo lectura** (no crea ni cambia nada):

| Herramienta | Para qué la usa Claude |
|---|---|
| `fecha_actual` | Saber qué día es ("las comparativas de esta semana") |
| `buscar_clientes` | Encontrar un cliente por nombre, cédula, teléfono o correo |
| `listar_comparativas` | Ver las comparativas de un cliente o de toda la oficina, con su prima mínima |
| `ver_comparativa` | Leer los planes de una comparativa: primas, sumas, deducibles, coberturas |
| `listar_tarifarios` | Saber qué planes de salud por edad están cargados |
| `cotizar_por_tarifario` | Calcular la prima de un grupo de edades en cada plan |

Ejemplos de preguntas que ya resuelve encadenando varias herramientas:

- "¿Qué comparativas tiene Juan Pérez y cuál es la más barata?"
- "Cotiza salud para dos adultos de 45 y 42 años y un niño de 8"
- "¿Qué comparativas de hogar siguen abiertas?"
- "Resume la comparativa más reciente y dime qué plan recomendarías"

## 3. Cómo usarlo

**En la web:** menú **Asistente**. Escribe la pregunta y espera. Debajo de la respuesta verás la
sección "Qué hizo el agente": cada herramienta que usó, con qué datos la llamó y qué le devolvió.
Esa traza es la mejor forma de entender (y depurar) un agente.

**En la terminal**, desde la carpeta del proyecto y con `ANTHROPIC_API_KEY` en el `.env`:

```bash
python -m app.agente "¿Cuánto pagaría una familia de 40, 38 y 6 años en cada plan de salud?"
```

Imprime los pasos y luego la respuesta.

## 4. Cómo está hecho (recorrido por `app/agente.py`)

1. **El prompt de sistema** (`SYSTEM_PROMPT`) le dice a Claude quién es, qué herramientas tiene y
   reglas de trabajo: buscar antes de suponer, pedir datos que falten, avisar si usó tarifarios de
   ejemplo. Casi todo el "comportamiento" de un agente se ajusta aquí.

2. **Las herramientas** son funciones normales decoradas con `@beta_tool`. El SDK convierte la firma
   y el docstring en la descripción que ve Claude, así que **el docstring es parte del prompt**:
   explica claramente para qué sirve y qué significa cada parámetro. Cada herramienta devuelve texto;
   usamos JSON porque a Claude le resulta fácil de leer.

   ```python
   @beta_tool
   def buscar_clientes(texto: str) -> str:
       """Busca clientes de la oficina por nombre, cédula/RIF, teléfono o correo.

       Args:
           texto: Parte del nombre, documento, teléfono o correo del cliente.
       """
       ...
       return json.dumps(filas, ensure_ascii=False)
   ```

3. **El ciclo** está en `preguntar()`. Crea el `tool_runner` con el modelo, el prompt, las
   herramientas y la pregunta, y lo recorre con un `for`. Cada mensaje que entrega es una vuelta: si
   trae llamadas a herramientas, el SDK las ejecuta y devuelve los resultados a Claude; si trae solo
   texto, el agente terminó. Mientras tanto guardamos cada paso en `RespuestaAgente.pasos` para
   mostrarlo en pantalla.

4. **Límites y errores.** `MAX_ITERACIONES` corta el ciclo si el agente se enreda (cada vuelta cuesta).
   Los errores de la API se traducen a mensajes en español con las mismas funciones que ya usaba
   `extraction.py`. Si Claude rechaza la pregunta o se queda sin espacio, se avisa en vez de fallar
   en silencio.

## 5. Cómo agregar una herramienta nueva

Supongamos que quieres que el agente pueda responder "¿qué dice el condicionado de Hispana sobre
maternidad?" usando la Biblioteca. Pasos:

1. Escribe la función en `app/agente.py`, decorada con `@beta_tool`, con tipos en los parámetros y un
   docstring con sección `Args:`:

   ```python
   @beta_tool
   def listar_condicionados(compania: str | None = None) -> str:
       """Lista los condicionados (condiciones generales) cargados en la Biblioteca.

       Args:
           compania: "mercantil", "oceanica" o "hispana". Si se omite, todos.
       """
       with db.get_conn() as conn:
           filas = conn.execute("SELECT id, company, ramo, title FROM library_docs").fetchall()
       return _json([f for f in db.rows_to_list(filas) if not compania or f["company"] == compania])
   ```

2. Agrégala a la lista `HERRAMIENTAS`.
3. Si cambia la forma de trabajar, añade una línea al `SYSTEM_PROMPT` ("si preguntan por
   condicionados, usa listar_condicionados").
4. Pruébala sin gastar API llamándola directo: `agente.listar_condicionados.call({"compania": "hispana"})`
   (así están hechas las pruebas en `tests/test_agente.py`).

Reglas prácticas:

- **Pocas herramientas, bien descritas**, mejor que muchas parecidas. Si dos hacen casi lo mismo, une
  las dos.
- **Devuelve solo lo necesario.** Todo lo que devuelve una herramienta entra al contexto de Claude y
  se paga. Recorta listas largas (las nuestras devuelven como máximo 20 o 50 filas).
- **Herramientas que escriben** (crear un cliente, guardar una comparativa, enviar un WhatsApp) son
  el siguiente nivel. Antes de agregarlas conviene pedir confirmación al asesor, porque el agente
  puede equivocarse de cliente. Una forma sencilla: la herramienta devuelve "propuesta" y la web
  muestra un botón de confirmar.

## 6. Costos y tiempos

- Cada pregunta hace entre 2 y 5 llamadas a Claude (una por vuelta). Con el modelo configurado en
  `CLAUDE_MODEL` y preguntas típicas, el costo está en el orden de centavos de dólar por pregunta.
- Tarda entre 10 y 60 segundos según cuántas herramientas use. La página espera la respuesta
  completa; si en Render ves cortes por tiempo, el siguiente paso sería ejecutarlo en segundo plano
  como ya se hace con la lectura de PDFs.
- El agente usa el mismo `ANTHROPIC_API_KEY` y `CLAUDE_MODEL` que el resto de la app. No hay nada
  nuevo que configurar.

## 7. Ideas para seguir

- Memoria de conversación: hoy cada pregunta empieza de cero. Guardar el historial permitiría
  "¿y para hogar?" después de una pregunta de salud.
- Herramienta para leer los condicionados de la Biblioteca con citas (ya existe la función
  `extraction.answer_from_document`, solo falta envolverla en una herramienta).
- Respuestas en streaming para ver el texto mientras se escribe.
