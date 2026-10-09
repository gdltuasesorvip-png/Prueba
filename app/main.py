"""Aplicación web del cotizador comparativo de seguros."""
from __future__ import annotations

import json
import re
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any
from urllib.parse import quote

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from . import auth, config, db, extraction, tarifas

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
templates.env.globals.update(COMPANIAS=config.COMPANIAS, RAMOS=config.RAMOS, ROLES=config.ROLES)


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


def _norm(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", name.lower().strip())


def load_comparison(comparison_id: int) -> dict[str, Any]:
    with db.get_conn() as conn:
        row = conn.execute(
            "SELECT c.*, cl.name AS client_name, cl.document_id AS client_document, "
            "cl.phone AS client_phone, cl.email AS client_email, u.full_name AS created_by_name "
            "FROM comparisons c JOIN clients cl ON cl.id = c.client_id "
            "LEFT JOIN users u ON u.id = c.created_by WHERE c.id = ?",
            (comparison_id,),
        ).fetchone()
        if row is None:
            raise HTTPException(404, "Cotización no encontrada")
        comp = dict(row)
        quotes = [
            db.quote_from_row(r)
            for r in conn.execute(
                "SELECT * FROM quotes WHERE comparison_id = ? ORDER BY created_at", (comparison_id,)
            ).fetchall()
        ]
    for q in quotes:
        q["company_label"] = config.COMPANIAS.get(q["company"], q["company"])
    comp["quotes"] = quotes
    comp["ramo_label"] = config.RAMOS.get(comp["ramo"], comp["ramo"])
    comp["coverage_matrix"] = build_coverage_matrix(quotes)
    comp["pending"] = any(q["extraction_status"] == "pendiente" for q in quotes) or comp[
        "analysis_status"
    ] == "procesando"
    ready = [q for q in quotes if q["prima_anual"] is not None]
    comp["cheapest_id"] = min(ready, key=lambda q: q["prima_anual"])["id"] if len(ready) > 1 else None
    return comp


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


def run_extraction(quote_id: int) -> None:
    with db.get_conn() as conn:
        row = conn.execute(
            "SELECT q.*, c.ramo FROM quotes q JOIN comparisons c ON c.id = q.comparison_id WHERE q.id = ?",
            (quote_id,),
        ).fetchone()
    if row is None or not row["file_path"]:
        return
    try:
        data = extraction.extract_quote(
            Path(row["file_path"]),
            config.COMPANIAS.get(row["company"], row["company"]),
            config.RAMOS.get(row["ramo"], row["ramo"]),
        )
    except extraction.ExtractionError as exc:
        _set_extraction_error(quote_id, str(exc))
        return
    except Exception as exc:  # noqa: BLE001 - cualquier fallo debe quedar registrado, no perder el PDF
        _set_extraction_error(quote_id, f"Error inesperado: {exc}")
        return

    with db.get_conn() as conn:
        conn.execute(
            """UPDATE quotes SET plan=?, moneda=?, prima_anual=?, prima_total=?, primas_fraccionadas=?,
               suma_asegurada=?, deducible=?, vigencia=?, fecha_cotizacion=?, coberturas=?, exclusiones=?,
               observaciones=?, confianza=?, extraction_status='ok', extraction_error=NULL, raw_json=?,
               updated_at=? WHERE id=?""",
            (
                data.plan,
                data.moneda,
                data.prima_anual,
                data.prima_total,
                data.primas_fraccionadas,
                data.suma_asegurada,
                data.deducible,
                data.vigencia,
                data.fecha_cotizacion,
                json.dumps([c.model_dump() for c in data.coberturas], ensure_ascii=False),
                json.dumps(data.exclusiones, ensure_ascii=False),
                data.observaciones,
                data.confianza,
                data.model_dump_json(),
                db.now_iso(),
                quote_id,
            ),
        )


def _set_extraction_error(quote_id: int, message: str) -> None:
    with db.get_conn() as conn:
        conn.execute(
            "UPDATE quotes SET extraction_status='error', extraction_error=?, updated_at=? WHERE id=?",
            (message, db.now_iso(), quote_id),
        )


def run_analysis(comparison_id: int) -> None:
    comp = load_comparison(comparison_id)
    usable = [q for q in comp["quotes"] if q["extraction_status"] in ("ok", "manual")]
    try:
        text = extraction.generate_analysis(comp["client_name"], comp["ramo_label"], usable)
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
        stats = {
            "clientes": conn.execute("SELECT COUNT(*) FROM clients").fetchone()[0],
            "cotizaciones": conn.execute("SELECT COUNT(*) FROM comparisons").fetchone()[0],
            "abiertas": conn.execute("SELECT COUNT(*) FROM comparisons WHERE status='abierta'").fetchone()[0],
            "pdfs": conn.execute("SELECT COUNT(*) FROM quotes WHERE file_path IS NOT NULL").fetchone()[0],
        }
    return render(request, "dashboard.html", user=user, recent=recent, stats=stats)


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
    return render(request, "cotizacion_detalle.html", user=user, comp=comp)


@app.get("/cotizaciones/{comparison_id}/imprimir", response_class=HTMLResponse)
def cotizacion_imprimir(request: Request, comparison_id: int, user: dict = Depends(auth.require_user)):
    comp = load_comparison(comparison_id)
    comp["quotes"] = [q for q in comp["quotes"] if q["extraction_status"] in ("ok", "manual")]
    comp["coverage_matrix"] = build_coverage_matrix(comp["quotes"])
    return render(request, "cotizacion_imprimir.html", user=user, comp=comp)


@app.post("/cotizaciones/{comparison_id}/subir")
async def cotizacion_subir(
    request: Request,
    comparison_id: int,
    background: BackgroundTasks,
    company: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(auth.require_user),
):
    load_comparison(comparison_id)
    if company not in config.COMPANIAS:
        raise HTTPException(400, "Compañía inválida")
    filename = file.filename or "cotizacion.pdf"
    if not filename.lower().endswith(".pdf"):
        return redirect(f"/cotizaciones/{comparison_id}", "Solo se aceptan archivos PDF", "error")
    content = await file.read()
    if len(content) > config.MAX_UPLOAD_MB * 1024 * 1024:
        return redirect(f"/cotizaciones/{comparison_id}", f"El PDF supera {config.MAX_UPLOAD_MB} MB", "error")
    if not content.startswith(b"%PDF"):
        return redirect(f"/cotizaciones/{comparison_id}", "El archivo no parece ser un PDF válido", "error")

    dest_dir = config.UPLOAD_DIR / str(comparison_id)
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"{company}-{uuid.uuid4().hex}.pdf"
    dest.write_bytes(content)

    status = "pendiente" if extraction.api_available() else "error"
    error = None if extraction.api_available() else "Sin clave de API: carga los datos manualmente con Editar."
    ts = db.now_iso()
    with db.get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO quotes (comparison_id, company, file_path, original_filename, extraction_status, "
            "extraction_error, uploaded_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (comparison_id, company, str(dest), filename, status, error, user["id"], ts, ts),
        )
        conn.execute("UPDATE comparisons SET updated_at=? WHERE id=?", (ts, comparison_id))
    quote_id = int(cur.lastrowid)
    if status == "pendiente":
        background.add_task(run_extraction, quote_id)
        msg = f"PDF de {config.COMPANIAS[company]} recibido. Claude lo está leyendo…"
    else:
        msg = f"PDF de {config.COMPANIAS[company]} guardado. {error}"
    return redirect(f"/cotizaciones/{comparison_id}", msg)


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
            "INSERT INTO quotes (comparison_id, company, extraction_status, uploaded_by, created_at, updated_at) "
            "VALUES (?, ?, 'manual', ?, ?, ?)",
            (comparison_id, company, user["id"], ts, ts),
        )
        conn.execute("UPDATE comparisons SET updated_at=? WHERE id=?", (ts, comparison_id))
    return redirect(f"/cotizaciones/{comparison_id}/items/{cur.lastrowid}/editar")


def _get_quote(comparison_id: int, quote_id: int) -> dict[str, Any]:
    with db.get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM quotes WHERE id=? AND comparison_id=?", (quote_id, comparison_id)
        ).fetchone()
    q = db.quote_from_row(row)
    if q is None:
        raise HTTPException(404, "Cotización no encontrada")
    q["company_label"] = config.COMPANIAS.get(q["company"], q["company"])
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
    _get_quote(comparison_id, quote_id)
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
    status = get("extraction_status") or "manual"
    if status not in ("ok", "manual"):
        status = "manual"
    ts = db.now_iso()
    with db.get_conn() as conn:
        conn.execute(
            """UPDATE quotes SET plan=?, moneda=?, prima_anual=?, prima_total=?, primas_fraccionadas=?,
               suma_asegurada=?, deducible=?, vigencia=?, fecha_cotizacion=?, coberturas=?, exclusiones=?,
               observaciones=?, extraction_status=?, extraction_error=NULL, updated_at=? WHERE id=?""",
            (
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


@app.post("/cotizaciones/{comparison_id}/items/{quote_id}/reprocesar")
def quote_reprocesar(
    comparison_id: int, quote_id: int, background: BackgroundTasks, user: dict = Depends(auth.require_user)
):
    q = _get_quote(comparison_id, quote_id)
    if not q["file_path"]:
        return redirect(f"/cotizaciones/{comparison_id}", "Esta cotización no tiene PDF", "error")
    if not extraction.api_available():
        return redirect(f"/cotizaciones/{comparison_id}", "No hay clave de API configurada", "error")
    with db.get_conn() as conn:
        conn.execute(
            "UPDATE quotes SET extraction_status='pendiente', extraction_error=NULL, updated_at=? WHERE id=?",
            (db.now_iso(), quote_id),
        )
    background.add_task(run_extraction, quote_id)
    return redirect(f"/cotizaciones/{comparison_id}", "Volviendo a leer el PDF…")


@app.post("/cotizaciones/{comparison_id}/items/{quote_id}/eliminar")
def quote_eliminar(comparison_id: int, quote_id: int, user: dict = Depends(auth.require_user)):
    q = _get_quote(comparison_id, quote_id)
    with db.get_conn() as conn:
        conn.execute("DELETE FROM quotes WHERE id=?", (quote_id,))
        conn.execute("UPDATE comparisons SET updated_at=? WHERE id=?", (db.now_iso(), comparison_id))
    if q["file_path"]:
        try:
            Path(q["file_path"]).unlink(missing_ok=True)
        except OSError:
            pass
    return redirect(f"/cotizaciones/{comparison_id}", "Cotización eliminada")


@app.get("/cotizaciones/{comparison_id}/items/{quote_id}/pdf")
def quote_pdf(comparison_id: int, quote_id: int, user: dict = Depends(auth.require_user)):
    q = _get_quote(comparison_id, quote_id)
    if not q["file_path"] or not Path(q["file_path"]).exists():
        raise HTTPException(404, "PDF no disponible")
    name = q["original_filename"] or "cotizacion.pdf"
    return FileResponse(
        q["file_path"],
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename*=UTF-8''{quote(name)}"},
    )


@app.post("/cotizaciones/{comparison_id}/analisis")
def cotizacion_analisis(comparison_id: int, background: BackgroundTasks, user: dict = Depends(auth.require_user)):
    comp = load_comparison(comparison_id)
    usable = [q for q in comp["quotes"] if q["extraction_status"] in ("ok", "manual")]
    if len(usable) < 2:
        return redirect(f"/cotizaciones/{comparison_id}", "Necesitas al menos dos cotizaciones con datos", "error")
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
    user: dict = Depends(auth.require_user),
):
    comp = load_comparison(comparison_id)
    if status not in ("abierta", "cerrada"):
        status = "abierta"
    with db.get_conn() as conn:
        conn.execute(
            "UPDATE comparisons SET title=?, notes=?, status=?, updated_at=? WHERE id=?",
            (title.strip() or comp["title"], notes.strip(), status, db.now_iso(), comparison_id),
        )
    return redirect(f"/cotizaciones/{comparison_id}", "Comparativa actualizada")


@app.post("/cotizaciones/{comparison_id}/eliminar")
def cotizacion_eliminar(comparison_id: int, user: dict = Depends(auth.require_admin)):
    comp = load_comparison(comparison_id)
    with db.get_conn() as conn:
        conn.execute("DELETE FROM quotes WHERE comparison_id=?", (comparison_id,))
        conn.execute("DELETE FROM comparisons WHERE id=?", (comparison_id,))
    for q in comp["quotes"]:
        if q["file_path"]:
            Path(q["file_path"]).unlink(missing_ok=True)
    return redirect("/cotizaciones", "Comparativa eliminada")


# --------------------------------------------------------------------------- usuarios


@app.get("/usuarios", response_class=HTMLResponse)
def usuarios(request: Request, user: dict = Depends(auth.require_admin)):
    with db.get_conn() as conn:
        rows = db.rows_to_list(
            conn.execute("SELECT id, username, full_name, role, active, created_at FROM users ORDER BY username").fetchall()
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
    user: dict = Depends(auth.require_admin),
):
    try:
        auth.create_user(username, password, full_name, role)
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
                "INSERT INTO quotes (comparison_id, company, plan, moneda, prima_anual, suma_asegurada, deducible, "
                "coberturas, exclusiones, observaciones, extraction_status, uploaded_by, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, 'manual', ?, ?, ?)",
                (comp_id, r["company"], r["plan"], r["moneda"], r["total"], r["suma_asegurada"], r["deducible"],
                 json.dumps(r["coberturas"], ensure_ascii=False),
                 f"Preliminar según tarifario. Detalle: {detalle}", user["id"], ts, ts),
            )
    return redirect(f"/cotizaciones/{comp_id}", "Cotización preliminar guardada en la comparativa del cliente")
