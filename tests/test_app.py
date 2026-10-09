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
        files={"file": ("mercantil.pdf", pdf, "application/pdf")},
        follow_redirects=True,
    )
    assert "Sin clave de API" in r.text
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

    # La primera (mercantil) está en error, así que la tabla solo muestra oceánica
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
        return extraction.CotizacionExtraida(
            compania=company_label, plan="Plan Hogar Plus", ramo_detectado="hogar", asegurado=None,
            moneda="USD", prima_anual=420.0, prima_total=486.0, primas_fraccionadas="Semestral: 250",
            suma_asegurada="USD 80.000", deducible="USD 200", vigencia="1 año", fecha_cotizacion="2026-10-01",
            coberturas=[extraction.Cobertura(nombre="Incendio", suma_asegurada="USD 80.000", deducible=None, detalle=None)],
            exclusiones=["Guerra"], observaciones=None, confianza="alta",
        )

    monkeypatch.setattr(extraction, "extract_quote", fake_extract)
    r = client.post("/clientes/nuevo", data={"name": "Casa Feliz"}, follow_redirects=False)
    client_id = int(r.headers["location"].rsplit("/", 1)[1])
    r = client.post("/cotizaciones/nueva", data={"client_id": client_id, "ramo": "hogar"}, follow_redirects=False)
    comp_id = int(r.headers["location"].rsplit("/", 1)[1])
    for company in ("mercantil", "hispana"):
        client.post(
            f"/cotizaciones/{comp_id}/subir",
            data={"company": company},
            files={"file": (f"{company}.pdf", io.BytesIO(b"%PDF-1.4 x"), "application/pdf")},
        )
    comp = main.load_comparison(comp_id)
    assert all(q["extraction_status"] == "ok" for q in comp["quotes"])
    assert comp["coverage_matrix"][0]["nombre"] == "Incendio"
    r = client.get(f"/cotizaciones/{comp_id}")
    assert "Plan Hogar Plus" in r.text and "Incendio" in r.text

    monkeypatch.setattr(extraction, "generate_analysis", lambda *a, **k: "Recomendación: Mercantil por precio.")
    r = client.post(f"/cotizaciones/{comp_id}/analisis", follow_redirects=True)
    assert "Recomendación: Mercantil" in r.text


def test_rejects_non_pdf(client):
    login(client)
    r = client.post("/clientes/nuevo", data={"name": "X"}, follow_redirects=False)
    client_id = int(r.headers["location"].rsplit("/", 1)[1])
    r = client.post("/cotizaciones/nueva", data={"client_id": client_id, "ramo": "pyme"}, follow_redirects=False)
    comp_id = int(r.headers["location"].rsplit("/", 1)[1])
    r = client.post(
        f"/cotizaciones/{comp_id}/subir",
        data={"company": "hispana"},
        files={"file": ("foto.jpg", io.BytesIO(b"\xff\xd8"), "image/jpeg")},
        follow_redirects=True,
    )
    assert "Solo se aceptan archivos PDF" in r.text


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
