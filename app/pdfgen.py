"""Generación del PDF de la comparativa para enviar al cliente."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from fpdf import FPDF
from fpdf.enums import XPos, YPos

FONT_DIR = Path(__file__).resolve().parent / "static" / "fonts"
PRIMARY = (11, 95, 165)
MUTED = (107, 118, 132)
TEXT = (29, 39, 51)
LINE = (221, 227, 234)
BEST = (31, 138, 76)
BEST_BG = (238, 250, 242)
HEAD_BG = (243, 245, 248)


def fmt_money(value: float | None, currency: str | None) -> str:
    if value is None:
        return "—"
    text = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{currency} {text}" if currency else text


class ComparativaPDF(FPDF):
    def __init__(self) -> None:
        super().__init__(orientation="L", unit="mm", format="A4")
        self.add_font("DejaVu", "", str(FONT_DIR / "DejaVuSans.ttf"))
        self.add_font("DejaVu", "B", str(FONT_DIR / "DejaVuSans-Bold.ttf"))
        self.set_auto_page_break(auto=True, margin=15)
        self.set_margins(12, 12, 12)

    def footer(self) -> None:
        self.set_y(-10)
        self.set_font("DejaVu", "", 7)
        self.set_text_color(*MUTED)
        self.cell(0, 5, f"Página {self.page_no()}", align="R")


def build_pdf(comp: dict[str, Any], settings: dict[str, str]) -> bytes:
    pdf = ComparativaPDF()
    pdf.add_page()
    ready = comp["ready"]
    width = pdf.w - pdf.l_margin - pdf.r_margin

    # Encabezado
    pdf.set_font("DejaVu", "B", 16)
    pdf.set_text_color(*TEXT)
    pdf.cell(width * 0.7, 9, f"Comparativa de seguros · {comp['ramo_label']}", new_x=XPos.RIGHT, new_y=YPos.TOP)
    pdf.set_font("DejaVu", "", 9)
    pdf.set_text_color(*MUTED)
    pdf.cell(width * 0.3, 9, comp["created_at"][:10], align="R", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_font("DejaVu", "", 10)
    who = f"Preparada para {comp['client_name']}"
    if comp.get("client_document"):
        who += f" · {comp['client_document']}"
    if settings.get("oficina_nombre"):
        who += f" · por {settings['oficina_nombre']}"
    pdf.cell(width, 6, who, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_draw_color(*PRIMARY)
    pdf.set_line_width(0.6)
    pdf.line(pdf.l_margin, pdf.get_y() + 1, pdf.l_margin + width, pdf.get_y() + 1)
    pdf.ln(5)

    if not ready:
        pdf.set_font("DejaVu", "", 11)
        pdf.cell(width, 8, "No hay planes seleccionados en esta comparativa.")
        return bytes(pdf.output())

    # Bloques por compañía (un plan por línea, como en los mensajes de WhatsApp)
    for g in comp.get("groups", []):
        color = _hex(g["color"])
        block_h = 8 + 9 * len(g["quotes"]) + 2
        if pdf.get_y() + block_h > pdf.h - 18:
            pdf.add_page()
        y = pdf.get_y()
        pdf.set_fill_color(*color)
        pdf.rect(pdf.l_margin, y, 2, block_h, style="F")
        pdf.set_draw_color(*LINE)
        pdf.set_line_width(0.3)
        pdf.rect(pdf.l_margin, y, width, block_h)
        pdf.set_xy(pdf.l_margin + 5, y + 1.5)
        pdf.set_font("DejaVu", "B", 10.5)
        pdf.set_text_color(*color)
        pdf.cell(width - 10, 6, g["label"], new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        for q in g["quotes"]:
            best = q["id"] == comp.get("cheapest_id")
            ry = pdf.get_y() + 0.5
            if best:
                pdf.set_fill_color(*BEST_BG)
                pdf.rect(pdf.l_margin + 2, ry, width - 2, 9, style="F")
            pdf.set_xy(pdf.l_margin + 5, ry + 0.5)
            pdf.set_font("DejaVu", "B", 8.5)
            pdf.set_text_color(*TEXT)
            pdf.cell(width * 0.45, 4.5, _fit(pdf, q.get("plan") or "Plan", width * 0.45), new_x=XPos.RIGHT, new_y=YPos.TOP)
            pdf.set_font("DejaVu", "B", 10)
            pdf.set_text_color(*(BEST if best else color))
            mensual = fmt_money(q["prima_anual"] / 12, q["moneda"]) + " /mes" if q["prima_anual"] is not None else "Por confirmar"
            pdf.cell(width * 0.25, 4.5, mensual, align="R", new_x=XPos.RIGHT, new_y=YPos.TOP)
            pdf.set_font("DejaVu", "", 8)
            pdf.set_text_color(*MUTED)
            pdf.cell(width * 0.25, 4.5, (fmt_money(q["prima_anual"], q["moneda"]) + " al año") if q["prima_anual"] is not None else "", align="R", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            pdf.set_x(pdf.l_margin + 5)
            pdf.set_font("DejaVu", "", 7.5)
            meta = " · ".join(v for v in (
                f"Suma asegurada {q['suma_asegurada']}" if q.get("suma_asegurada") else "",
                f"Deducible {q['deducible']}" if q.get("deducible") else "",
                "Más económico" if best else "",
                "Mayor suma asegurada" if q["id"] == comp.get("best_cover_id") else "",
            ) if v)
            pdf.cell(width - 10, 4, _fit(pdf, meta, width - 12), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_y(y + block_h + 4)
    pdf.ln(2)

    # Tabla de detalle, en bloques de hasta 5 columnas para que se lea bien
    chunk = 5
    for i in range(0, len(ready), chunk):
        _draw_table(pdf, comp, ready[i : i + chunk], width, first=(i == 0))

    if comp.get("analysis"):
        pdf.ln(4)
        if pdf.get_y() > pdf.h - 60:
            pdf.add_page()
        pdf.set_font("DejaVu", "B", 11)
        pdf.set_text_color(*TEXT)
        pdf.cell(width, 7, "Análisis y recomendación", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_font("DejaVu", "", 8.5)
        pdf.multi_cell(width, 4.5, comp["analysis"], new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.ln(4)
    pdf.set_font("DejaVu", "", 7.5)
    pdf.set_text_color(*MUTED)
    contact = " · ".join(
        v for v in (settings.get("oficina_nombre"), settings.get("oficina_telefono"), settings.get("oficina_correo")) if v
    )
    if contact:
        pdf.multi_cell(width, 4, contact, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.multi_cell(
        width, 4,
        settings.get("oficina_pie")
        or "Las primas y coberturas provienen de las cotizaciones emitidas por cada aseguradora y están sujetas a sus condiciones generales y particulares.",
        new_x=XPos.LMARGIN, new_y=YPos.NEXT,
    )
    return bytes(pdf.output())


def _draw_table(pdf: FPDF, comp: dict[str, Any], cols: list[dict[str, Any]], width: float, first: bool) -> None:
    n = len(cols)
    label_w = 42
    col_w = (width - label_w) / n
    if pdf.get_y() > pdf.h - 70:
        pdf.add_page()
    elif not first:
        pdf.ln(4)

    def row(label: str, values: list[str], bold: bool = False, section: bool = False) -> None:
        if section:
            pdf.set_fill_color(*HEAD_BG)
            pdf.set_font("DejaVu", "B", 7.5)
            pdf.set_text_color(*TEXT)
            pdf.cell(width, 6, label.upper(), fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            pdf.set_font("DejaVu", "", 8)
            return
        pdf.set_font("DejaVu", "B" if bold else "", 8)
        heights = [_lines(pdf, v, col_w - 2) for v in values]
        pdf.set_font("DejaVu", "B", 7.5)
        heights.append(_lines(pdf, label, label_w - 2))
        h = max(heights) * 4 + 2
        if pdf.get_y() + h > pdf.h - 18:
            pdf.add_page()
        y = pdf.get_y()
        x = pdf.l_margin
        pdf.set_draw_color(*LINE)
        pdf.set_line_width(0.2)
        pdf.set_text_color(*MUTED)
        pdf.set_font("DejaVu", "B", 7.5)
        pdf.set_xy(x, y)
        pdf.multi_cell(label_w - 2, 4, label, border=0, align="L", new_x=XPos.RIGHT, new_y=YPos.TOP, max_line_height=4)
        pdf.set_font("DejaVu", "B" if bold else "", 8)
        for i, v in enumerate(values):
            q = cols[i]
            cx = x + label_w + i * col_w
            if q["id"] == comp.get("cheapest_id") and bold:
                pdf.set_fill_color(*BEST_BG)
                pdf.rect(cx, y, col_w, h, style="F")
            pdf.set_text_color(*TEXT)
            pdf.set_xy(cx + 1, y + 1)
            pdf.multi_cell(col_w - 2, 4, v, border=0, align="L", new_x=XPos.RIGHT, new_y=YPos.TOP, max_line_height=4)
        pdf.set_y(y + h)
        pdf.line(x, y + h, x + width, y + h)

    # cabecera de columnas
    pdf.set_fill_color(*HEAD_BG)
    y = pdf.get_y()
    pdf.set_font("DejaVu", "B", 8)
    pdf.set_text_color(*TEXT)
    pdf.cell(label_w, 10, "", fill=True)
    for q in cols:
        x = pdf.get_x()
        pdf.set_xy(x, y)
        pdf.set_font("DejaVu", "B", 8)
        pdf.set_text_color(*TEXT)
        pdf.multi_cell(col_w, 5, _fit(pdf, q["company_label"], col_w - 2), fill=True, new_x=XPos.RIGHT, new_y=YPos.TOP, max_line_height=5)
        pdf.set_xy(x, y + 5)
        pdf.set_font("DejaVu", "", 7)
        pdf.set_text_color(*MUTED)
        pdf.multi_cell(col_w, 5, _fit(pdf, q.get("plan") or "—", col_w - 2), fill=True, new_x=XPos.RIGHT, new_y=YPos.TOP, max_line_height=5)
        pdf.set_xy(x + col_w, y)
    pdf.set_y(y + 10)

    row("Prima anual", [fmt_money(q["prima_anual"], q["moneda"]) for q in cols], bold=True)
    row("Prima total (con impuestos)", [fmt_money(q["prima_total"], q["moneda"]) for q in cols])
    row("Pago fraccionado", [q.get("primas_fraccionadas") or "—" for q in cols])
    row("Suma asegurada", [q.get("suma_asegurada") or "—" for q in cols])
    row("Deducible", [q.get("deducible") or "—" for q in cols])
    row("Vigencia", [q.get("vigencia") or "—" for q in cols])
    if comp["coverage_matrix"]:
        row("Coberturas", [], section=True)
        for cov in comp["coverage_matrix"]:
            vals = []
            for q in cols:
                c = cov["por_cotizacion"].get(q["id"])
                if not c:
                    vals.append("No indica")
                    continue
                text = c.get("suma_asegurada") or "Incluida"
                if c.get("deducible"):
                    text += f"\nDeducible: {c['deducible']}"
                if c.get("detalle"):
                    text += f"\n{c['detalle']}"
                vals.append(text)
            row(cov["nombre"], vals)
    row("Exclusiones y condiciones", [], section=True)
    row("Exclusiones", ["\n".join(f"• {e}" for e in q["exclusiones"]) if q["exclusiones"] else "—" for q in cols])
    row("Observaciones", [q.get("observaciones") or "—" for q in cols])


def _hex(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)


def _fit(pdf: FPDF, text: str, max_w: float) -> str:
    text = text or ""
    if pdf.get_string_width(text) <= max_w:
        return text
    while text and pdf.get_string_width(text + "…") > max_w:
        text = text[:-1]
    return text + "…"


def _lines(pdf: FPDF, text: str, max_w: float) -> int:
    lines = pdf.multi_cell(max_w, 4, text or "—", dry_run=True, output="LINES", align="L")
    return max(1, len(lines))
