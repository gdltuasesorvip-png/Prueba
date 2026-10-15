"""Primer agente del cotizador: un asistente que responde preguntas usando herramientas.

A diferencia de las llamadas sueltas de `extraction.py` (una pregunta, una respuesta), aquí Claude
recibe un conjunto de HERRAMIENTAS (funciones de Python) y decide por sí mismo cuáles usar, en qué
orden y cuántas veces, hasta tener lo necesario para responder. Ese ciclo "pensar → usar herramienta →
leer resultado → repetir" es lo que convierte una llamada en un agente.

El ciclo lo maneja el SDK de Anthropic (`client.beta.messages.tool_runner`). Nosotros solo escribimos
las herramientas. Todas son de SOLO LECTURA: el agente puede consultar clientes, comparativas y
tarifarios, pero no crea ni modifica nada.

Uso desde la terminal:

    python -m app.agente "¿Cuánto pagaría una familia de 40, 38 y 6 años en cada plan de salud?"
"""
from __future__ import annotations

import json
import sys
from dataclasses import dataclass, field
from datetime import date
from typing import Any

import anthropic
from anthropic import beta_tool

from . import config, db, tarifas
from .extraction import BETAS, ExtractionError, _client, _handle_api_errors, api_available

# Tope de vueltas del ciclo. Cada vuelta es una llamada a Claude; evita que un agente confundido
# gaste sin fin. Para preguntas normales bastan 2 o 3.
MAX_ITERACIONES = 10

SYSTEM_PROMPT = """Eres el asistente interno de una oficina de corredores de seguros en Venezuela que trabaja
con Mercantil Seguros, Oceánica de Seguros e Hispana de Seguros en los ramos de salud, hogar y PyME.
Quien te escribe es un asesor de la oficina.

Tienes herramientas para consultar los datos de la oficina: clientes, comparativas (cotizaciones ya
cargadas, con sus planes y primas) y tarifarios de salud por rango de edad. Úsalas siempre que la
pregunta dependa de datos; no adivines ni inventes nombres, primas o coberturas. Si una herramienta
devuelve una lista vacía, dilo tal cual.

Cómo trabajar:
- Si te dan un nombre de cliente, búscalo primero con buscar_clientes y luego consulta sus comparativas.
- Si te dan edades y preguntan precios, usa cotizar_por_tarifario (si no indican planes, cotiza todos).
- Si piden detalles de una comparativa (planes, primas, coberturas), usa ver_comparativa.
- Puedes encadenar varias herramientas en una misma pregunta.
- Responde en español, breve y concreto, con montos y moneda. Usa viñetas cuando compares opciones.
- Si falta un dato para responder (por ejemplo la edad), pídelo en vez de suponerlo.
- Al final, si usaste tarifarios marcados como ejemplo, advierte que son primas de prueba."""


# --------------------------------------------------------------------------- herramientas

def _json(data: Any) -> str:
    """Las herramientas devuelven texto; JSON compacto es lo más fácil de leer para Claude."""
    return json.dumps(data, ensure_ascii=False, default=str)


def _label(company: str, company_name: str | None) -> str:
    if company == "otra" and company_name:
        return company_name
    return config.COMPANIAS.get(company, company_name or company)


@beta_tool
def fecha_actual() -> str:
    """Devuelve la fecha de hoy en formato AAAA-MM-DD. Úsala para preguntas sobre "esta semana", "este mes", etc."""
    return date.today().isoformat()


@beta_tool
def buscar_clientes(texto: str) -> str:
    """Busca clientes de la oficina por nombre, cédula/RIF, teléfono o correo.

    Args:
        texto: Parte del nombre, documento, teléfono o correo del cliente. Vacío devuelve los más recientes.
    """
    like = f"%{texto.strip()}%"
    with db.get_conn() as conn:
        rows = conn.execute(
            "SELECT c.id, c.name, c.document_id, c.phone, c.email, c.notes, c.created_at, "
            "(SELECT COUNT(*) FROM comparisons k WHERE k.client_id=c.id) AS comparativas "
            "FROM clients c WHERE c.name LIKE ? OR IFNULL(c.document_id,'') LIKE ? "
            "OR IFNULL(c.phone,'') LIKE ? OR IFNULL(c.email,'') LIKE ? "
            "ORDER BY c.created_at DESC LIMIT 20",
            (like, like, like, like),
        ).fetchall()
    return _json(db.rows_to_list(rows))


@beta_tool
def listar_comparativas(client_id: int | None = None, ramo: str | None = None, limite: int = 20) -> str:
    """Lista comparativas (cotizaciones) de la oficina, las más recientes primero.

    Args:
        client_id: Id del cliente (obtenido con buscar_clientes). Si se omite, lista las de todos los clientes.
        ramo: Filtra por ramo: "salud", "hogar" o "pyme". Si se omite, todos.
        limite: Máximo de comparativas a devolver (1 a 50).
    """
    limite = max(1, min(int(limite), 50))
    sql = (
        "SELECT c.id, c.title, c.ramo, c.status, c.created_at, c.updated_at, c.client_id, cl.name AS cliente, "
        "u.full_name AS asesor, "
        "(SELECT COUNT(*) FROM quotes q WHERE q.comparison_id=c.id AND q.included=1 "
        " AND q.extraction_status IN ('ok','manual')) AS planes_listos, "
        "(SELECT MIN(q.prima_anual) FROM quotes q WHERE q.comparison_id=c.id AND q.included=1 "
        " AND q.extraction_status IN ('ok','manual')) AS prima_minima, "
        "CASE WHEN c.analysis IS NOT NULL THEN 1 ELSE 0 END AS tiene_analisis, "
        "CASE WHEN c.recommended_quote_id IS NOT NULL THEN 1 ELSE 0 END AS tiene_recomendacion "
        "FROM comparisons c JOIN clients cl ON cl.id=c.client_id LEFT JOIN users u ON u.id=c.created_by WHERE 1=1"
    )
    params: list[Any] = []
    if client_id is not None:
        sql += " AND c.client_id=?"
        params.append(int(client_id))
    if ramo:
        sql += " AND c.ramo=?"
        params.append(ramo.strip().lower())
    sql += " ORDER BY c.updated_at DESC LIMIT ?"
    params.append(limite)
    with db.get_conn() as conn:
        rows = db.rows_to_list(conn.execute(sql, params).fetchall())
    for r in rows:
        r["ramo_label"] = config.RAMOS.get(r["ramo"], r["ramo"])
    return _json(rows)


@beta_tool
def ver_comparativa(comparison_id: int) -> str:
    """Devuelve el detalle de una comparativa: cliente, planes incluidos con prima, suma asegurada,
    deducible, coberturas y exclusiones, el plan recomendado y si ya tiene análisis.

    Args:
        comparison_id: Id de la comparativa (obtenido con listar_comparativas).
    """
    with db.get_conn() as conn:
        row = conn.execute(
            "SELECT c.*, cl.name AS cliente, cl.phone AS cliente_telefono FROM comparisons c "
            "JOIN clients cl ON cl.id=c.client_id WHERE c.id=?",
            (int(comparison_id),),
        ).fetchone()
        if row is None:
            return _json({"error": f"No existe la comparativa {comparison_id}"})
        comp = dict(row)
        quotes = [
            db.quote_from_row(r)
            for r in conn.execute(
                "SELECT * FROM quotes WHERE comparison_id=? ORDER BY prima_anual IS NULL, prima_anual", (int(comparison_id),)
            ).fetchall()
        ]
    planes = []
    for q in quotes:
        if not q["included"] or q["extraction_status"] not in ("ok", "manual"):
            continue
        planes.append(
            {
                "quote_id": q["id"],
                "compania": _label(q["company"], q.get("company_name")),
                "plan": q.get("plan"),
                "moneda": q.get("moneda"),
                "prima_anual": q.get("prima_anual"),
                "prima_total": q.get("prima_total"),
                "primas_fraccionadas": q.get("primas_fraccionadas"),
                "suma_asegurada": q.get("suma_asegurada"),
                "deducible": q.get("deducible"),
                "vigencia": q.get("vigencia"),
                "coberturas": q.get("coberturas"),
                "exclusiones": q.get("exclusiones"),
                "observaciones": q.get("observaciones"),
                "recomendado": q["id"] == comp.get("recommended_quote_id"),
            }
        )
    return _json(
        {
            "id": comp["id"],
            "titulo": comp["title"],
            "cliente": comp["cliente"],
            "cliente_telefono": comp.get("cliente_telefono"),
            "ramo": config.RAMOS.get(comp["ramo"], comp["ramo"]),
            "estado": comp["status"],
            "notas": comp.get("notes"),
            "creada": comp["created_at"],
            "planes_incluidos": planes,
            "tiene_analisis": bool(comp.get("analysis")),
            "recomendacion_al_cliente": comp.get("recommendation"),
        }
    )


@beta_tool
def listar_tarifarios(ramo: str | None = None) -> str:
    """Lista los tarifarios activos (planes con prima por rango de edad) con su id, compañía, plan,
    moneda, rango de edades cubierto, suma asegurada y deducible.

    Args:
        ramo: Filtra por ramo ("salud", "hogar", "pyme"). Si se omite, todos.
    """
    out = []
    for t in tarifas.list_tariffs(only_active=True):
        if ramo and t["ramo"] != ramo.strip().lower():
            continue
        out.append(
            {
                "tariff_id": t["id"],
                "compania": t["company_label"],
                "plan": t["plan"],
                "ramo": t["ramo_label"],
                "moneda": t["moneda"],
                "edad_min": t["edad_min"],
                "edad_max": t["edad_max"],
                "suma_asegurada": t["suma_asegurada"],
                "deducible": t["deducible"],
                "es_ejemplo": bool(t["is_sample"]),
                "coberturas": t["coberturas"],
            }
        )
    return _json(out)


@beta_tool
def cotizar_por_tarifario(edades: list[int], tariff_ids: list[int] | None = None) -> str:
    """Calcula la prima anual de cada plan de salud para un grupo de asegurados según los tarifarios
    por edad. Devuelve el total por plan y el detalle por persona; "prima": null significa que la edad
    está fuera del rango del tarifario.

    Args:
        edades: Edad de cada asegurado, por ejemplo [40, 38, 6].
        tariff_ids: Ids de tarifarios a cotizar (de listar_tarifarios). Si se omite, cotiza todos los activos.
    """
    edades = [int(e) for e in edades]
    if not edades or any(e < 0 or e > 120 for e in edades):
        return _json({"error": "Indica edades válidas entre 0 y 120"})
    if not tariff_ids:
        tariff_ids = [t["id"] for t in tarifas.list_tariffs(only_active=True)]
    insureds = [{"nombre": f"Asegurado {i + 1}", "edad": e} for i, e in enumerate(edades)]
    results = tarifas.quick_quote(insureds, [int(x) for x in tariff_ids])
    out = []
    for r in results:
        out.append(
            {
                "tariff_id": r["id"],
                "compania": r["company_label"],
                "plan": r["plan"],
                "moneda": r["moneda"],
                "total_anual": r["total"],
                "cotizacion_completa": r["complete"],
                "detalle": [{"edad": l["edad"], "prima": l["prima"]} for l in r["lines"]],
                "suma_asegurada": r["suma_asegurada"],
                "deducible": r["deducible"],
                "es_ejemplo": bool(r["is_sample"]),
            }
        )
    out.sort(key=lambda x: (x["total_anual"] is None, x["total_anual"] or 0))
    return _json(out)


HERRAMIENTAS = [fecha_actual, buscar_clientes, listar_comparativas, ver_comparativa, listar_tarifarios, cotizar_por_tarifario]


# --------------------------------------------------------------------------- el agente

@dataclass
class Paso:
    """Una herramienta que el agente decidió usar, con lo que pidió y lo que obtuvo."""

    herramienta: str
    entrada: dict[str, Any]
    resultado: str
    error: bool = False


@dataclass
class RespuestaAgente:
    respuesta: str
    pasos: list[Paso] = field(default_factory=list)
    vueltas: int = 0


def _recortar(texto: str, n: int = 1500) -> str:
    return texto if len(texto) <= n else texto[:n] + f"… ({len(texto)} caracteres)"


def preguntar(pregunta: str) -> RespuestaAgente:
    """Ejecuta el agente con una pregunta y devuelve la respuesta final más la traza de herramientas."""
    pregunta = (pregunta or "").strip()
    if not pregunta:
        raise ExtractionError("Escribe una pregunta.")
    if not api_available():
        raise ExtractionError("No hay clave de API configurada (ANTHROPIC_API_KEY). El asistente necesita Claude.")

    client = _client()
    resultado = RespuestaAgente(respuesta="")
    try:
        runner = client.beta.messages.tool_runner(
            model=config.CLAUDE_MODEL,
            max_tokens=8000,
            betas=BETAS,
            fallbacks="default",
            output_config={"effort": "medium"},
            system=SYSTEM_PROMPT,
            tools=HERRAMIENTAS,
            messages=[{"role": "user", "content": pregunta}],
            max_iterations=MAX_ITERACIONES,
        )
        ultimo = None
        # Cada vuelta del ciclo entrega un mensaje de Claude. Si trae llamadas a herramientas, el SDK
        # las ejecuta y le devuelve los resultados; si no, el agente terminó.
        for mensaje in runner:
            ultimo = mensaje
            resultado.vueltas += 1
            if mensaje.stop_reason == "refusal":
                raise ExtractionError("Claude no pudo atender esta pregunta (respuesta rechazada).")
            llamadas = [b for b in mensaje.content if b.type == "tool_use"]
            if not llamadas:
                continue
            respuesta_tools = runner.generate_tool_call_response()
            resultados_por_id: dict[str, Any] = {}
            if respuesta_tools is not None:
                for bloque in respuesta_tools["content"]:
                    if bloque.get("type") == "tool_result":
                        resultados_por_id[bloque["tool_use_id"]] = bloque
            for llamada in llamadas:
                bloque = resultados_por_id.get(llamada.id, {})
                contenido = bloque.get("content", "")
                if not isinstance(contenido, str):
                    contenido = _json(contenido)
                resultado.pasos.append(
                    Paso(
                        herramienta=llamada.name,
                        entrada=dict(llamada.input) if isinstance(llamada.input, dict) else {"input": llamada.input},
                        resultado=_recortar(contenido),
                        error=bool(bloque.get("is_error")),
                    )
                )
    except (anthropic.APIStatusError, anthropic.APIConnectionError) as exc:
        raise _handle_api_errors(exc) from exc

    if ultimo is None:
        raise ExtractionError("Claude no devolvió ninguna respuesta.")
    if ultimo.stop_reason == "max_tokens":
        raise ExtractionError("La respuesta fue demasiado larga; intenta una pregunta más acotada.")
    texto = "".join(b.text for b in ultimo.content if b.type == "text").strip()
    if not texto:
        if ultimo.stop_reason == "tool_use":
            raise ExtractionError(
                f"El agente no terminó en {MAX_ITERACIONES} vueltas. Intenta una pregunta más sencilla."
            )
        raise ExtractionError("Claude devolvió una respuesta vacía.")
    resultado.respuesta = texto
    return resultado


# --------------------------------------------------------------------------- uso desde la terminal

def _main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 2
    try:
        r = preguntar(" ".join(argv[1:]))
    except ExtractionError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    for i, paso in enumerate(r.pasos, 1):
        print(f"[{i}] {paso.herramienta}({json.dumps(paso.entrada, ensure_ascii=False)})")
        print(f"    → {_recortar(paso.resultado, 300)}")
    print()
    print(r.respuesta)
    print(f"\n({r.vueltas} vueltas, {len(r.pasos)} herramientas usadas)")
    return 0


if __name__ == "__main__":
    sys.exit(_main(sys.argv))
