"""Aplicación web del cotizador comparativo de seguros."""
from __future__ import annotations

import json
import re
import secrets
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any
from urllib.parse import quote

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from . import auth, config, db, extraction, pdfgen, tarifas

BASE_DIR = Path(__file__).resolve().parent

@asynccontextmanager
async def lifespan(_: FastAPI):
    db.init_db()
    auth.ensure_admin()
    tarifas.seed_samples()
    yield


app = FastAPI(title="Cotizador de Seguros", docs_url=None, redoc_url=None, lifespan=lifespan)
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")
templates.env.globals.update(COMPANIAS=config.COMPANIAS, RAMOS=config.RAMOS, ROLES=config.ROLES, COMPANY_COLORS=config.COMPANY_COLORS)


# --------------------------------------------------------------------------- utilidades

FLASH_COOKIE = "cotizador_flash"


def render(request: Request, template: str, **ctx: Any) -> HTMLResponse:
    flash = None
    raw = request.cookies.get(FLASH_COOKIE)
    if raw:
        try:
            flash = json.loads(raw)
        except json.JSONDecodeError:
            flash = None
    ctx.setdefault("user", auth.current_user(request))
    ctx["flash"] = flash
    ctx["api_available"] = extraction.api_available()
    status_code = ctx.pop("status_code", 200)
    response = templates.TemplateResponse(request, template, ctx, status_code=status_code)
    if raw:
        response.delete_cookie(FLASH_COOKIE)
    return response


def redirect(url: str, msg: str | None = None, kind: str = "ok") -> RedirectResponse:
    response = RedirectResponse(url, status_code=303)
    if msg:
        response.set_cookie(FLASH_COOKIE, json.dumps({"msg": msg, "kind": kind}), max_age=30, httponly=True)
    return response


def fmt_money(value: float | None, currency: str | None = None) -> str:
    if value is None:
        return "—"
    text = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{currency} {text}" if currency else text


templates.env.filters["money"] = fmt_money


def fmt_num(value: float | None) -> str:
    if value is None:
        return ""
    return str(int(value)) if float(value).is_integer() else f"{value:g}"


templates.env.filters["num"] = fmt_num


def fmt_when(value: str | None) -> str:
    """Fecha ISO en UTC a texto corto en hora de Venezuela (UTC-4)."""
    if not value:
        return "—"
    from datetime import datetime, timedelta, timezone
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        return value
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    local = dt.astimezone(timezone(timedelta(hours=-4)))
    return local.strftime("%d/%m %I:%M %p").lower().replace("am", "a. m.").replace("pm", "p. m.")


templates.env.filters["when"] = fmt_when


def _norm(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", name.lower().strip())


def _amount(text: str | None) -> float | None:
    """Saca el número principal de un texto como 'USD 50.000' o '$1,250.50'."""
    if not text:
        return None
    m = re.search(r"\d[\d.,]*", text)
    if not m:
        return None
    return tarifas.parse_number(m.group(0))


def ensure_share_token(comparison_id: int) -> str:
    with db.get_conn() as conn:
        row = conn.execute("SELECT share_token FROM comparisons WHERE id=?", (comparison_id,)).fetchone()
        if row is None:
            raise HTTPException(404, "Cotización no encontrada")
        if row["share_token"]:
            return row["share_token"]
        token = secrets.token_urlsafe(12)
        conn.execute("UPDATE comparisons SET share_token=? WHERE id=?", (token, comparison_id))
        return token


def client_view_context(request: Request, comp: dict[str, Any]) -> dict[str, Any]:
    settings = db.get_settings()
    token = comp.get("share_token") or ensure_share_token(comp["id"])
    share_url = str(request.base_url).rstrip("/") + f"/c/{token}"
    phone = wa_number(comp.get("client_phone"))
    text = whatsapp_summary(comp, share_url, settings)
    wa = f"https://wa.me/{phone}?text={quote(text)}" if phone else f"https://wa.me/?text={quote(text)}"
    advisor_wa = wa_number(comp.get("advisor_phone")) or wa_number(settings.get("oficina_telefono"))
    return {
        "settings": settings, "share_url": share_url, "whatsapp_url": wa, "share_text": text,
        "office_wa": advisor_wa, "token": token,
    }


def company_label(company: str, company_name: str | None) -> str:
    if company == "otra" and company_name:
        return company_name
    return config.COMPANIAS.get(company, company_name or company)


def load_comparison(comparison_id: int) -> dict[str, Any]:
    with db.get_conn() as conn:
        row = conn.execute(
            "SELECT c.*, cl.name AS client_name, cl.document_id AS client_document, "
            "cl.phone AS client_phone, cl.email AS client_email, u.full_name AS created_by_name, "
            "u.phone AS advisor_phone, u.email AS advisor_email, u.title AS advisor_title "
            "FROM comparisons c JOIN clients cl ON cl.id = c.client_id "
            "LEFT JOIN users u ON u.id = c.created_by WHERE c.id = ?",
            (comparison_id,),
        ).fetchone()
        if row is None:
            raise HTTPException(404, "Cotización no encontrada")
        comp = dict(row)
        documents = db.rows_to_list(
            conn.execute("SELECT * FROM documents WHERE comparison_id = ? ORDER BY created_at, id", (comparison_id,)).fetchall()
        )
        quotes = [
            db.quote_from_row(r)
            for r in conn.execute(
                "SELECT * FROM quotes WHERE comparison_id = ? ORDER BY created_at, id", (comparison_id,)
            ).fetchall()
        ]
    for d in documents:
        d["company_label"] = company_label(d["company"], d["company_name"]) if d["company"] != "auto" else "Detectando…"
        d["quotes"] = []
    by_doc = {d["id"]: d for d in documents}
    for q in quotes:
        q["company_label"] = company_label(q["company"], q["company_name"])
        q["label"] = f"{q['company_label']} · {q['plan']}" if q.get("plan") else q["company_label"]
        if q.get("document_id") in by_doc:
            by_doc[q["document_id"]]["quotes"].append(q)
    comp["documents"] = documents
    comp["quotes"] = quotes
    comp["manual_quotes"] = [q for q in quotes if q.get("document_id") not in by_doc]
    comp["ramo_label"] = config.RAMOS.get(comp["ramo"], comp["ramo"])
    ready = [q for q in quotes if q["included"] and q["extraction_status"] in ("ok", "manual")]
    ready.sort(key=lambda q: (q["prima_anual"] is None, q["prima_anual"] or 0, q["company_label"], q.get("plan") or ""))
    comp["ready"] = ready
    comp["coverage_matrix"] = build_coverage_matrix(comp["ready"])
    covered = [(q, _amount(q.get("suma_asegurada"))) for q in ready]
    covered = [(q, a) for q, a in covered if a is not None]
    comp["best_cover_id"] = max(covered, key=lambda t: t[1])[0]["id"] if len(covered) > 1 else None
    comp["groups"] = build_groups(ready)
    comp["recommended"] = next((q for q in ready if q["id"] == comp.get("recommended_quote_id")), None)
    comp["activity"] = load_activity(comparison_id, quotes)
    comp["pending"] = (
        any(d["extraction_status"] == "pendiente" for d in documents)
        or comp["analysis_status"] == "procesando"
        or comp.get("recommendation_status") == "procesando"
    )
    priced = [q for q in comp["ready"] if q["prima_anual"] is not None]
    comp["cheapest_id"] = min(priced, key=lambda q: q["prima_anual"])["id"] if len(priced) > 1 else None
    return comp


def load_activity(comparison_id: int, quotes: list[dict[str, Any]]) -> dict[str, Any]:
    """Resumen de lo que el cliente hizo con el enlace: aperturas y planes que le interesaron."""
    with db.get_conn() as conn:
        events = db.rows_to_list(
            conn.execute(
                "SELECT * FROM share_events WHERE comparison_id=? ORDER BY created_at DESC, id DESC LIMIT 200",
                (comparison_id,),
            ).fetchall()
        )
    by_id = {q["id"]: q for q in quotes}
    opens = [e for e in events if e["kind"] == "open"]
    choices = []
    for e in events:
        if e["kind"] in ("choose", "question"):
            q = by_id.get(e["quote_id"])
            choices.append({**e, "label": q["label"] if q else (e.get("detail") or "")})
    return {
        "opens": len(opens),
        "first_open": opens[-1]["created_at"] if opens else None,
        "last_open": opens[0]["created_at"] if opens else None,
        "choices": choices[:10],
        "events": events[:10],
    }


def log_event(comparison_id: int, kind: str, quote_id: int | None = None, detail: str | None = None) -> None:
    with db.get_conn() as conn:
        conn.execute(
            "INSERT INTO share_events (comparison_id, kind, quote_id, detail, created_at) VALUES (?, ?, ?, ?, ?)",
            (comparison_id, kind, quote_id, detail, db.now_iso()),
        )


def wa_number(text: str | None) -> str:
    """Convierte un teléfono venezolano escrito de cualquier forma al formato que usa WhatsApp."""
    digits = re.sub(r"\D", "", text or "")
    if digits.startswith("0") and len(digits) == 11:
        return "58" + digits[1:]
    if len(digits) == 10 and digits[0] in "42":
        return "58" + digits
    return digits


def build_groups(ready: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Agrupa los planes incluidos por compañía; cada grupo ordenado por prima y los grupos por su plan más barato."""
    groups: dict[str, dict[str, Any]] = {}
    for q in ready:  # ready ya viene ordenado por prima
        key = q["company_label"]
        g = groups.setdefault(
            key,
            {"company": q["company"], "label": key, "color": config.COMPANY_COLORS.get(q["company"], config.COMPANY_COLORS["otra"]), "quotes": []},
        )
        g["quotes"].append(q)
    def min_price(g: dict[str, Any]) -> tuple[bool, float]:
        prices = [q["prima_anual"] for q in g["quotes"] if q["prima_anual"] is not None]
        return (not prices, min(prices) if prices else 0.0)
    return sorted(groups.values(), key=min_price)


def whatsapp_summary(comp: dict[str, Any], share_url: str, settings: dict[str, str]) -> str:
    """Resumen en el estilo de los mensajes de WhatsApp: un bloque por compañía, un plan por línea."""
    greeting = comp["client_name"].split(" ")[0] if comp.get("client_name") else ""
    lines = [f"Hola {greeting}, te comparto las opciones de seguro de {comp['ramo_label'].lower()}:", ""]
    for g in comp["groups"]:
        lines.append(f"*{g['label'].upper()}*")
        for q in g["quotes"]:
            if q["prima_anual"] is not None:
                precio = f"{fmt_money(q['prima_anual'] / 12, q['moneda'])} mensuales ({fmt_money(q['prima_anual'], q['moneda'])} al año)"
            else:
                precio = "prima por confirmar"
            lines.append(f"• {q.get('plan') or 'Plan'} → {precio}")
        lines.append("")
    lines.append(f"Comparativa completa con coberturas: {share_url}")
    firma = " · ".join(v for v in (comp.get("created_by_name"), settings.get("oficina_nombre")) if v)
    if firma:
        lines.append(firma)
    return "\n".join(lines).strip()


def build_coverage_matrix(quotes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Une las coberturas de todas las cotizaciones en una matriz por nombre."""
    order: list[str] = []
    labels: dict[str, str] = {}
    cells: dict[str, dict[int, dict[str, Any]]] = {}
    for q in quotes:
        for cov in q["coberturas"]:
            name = (cov.get("nombre") or "").strip()
            if not name:
                continue
            key = _norm(name)
            if key not in labels:
                labels[key] = name
                order.append(key)
                cells[key] = {}
            cells[key][q["id"]] = cov
    return [{"nombre": labels[k], "por_cotizacion": cells[k]} for k in order]


# --------------------------------------------------------------------------- tareas en segundo plano


def run_extraction(document_id: int) -> None:
    with db.get_conn() as conn:
        doc = conn.execute(
            "SELECT d.*, c.ramo FROM documents d JOIN comparisons c ON c.id = d.comparison_id WHERE d.id = ?",
            (document_id,),
        ).fetchone()
    if doc is None:
        return
    hint = config.COMPANIAS.get(doc["company"]) if doc["company"] not in ("auto", "otra") else None
    try:
        data = extraction.extract_quote(Path(doc["file_path"]), hint, config.RAMOS.get(doc["ramo"], doc["ramo"]))
    except extraction.ExtractionError as exc:
        _set_extraction_error(document_id, str(exc))
        return
    except Exception as exc:  # noqa: BLE001 - cualquier fallo debe quedar registrado, no perder el PDF
        _set_extraction_error(document_id, f"Error inesperado: {exc}")
        return

    company = doc["company"]
    if company == "auto":
        company = extraction.detect_company(data.compania)
    company_name = data.compania if company == "otra" else None
    ts = db.now_iso()
    with db.get_conn() as conn:
        conn.execute("DELETE FROM quotes WHERE document_id=?", (document_id,))
        for plan in data.planes:
            conn.execute(
                """INSERT INTO quotes (comparison_id, document_id, company, company_name, included, plan, moneda,
                   prima_anual, prima_total, primas_fraccionadas, suma_asegurada, deducible, vigencia,
                   fecha_cotizacion, coberturas, exclusiones, observaciones, confianza, extraction_status,
                   uploaded_by, created_at, updated_at)
                   VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ok', ?, ?, ?)""",
                (
                    doc["comparison_id"], document_id, company, company_name, plan.plan, data.moneda,
                    plan.prima_anual, plan.prima_total, plan.primas_fraccionadas, plan.suma_asegurada,
                    plan.deducible, data.vigencia, data.fecha_cotizacion,
                    json.dumps([c.model_dump() for c in plan.coberturas], ensure_ascii=False),
                    json.dumps(plan.exclusiones, ensure_ascii=False),
                    plan.observaciones, data.confianza, doc["uploaded_by"], ts, ts,
                ),
            )
        conn.execute(
            "UPDATE documents SET company=?, company_name=?, extraction_status='ok', extraction_error=NULL, "
            "confianza=?, raw_json=?, updated_at=? WHERE id=?",
            (company, company_name, data.confianza, data.model_dump_json(), ts, document_id),
        )
        conn.execute("UPDATE comparisons SET updated_at=? WHERE id=?", (ts, doc["comparison_id"]))


def _set_extraction_error(document_id: int, message: str) -> None:
    with db.get_conn() as conn:
        conn.execute(
            "UPDATE documents SET extraction_status='error', extraction_error=?, updated_at=? WHERE id=?",
            (message, db.now_iso(), document_id),
        )


def run_analysis(comparison_id: int) -> None:
    comp = load_comparison(comparison_id)
    try:
        text = extraction.generate_analysis(comp["client_name"], comp["ramo_label"], comp["ready"])
    except Exception as exc:  # noqa: BLE001
        with db.get_conn() as conn:
            conn.execute(
                "UPDATE comparisons SET analysis_status='error', analysis_error=?, updated_at=? WHERE id=?",
                (str(exc), db.now_iso(), comparison_id),
            )
        return
    with db.get_conn() as conn:
        conn.execute(
            "UPDATE comparisons SET analysis=?, analysis_status='ok', analysis_error=NULL, updated_at=? WHERE id=?",
            (text, db.now_iso(), comparison_id),
        )


# --------------------------------------------------------------------------- sesión


@app.get("/login", response_class=HTMLResponse)
def login_form(request: Request, next: str = "/"):
    if auth.current_user(request):
        return redirect("/")
    return render(request, "login.html", next=next, user=None)


@app.post("/login")
def login(request: Request, username: str = Form(...), password: str = Form(...), next: str = Form("/")):
    user = auth.authenticate(username, password)
    if user is None:
        return render(request, "login.html", error="Usuario o clave incorrectos", next=next, user=None)
    target = next if next.startswith("/") and not next.startswith("//") else "/"
    response = RedirectResponse(target, status_code=303)
    response.set_cookie(
        auth.COOKIE_NAME,
        auth.make_session_token(user["id"]),
        max_age=config.SESSION_MAX_AGE,
        httponly=True,
        samesite="lax",
    )
    return response


@app.post("/logout")
def logout():
    response = RedirectResponse("/login", status_code=303)
    response.delete_cookie(auth.COOKIE_NAME)
    return response


# --------------------------------------------------------------------------- inicio


@app.get("/", response_class=HTMLResponse)
def dashboard(request: Request, user: dict = Depends(auth.require_user)):
    with db.get_conn() as conn:
        recent = db.rows_to_list(
            conn.execute(
                "SELECT c.*, cl.name AS client_name, "
                "(SELECT COUNT(*) FROM quotes q WHERE q.comparison_id = c.id) AS n_quotes "
                "FROM comparisons c JOIN clients cl ON cl.id = c.client_id "
                "ORDER BY c.updated_at DESC LIMIT 10"
            ).fetchall()
        )
        novedades = db.rows_to_list(
            conn.execute(
                "SELECT e.kind, e.created_at, e.quote_id, c.id AS comparison_id, c.title, cl.name AS client_name, "
                "q.plan, q.company, q.company_name "
                "FROM share_events e JOIN comparisons c ON c.id = e.comparison_id JOIN clients cl ON cl.id = c.client_id "
                "LEFT JOIN quotes q ON q.id = e.quote_id ORDER BY e.created_at DESC, e.id DESC LIMIT 12"
            ).fetchall()
        )
        for n in novedades:
            n["company_label"] = company_label(n["company"], n["company_name"]) if n["company"] else ""
        stats = {
            "clientes": conn.execute("SELECT COUNT(*) FROM clients").fetchone()[0],
            "cotizaciones": conn.execute("SELECT COUNT(*) FROM comparisons").fetchone()[0],
            "abiertas": conn.execute("SELECT COUNT(*) FROM comparisons WHERE status='abierta'").fetchone()[0],
            "pdfs": conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0],
        }
    return render(request, "dashboard.html", user=user, recent=recent, stats=stats, novedades=novedades)


# --------------------------------------------------------------------------- clientes


@app.get("/clientes", response_class=HTMLResponse)
def clientes(request: Request, q: str = "", user: dict = Depends(auth.require_user)):
    with db.get_conn() as conn:
        if q:
            like = f"%{q.strip()}%"
            rows = conn.execute(
                "SELECT c.*, (SELECT COUNT(*) FROM comparisons x WHERE x.client_id=c.id) AS n_comp "
                "FROM clients c WHERE c.name LIKE ? OR c.document_id LIKE ? OR c.email LIKE ? "
                "ORDER BY c.name",
                (like, like, like),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT c.*, (SELECT COUNT(*) FROM comparisons x WHERE x.client_id=c.id) AS n_comp "
                "FROM clients c ORDER BY c.name"
            ).fetchall()
    return render(request, "clientes.html", user=user, clientes=db.rows_to_list(rows), q=q)


@app.get("/clientes/nuevo", response_class=HTMLResponse)
def cliente_nuevo_form(request: Request, user: dict = Depends(auth.require_user)):
    return render(request, "cliente_form.html", user=user, cliente=None)


@app.post("/clientes/nuevo")
def cliente_nuevo(
    request: Request,
    name: str = Form(...),
    document_id: str = Form(""),
    phone: str = Form(""),
    email: str = Form(""),
    notes: str = Form(""),
    user: dict = Depends(auth.require_user),
):
    if not name.strip():
        return render(request, "cliente_form.html", user=user, cliente=None, error="El nombre es obligatorio")
    with db.get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO clients (name, document_id, phone, email, notes, created_by, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (name.strip(), document_id.strip(), phone.strip(), email.strip(), notes.strip(), user["id"], db.now_iso()),
        )
    return redirect(f"/clientes/{cur.lastrowid}", "Cliente creado")


@app.get("/clientes/{client_id}", response_class=HTMLResponse)
def cliente_detalle(request: Request, client_id: int, user: dict = Depends(auth.require_user)):
    with db.get_conn() as conn:
        cliente = db.row_to_dict(conn.execute("SELECT * FROM clients WHERE id=?", (client_id,)).fetchone())
        if cliente is None:
            raise HTTPException(404, "Cliente no encontrado")
        comps = db.rows_to_list(
            conn.execute(
                "SELECT c.*, (SELECT COUNT(*) FROM quotes q WHERE q.comparison_id=c.id) AS n_quotes "
                "FROM comparisons c WHERE c.client_id=? ORDER BY c.created_at DESC",
                (client_id,),
            ).fetchall()
        )
    return render(request, "cliente_detalle.html", user=user, cliente=cliente, comparaciones=comps)


@app.get("/clientes/{client_id}/editar", response_class=HTMLResponse)
def cliente_editar_form(request: Request, client_id: int, user: dict = Depends(auth.require_user)):
    with db.get_conn() as conn:
        cliente = db.row_to_dict(conn.execute("SELECT * FROM clients WHERE id=?", (client_id,)).fetchone())
    if cliente is None:
        raise HTTPException(404, "Cliente no encontrado")
    return render(request, "cliente_form.html", user=user, cliente=cliente)


@app.post("/clientes/{client_id}/editar")
def cliente_editar(
    request: Request,
    client_id: int,
    name: str = Form(...),
    document_id: str = Form(""),
    phone: str = Form(""),
    email: str = Form(""),
    notes: str = Form(""),
    user: dict = Depends(auth.require_user),
):
    with db.get_conn() as conn:
        conn.execute(
            "UPDATE clients SET name=?, document_id=?, phone=?, email=?, notes=? WHERE id=?",
            (name.strip(), document_id.strip(), phone.strip(), email.strip(), notes.strip(), client_id),
        )
    return redirect(f"/clientes/{client_id}", "Cliente actualizado")


# --------------------------------------------------------------------------- cotizaciones (comparativas)


@app.get("/cotizaciones", response_class=HTMLResponse)
def cotizaciones(request: Request, ramo: str = "", estado: str = "", user: dict = Depends(auth.require_user)):
    where, params = [], []
    if ramo in config.RAMOS:
        where.append("c.ramo=?")
        params.append(ramo)
    if estado in ("abierta", "cerrada"):
        where.append("c.status=?")
        params.append(estado)
    sql = (
        "SELECT c.*, cl.name AS client_name, u.full_name AS created_by_name, "
        "(SELECT COUNT(*) FROM quotes q WHERE q.comparison_id=c.id) AS n_quotes "
        "FROM comparisons c JOIN clients cl ON cl.id=c.client_id LEFT JOIN users u ON u.id=c.created_by"
    )
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY c.updated_at DESC"
    with db.get_conn() as conn:
        rows = db.rows_to_list(conn.execute(sql, params).fetchall())
    return render(request, "cotizaciones.html", user=user, comparaciones=rows, ramo=ramo, estado=estado)


@app.get("/cotizaciones/nueva", response_class=HTMLResponse)
def cotizacion_nueva_form(request: Request, cliente: int | None = None, user: dict = Depends(auth.require_user)):
    with db.get_conn() as conn:
        clientes_ = db.rows_to_list(conn.execute("SELECT id, name, document_id FROM clients ORDER BY name").fetchall())
    return render(request, "cotizacion_nueva.html", user=user, clientes=clientes_, cliente_id=cliente)


@app.post("/cotizaciones/nueva")
def cotizacion_nueva(
    request: Request,
    client_id: int = Form(...),
    ramo: str = Form(...),
    title: str = Form(""),
    notes: str = Form(""),
    user: dict = Depends(auth.require_user),
):
    if ramo not in config.RAMOS:
        raise HTTPException(400, "Ramo inválido")
    with db.get_conn() as conn:
        cliente = conn.execute("SELECT name FROM clients WHERE id=?", (client_id,)).fetchone()
        if cliente is None:
            raise HTTPException(400, "Cliente inválido")
        ts = db.now_iso()
        final_title = title.strip() or f"{config.RAMOS[ramo]} - {cliente['name']}"
        cur = conn.execute(
            "INSERT INTO comparisons (client_id, ramo, title, notes, created_by, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (client_id, ramo, final_title, notes.strip(), user["id"], ts, ts),
        )
    return redirect(f"/cotizaciones/{cur.lastrowid}", "Comparativa creada. Sube los PDFs de cada compañía.")


@app.get("/cotizaciones/{comparison_id}", response_class=HTMLResponse)
def cotizacion_detalle(request: Request, comparison_id: int, user: dict = Depends(auth.require_user)):
    comp = load_comparison(comparison_id)
    with db.get_conn() as conn:
        advisors = db.rows_to_list(conn.execute("SELECT id, full_name, phone FROM users WHERE active=1 ORDER BY full_name").fetchall())
    return render(request, "cotizacion_detalle.html", user=user, comp=comp, advisors=advisors, **client_view_context(request, comp))


@app.get("/cotizaciones/{comparison_id}/imprimir", response_class=HTMLResponse)
def cotizacion_imprimir(request: Request, comparison_id: int, user: dict = Depends(auth.require_user)):
    comp = load_comparison(comparison_id)
    ctx = client_view_context(request, comp)
    return render(request, "cotizacion_cliente.html", user=user, comp=comp, public=False, pdf_url=f"/cotizaciones/{comp['id']}/pdf", **ctx)


@app.get("/cotizaciones/{comparison_id}/pdf")
def cotizacion_pdf(comparison_id: int, user: dict = Depends(auth.require_user)):
    comp = load_comparison(comparison_id)
    return _pdf_response(comp)


def _pdf_response(comp: dict[str, Any]) -> Response:
    data = pdfgen.build_pdf(comp, db.get_settings())
    safe = re.sub(r"[^A-Za-z0-9_-]+", "_", f"Comparativa {comp['ramo_label']} {comp['client_name']}").strip("_")
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(safe)}.pdf"},
    )


@app.get("/c/{token}", response_class=HTMLResponse)
def comparativa_publica(request: Request, token: str):
    with db.get_conn() as conn:
        row = conn.execute("SELECT id FROM comparisons WHERE share_token=?", (token,)).fetchone()
    if row is None or len(token) < 8:
        raise HTTPException(404, "Esta comparativa no existe o el enlace ya no es válido")
    log_event(row["id"], "open", detail=(request.headers.get("user-agent") or "")[:120])
    comp = load_comparison(row["id"])
    ctx = client_view_context(request, comp)
    return render(request, "cotizacion_cliente.html", user=None, comp=comp, public=True, pdf_url=f"/c/{token}/pdf", **ctx)


def _comparison_by_token(token: str) -> int:
    with db.get_conn() as conn:
        row = conn.execute("SELECT id FROM comparisons WHERE share_token=?", (token,)).fetchone()
    if row is None or len(token) < 8:
        raise HTTPException(404, "Esta comparativa no existe o el enlace ya no es válido")
    return int(row["id"])


@app.get("/c/{token}/elegir/{quote_id}")
def comparativa_elegir(request: Request, token: str, quote_id: int):
    comp_id = _comparison_by_token(token)
    comp = load_comparison(comp_id)
    q = next((x for x in comp["ready"] if x["id"] == quote_id), None)
    if q is None:
        raise HTTPException(404, "Plan no encontrado")
    log_event(comp_id, "choose", quote_id=quote_id)
    settings = db.get_settings()
    target = wa_number(comp.get("advisor_phone")) or wa_number(settings.get("oficina_telefono"))
    text = (
        f"Hola, soy {comp['client_name']}. Me interesa el plan *{q.get('plan') or 'Plan'}* de *{q['company_label']}* "
        f"({fmt_money(q['prima_anual'], q['moneda'])} al año) de la comparativa de {comp['ramo_label'].lower()}. ¿Cómo seguimos?"
    )
    return RedirectResponse(f"https://wa.me/{target}?text={quote(text)}", status_code=303)


@app.get("/c/{token}/pregunta")
def comparativa_pregunta(request: Request, token: str):
    comp_id = _comparison_by_token(token)
    comp = load_comparison(comp_id)
    log_event(comp_id, "question", detail="Tengo una pregunta")
    settings = db.get_settings()
    target = wa_number(comp.get("advisor_phone")) or wa_number(settings.get("oficina_telefono"))
    text = f"Hola, soy {comp['client_name']}. Tengo una pregunta sobre la comparativa de {comp['ramo_label'].lower()} que me enviaste."
    return RedirectResponse(f"https://wa.me/{target}?text={quote(text)}", status_code=303)


@app.get("/c/{token}/pdf")
def comparativa_publica_pdf(token: str):
    with db.get_conn() as conn:
        row = conn.execute("SELECT id FROM comparisons WHERE share_token=?", (token,)).fetchone()
    if row is None or len(token) < 8:
        raise HTTPException(404, "Esta comparativa no existe o el enlace ya no es válido")
    return _pdf_response(load_comparison(row["id"]))


@app.post("/cotizaciones/{comparison_id}/recomendar")
def cotizacion_recomendar(
    comparison_id: int,
    quote_id: int = Form(0),
    recommendation: str = Form(""),
    user: dict = Depends(auth.require_user),
):
    comp = load_comparison(comparison_id)
    if quote_id and not any(q["id"] == quote_id for q in comp["quotes"]):
        raise HTTPException(400, "Plan inválido")
    with db.get_conn() as conn:
        conn.execute(
            "UPDATE comparisons SET recommended_quote_id=?, recommendation=?, recommendation_status='ok', updated_at=? WHERE id=?",
            (quote_id or None, recommendation.strip() or None, db.now_iso(), comparison_id),
        )
    return redirect(f"/cotizaciones/{comparison_id}#recomendacion", "Recomendación guardada" if quote_id else "Recomendación retirada")


@app.post("/cotizaciones/{comparison_id}/recomendar/sugerir")
def cotizacion_recomendar_sugerir(
    comparison_id: int, background: BackgroundTasks, quote_id: int = Form(...), user: dict = Depends(auth.require_user)
):
    comp = load_comparison(comparison_id)
    if not any(q["id"] == quote_id for q in comp["ready"]):
        return redirect(f"/cotizaciones/{comparison_id}#recomendacion", "Elige primero un plan incluido en la comparativa", "error")
    if not extraction.api_available():
        return redirect(f"/cotizaciones/{comparison_id}#recomendacion", "No hay clave de API configurada", "error")
    with db.get_conn() as conn:
        conn.execute(
            "UPDATE comparisons SET recommended_quote_id=?, recommendation_status='procesando', updated_at=? WHERE id=?",
            (quote_id, db.now_iso(), comparison_id),
        )
    background.add_task(run_recommendation, comparison_id, quote_id)
    return redirect(f"/cotizaciones/{comparison_id}#recomendacion", "Claude está redactando la recomendación…")


def run_recommendation(comparison_id: int, quote_id: int) -> None:
    comp = load_comparison(comparison_id)
    chosen = next((q for q in comp["ready"] if q["id"] == quote_id), None)
    if chosen is None:
        return
    others = [q for q in comp["ready"] if q["id"] != quote_id]
    try:
        text = extraction.generate_recommendation(comp["client_name"], comp["ramo_label"], chosen, others, comp.get("notes"))
    except Exception as exc:  # noqa: BLE001
        with db.get_conn() as conn:
            conn.execute(
                "UPDATE comparisons SET recommendation_status='error', recommendation=?, updated_at=? WHERE id=?",
                (f"No se pudo redactar: {exc}", db.now_iso(), comparison_id),
            )
        return
    with db.get_conn() as conn:
        conn.execute(
            "UPDATE comparisons SET recommendation=?, recommendation_status='ok', updated_at=? WHERE id=?",
            (text, db.now_iso(), comparison_id),
        )


@app.post("/cotizaciones/{comparison_id}/compartir/renovar")
def compartir_renovar(comparison_id: int, user: dict = Depends(auth.require_user)):
    load_comparison(comparison_id)
    with db.get_conn() as conn:
        conn.execute("UPDATE comparisons SET share_token=? WHERE id=?", (secrets.token_urlsafe(12), comparison_id))
    return redirect(f"/cotizaciones/{comparison_id}", "Enlace renovado: el anterior dejó de funcionar")


@app.post("/cotizaciones/{comparison_id}/subir")
async def cotizacion_subir(
    request: Request,
    comparison_id: int,
    background: BackgroundTasks,
    company: str = Form("auto"),
    files: list[UploadFile] = File(...),
    user: dict = Depends(auth.require_user),
):
    load_comparison(comparison_id)
    if company != "auto" and company not in config.COMPANIAS:
        raise HTTPException(400, "Compañía inválida")
    dest_dir = config.UPLOAD_DIR / str(comparison_id)
    dest_dir.mkdir(parents=True, exist_ok=True)
    accepted, rejected = [], []
    for file in files:
        filename = file.filename or "cotizacion.pdf"
        content = await file.read()
        if not filename.lower().endswith(".pdf") or not content.startswith(b"%PDF"):
            rejected.append(f"{filename} (no es PDF)")
            continue
        if len(content) > config.MAX_UPLOAD_MB * 1024 * 1024:
            rejected.append(f"{filename} (supera {config.MAX_UPLOAD_MB} MB)")
            continue
        dest = dest_dir / f"{uuid.uuid4().hex}.pdf"
        dest.write_bytes(content)
        status = "pendiente" if extraction.api_available() else "error"
        error = None if extraction.api_available() else "Sin clave de API: carga los planes a mano."
        ts = db.now_iso()
        with db.get_conn() as conn:
            cur = conn.execute(
                "INSERT INTO documents (comparison_id, company, file_path, original_filename, extraction_status, "
                "extraction_error, uploaded_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (comparison_id, company, str(dest), filename, status, error, user["id"], ts, ts),
            )
            conn.execute("UPDATE comparisons SET updated_at=? WHERE id=?", (ts, comparison_id))
        if status == "pendiente":
            background.add_task(run_extraction, int(cur.lastrowid))
        accepted.append(filename)

    if not accepted:
        return redirect(f"/cotizaciones/{comparison_id}", "No se subió ningún PDF: " + "; ".join(rejected), "error")
    if extraction.api_available():
        msg = f"{len(accepted)} PDF recibido(s). Claude está leyendo los planes de cada uno…"
    else:
        msg = f"{len(accepted)} PDF guardado(s). Sin clave de API: carga los planes a mano."
    if rejected:
        msg += " Rechazados: " + "; ".join(rejected)
    return redirect(f"/cotizaciones/{comparison_id}", msg, "ok" if not rejected else "warn")


@app.post("/cotizaciones/{comparison_id}/manual")
def cotizacion_manual(
    request: Request, comparison_id: int, company: str = Form(...), user: dict = Depends(auth.require_user)
):
    load_comparison(comparison_id)
    if company not in config.COMPANIAS:
        raise HTTPException(400, "Compañía inválida")
    ts = db.now_iso()
    with db.get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO quotes (comparison_id, company, included, extraction_status, uploaded_by, created_at, updated_at) "
            "VALUES (?, ?, 1, 'manual', ?, ?, ?)",
            (comparison_id, company, user["id"], ts, ts),
        )
        conn.execute("UPDATE comparisons SET updated_at=? WHERE id=?", (ts, comparison_id))
    return redirect(f"/cotizaciones/{comparison_id}/items/{cur.lastrowid}/editar")


def _get_document(comparison_id: int, document_id: int) -> dict[str, Any]:
    with db.get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM documents WHERE id=? AND comparison_id=?", (document_id, comparison_id)
        ).fetchone()
    if row is None:
        raise HTTPException(404, "Documento no encontrado")
    return dict(row)


@app.post("/cotizaciones/{comparison_id}/docs/{document_id}/reprocesar")
def documento_reprocesar(
    comparison_id: int, document_id: int, background: BackgroundTasks, user: dict = Depends(auth.require_user)
):
    _get_document(comparison_id, document_id)
    if not extraction.api_available():
        return redirect(f"/cotizaciones/{comparison_id}", "No hay clave de API configurada", "error")
    with db.get_conn() as conn:
        conn.execute(
            "UPDATE documents SET extraction_status='pendiente', extraction_error=NULL, updated_at=? WHERE id=?",
            (db.now_iso(), document_id),
        )
    background.add_task(run_extraction, document_id)
    return redirect(f"/cotizaciones/{comparison_id}", "Volviendo a leer el PDF…")


@app.post("/cotizaciones/{comparison_id}/docs/{document_id}/eliminar")
def documento_eliminar(comparison_id: int, document_id: int, user: dict = Depends(auth.require_user)):
    doc = _get_document(comparison_id, document_id)
    with db.get_conn() as conn:
        conn.execute("DELETE FROM quotes WHERE document_id=?", (document_id,))
        conn.execute("DELETE FROM documents WHERE id=?", (document_id,))
        conn.execute("UPDATE comparisons SET updated_at=? WHERE id=?", (db.now_iso(), comparison_id))
    Path(doc["file_path"]).unlink(missing_ok=True)
    return redirect(f"/cotizaciones/{comparison_id}", "PDF y sus planes eliminados")


@app.get("/cotizaciones/{comparison_id}/docs/{document_id}/pdf")
def documento_pdf(comparison_id: int, document_id: int, user: dict = Depends(auth.require_user)):
    doc = _get_document(comparison_id, document_id)
    if not Path(doc["file_path"]).exists():
        raise HTTPException(404, "PDF no disponible")
    name = doc["original_filename"] or "cotizacion.pdf"
    return FileResponse(
        doc["file_path"],
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename*=UTF-8''{quote(name)}"},
    )


def _get_quote(comparison_id: int, quote_id: int) -> dict[str, Any]:
    with db.get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM quotes WHERE id=? AND comparison_id=?", (quote_id, comparison_id)
        ).fetchone()
    q = db.quote_from_row(row)
    if q is None:
        raise HTTPException(404, "Cotización no encontrada")
    q["company_label"] = company_label(q["company"], q["company_name"])
    return q


@app.get("/cotizaciones/{comparison_id}/items/{quote_id}/editar", response_class=HTMLResponse)
def quote_editar_form(request: Request, comparison_id: int, quote_id: int, user: dict = Depends(auth.require_user)):
    comp = load_comparison(comparison_id)
    q = _get_quote(comparison_id, quote_id)
    return render(request, "cotizacion_editar.html", user=user, comp=comp, q=q)


def _parse_float(value: str) -> float | None:
    value = value.strip().replace(" ", "")
    if not value:
        return None
    # Acepta "1.234,56" y "1,234.56"
    if "," in value and "." in value:
        if value.rfind(",") > value.rfind("."):
            value = value.replace(".", "").replace(",", ".")
        else:
            value = value.replace(",", "")
    elif "," in value:
        value = value.replace(",", ".")
    try:
        return float(re.sub(r"[^0-9.\-]", "", value))
    except ValueError:
        return None


@app.post("/cotizaciones/{comparison_id}/items/{quote_id}/editar")
async def quote_editar(request: Request, comparison_id: int, quote_id: int, user: dict = Depends(auth.require_user)):
    q = _get_quote(comparison_id, quote_id)
    form = await request.form()
    get = lambda k: str(form.get(k, "")).strip()  # noqa: E731

    coberturas = []
    nombres = form.getlist("cov_nombre")
    sumas = form.getlist("cov_suma")
    deds = form.getlist("cov_deducible")
    dets = form.getlist("cov_detalle")
    for i, nombre in enumerate(nombres):
        nombre = str(nombre).strip()
        if not nombre:
            continue
        coberturas.append(
            {
                "nombre": nombre,
                "suma_asegurada": str(sumas[i]).strip() or None if i < len(sumas) else None,
                "deducible": str(deds[i]).strip() or None if i < len(deds) else None,
                "detalle": str(dets[i]).strip() or None if i < len(dets) else None,
            }
        )
    exclusiones = [line.strip() for line in get("exclusiones").splitlines() if line.strip()]
    status = "ok" if q["extraction_status"] == "ok" else "manual"
    company = get("company") if get("company") in config.COMPANIAS else q["company"]
    company_name = get("company_name") or None if company == "otra" else None
    ts = db.now_iso()
    with db.get_conn() as conn:
        conn.execute(
            """UPDATE quotes SET company=?, company_name=?, plan=?, moneda=?, prima_anual=?, prima_total=?,
               primas_fraccionadas=?, suma_asegurada=?, deducible=?, vigencia=?, fecha_cotizacion=?, coberturas=?,
               exclusiones=?, observaciones=?, extraction_status=?, extraction_error=NULL, updated_at=? WHERE id=?""",
            (
                company,
                company_name,
                get("plan") or None,
                get("moneda") or None,
                _parse_float(get("prima_anual")),
                _parse_float(get("prima_total")),
                get("primas_fraccionadas") or None,
                get("suma_asegurada") or None,
                get("deducible") or None,
                get("vigencia") or None,
                get("fecha_cotizacion") or None,
                json.dumps(coberturas, ensure_ascii=False),
                json.dumps(exclusiones, ensure_ascii=False),
                get("observaciones") or None,
                status,
                ts,
                quote_id,
            ),
        )
        conn.execute("UPDATE comparisons SET updated_at=? WHERE id=?", (ts, comparison_id))
    return redirect(f"/cotizaciones/{comparison_id}", "Datos guardados")


@app.post("/cotizaciones/{comparison_id}/items/{quote_id}/incluir")
def quote_incluir(comparison_id: int, quote_id: int, included: int = Form(...), user: dict = Depends(auth.require_user)):
    _get_quote(comparison_id, quote_id)
    with db.get_conn() as conn:
        conn.execute("UPDATE quotes SET included=?, updated_at=? WHERE id=?", (1 if included else 0, db.now_iso(), quote_id))
    return redirect(f"/cotizaciones/{comparison_id}#comparativa")


@app.post("/cotizaciones/{comparison_id}/items/todos")
def quotes_incluir_todos(comparison_id: int, included: int = Form(...), user: dict = Depends(auth.require_user)):
    load_comparison(comparison_id)
    with db.get_conn() as conn:
        conn.execute(
            "UPDATE quotes SET included=?, updated_at=? WHERE comparison_id=?",
            (1 if included else 0, db.now_iso(), comparison_id),
        )
    return redirect(f"/cotizaciones/{comparison_id}#planes")


@app.post("/cotizaciones/{comparison_id}/items/{quote_id}/duplicar")
def quote_duplicar(comparison_id: int, quote_id: int, user: dict = Depends(auth.require_user)):
    q = _get_quote(comparison_id, quote_id)
    ts = db.now_iso()
    with db.get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO quotes (comparison_id, document_id, company, company_name, included, plan, moneda, prima_anual,
               prima_total, primas_fraccionadas, suma_asegurada, deducible, vigencia, fecha_cotizacion, coberturas,
               exclusiones, observaciones, extraction_status, uploaded_by, created_at, updated_at)
               VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?, ?)""",
            (
                comparison_id, q.get("document_id"), q["company"], q["company_name"], f"{q['plan'] or 'Plan'} (copia)",
                q["moneda"], q["prima_anual"], q["prima_total"], q["primas_fraccionadas"], q["suma_asegurada"],
                q["deducible"], q["vigencia"], q["fecha_cotizacion"], json.dumps(q["coberturas"], ensure_ascii=False),
                json.dumps(q["exclusiones"], ensure_ascii=False), q["observaciones"], user["id"], ts, ts,
            ),
        )
    return redirect(f"/cotizaciones/{comparison_id}/items/{cur.lastrowid}/editar")


@app.post("/cotizaciones/{comparison_id}/items/{quote_id}/eliminar")
def quote_eliminar(comparison_id: int, quote_id: int, user: dict = Depends(auth.require_user)):
    _get_quote(comparison_id, quote_id)
    with db.get_conn() as conn:
        conn.execute("DELETE FROM quotes WHERE id=?", (quote_id,))
        conn.execute("UPDATE comparisons SET updated_at=? WHERE id=?", (db.now_iso(), comparison_id))
    return redirect(f"/cotizaciones/{comparison_id}", "Plan eliminado")


@app.post("/cotizaciones/{comparison_id}/analisis")
def cotizacion_analisis(comparison_id: int, background: BackgroundTasks, user: dict = Depends(auth.require_user)):
    comp = load_comparison(comparison_id)
    if len(comp["ready"]) < 2:
        return redirect(f"/cotizaciones/{comparison_id}", "Necesitas al menos dos planes incluidos en la comparativa", "error")
    if not extraction.api_available():
        return redirect(f"/cotizaciones/{comparison_id}", "No hay clave de API configurada", "error")
    with db.get_conn() as conn:
        conn.execute(
            "UPDATE comparisons SET analysis_status='procesando', analysis_error=NULL, updated_at=? WHERE id=?",
            (db.now_iso(), comparison_id),
        )
    background.add_task(run_analysis, comparison_id)
    return redirect(f"/cotizaciones/{comparison_id}", "Generando el análisis comparativo…")


@app.post("/cotizaciones/{comparison_id}/actualizar")
def cotizacion_actualizar(
    comparison_id: int,
    title: str = Form(""),
    notes: str = Form(""),
    status: str = Form("abierta"),
    advisor_id: int = Form(0),
    user: dict = Depends(auth.require_user),
):
    comp = load_comparison(comparison_id)
    if status not in ("abierta", "cerrada"):
        status = "abierta"
    with db.get_conn() as conn:
        advisor = advisor_id or comp["created_by"]
        if advisor_id and conn.execute("SELECT 1 FROM users WHERE id=? AND active=1", (advisor_id,)).fetchone() is None:
            raise HTTPException(400, "Asesor inválido")
        conn.execute(
            "UPDATE comparisons SET title=?, notes=?, status=?, created_by=?, updated_at=? WHERE id=?",
            (title.strip() or comp["title"], notes.strip(), status, advisor, db.now_iso(), comparison_id),
        )
    return redirect(f"/cotizaciones/{comparison_id}", "Comparativa actualizada")


@app.post("/cotizaciones/{comparison_id}/eliminar")
def cotizacion_eliminar(comparison_id: int, user: dict = Depends(auth.require_admin)):
    comp = load_comparison(comparison_id)
    with db.get_conn() as conn:
        conn.execute("DELETE FROM quotes WHERE comparison_id=?", (comparison_id,))
        conn.execute("DELETE FROM documents WHERE comparison_id=?", (comparison_id,))
        conn.execute("DELETE FROM comparisons WHERE id=?", (comparison_id,))
    for d in comp["documents"]:
        Path(d["file_path"]).unlink(missing_ok=True)
    return redirect("/cotizaciones", "Comparativa eliminada")


# --------------------------------------------------------------------------- usuarios


@app.get("/usuarios", response_class=HTMLResponse)
def usuarios(request: Request, user: dict = Depends(auth.require_admin)):
    with db.get_conn() as conn:
        rows = db.rows_to_list(
            conn.execute("SELECT id, username, full_name, role, active, phone, created_at FROM users ORDER BY username").fetchall()
        )
    return render(request, "usuarios.html", user=user, usuarios=rows)


@app.get("/usuarios/nuevo", response_class=HTMLResponse)
def usuario_nuevo_form(request: Request, user: dict = Depends(auth.require_admin)):
    return render(request, "usuario_form.html", user=user)


@app.post("/usuarios/nuevo")
def usuario_nuevo(
    request: Request,
    username: str = Form(...),
    full_name: str = Form(...),
    password: str = Form(...),
    role: str = Form("agente"),
    phone: str = Form(""),
    user: dict = Depends(auth.require_admin),
):
    try:
        new_id = auth.create_user(username, password, full_name, role)
        if phone.strip():
            with db.get_conn() as conn:
                conn.execute("UPDATE users SET phone=? WHERE id=?", (phone.strip(), new_id))
    except ValueError as exc:
        return render(request, "usuario_form.html", user=user, error=str(exc), form=locals())
    except Exception:  # noqa: BLE001 - username duplicado
        return render(request, "usuario_form.html", user=user, error="Ese usuario ya existe")
    return redirect("/usuarios", f"Usuario {username.strip().lower()} creado")


@app.post("/usuarios/{user_id}/estado")
def usuario_estado(user_id: int, active: int = Form(...), user: dict = Depends(auth.require_admin)):
    if user_id == user["id"]:
        return redirect("/usuarios", "No puedes desactivar tu propio usuario", "error")
    with db.get_conn() as conn:
        conn.execute("UPDATE users SET active=? WHERE id=?", (1 if active else 0, user_id))
    return redirect("/usuarios", "Usuario actualizado")


@app.post("/usuarios/{user_id}/clave")
def usuario_clave(user_id: int, password: str = Form(...), user: dict = Depends(auth.require_admin)):
    if len(password) < 6:
        return redirect("/usuarios", "La clave debe tener al menos 6 caracteres", "error")
    with db.get_conn() as conn:
        conn.execute("UPDATE users SET password_hash=? WHERE id=?", (auth.hash_password(password), user_id))
    return redirect("/usuarios", "Clave restablecida")


@app.get("/configuracion", response_class=HTMLResponse)
def configuracion_form(request: Request, user: dict = Depends(auth.require_admin)):
    return render(request, "configuracion.html", user=user, settings=db.get_settings(), keys=db.SETTING_KEYS)


@app.post("/configuracion")
async def configuracion_guardar(request: Request, user: dict = Depends(auth.require_admin)):
    form = await request.form()
    db.save_settings({k: str(form.get(k, "")) for k in db.SETTING_KEYS})
    return redirect("/configuracion", "Configuración guardada")


@app.get("/perfil", response_class=HTMLResponse)
def perfil_form(request: Request, user: dict = Depends(auth.require_user)):
    return render(request, "perfil.html", user=user)


@app.post("/perfil")
def perfil_guardar(
    full_name: str = Form(...),
    phone: str = Form(""),
    email: str = Form(""),
    title: str = Form(""),
    user: dict = Depends(auth.require_user),
):
    if not full_name.strip():
        return redirect("/perfil", "El nombre es obligatorio", "error")
    with db.get_conn() as conn:
        conn.execute(
            "UPDATE users SET full_name=?, phone=?, email=?, title=? WHERE id=?",
            (full_name.strip(), phone.strip(), email.strip(), title.strip(), user["id"]),
        )
    return redirect("/perfil", "Perfil guardado. Tus comparativas ya muestran estos datos.")


@app.get("/usuarios/{user_id}/editar", response_class=HTMLResponse)
def usuario_editar_form(request: Request, user_id: int, user: dict = Depends(auth.require_admin)):
    with db.get_conn() as conn:
        target = db.row_to_dict(conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone())
    if target is None:
        raise HTTPException(404, "Usuario no encontrado")
    return render(request, "usuario_editar.html", user=user, target=target)


@app.post("/usuarios/{user_id}/editar")
def usuario_editar(
    user_id: int,
    full_name: str = Form(...),
    phone: str = Form(""),
    email: str = Form(""),
    title: str = Form(""),
    role: str = Form("agente"),
    user: dict = Depends(auth.require_admin),
):
    if role not in config.ROLES:
        raise HTTPException(400, "Rol inválido")
    if user_id == user["id"]:
        role = "admin"
    with db.get_conn() as conn:
        conn.execute(
            "UPDATE users SET full_name=?, phone=?, email=?, title=?, role=? WHERE id=?",
            (full_name.strip() or "Sin nombre", phone.strip(), email.strip(), title.strip(), role, user_id),
        )
    return redirect("/usuarios", "Usuario actualizado")


@app.get("/perfil/clave", response_class=HTMLResponse)
def perfil_clave_form(request: Request, user: dict = Depends(auth.require_user)):
    return render(request, "perfil_clave.html", user=user)


@app.post("/perfil/clave")
def perfil_clave(
    request: Request,
    current: str = Form(...),
    password: str = Form(...),
    confirm: str = Form(...),
    user: dict = Depends(auth.require_user),
):
    if not auth.authenticate(user["username"], current):
        return render(request, "perfil_clave.html", user=user, error="La clave actual no es correcta")
    if password != confirm:
        return render(request, "perfil_clave.html", user=user, error="Las claves nuevas no coinciden")
    if len(password) < 6:
        return render(request, "perfil_clave.html", user=user, error="La clave debe tener al menos 6 caracteres")
    with db.get_conn() as conn:
        conn.execute("UPDATE users SET password_hash=? WHERE id=?", (auth.hash_password(password), user["id"]))
    return redirect("/", "Clave actualizada")


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code == 303 and exc.headers and "Location" in exc.headers:
        return RedirectResponse(exc.headers["Location"], status_code=303)
    if exc.status_code in (403, 404) and "text/html" in request.headers.get("accept", ""):
        return render(request, "error.html", code=exc.status_code, detail=exc.detail, status_code=exc.status_code)
    return Response(content=str(exc.detail), status_code=exc.status_code)


# --------------------------------------------------------------------------- tarifarios


@app.get("/tarifarios", response_class=HTMLResponse)
def tarifarios(request: Request, user: dict = Depends(auth.require_user)):
    rows = tarifas.list_tariffs()
    return render(request, "tarifarios.html", user=user, tarifarios=rows)


@app.get("/tarifarios/nuevo", response_class=HTMLResponse)
def tarifario_nuevo_form(request: Request, user: dict = Depends(auth.require_admin)):
    return render(request, "tarifario_form.html", user=user)


@app.post("/tarifarios/nuevo")
def tarifario_nuevo(
    company: str = Form(...),
    plan: str = Form(...),
    moneda: str = Form("USD"),
    suma_asegurada: str = Form(""),
    deducible: str = Form(""),
    vigente_desde: str = Form(""),
    vigente_hasta: str = Form(""),
    notes: str = Form(""),
    user: dict = Depends(auth.require_admin),
):
    if company not in config.COMPANIAS or not plan.strip():
        raise HTTPException(400, "Datos inválidos")
    ts = db.now_iso()
    with db.get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO tariffs (company, ramo, plan, moneda, suma_asegurada, deducible, vigente_desde, vigente_hasta, "
            "notes, created_by, created_at, updated_at) VALUES (?, 'salud', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (company, plan.strip(), moneda.strip() or "USD", suma_asegurada.strip(), deducible.strip(),
             vigente_desde.strip(), vigente_hasta.strip(), notes.strip(), user["id"], ts, ts),
        )
    return redirect(f"/tarifarios/{cur.lastrowid}", "Tarifario creado. Ahora carga los rangos de edad.")


def _get_tariff_or_404(tariff_id: int) -> dict[str, Any]:
    t = tarifas.get_tariff(tariff_id)
    if t is None:
        raise HTTPException(404, "Tarifario no encontrado")
    return t


@app.get("/tarifarios/{tariff_id}", response_class=HTMLResponse)
def tarifario_detalle(request: Request, tariff_id: int, user: dict = Depends(auth.require_user)):
    t = _get_tariff_or_404(tariff_id)
    return render(request, "tarifario_detalle.html", user=user, t=t)


@app.post("/tarifarios/{tariff_id}/editar")
async def tarifario_editar(request: Request, tariff_id: int, user: dict = Depends(auth.require_admin)):
    _get_tariff_or_404(tariff_id)
    form = await request.form()
    get = lambda k: str(form.get(k, "")).strip()  # noqa: E731
    coberturas = []
    for line in get("coberturas").splitlines():
        parts = [p.strip() for p in line.split("|")]
        if not parts or not parts[0]:
            continue
        coberturas.append(
            {
                "nombre": parts[0],
                "suma_asegurada": parts[1] if len(parts) > 1 and parts[1] else None,
                "detalle": parts[2] if len(parts) > 2 and parts[2] else None,
            }
        )
    with db.get_conn() as conn:
        conn.execute(
            "UPDATE tariffs SET plan=?, moneda=?, suma_asegurada=?, deducible=?, vigente_desde=?, vigente_hasta=?, "
            "notes=?, coberturas=?, is_sample=0, updated_at=? WHERE id=?",
            (get("plan") or "Sin nombre", get("moneda") or "USD", get("suma_asegurada"), get("deducible"),
             get("vigente_desde"), get("vigente_hasta"), get("notes"),
             json.dumps(coberturas, ensure_ascii=False), db.now_iso(), tariff_id),
        )
    return redirect(f"/tarifarios/{tariff_id}", "Tarifario actualizado")


@app.post("/tarifarios/{tariff_id}/bandas")
async def tarifario_bandas(request: Request, tariff_id: int, user: dict = Depends(auth.require_admin)):
    _get_tariff_or_404(tariff_id)
    form = await request.form()
    mins, maxs, primas = form.getlist("edad_min"), form.getlist("edad_max"), form.getlist("prima")
    bands = []
    for i in range(len(mins)):
        a, b = tarifas.parse_number(str(mins[i])), tarifas.parse_number(str(maxs[i]) if i < len(maxs) else "")
        p = tarifas.parse_number(str(primas[i]) if i < len(primas) else "")
        if a is None and b is None and p is None:
            continue
        if a is None or b is None or p is None:
            return redirect(f"/tarifarios/{tariff_id}", f"La fila {i + 1} está incompleta", "error")
        bands.append((int(a), int(b), p))
    errors = tarifas.validate_bands(bands)
    if errors:
        return redirect(f"/tarifarios/{tariff_id}", "; ".join(errors), "error")
    tarifas.save_bands(tariff_id, bands)
    with db.get_conn() as conn:
        conn.execute("UPDATE tariffs SET is_sample=0 WHERE id=?", (tariff_id,))
    return redirect(f"/tarifarios/{tariff_id}", "Rangos de edad guardados")


@app.post("/tarifarios/{tariff_id}/importar")
async def tarifario_importar(tariff_id: int, file: UploadFile = File(...), user: dict = Depends(auth.require_admin)):
    _get_tariff_or_404(tariff_id)
    content = await file.read()
    bands, errors = tarifas.parse_bands_csv(content)
    errors += tarifas.validate_bands(bands)
    if not bands:
        return redirect(f"/tarifarios/{tariff_id}", "No se encontraron rangos en el archivo. Usa columnas: edad mínima, edad máxima, prima.", "error")
    if errors:
        return redirect(f"/tarifarios/{tariff_id}", "; ".join(errors[:5]), "error")
    tarifas.save_bands(tariff_id, bands)
    with db.get_conn() as conn:
        conn.execute("UPDATE tariffs SET is_sample=0 WHERE id=?", (tariff_id,))
    return redirect(f"/tarifarios/{tariff_id}", f"Se importaron {len(bands)} rangos de edad")


@app.post("/tarifarios/{tariff_id}/estado")
def tarifario_estado(tariff_id: int, active: int = Form(...), user: dict = Depends(auth.require_admin)):
    _get_tariff_or_404(tariff_id)
    with db.get_conn() as conn:
        conn.execute("UPDATE tariffs SET active=?, updated_at=? WHERE id=?", (1 if active else 0, db.now_iso(), tariff_id))
    return redirect(f"/tarifarios/{tariff_id}", "Estado actualizado")


@app.post("/tarifarios/{tariff_id}/eliminar")
def tarifario_eliminar(tariff_id: int, user: dict = Depends(auth.require_admin)):
    _get_tariff_or_404(tariff_id)
    with db.get_conn() as conn:
        conn.execute("DELETE FROM tariff_bands WHERE tariff_id=?", (tariff_id,))
        conn.execute("DELETE FROM tariffs WHERE id=?", (tariff_id,))
    return redirect("/tarifarios", "Tarifario eliminado")


# --------------------------------------------------------------------------- cotizador rápido


def _parse_insureds(form) -> list[dict[str, Any]]:
    nombres, edades = form.getlist("aseg_nombre"), form.getlist("aseg_edad")
    insureds = []
    for i, edad in enumerate(edades):
        age = tarifas.parse_number(str(edad))
        if age is None:
            continue
        nombre = str(nombres[i]).strip() if i < len(nombres) else ""
        insureds.append({"nombre": nombre or f"Asegurado {len(insureds) + 1}", "edad": int(age)})
    return insureds


@app.get("/cotizar", response_class=HTMLResponse)
def cotizar_form(request: Request, cliente: int | None = None, user: dict = Depends(auth.require_user)):
    with db.get_conn() as conn:
        clientes_ = db.rows_to_list(conn.execute("SELECT id, name FROM clients ORDER BY name").fetchall())
    return render(
        request, "cotizar.html", user=user, clientes=clientes_, cliente_id=cliente,
        tarifarios=tarifas.list_tariffs(only_active=True),
    )


@app.post("/cotizar", response_class=HTMLResponse)
async def cotizar(request: Request, user: dict = Depends(auth.require_user)):
    form = await request.form()
    insureds = _parse_insureds(form)
    tariff_ids = [int(x) for x in form.getlist("tariff_id") if str(x).isdigit()]
    client_id = tarifas.parse_number(str(form.get("client_id", "")))
    if not insureds:
        return redirect("/cotizar", "Indica la edad de al menos un asegurado", "error")
    if not tariff_ids:
        return redirect("/cotizar", "Selecciona al menos un plan", "error")
    results = tarifas.quick_quote(insureds, tariff_ids)
    complete = [r for r in results if r["complete"]]
    cheapest_id = min(complete, key=lambda r: r["total"])["id"] if len(complete) > 1 else None
    cliente = None
    if client_id:
        with db.get_conn() as conn:
            cliente = db.row_to_dict(conn.execute("SELECT * FROM clients WHERE id=?", (int(client_id),)).fetchone())
    return render(
        request, "cotizar_resultado.html", user=user, insureds=insureds, results=results,
        cheapest_id=cheapest_id, cliente=cliente, matrix=tarifas.coverage_matrix(results),
        payload=json.dumps({"insureds": insureds, "tariff_ids": tariff_ids}),
    )


@app.post("/cotizar/guardar")
def cotizar_guardar(
    payload: str = Form(...),
    client_id: int = Form(...),
    title: str = Form(""),
    user: dict = Depends(auth.require_user),
):
    try:
        data = json.loads(payload)
        insureds = [{"nombre": str(p["nombre"]), "edad": int(p["edad"])} for p in data["insureds"]]
        tariff_ids = [int(x) for x in data["tariff_ids"]]
    except (ValueError, KeyError, TypeError):
        raise HTTPException(400, "Datos inválidos")
    results = tarifas.quick_quote(insureds, tariff_ids)
    with db.get_conn() as conn:
        cliente = conn.execute("SELECT name FROM clients WHERE id=?", (client_id,)).fetchone()
        if cliente is None:
            raise HTTPException(400, "Cliente inválido")
        ts = db.now_iso()
        desc = ", ".join(f"{p['nombre']} ({p['edad']} años)" for p in insureds)
        cur = conn.execute(
            "INSERT INTO comparisons (client_id, ramo, title, notes, created_by, created_at, updated_at) "
            "VALUES (?, 'salud', ?, ?, ?, ?, ?)",
            (client_id, title.strip() or f"Salud (tarifario) - {cliente['name']}",
             f"Cotización preliminar por tarifario. Asegurados: {desc}", user["id"], ts, ts),
        )
        comp_id = int(cur.lastrowid)
        for r in results:
            detalle = "; ".join(
                f"{l['nombre']} ({l['edad']} años): {fmt_money(l['prima'], r['moneda']) if l['prima'] is not None else 'fuera de rango'}"
                for l in r["lines"]
            )
            conn.execute(
                "INSERT INTO quotes (comparison_id, company, included, plan, moneda, prima_anual, suma_asegurada, deducible, "
                "coberturas, exclusiones, observaciones, extraction_status, uploaded_by, created_at, updated_at) "
                "VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, '[]', ?, 'manual', ?, ?, ?)",
                (comp_id, r["company"], r["plan"], r["moneda"], r["total"], r["suma_asegurada"], r["deducible"],
                 json.dumps(r["coberturas"], ensure_ascii=False),
                 f"Preliminar según tarifario. Detalle: {detalle}", user["id"], ts, ts),
            )
    return redirect(f"/cotizaciones/{comp_id}", "Cotización preliminar guardada en la comparativa del cliente")
