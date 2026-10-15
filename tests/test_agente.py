"""Pruebas del primer agente: las herramientas sobre datos reales y el ciclo del agente con un Claude simulado."""
import json
import os
import tempfile

os.environ["ENV_FILE"] = "/nonexistent/.env"
os.environ.setdefault("DATA_DIR", tempfile.mkdtemp())
os.environ["SECRET_KEY"] = "clave-de-prueba"
os.environ["ADMIN_USER"] = "admin"
os.environ["ADMIN_PASSWORD"] = "admin123"
os.environ["ADMIN_NAME"] = "Administrador"
os.environ.pop("ANTHROPIC_API_KEY", None)

import pytest
from fastapi.testclient import TestClient

from app import agente, config, main
from app.extraction import ExtractionError


@pytest.fixture(scope="module")
def client():
    with TestClient(main.app) as c:
        r = c.post("/login", data={"username": "admin", "password": "admin123"}, follow_redirects=False)
        assert r.status_code == 303
        yield c


@pytest.fixture(scope="module")
def datos(client):
    r = client.post("/clientes/nuevo", data={"name": "Agente Prueba Pérez", "document_id": "V-99887766"}, follow_redirects=False)
    client_id = int(r.headers["location"].rsplit("/", 1)[1])
    r = client.post("/cotizaciones/nueva", data={"client_id": client_id, "ramo": "hogar"}, follow_redirects=False)
    comp_id = int(r.headers["location"].rsplit("/", 1)[1])
    r = client.post(f"/cotizaciones/{comp_id}/manual", data={"company": "hispana"}, follow_redirects=False)
    r = client.post(
        r.headers["location"],
        data={"plan": "Hogar Total", "moneda": "USD", "prima_anual": "320", "suma_asegurada": "USD 80.000", "exclusiones": ""},
        follow_redirects=False,
    )
    assert r.status_code == 303
    return {"client_id": client_id, "comp_id": comp_id}


def test_herramientas_de_consulta(datos):
    clientes = json.loads(agente.buscar_clientes.call({"texto": "Agente Prueba"}))
    assert [c for c in clientes if c["id"] == datos["client_id"]]
    assert clientes[0]["comparativas"] >= 1

    comps = json.loads(agente.listar_comparativas.call({"client_id": datos["client_id"]}))
    assert comps and comps[0]["id"] == datos["comp_id"] and comps[0]["ramo"] == "hogar"
    assert json.loads(agente.listar_comparativas.call({"client_id": datos["client_id"], "ramo": "salud"})) == []

    detalle = json.loads(agente.ver_comparativa.call({"comparison_id": datos["comp_id"]}))
    assert detalle["cliente"] == "Agente Prueba Pérez"
    assert detalle["planes_incluidos"][0]["plan"] == "Hogar Total"
    assert detalle["planes_incluidos"][0]["prima_anual"] == 320
    assert "error" in json.loads(agente.ver_comparativa.call({"comparison_id": 999999}))


def test_herramientas_de_tarifario(client):
    tarifarios = json.loads(agente.listar_tarifarios.call({}))
    assert tarifarios and all(t["es_ejemplo"] for t in tarifarios)  # los tres de EJEMPLO que siembra la app
    assert json.loads(agente.listar_tarifarios.call({"ramo": "pyme"})) == []

    cotizacion = json.loads(agente.cotizar_por_tarifario.call({"edades": [35, 5]}))
    assert len(cotizacion) == len(tarifarios)
    assert all(c["total_anual"] is not None and c["cotizacion_completa"] for c in cotizacion)
    assert cotizacion == sorted(cotizacion, key=lambda c: c["total_anual"])
    assert len(cotizacion[0]["detalle"]) == 2

    solo_uno = json.loads(agente.cotizar_por_tarifario.call({"edades": [40], "tariff_ids": [tarifarios[0]["tariff_id"]]}))
    assert len(solo_uno) == 1
    assert "error" in json.loads(agente.cotizar_por_tarifario.call({"edades": [150]}))


def test_sin_clave_de_api(client):
    with pytest.raises(ExtractionError, match="ANTHROPIC_API_KEY"):
        agente.preguntar("¿Qué clientes hay?")
    with pytest.raises(ExtractionError, match="pregunta"):
        agente.preguntar("   ")


def test_pagina_asistente(client):
    r = client.get("/asistente")
    assert r.status_code == 200 and "Asistente" in r.text and "Sin clave de API" in r.text
    r = client.post("/asistente", data={"pregunta": "¿Qué clientes hay?"})
    assert r.status_code == 200 and "ANTHROPIC_API_KEY" in r.text


# --------------------------------------------------------------------------- ciclo del agente con un Claude simulado

class _Bloque:
    def __init__(self, **kw):
        self.__dict__.update(kw)


class _Mensaje:
    def __init__(self, content, stop_reason):
        self.content, self.stop_reason = content, stop_reason


class _RunnerFalso:
    """Imita al tool runner del SDK: primero Claude pide una herramienta, luego responde con texto."""

    def __init__(self, tools):
        self.tools = {t.name: t for t in tools}
        self._ultimo = None

    def __iter__(self):
        llamada = _Bloque(type="tool_use", id="t1", name="buscar_clientes", input={"texto": "Agente Prueba"})
        self._ultimo = _Mensaje([llamada], "tool_use")
        yield self._ultimo
        self._ultimo = _Mensaje([_Bloque(type="text", text="Encontré 1 cliente: Agente Prueba Pérez.")], "end_turn")
        yield self._ultimo

    def generate_tool_call_response(self):
        # Como el SDK real: ejecuta las herramientas pedidas en el último mensaje y arma los tool_result.
        llamadas = [b for b in self._ultimo.content if b.type == "tool_use"]
        if not llamadas:
            return None
        return {
            "role": "user",
            "content": [
                {"type": "tool_result", "tool_use_id": b.id, "content": self.tools[b.name].call(b.input)} for b in llamadas
            ],
        }


class _ClienteFalso:
    def __init__(self):
        self.kwargs = None
        self.beta = _Bloque(messages=_Bloque(tool_runner=self._tool_runner))

    def _tool_runner(self, **kwargs):
        self.kwargs = kwargs
        return _RunnerFalso(kwargs["tools"])


def test_preguntar_con_claude_simulado(datos, monkeypatch):
    falso = _ClienteFalso()
    monkeypatch.setattr(agente, "api_available", lambda: True)
    monkeypatch.setattr(agente, "_client", lambda: falso)

    r = agente.preguntar("¿Existe el cliente Agente Prueba?")

    assert r.respuesta == "Encontré 1 cliente: Agente Prueba Pérez."
    assert r.vueltas == 2
    assert [p.herramienta for p in r.pasos] == ["buscar_clientes"]
    assert r.pasos[0].entrada == {"texto": "Agente Prueba"}
    assert "Agente Prueba Pérez" in r.pasos[0].resultado and not r.pasos[0].error
    # Parámetros clave que recibió Claude
    assert falso.kwargs["model"] == config.CLAUDE_MODEL
    assert falso.kwargs["max_iterations"] == agente.MAX_ITERACIONES
    assert {t.name for t in falso.kwargs["tools"]} == {t.name for t in agente.HERRAMIENTAS}


def test_pagina_asistente_muestra_respuesta_y_pasos(client, monkeypatch):
    respuesta = agente.RespuestaAgente(
        respuesta="La más barata es Hogar Total (USD 320).",
        pasos=[agente.Paso("buscar_clientes", {"texto": "Agente"}, '[{"id": 1}]')],
        vueltas=2,
    )
    monkeypatch.setattr(main.agente, "preguntar", lambda pregunta: respuesta)
    r = client.post("/asistente", data={"pregunta": "¿Cuál es la más barata?"})
    assert r.status_code == 200
    assert "Hogar Total (USD 320)" in r.text
    assert "buscar_clientes" in r.text and "Qué hizo el agente" in r.text
    assert "¿Cuál es la más barata?" in r.text  # la pregunta queda en el formulario
