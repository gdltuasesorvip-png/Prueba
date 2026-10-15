import io
import os
import tempfile
from pathlib import Path

os.environ["ENV_FILE"] = "/nonexistent/.env"
os.environ.setdefault("DATA_DIR", tempfile.mkdtemp())  # compartido con tests/test_agente.py
os.environ["SECRET_KEY"] = "clave-de-prueba"
os.environ["ADMIN_USER"] = "admin"
os.environ["ADMIN_PASSWORD"] = "admin123"
os.environ["ADMIN_NAME"] = "Administrador"
os.environ.pop("ANTHROPIC_API_KEY", None)

import pytest
from fastapi.testclient import TestClient

from app import extraction, main


@pytest.fixture(scope="module")
def client():
    with TestClient(main.app) as c:
        yield c


def login(client, user="admin", password="admin123"):
    r = client.post("/login", data={"username": user, "password": password}, follow_redirects=False)
    assert r.status_code == 303
    return r


def test_requires_login(client):
    r = client.get("/", follow_redirects=False)
    assert r.status_code == 303 and r.headers["location"].startswith("/login")


def test_login_bad_password(client):
    r = client.post("/login", data={"username": "admin", "password": "mala"})
    assert "incorrectos" in r.text


def test_full_flow_manual(client):
    login(client)
    r = client.get("/")
    assert "Hola, Administrador" in r.text

    r = client.post("/clientes/nuevo", data={"name": "Juan Pérez", "document_id": "V-12345678"}, follow_redirects=False)
    assert r.status_code == 303
    client_id = int(r.headers["location"].rsplit("/", 1)[1])

    r = client.post("/cotizaciones/nueva", data={"client_id": client_id, "ramo": "salud"}, follow_redirects=False)
    comp_id = int(r.headers["location"].rsplit("/", 1)[1])
    r = client.get(f"/cotizaciones/{comp_id}")
    assert "Salud - Juan Pérez" in r.text

    # Sin clave de API, un PDF se guarda con estado de error y se puede editar a mano
    pdf = io.BytesIO(b"%PDF-1.4 fake")
    r = client.post(
        f"/cotizaciones/{comp_id}/subir",
        data={"company": "mercantil"},
        files=[("files", ("mercantil.pdf", pdf, "application/pdf"))],
        follow_redirects=True,
    )
    assert "Sin clave de API" in r.text
    comp = main.load_comparison(comp_id)
    assert len(comp["documents"]) == 1 and comp["documents"][0]["extraction_status"] == "error"
    assert Path(os.environ["DATA_DIR"], "uploads", str(comp_id)).exists()

    r = client.post(f"/cotizaciones/{comp_id}/manual", data={"company": "oceanica"}, follow_redirects=False)
    edit_url = r.headers["location"]
    quote_id = int(edit_url.split("/items/")[1].split("/")[0])

    r = client.post(
        edit_url,
        data={
            "plan": "Plan Oro",
            "moneda": "USD",
            "prima_anual": "1.250,50",
            "suma_asegurada": "USD 50.000",
            "cov_nombre": ["Hospitalización", "Maternidad", ""],
            "cov_suma": ["USD 50.000", "USD 3.000", ""],
            "cov_deducible": ["", "", ""],
            "cov_detalle": ["", "Espera 10 meses", ""],
            "exclusiones": "Preexistencias\nDeportes extremos",
        },
        follow_redirects=False,
    )
    assert r.status_code == 303
    comp = main.load_comparison(comp_id)
    q = next(x for x in comp["quotes"] if x["id"] == quote_id)
    assert q["prima_anual"] == 1250.5
    assert [c["nombre"] for c in q["coberturas"]] == ["Hospitalización", "Maternidad"]
    assert q["exclusiones"] == ["Preexistencias", "Deportes extremos"]

    # El PDF quedó en error sin planes, así que la tabla solo muestra el plan manual
    r = client.get(f"/cotizaciones/{comp_id}")
    assert "Plan Oro" in r.text and "Hospitalización" in r.text
    # Análisis requiere dos cotizaciones con datos
    r = client.post(f"/cotizaciones/{comp_id}/analisis", follow_redirects=True)
    assert "al menos dos" in r.text

    r = client.get(f"/cotizaciones/{comp_id}/imprimir")
    assert "Comparativa de seguros" in r.text and "Plan Oro" in r.text


def test_extraction_pipeline_with_mock(client, monkeypatch):
    login(client)
    monkeypatch.setattr(extraction, "api_available", lambda: True)

    def fake_extract(pdf_path, company_label, ramo_label):
        # Cada PDF trae dos planes; la compañía se deduce del nombre del archivo
        name = pdf_path.read_bytes().decode(errors="ignore")
        compania = "Mercantil Seguros, C.A." if "mercantil" in name else "Hispana de Seguros"
        return extraction.CotizacionExtraida(
            compania=compania, ramo_detectado="hogar", asegurado=None, moneda="USD", vigencia="1 año",
            fecha_cotizacion="2026-10-01", observaciones_generales=None, confianza="alta",
            planes=[
                extraction.PlanExtraido(
                    plan="Plan Básico", prima_anual=420.0, prima_total=486.0, primas_fraccionadas="Semestral: 250",
                    suma_asegurada="USD 80.000", deducible="USD 200",
                    coberturas=[extraction.Cobertura(nombre="Incendio", suma_asegurada="USD 80.000", deducible=None, detalle=None)],
                    exclusiones=["Guerra"], observaciones=None,
                ),
                extraction.PlanExtraido(
                    plan="Plan Plus", prima_anual=610.0, prima_total=700.0, primas_fraccionadas=None,
                    suma_asegurada="USD 120.000", deducible="USD 150",
                    coberturas=[
                        extraction.Cobertura(nombre="Incendio", suma_asegurada="USD 120.000", deducible=None, detalle=None),
                        extraction.Cobertura(nombre="Robo", suma_asegurada="USD 10.000", deducible=None, detalle=None),
                    ],
                    exclusiones=[], observaciones=None,
                ),
            ],
        )

    monkeypatch.setattr(extraction, "extract_quote", fake_extract)
    r = client.post("/clientes/nuevo", data={"name": "Casa Feliz"}, follow_redirects=False)
    client_id = int(r.headers["location"].rsplit("/", 1)[1])
    r = client.post("/cotizaciones/nueva", data={"client_id": client_id, "ramo": "hogar"}, follow_redirects=False)
    comp_id = int(r.headers["location"].rsplit("/", 1)[1])
    # Dos PDFs de una sola vez, compañía detectada automáticamente
    r = client.post(
        f"/cotizaciones/{comp_id}/subir",
        data={"company": "auto"},
        files=[
            ("files", ("a.pdf", io.BytesIO(b"%PDF-1.4 mercantil"), "application/pdf")),
            ("files", ("b.pdf", io.BytesIO(b"%PDF-1.4 hispana"), "application/pdf")),
        ],
        follow_redirects=True,
    )
    assert "2 PDF recibido" in r.text
    comp = main.load_comparison(comp_id)
    assert [d["company"] for d in comp["documents"]] == ["mercantil", "hispana"]
    assert all(d["extraction_status"] == "ok" for d in comp["documents"])
    assert len(comp["quotes"]) == 4 and len(comp["ready"]) == 4
    assert [row["nombre"] for row in comp["coverage_matrix"]] == ["Incendio", "Robo"]
    cheapest = next(q for q in comp["quotes"] if q["id"] == comp["cheapest_id"])
    assert cheapest["plan"] == "Plan Básico" and cheapest["prima_anual"] == 420.0
    r = client.get(f"/cotizaciones/{comp_id}")
    assert r.text.count("Plan Plus") >= 2 and "Hispana de Seguros" in r.text

    # Quitar un plan de la comparativa
    plus_id = next(q["id"] for q in comp["quotes"] if q["plan"] == "Plan Plus")
    client.post(f"/cotizaciones/{comp_id}/items/{plus_id}/incluir", data={"included": 0})
    comp = main.load_comparison(comp_id)
    assert len(comp["ready"]) == 3
    r = client.get(f"/cotizaciones/{comp_id}/imprimir")
    assert r.text.count("Plan Plus") == 2  # tarjeta + tabla del plan que sigue incluido

    # Releer un PDF reemplaza sus planes sin duplicarlos
    doc_id = comp["documents"][0]["id"]
    client.post(f"/cotizaciones/{comp_id}/docs/{doc_id}/reprocesar")
    assert len(main.load_comparison(comp_id)["quotes"]) == 4

    monkeypatch.setattr(extraction, "generate_analysis", lambda *a, **k: "Recomendación: Mercantil por precio.")
    r = client.post(f"/cotizaciones/{comp_id}/analisis", follow_redirects=True)
    assert "Recomendación: Mercantil" in r.text

    # Eliminar el PDF elimina sus planes
    client.post(f"/cotizaciones/{comp_id}/docs/{doc_id}/eliminar")
    comp = main.load_comparison(comp_id)
    assert len(comp["documents"]) == 1 and len(comp["quotes"]) == 2


def test_rejects_non_pdf(client):
    login(client)
    r = client.post("/clientes/nuevo", data={"name": "X"}, follow_redirects=False)
    client_id = int(r.headers["location"].rsplit("/", 1)[1])
    r = client.post("/cotizaciones/nueva", data={"client_id": client_id, "ramo": "pyme"}, follow_redirects=False)
    comp_id = int(r.headers["location"].rsplit("/", 1)[1])
    r = client.post(
        f"/cotizaciones/{comp_id}/subir",
        data={"company": "hispana"},
        files=[("files", ("foto.jpg", io.BytesIO(b"\xff\xd8"), "image/jpeg"))],
        follow_redirects=True,
    )
    assert "No se subió ningún PDF" in r.text


def test_user_management(client):
    login(client)
    r = client.post(
        "/usuarios/nuevo",
        data={"username": "Maria", "full_name": "María López", "password": "clave123", "role": "agente"},
        follow_redirects=True,
    )
    assert "Usuario maria creado" in r.text
    r = client.post("/usuarios/nuevo", data={"username": "maria", "full_name": "Otra", "password": "clave123"})
    assert "ya existe" in r.text

    # El agente puede entrar pero no ver usuarios
    client.post("/logout")
    login(client, "maria", "clave123")
    r = client.get("/usuarios")
    assert r.status_code == 403
    r = client.post("/perfil/clave", data={"current": "clave123", "password": "nueva123", "confirm": "nueva123"}, follow_redirects=False)
    assert r.status_code == 303
    client.post("/logout")
    login(client, "maria", "nueva123")

    # El admin desactiva a maría y ella ya no entra
    client.post("/logout")
    login(client)
    r = client.get("/usuarios")
    user_id = int(r.text.split('action="/usuarios/')[2].split("/")[0]) if 'action="/usuarios/' in r.text else None
    assert user_id is not None
    client.post(f"/usuarios/{user_id}/estado", data={"active": 0})
    client.post("/logout")
    r = client.post("/login", data={"username": "maria", "password": "nueva123"})
    assert "incorrectos" in r.text


def test_tarifarios_and_quick_quote(client):
    login(client)
    r = client.get("/tarifarios")
    assert "EJEMPLO" in r.text and "Mercantil Seguros" in r.text

    # Crear tarifario y cargar rangos a mano
    r = client.post(
        "/tarifarios/nuevo",
        data={"company": "hispana", "plan": "Hispana Premium", "moneda": "USD", "suma_asegurada": "USD 120.000"},
        follow_redirects=False,
    )
    tid = int(r.headers["location"].rsplit("/", 1)[1])
    r = client.post(
        f"/tarifarios/{tid}/bandas",
        data={"edad_min": ["0", "18", "41"], "edad_max": ["17", "40", "65"], "prima": ["300", "550,50", "900"]},
        follow_redirects=True,
    )
    assert "Rangos de edad guardados" in r.text
    # Rangos solapados se rechazan
    r = client.post(
        f"/tarifarios/{tid}/bandas",
        data={"edad_min": ["0", "10"], "edad_max": ["17", "40"], "prima": ["300", "550"]},
        follow_redirects=True,
    )
    assert "se solapan" in r.text
    # Importar CSV
    csv_data = "edad_min;edad_max;prima\n0;17;310\n18;40;560\n41;70;950\n"
    r = client.post(
        f"/tarifarios/{tid}/importar",
        files={"file": ("tarifa.csv", io.BytesIO(csv_data.encode()), "text/csv")},
        follow_redirects=True,
    )
    assert "Se importaron 3 rangos" in r.text
    t = main.tarifas.get_tariff(tid)
    assert [b["prima_anual"] for b in t["bands"]] == [310, 560, 950]
    assert t["is_sample"] == 0
    # Coberturas por líneas
    r = client.post(
        f"/tarifarios/{tid}/editar",
        data={"plan": "Hispana Premium", "moneda": "USD", "coberturas": "Hospitalización | USD 120.000\nMaternidad | USD 4.000 | Espera 10 meses"},
        follow_redirects=True,
    )
    assert main.tarifas.get_tariff(tid)["coberturas"][1]["detalle"] == "Espera 10 meses"

    # Cotizar: titular 35, hijo 8, abuelo 80 (fuera de rango en Hispana Premium)
    r = client.post("/clientes/nuevo", data={"name": "Familia Gómez"}, follow_redirects=False)
    client_id = int(r.headers["location"].rsplit("/", 1)[1])
    all_ids = [t["id"] for t in main.tarifas.list_tariffs(only_active=True)]
    r = client.post(
        "/cotizar",
        data={
            "aseg_nombre": ["Pedro", "Ana", ""],
            "aseg_edad": ["35", "8", "80"],
            "tariff_id": [str(i) for i in all_ids],
            "client_id": str(client_id),
        },
    )
    assert r.status_code == 200
    assert "Fuera de rango" in r.text and "Hispana Premium" in r.text
    assert "Asegurado 3" in r.text
    # Total Hispana Premium: 560 + 310 + fuera de rango → sin total; Mercantil ejemplo: 780+520+2400? (80 fuera de rango también)
    results = main.tarifas.quick_quote(
        [{"nombre": "Pedro", "edad": 35}, {"nombre": "Ana", "edad": 8}], [tid]
    )
    assert results[0]["total"] == 870.0 and results[0]["complete"]

    # Guardar como comparativa
    payload = '{"insureds": [{"nombre": "Pedro", "edad": 35}, {"nombre": "Ana", "edad": 8}], "tariff_ids": [%d]}' % tid
    r = client.post("/cotizar/guardar", data={"payload": payload, "client_id": client_id}, follow_redirects=False)
    comp_id = int(r.headers["location"].rsplit("/", 1)[1])
    comp = main.load_comparison(comp_id)
    assert comp["quotes"][0]["prima_anual"] == 870.0
    assert "Pedro (35 años)" in comp["quotes"][0]["observaciones"]
    assert comp["quotes"][0]["coberturas"][0]["nombre"] == "Hospitalización"

    # El agente no puede editar tarifarios
    client.post("/logout")
    client.post("/usuarios/nuevo")  # sin sesión: redirige
    login(client)
    client.post("/usuarios/nuevo", data={"username": "pepe", "full_name": "Pepe", "password": "clave123", "role": "agente"})
    client.post("/logout")
    login(client, "pepe", "clave123")
    r = client.post(f"/tarifarios/{tid}/bandas", data={"edad_min": ["0"], "edad_max": ["99"], "prima": ["1"]})
    assert r.status_code == 403
    r = client.get(f"/tarifarios/{tid}")
    assert r.status_code == 200 and "Guardar rangos" not in r.text
    client.post("/logout")


def test_migration_from_old_schema(tmp_path, monkeypatch):
    """Una base de datos de la versión anterior (PDF guardado en la cotización) se migra sola."""
    import sqlite3
    from app import config, db

    old_db = tmp_path / "viejo.sqlite3"
    conn = sqlite3.connect(old_db)
    conn.executescript(
        """
        CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password_hash TEXT, full_name TEXT, role TEXT, active INTEGER, created_at TEXT);
        CREATE TABLE clients (id INTEGER PRIMARY KEY, name TEXT, document_id TEXT, phone TEXT, email TEXT, notes TEXT, created_by INTEGER, created_at TEXT);
        CREATE TABLE comparisons (id INTEGER PRIMARY KEY, client_id INTEGER, ramo TEXT, title TEXT, notes TEXT, analysis TEXT,
            analysis_status TEXT DEFAULT 'ninguno', analysis_error TEXT, status TEXT DEFAULT 'abierta', created_by INTEGER, created_at TEXT, updated_at TEXT);
        CREATE TABLE quotes (id INTEGER PRIMARY KEY, comparison_id INTEGER, company TEXT, file_path TEXT, original_filename TEXT,
            plan TEXT, moneda TEXT, prima_anual REAL, prima_total REAL, primas_fraccionadas TEXT, suma_asegurada TEXT, deducible TEXT,
            vigencia TEXT, fecha_cotizacion TEXT, coberturas TEXT DEFAULT '[]', exclusiones TEXT DEFAULT '[]', observaciones TEXT,
            confianza TEXT, extraction_status TEXT DEFAULT 'pendiente', extraction_error TEXT, raw_json TEXT, uploaded_by INTEGER,
            created_at TEXT, updated_at TEXT);
        INSERT INTO clients (id, name, created_at) VALUES (1, 'Viejo', 'x');
        INSERT INTO comparisons (id, client_id, ramo, title, created_at, updated_at) VALUES (1, 1, 'salud', 'Vieja', 'x', 'x');
        INSERT INTO quotes (comparison_id, company, file_path, original_filename, plan, prima_anual, extraction_status, created_at, updated_at)
            VALUES (1, 'mercantil', '/tmp/viejo.pdf', 'viejo.pdf', 'Plan Viejo', 900, 'ok', 'x', 'x');
        INSERT INTO quotes (comparison_id, company, plan, prima_anual, extraction_status, created_at, updated_at)
            VALUES (1, 'hispana', 'Manual', 700, 'manual', 'x', 'x');
        """
    )
    conn.commit()
    conn.close()
    monkeypatch.setattr(config, "DB_PATH", old_db)
    db.init_db()
    db.init_db()  # idempotente
    comp = main.load_comparison(1)
    assert len(comp["documents"]) == 1 and comp["documents"][0]["original_filename"] == "viejo.pdf"
    assert comp["documents"][0]["quotes"][0]["plan"] == "Plan Viejo"
    assert [q["plan"] for q in comp["manual_quotes"]] == ["Manual"]
    assert len(comp["ready"]) == 2


def test_extract_quote_uses_streaming(tmp_path, monkeypatch):
    """extract_quote debe usar la API en modo streaming y leer la respuesta estructurada."""
    from types import SimpleNamespace
    from app import config

    calls = {}

    class FakeStream:
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def get_final_message(self):
            data = extraction.CotizacionExtraida(
                compania="Oceánica de Seguros", ramo_detectado="salud", asegurado=None, moneda="USD", vigencia=None,
                fecha_cotizacion=None, observaciones_generales=None, confianza="alta",
                planes=[extraction.PlanExtraido(plan="Oro", prima_anual=100.0, prima_total=None, primas_fraccionadas=None,
                                                suma_asegurada=None, deducible=None, coberturas=[], exclusiones=[], observaciones=None)],
            )
            # Simula un bloque de texto sin parsed_output: debe parsearse desde el JSON
            block = SimpleNamespace(type="text", text=data.model_dump_json(), parsed_output=None)
            return SimpleNamespace(stop_reason="end_turn", content=[block])

    class FakeMessages:
        def stream(self, **kwargs):
            calls.update(kwargs)
            return FakeStream()

        def parse(self, **kwargs):
            raise AssertionError("no debe usar parse() sin streaming")

    class FakeClient:
        def __init__(self, **kwargs):
            calls["client_kwargs"] = kwargs
            self.beta = SimpleNamespace(messages=FakeMessages())

    monkeypatch.setattr(config, "ANTHROPIC_API_KEY", "sk-test")
    monkeypatch.setattr(extraction.anthropic, "Anthropic", FakeClient)
    pdf = tmp_path / "x.pdf"
    pdf.write_bytes(b"%PDF-1.4 test")
    result = extraction.extract_quote(pdf, None, "Salud")
    assert result.compania == "Oceánica de Seguros" and result.planes[0].plan == "Oro"
    assert calls["output_format"] is extraction.CotizacionExtraida
    assert calls["messages"][0]["content"][0]["type"] == "document"
    assert "Identifica la aseguradora" in calls["messages"][0]["content"][1]["text"]
    assert calls["client_kwargs"]["timeout"] == 900
    assert extraction.detect_company(result.compania) == "oceanica"


def test_share_link_pdf_and_select_all(client, monkeypatch):
    login(client)
    r = client.post("/configuracion", data={"oficina_nombre": "Oficina Díaz", "oficina_telefono": "0414-0000000"}, follow_redirects=True)
    assert "Configuración guardada" in r.text

    r = client.post("/clientes/nuevo", data={"name": "Laura Pérez", "phone": "+58 412-1234567"}, follow_redirects=False)
    client_id = int(r.headers["location"].rsplit("/", 1)[1])
    r = client.post("/cotizaciones/nueva", data={"client_id": client_id, "ramo": "salud"}, follow_redirects=False)
    comp_id = int(r.headers["location"].rsplit("/", 1)[1])
    for company, plan, prima, suma in (("mercantil", "Plus", "1850", "USD 100.000"), ("hispana", "Familiar", "1390", "USD 60.000"), ("oceanica", "Oro", "1620", "USD 80.000")):
        r = client.post(f"/cotizaciones/{comp_id}/manual", data={"company": company}, follow_redirects=False)
        client.post(r.headers["location"], data={"plan": plan, "moneda": "USD", "prima_anual": prima, "suma_asegurada": suma,
                                                 "cov_nombre": ["Hospitalización"], "cov_suma": [suma], "cov_deducible": [""], "cov_detalle": [""]})
    comp = main.load_comparison(comp_id)
    # Ordenados de menor a mayor prima; mayor suma asegurada detectada
    assert [q["plan"] for q in comp["ready"]] == ["Familiar", "Oro", "Plus"]
    assert next(q for q in comp["ready"] if q["id"] == comp["best_cover_id"])["plan"] == "Plus"

    # Bloques por compañía ordenados por su plan más barato
    assert [g["label"] for g in comp["groups"]] == ["Hispana de Seguros", "Oceánica de Seguros", "Mercantil Seguros"]
    text = main.whatsapp_summary(comp, "https://x/c/abc", {"oficina_nombre": "Oficina Díaz"})
    assert "*HISPANA DE SEGUROS*" in text and "• Familiar → USD 115,83 mensuales (USD 1.390,00 al año)" in text
    assert text.index("HISPANA") < text.index("MERCANTIL") and text.endswith("Oficina Díaz")

    # Enlace público con el teléfono del cliente en WhatsApp y resumen copiable
    r = client.get(f"/cotizaciones/{comp_id}")
    assert "Copiar enlace" in r.text and "wa.me/584121234567" in r.text and "Copiar resumen" in r.text
    token = r.text.split('id="share-url" value="')[1].split("/c/")[1].split('"')[0]
    assert len(token) >= 12

    # La vista pública no requiere sesión y muestra oficina, orden y badges
    anon = TestClient(main.app)
    r = anon.get(f"/c/{token}")
    assert r.status_code == 200 and "Oficina Díaz" in r.text and "Más económico" in r.text
    assert r.text.index("Familiar") < r.text.index("Oro") < r.text.index("Plus")
    assert anon.get("/c/tokenfalso123").status_code == 404
    r = anon.get(f"/c/{token}/pdf")
    assert r.status_code == 200 and r.headers["content-type"] == "application/pdf" and r.content.startswith(b"%PDF")

    # PDF con sesión
    r = client.get(f"/cotizaciones/{comp_id}/pdf")
    assert r.status_code == 200 and r.content.startswith(b"%PDF") and len(r.content) > 5000

    # Deseleccionar todo / seleccionar todo
    client.post(f"/cotizaciones/{comp_id}/items/todos", data={"included": 0})
    assert main.load_comparison(comp_id)["ready"] == []
    r = anon.get(f"/c/{token}")
    assert "no tiene planes seleccionados" in r.text
    client.post(f"/cotizaciones/{comp_id}/items/todos", data={"included": 1})
    assert len(main.load_comparison(comp_id)["ready"]) == 3

    # Renovar enlace invalida el anterior
    client.post(f"/cotizaciones/{comp_id}/compartir/renovar")
    assert anon.get(f"/c/{token}").status_code == 404


def test_recommendation_and_client_activity(client, monkeypatch):
    login(client)
    client.post("/configuracion", data={"oficina_nombre": "Oficina Díaz", "oficina_telefono": "0414-1234567"})
    r = client.post("/clientes/nuevo", data={"name": "Pedro Gómez"}, follow_redirects=False)
    client_id = int(r.headers["location"].rsplit("/", 1)[1])
    r = client.post("/cotizaciones/nueva", data={"client_id": client_id, "ramo": "salud", "notes": "Familia joven, esperan bebé"}, follow_redirects=False)
    comp_id = int(r.headers["location"].rsplit("/", 1)[1])
    for company, plan, prima in (("mercantil", "Plus", "1850"), ("hispana", "Familiar", "1390")):
        r = client.post(f"/cotizaciones/{comp_id}/manual", data={"company": company}, follow_redirects=False)
        client.post(r.headers["location"], data={"plan": plan, "moneda": "USD", "prima_anual": prima})
    comp = main.load_comparison(comp_id)
    plus_id = next(q["id"] for q in comp["quotes"] if q["plan"] == "Plus")

    # Recomendación escrita a mano
    r = client.post(f"/cotizaciones/{comp_id}/recomendar", data={"quote_id": plus_id, "recommendation": "Pedro, por la maternidad te conviene Plus."}, follow_redirects=True)
    assert "Recomendación guardada" in r.text
    comp = main.load_comparison(comp_id)
    assert comp["recommended"]["plan"] == "Plus"

    # Texto sugerido por Claude (simulado)
    monkeypatch.setattr(extraction, "api_available", lambda: True)
    captured = {}
    def fake_reco(client_name, ramo_label, chosen, others, notes):
        captured.update(chosen=chosen["plan"], others=[o["plan"] for o in others], notes=notes)
        return "Pedro, con un bebé en camino, Plus cubre maternidad."
    monkeypatch.setattr(extraction, "generate_recommendation", fake_reco)
    client.post(f"/cotizaciones/{comp_id}/recomendar/sugerir", data={"quote_id": plus_id})
    comp = main.load_comparison(comp_id)
    assert comp["recommendation"].startswith("Pedro, con un bebé") and comp["recommendation_status"] == "ok"
    assert captured == {"chosen": "Plus", "others": ["Familiar"], "notes": "Familia joven, esperan bebé"}

    # El cliente abre el enlace, elige un plan y pregunta
    r = client.get(f"/cotizaciones/{comp_id}")
    token = r.text.split('id="share-url" value="')[1].split("/c/")[1].split('"')[0]
    anon = TestClient(main.app)
    r = anon.get(f"/c/{token}")
    assert "Recomendado por" in r.text and "Quiero este plan" in r.text and "Tengo una pregunta" in r.text
    assert "Pedro, con un bebé" in r.text
    r = anon.get(f"/c/{token}/elegir/{plus_id}", follow_redirects=False)
    assert r.status_code == 303 and r.headers["location"].startswith("https://wa.me/584141234567?text=")
    assert "Plus" in r.headers["location"] and "Pedro%20G" in r.headers["location"]
    r = anon.get(f"/c/{token}/pregunta", follow_redirects=False)
    assert r.headers["location"].startswith("https://wa.me/584141234567")
    anon.get(f"/c/{token}")

    comp = main.load_comparison(comp_id)
    assert comp["activity"]["opens"] == 2
    assert [e["kind"] for e in comp["activity"]["choices"]] == ["question", "choose"]
    r = client.get(f"/cotizaciones/{comp_id}")
    assert "Abrió la comparativa 2 veces" in r.text and "Quiero este plan" in r.text
    r = client.get("/")
    assert "Novedades de clientes" in r.text and "Pedro Gómez" in r.text and "Quiere un plan" in r.text
    # PDF con recomendación
    r = client.get(f"/cotizaciones/{comp_id}/pdf")
    assert r.status_code == 200 and r.content.startswith(b"%PDF")
    # Teléfonos venezolanos a formato WhatsApp
    assert main.wa_number("0414-1234567") == "584141234567"
    assert main.wa_number("+58 412 555 1234") == "584125551234"
    assert main.wa_number("412-5551234") == "584125551234"


def test_advisor_profile_routes_whatsapp(client):
    login(client)
    client.post("/configuracion", data={"oficina_nombre": "Oficina Díaz", "oficina_telefono": "0414-0000000"})
    client.post("/usuarios/nuevo", data={"username": "luis", "full_name": "Luis Pérez", "password": "clave123", "role": "agente", "phone": "0416-7778899"})
    client.post("/logout")
    login(client, "luis", "clave123")
    r = client.get("/perfil")
    assert "0416-7778899" in r.text
    client.post("/perfil", data={"full_name": "Luis Pérez", "phone": "0416-7778899", "title": "Asesor de seguros", "email": ""})

    r = client.post("/clientes/nuevo", data={"name": "Ana Torres"}, follow_redirects=False)
    client_id = int(r.headers["location"].rsplit("/", 1)[1])
    r = client.post("/cotizaciones/nueva", data={"client_id": client_id, "ramo": "salud"}, follow_redirects=False)
    comp_id = int(r.headers["location"].rsplit("/", 1)[1])
    r = client.post(f"/cotizaciones/{comp_id}/manual", data={"company": "hispana"}, follow_redirects=False)
    client.post(r.headers["location"], data={"plan": "Familiar", "moneda": "USD", "prima_anual": "1000"})
    comp = main.load_comparison(comp_id)
    quote_id = comp["ready"][0]["id"]
    r = client.get(f"/cotizaciones/{comp_id}")
    token = r.text.split('id="share-url" value="')[1].split("/c/")[1].split('"')[0]

    anon = TestClient(main.app)
    r = anon.get(f"/c/{token}")
    assert "Luis Pérez" in r.text and "Asesor de seguros" in r.text and "Recomendado por" not in r.text
    r = anon.get(f"/c/{token}/elegir/{quote_id}", follow_redirects=False)
    assert r.headers["location"].startswith("https://wa.me/584167778899?text=")  # el asesor, no la oficina
    # el resumen de WhatsApp firma con el asesor y la oficina
    text = main.whatsapp_summary(comp, "https://x/c/t", {"oficina_nombre": "Oficina Díaz"})
    assert text.endswith("Luis Pérez · Oficina Díaz")

    # el admin reasigna la comparativa a sí mismo (sin teléfono): usa el de la oficina
    client.post("/logout")
    login(client)
    r = client.post(f"/cotizaciones/{comp_id}/actualizar", data={"title": "x", "status": "abierta", "advisor_id": 1}, follow_redirects=True)
    assert "Comparativa actualizada" in r.text
    r = anon.get(f"/c/{token}/elegir/{quote_id}", follow_redirects=False)
    assert r.headers["location"].startswith("https://wa.me/584140000000?text=")
    # admin edita el perfil de luis
    import re as _re
    r = client.get("/usuarios")
    luis_id = int(_re.search(r'<code>luis</code></td>\s*<td><a href="/usuarios/(\d+)/editar"', r.text).group(1))
    r = client.post(f"/usuarios/{luis_id}/editar", data={"full_name": "Luis A. Pérez", "phone": "0416-1112233", "email": "", "title": "", "role": "agente"}, follow_redirects=True)
    assert "Usuario actualizado" in r.text and "Luis A. Pérez" in r.text


def test_library_questions(client, monkeypatch):
    login(client)
    r = client.get("/biblioteca")
    assert "Biblioteca de condicionados" in r.text
    r = client.post(
        "/biblioteca/subir",
        data={"company": "oceanica", "ramo": "salud", "title": "Salud Integral Oro - Condiciones", "notes": ""},
        files={"file": ("oro.pdf", io.BytesIO(b"%PDF-1.4 condicionado"), "application/pdf")},
        follow_redirects=True,
    )
    assert "guardado" in r.text and "Salud Integral Oro" in r.text
    doc_id = int(r.text.split('href="/biblioteca?doc=')[1].split('"')[0])

    monkeypatch.setattr(extraction, "api_available", lambda: True)
    calls = []
    def fake_answer(pdf_path, title, question):
        calls.append((title, question))
        return ("Sí, cubre lentes hasta USD 150 al año [pág. 12].", [{"pages": "12", "text": "Lentes correctivos: hasta USD 150 por año póliza."}])
    monkeypatch.setattr(extraction, "answer_from_document", fake_answer)

    r = client.post("/biblioteca/preguntar", data={"doc_id": doc_id, "question": "¿Cubre lentes?"}, follow_redirects=True)
    assert "cubre lentes hasta USD 150" in r.text and "pág. 12" in r.text
    assert calls == [("Oceánica de Seguros · Salud Integral Oro - Condiciones", "¿Cubre lentes?")]
    # misma pregunta: reutiliza la respuesta sin llamar a Claude
    r = client.post("/biblioteca/preguntar", data={"doc_id": doc_id, "question": "¿cubre lentes?"}, follow_redirects=True)
    assert "ya tiene respuesta" in r.text and len(calls) == 1
    # búsqueda
    r = client.get("/biblioteca?q=lentes")
    assert "Cubre lentes" in r.text
    r = client.get("/biblioteca?q=maternidad")
    assert "Aún no hay preguntas" in r.text
    # un agente puede preguntar pero no subir ni borrar
    client.post("/usuarios/nuevo", data={"username": "rosa", "full_name": "Rosa", "password": "clave123", "role": "agente"})
    client.post("/logout"); login(client, "rosa", "clave123")
    r = client.post("/biblioteca/preguntar", data={"doc_id": doc_id, "question": "¿Período de espera de maternidad?"}, follow_redirects=True)
    assert len(calls) == 2
    r = client.post("/biblioteca/subir", data={"company": "hispana", "title": "x"}, files={"file": ("a.pdf", io.BytesIO(b"%PDF"), "application/pdf")})
    assert r.status_code == 403
    client.post("/logout")


def test_answer_from_document_parses_citations(tmp_path, monkeypatch):
    from types import SimpleNamespace
    from app import config

    class FakeStream:
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def get_final_message(self):
            cit = SimpleNamespace(type="page_location", start_page_number=12, end_page_number=13, cited_text="Lentes correctivos: hasta USD 150.")
            return SimpleNamespace(stop_reason="end_turn", content=[
                SimpleNamespace(type="text", text="Sí, cubre lentes hasta USD 150 al año", citations=[cit]),
                SimpleNamespace(type="text", text=". Aplica período de espera.", citations=None),
            ])
    captured = {}
    class FakeMessages:
        def stream(self, **kw):
            captured.update(kw); return FakeStream()
    class FakeClient:
        def __init__(self, **kw): self.beta = SimpleNamespace(messages=FakeMessages())
    monkeypatch.setattr(config, "ANTHROPIC_API_KEY", "sk-test")
    monkeypatch.setattr(extraction.anthropic, "Anthropic", FakeClient)
    pdf = tmp_path / "c.pdf"; pdf.write_bytes(b"%PDF-1.4 x")
    answer, cites = extraction.answer_from_document(pdf, "Oro", "¿Cubre lentes?")
    assert answer == "Sí, cubre lentes hasta USD 150 al año [pág. 12]. Aplica período de espera."
    assert cites == [{"pages": "12", "text": "Lentes correctivos: hasta USD 150."}]
    doc_block = captured["messages"][0]["content"][0]
    assert doc_block["citations"] == {"enabled": True} and doc_block["cache_control"] == {"type": "ephemeral"}
