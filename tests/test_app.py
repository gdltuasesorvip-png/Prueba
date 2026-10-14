import io
import os
import tempfile
from pathlib import Path

os.environ["ENV_FILE"] = "/nonexistent/.env"
os.environ["DATA_DIR"] = tempfile.mkdtemp()
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
    assert r.text.count("Plan Plus") == 1

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
