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

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
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
    share_token TEXT,
    recommended_quote_id INTEGER,
    recommendation TEXT,
    recommendation_status TEXT NOT NULL DEFAULT 'ninguno',
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS share_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comparison_id INTEGER NOT NULL REFERENCES comparisons(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    quote_id INTEGER,
    detail TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_share_events_comparison ON share_events(comparison_id);

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comparison_id INTEGER NOT NULL REFERENCES comparisons(id) ON DELETE CASCADE,
    company TEXT NOT NULL DEFAULT 'auto',
    company_name TEXT,
    file_path TEXT NOT NULL,
    original_filename TEXT,
    extraction_status TEXT NOT NULL DEFAULT 'pendiente',
    extraction_error TEXT,
    confianza TEXT,
    raw_json TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comparison_id INTEGER NOT NULL REFERENCES comparisons(id) ON DELETE CASCADE,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    company TEXT NOT NULL,
    company_name TEXT,
    included INTEGER NOT NULL DEFAULT 1,
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
CREATE INDEX IF NOT EXISTS idx_documents_comparison ON documents(comparison_id);
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
        _migrate(conn)


def _columns(conn: sqlite3.Connection, table: str) -> set[str]:
    return {row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()}


def _migrate(conn: sqlite3.Connection) -> None:
    """Actualiza bases de datos creadas con versiones anteriores de la app."""
    ccols = _columns(conn, "comparisons")
    if "share_token" not in ccols:
        conn.execute("ALTER TABLE comparisons ADD COLUMN share_token TEXT")
    if "recommended_quote_id" not in ccols:
        conn.execute("ALTER TABLE comparisons ADD COLUMN recommended_quote_id INTEGER")
        conn.execute("ALTER TABLE comparisons ADD COLUMN recommendation TEXT")
        conn.execute("ALTER TABLE comparisons ADD COLUMN recommendation_status TEXT NOT NULL DEFAULT 'ninguno'")
    cols = _columns(conn, "quotes")
    if "document_id" not in cols:
        conn.execute("ALTER TABLE quotes ADD COLUMN document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE")
    if "company_name" not in cols:
        conn.execute("ALTER TABLE quotes ADD COLUMN company_name TEXT")
    if "included" not in cols:
        conn.execute("ALTER TABLE quotes ADD COLUMN included INTEGER NOT NULL DEFAULT 1")
    # Cotizaciones antiguas que guardaban el PDF en la propia fila: crear su documento.
    rows = conn.execute(
        "SELECT * FROM quotes WHERE file_path IS NOT NULL AND file_path != '' AND document_id IS NULL"
    ).fetchall()
    for q in rows:
        status = "ok" if q["extraction_status"] == "ok" else q["extraction_status"]
        cur = conn.execute(
            "INSERT INTO documents (comparison_id, company, file_path, original_filename, extraction_status, "
            "extraction_error, confianza, raw_json, uploaded_by, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (q["comparison_id"], q["company"], q["file_path"], q["original_filename"], status,
             q["extraction_error"], q["confianza"], q["raw_json"], q["uploaded_by"], q["created_at"], q["updated_at"]),
        )
        conn.execute("UPDATE quotes SET document_id=?, file_path=NULL WHERE id=?", (cur.lastrowid, q["id"]))


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


SETTING_KEYS = {
    "oficina_nombre": "Nombre de la oficina o corredor",
    "oficina_telefono": "Teléfono / WhatsApp",
    "oficina_correo": "Correo",
    "oficina_pie": "Texto al pie de la comparativa",
}


def get_settings() -> dict[str, str]:
    with get_conn() as conn:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
    data = {k: "" for k in SETTING_KEYS}
    data.update({r["key"]: r["value"] or "" for r in rows})
    return data


def save_settings(values: dict[str, str]) -> None:
    with get_conn() as conn:
        for key in SETTING_KEYS:
            conn.execute(
                "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (key, (values.get(key) or "").strip()),
            )
