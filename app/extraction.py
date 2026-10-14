"""Lectura de PDFs de cotización con Claude y generación del análisis comparativo."""
from __future__ import annotations

import base64
import json
from pathlib import Path
from typing import Literal, Optional

import anthropic
from pydantic import BaseModel, Field

from . import config

BETAS = ["server-side-fallback-2026-07-01"]


class Cobertura(BaseModel):
    nombre: str = Field(description="Nombre de la cobertura o beneficio")
    suma_asegurada: Optional[str] = Field(description="Límite o suma asegurada con su moneda, tal como aparece")
    deducible: Optional[str] = Field(description="Deducible o copago aplicable a esta cobertura, si lo indica")
    detalle: Optional[str] = Field(description="Condición, sublímite, período de espera u otra nota breve")


class PlanExtraido(BaseModel):
    plan: str = Field(description="Nombre del plan u opción tal como aparece (por ejemplo 'Plan Oro', 'Opción 2', 'Suma asegurada USD 50.000')")
    prima_anual: Optional[float] = Field(description="Prima anual neta de este plan en número, sin símbolos")
    prima_total: Optional[float] = Field(description="Prima total anual a pagar de este plan incluyendo impuestos y recargos, si la distingue")
    primas_fraccionadas: Optional[str] = Field(description="Opciones de pago fraccionado de este plan con sus montos, en una línea")
    suma_asegurada: Optional[str] = Field(description="Suma asegurada o límite máximo principal del plan")
    deducible: Optional[str] = Field(description="Deducible o copago principal del plan")
    coberturas: list[Cobertura] = Field(description="Coberturas, beneficios y sublímites de este plan")
    exclusiones: list[str] = Field(description="Exclusiones, períodos de espera o condiciones importantes de este plan")
    observaciones: Optional[str] = Field(description="Cualquier dato relevante de este plan que no encaje en los otros campos")


class CotizacionExtraida(BaseModel):
    compania: Optional[str] = Field(description="Nombre de la aseguradora que emite la cotización, tal como aparece")
    ramo_detectado: Literal["salud", "hogar", "pyme", "otro"] = Field(description="Ramo del seguro cotizado")
    asegurado: Optional[str] = Field(description="Nombre del tomador, asegurado o empresa, si aparece")
    moneda: Optional[str] = Field(description="Moneda principal de las primas, por ejemplo USD, EUR o Bs")
    vigencia: Optional[str] = Field(description="Período de vigencia o fecha de inicio y fin")
    fecha_cotizacion: Optional[str] = Field(description="Fecha de emisión o validez de la cotización")
    planes: list[PlanExtraido] = Field(description="Todos los planes u opciones cotizados en el documento, uno por entrada")
    observaciones_generales: Optional[str] = Field(description="Notas que aplican a todo el documento")
    confianza: Literal["alta", "media", "baja"] = Field(description="Qué tan completa y legible fue la lectura del PDF")


SYSTEM_PROMPT = """Eres un asistente experto en seguros en Venezuela que trabaja para un corredor de seguros.
Recibirás el PDF de una cotización emitida por una aseguradora (Mercantil Seguros, Oceánica de Seguros,
Hispana de Seguros u otra) para los ramos de salud, hogar o PyME.

Tu tarea es extraer con exactitud los datos de la cotización en el formato solicitado:
- Las cotizaciones suelen traer VARIOS planes u opciones (por ejemplo distintos nombres de plan, distintas
  sumas aseguradas o distintos deducibles, cada uno con su prima). Extrae TODOS como entradas separadas en
  "planes", en el mismo orden del documento. Si solo hay uno, devuelve una sola entrada.
- Si un mismo plan aparece con varias sumas aseguradas y primas (por ejemplo en una tabla), cada combinación
  es una entrada distinta; nómbrala combinando el plan y la suma, como "Plan Oro - USD 50.000".
- Copia montos, límites y deducibles tal como aparecen, incluyendo la moneda, salvo en los campos numéricos.
- En los campos numéricos (prima_anual, prima_total) escribe solo el número, sin símbolos ni separadores de miles.
- Si un dato no aparece en el documento, déjalo en null. Nunca inventes valores.
- Lista las coberturas de cada plan con sus límites; en salud incluye cobertura máxima, emergencias, maternidad,
  hospitalización, ambulatorio, odontología, red de clínicas, períodos de espera y copagos si aparecen.
  En hogar incluye estructura, contenido, robo, responsabilidad civil, daños por agua, incendio y asistencia.
  En PyME incluye incendio, robo, responsabilidad civil, equipos, pérdida de beneficios, fidelidad y asistencia.
- Si las coberturas son comunes a todos los planes y solo cambian los límites, repítelas en cada plan con el
  límite que le corresponde.
- Responde en español."""

ANALYSIS_PROMPT = """Eres un asesor de seguros senior en Venezuela. Un corredor te entrega las cotizaciones de
varias aseguradoras (a veces varios planes de una misma aseguradora) para un mismo cliente y ramo, ya
extraídas en formato estructurado.

Redacta un análisis comparativo breve y claro, en español, listo para enviarle al cliente:
1. Un resumen de dos o tres líneas con la diferencia principal entre las opciones.
2. Una lista de ventajas y desventajas de cada plan (precio, coberturas, límites, deducibles, exclusiones).
   Si hay varios planes de una misma compañía, explica en qué se diferencian entre sí.
3. Una recomendación razonada, aclarando para qué perfil de cliente conviene cada opción.
4. Datos que faltan o que conviene confirmar con la aseguradora antes de decidir.

Usa solo la información entregada. No inventes coberturas ni precios. Si los datos de un plan están
incompletos, dilo. Escribe en texto plano con títulos cortos y viñetas, sin tablas."""


class ExtractionError(Exception):
    pass


def api_available() -> bool:
    return bool(config.ANTHROPIC_API_KEY)


def detect_company(name: str | None) -> str:
    """Convierte el nombre de la aseguradora leído del PDF en la clave interna."""
    text = (name or "").lower()
    if "mercantil" in text:
        return "mercantil"
    if "ocean" in text or "oceán" in text:
        return "oceanica"
    if "hispana" in text:
        return "hispana"
    return "otra"


def _client() -> anthropic.Anthropic:
    if not api_available():
        raise ExtractionError(
            "No hay clave de API configurada (ANTHROPIC_API_KEY). "
            "Puedes cargar los datos manualmente."
        )
    return anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY, timeout=900, max_retries=3)


def _handle_api_errors(exc: Exception) -> ExtractionError:
    if isinstance(exc, anthropic.AuthenticationError):
        return ExtractionError("La clave de API de Anthropic no es válida.")
    if isinstance(exc, anthropic.RateLimitError):
        return ExtractionError("Límite de uso de la API alcanzado. Intenta de nuevo en unos minutos.")
    if isinstance(exc, anthropic.APIStatusError):
        return ExtractionError(f"Error de la API de Claude ({exc.status_code}): {exc.message}")
    if isinstance(exc, anthropic.APIConnectionError):
        return ExtractionError("No se pudo conectar con la API de Claude.")
    return ExtractionError(f"Error inesperado: {exc}")


def extract_quote(pdf_path: Path, company_label: str | None, ramo_label: str) -> CotizacionExtraida:
    """Lee un PDF de cotización y devuelve sus datos estructurados, con todos sus planes."""
    client = _client()
    pdf_b64 = base64.standard_b64encode(pdf_path.read_bytes()).decode("ascii")
    hint = (
        f"Esta cotización debería ser de {company_label} para el ramo {ramo_label}."
        if company_label
        else f"Esta cotización es para el ramo {ramo_label}. Identifica la aseguradora que la emite."
    )
    try:
        # Streaming: la librería lo exige para peticiones largas (PDFs grandes) y evita cortes por tiempo.
        with client.beta.messages.stream(
            model=config.CLAUDE_MODEL,
            max_tokens=32000,
            betas=BETAS,
            fallbacks="default",
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "document",
                            "source": {"type": "base64", "media_type": "application/pdf", "data": pdf_b64},
                        },
                        {"type": "text", "text": f"{hint} Extrae todos los planes y datos de la cotización."},
                    ],
                }
            ],
            output_format=CotizacionExtraida,
        ) as stream:
            response = stream.get_final_message()
    except (anthropic.APIStatusError, anthropic.APIConnectionError) as exc:
        raise _handle_api_errors(exc) from exc

    if response.stop_reason == "refusal":
        raise ExtractionError("Claude no pudo procesar este documento (respuesta rechazada).")
    if response.stop_reason == "max_tokens":
        raise ExtractionError("El documento es demasiado largo para procesarlo de una vez.")
    parsed = _parsed_from_message(response)
    if parsed is None:
        raise ExtractionError("Claude no devolvió datos estructurados para este PDF.")
    if not parsed.planes:
        raise ExtractionError("Claude no encontró planes con prima en este PDF.")
    return parsed


def _parsed_from_message(message) -> CotizacionExtraida | None:
    """Obtiene el objeto estructurado de la respuesta, venga ya parseado o como texto JSON."""
    for block in message.content:
        if getattr(block, "type", None) != "text":
            continue
        parsed = getattr(block, "parsed_output", None)
        if isinstance(parsed, CotizacionExtraida):
            return parsed
        text = (getattr(block, "text", "") or "").strip()
        if text:
            try:
                return CotizacionExtraida.model_validate_json(text)
            except ValueError:
                continue
    return None


def generate_analysis(client_name: str, ramo_label: str, quotes: list[dict]) -> str:
    """Genera el análisis comparativo en texto a partir de las cotizaciones ya extraídas."""
    client = _client()
    payload = [
        {
            "compania": q.get("company_label"),
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
        }
        for q in quotes
    ]
    user_text = (
        f"Cliente: {client_name}\nRamo: {ramo_label}\n\n"
        f"Cotizaciones:\n{json.dumps(payload, ensure_ascii=False, indent=2)}"
    )
    try:
        with client.beta.messages.stream(
            model=config.CLAUDE_MODEL,
            max_tokens=16000,
            betas=BETAS,
            fallbacks="default",
            system=ANALYSIS_PROMPT,
            messages=[{"role": "user", "content": user_text}],
        ) as stream:
            response = stream.get_final_message()
    except (anthropic.APIStatusError, anthropic.APIConnectionError) as exc:
        raise _handle_api_errors(exc) from exc

    if response.stop_reason == "refusal":
        raise ExtractionError("Claude no pudo generar el análisis (respuesta rechazada).")
    text = "".join(block.text for block in response.content if block.type == "text").strip()
    if not text:
        raise ExtractionError("Claude devolvió una respuesta vacía.")
    return text
