"""Acceso a la base de datos SQLite."""
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator

from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'agente',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    document_id TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comparisons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    ramo TEXT NOT NULL,
    title TEXT NOT NULL,
    notes TEXT,
    analysis TEXT,
    analysis_status TEXT NOT NULL DEFAULT 'ninguno',
    analysis_error TEXT,
    status TEXT NOT NULL DEFAULT 'abierta',
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comparison_id INTEGER NOT NULL REFERENCES comparisons(id) ON DELETE CASCADE,
    company TEXT NOT NULL,
    file_path TEXT,
    original_filename TEXT,
    plan TEXT,
    moneda TEXT,
    prima_anual REAL,
    prima_total REAL,
    primas_fraccionadas TEXT,
    suma_asegurada TEXT,
    deducible TEXT,
    vigencia TEXT,
    fecha_cotizacion TEXT,
    coberturas TEXT NOT NULL DEFAULT '[]',
    exclusiones TEXT NOT NULL DEFAULT '[]',
    observaciones TEXT,
    confianza TEXT,
    extraction_status TEXT NOT NULL DEFAULT 'pendiente',
    extraction_error TEXT,
    raw_json TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tariffs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    ramo TEXT NOT NULL DEFAULT 'salud',
    plan TEXT NOT NULL,
    moneda TEXT NOT NULL DEFAULT 'USD',
    suma_asegurada TEXT,
    deducible TEXT,
    coberturas TEXT NOT NULL DEFAULT '[]',
    notes TEXT,
    vigente_desde TEXT,
    vigente_hasta TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    is_sample INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tariff_bands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tariff_id INTEGER NOT NULL REFERENCES tariffs(id) ON DELETE CASCADE,
    edad_min INTEGER NOT NULL,
    edad_max INTEGER NOT NULL,
    prima_anual REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bands_tariff ON tariff_bands(tariff_id);
CREATE INDEX IF NOT EXISTS idx_quotes_comparison ON quotes(comparison_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_client ON comparisons(client_id);
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def connect() -> sqlite3.Connection:
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(config.DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


@contextmanager
def get_conn() -> Iterator[sqlite3.Connection]:
    conn = connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    with get_conn() as conn:
        conn.executescript(SCHEMA)


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row is not None else None


def rows_to_list(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(r) for r in rows]


def quote_from_row(row: sqlite3.Row | dict | None) -> dict[str, Any] | None:
    """Convierte una fila de quotes en dict con las listas JSON decodificadas."""
    if row is None:
        return None
    q = dict(row)
    for key in ("coberturas", "exclusiones"):
        try:
            q[key] = json.loads(q.get(key) or "[]")
        except json.JSONDecodeError:
            q[key] = []
    return q
