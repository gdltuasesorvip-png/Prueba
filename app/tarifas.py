"""Tarifarios por rango de edad y cotizador rápido."""
from __future__ import annotations

import csv
import io
import json
import re
from typing import Any

from . import config, db

# Tarifas de EJEMPLO para que la pantalla tenga datos antes de cargar los tarifarios reales.
SAMPLE_TARIFFS = [
    {
        "company": "mercantil", "plan": "Plan Salud Global (EJEMPLO)", "moneda": "USD",
        "suma_asegurada": "USD 100.000", "deducible": "USD 150 por evento",
        "coberturas": [
            {"nombre": "Hospitalización", "suma_asegurada": "USD 100.000"},
            {"nombre": "Emergencias", "suma_asegurada": "USD 5.000"},
            {"nombre": "Maternidad", "suma_asegurada": "USD 3.500", "detalle": "Espera 10 meses"},
            {"nombre": "Odontología", "suma_asegurada": "USD 500"},
        ],
        "bands": [(0, 17, 520), (18, 25, 640), (26, 35, 780), (36, 45, 950), (46, 55, 1250), (56, 65, 1700), (66, 75, 2400)],
    },
    {
        "company": "oceanica", "plan": "Salud Integral Oro (EJEMPLO)", "moneda": "USD",
        "suma_asegurada": "USD 80.000", "deducible": "USD 100 por evento",
        "coberturas": [
            {"nombre": "Hospitalización", "suma_asegurada": "USD 80.000"},
            {"nombre": "Emergencias", "suma_asegurada": "USD 3.000"},
            {"nombre": "Maternidad", "suma_asegurada": "USD 2.500", "detalle": "Espera 12 meses"},
            {"nombre": "Ambulatorio", "suma_asegurada": "USD 1.500"},
        ],
        "bands": [(0, 17, 460), (18, 25, 560), (26, 35, 690), (36, 45, 850), (46, 55, 1120), (56, 65, 1520), (66, 70, 2100)],
    },
    {
        "company": "hispana", "plan": "Hispana Familiar (EJEMPLO)", "moneda": "USD",
        "suma_asegurada": "USD 60.000", "deducible": "USD 200 por evento",
        "coberturas": [
            {"nombre": "Hospitalización", "suma_asegurada": "USD 60.000"},
            {"nombre": "Emergencias", "suma_asegurada": "USD 2.500"},
            {"nombre": "Odontología", "suma_asegurada": "USD 300"},
        ],
        "bands": [(0, 17, 390), (18, 25, 480), (26, 35, 590), (36, 45, 730), (46, 55, 960), (56, 65, 1300), (66, 70, 1800)],
    },
]


def seed_samples() -> None:
    """Carga tarifarios de ejemplo si no hay ninguno."""
    with db.get_conn() as conn:
        if conn.execute("SELECT COUNT(*) FROM tariffs").fetchone()[0]:
            return
        ts = db.now_iso()
        for t in SAMPLE_TARIFFS:
            cur = conn.execute(
                "INSERT INTO tariffs (company, ramo, plan, moneda, suma_asegurada, deducible, coberturas, notes, "
                "is_sample, created_at, updated_at) VALUES (?, 'salud', ?, ?, ?, ?, ?, ?, 1, ?, ?)",
                (
                    t["company"], t["plan"], t["moneda"], t["suma_asegurada"], t["deducible"],
                    json.dumps(t["coberturas"], ensure_ascii=False),
                    "Tarifa de ejemplo. Reemplázala con el tarifario real de la compañía.",
                    ts, ts,
                ),
            )
            conn.executemany(
                "INSERT INTO tariff_bands (tariff_id, edad_min, edad_max, prima_anual) VALUES (?, ?, ?, ?)",
                [(cur.lastrowid, a, b, p) for a, b, p in t["bands"]],
            )


def tariff_from_row(row) -> dict[str, Any]:
    t = dict(row)
    try:
        t["coberturas"] = json.loads(t.get("coberturas") or "[]")
    except json.JSONDecodeError:
        t["coberturas"] = []
    t["company_label"] = config.COMPANIAS.get(t["company"], t["company"])
    t["ramo_label"] = config.RAMOS.get(t["ramo"], t["ramo"])
    return t


def list_tariffs(only_active: bool = False) -> list[dict[str, Any]]:
    sql = (
        "SELECT t.*, (SELECT COUNT(*) FROM tariff_bands b WHERE b.tariff_id=t.id) AS n_bands, "
        "(SELECT MIN(edad_min) FROM tariff_bands b WHERE b.tariff_id=t.id) AS edad_min, "
        "(SELECT MAX(edad_max) FROM tariff_bands b WHERE b.tariff_id=t.id) AS edad_max FROM tariffs t"
    )
    if only_active:
        sql += " WHERE t.active=1"
    sql += " ORDER BY t.company, t.plan"
    with db.get_conn() as conn:
        return [tariff_from_row(r) for r in conn.execute(sql).fetchall()]


def get_tariff(tariff_id: int) -> dict[str, Any] | None:
    with db.get_conn() as conn:
        row = conn.execute("SELECT * FROM tariffs WHERE id=?", (tariff_id,)).fetchone()
        if row is None:
            return None
        t = tariff_from_row(row)
        t["bands"] = db.rows_to_list(
            conn.execute(
                "SELECT * FROM tariff_bands WHERE tariff_id=? ORDER BY edad_min", (tariff_id,)
            ).fetchall()
        )
    return t


def parse_number(value: str) -> float | None:
    value = str(value).strip().replace(" ", "")
    if not value:
        return None
    if "," in value and "." in value:
        if value.rfind(",") > value.rfind("."):
            value = value.replace(".", "").replace(",", ".")
        else:
            value = value.replace(",", "")
    elif "," in value:
        value = value.replace(",", ".")
    value = re.sub(r"[^0-9.\-]", "", value)
    try:
        return float(value)
    except ValueError:
        return None


def parse_bands_csv(content: bytes) -> tuple[list[tuple[int, int, float]], list[str]]:
    """Lee un CSV con columnas edad_min, edad_max, prima (acepta cabecera y separadores ; o ,)."""
    text = content.decode("utf-8-sig", errors="replace")
    sample = text[:2048]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=";,\t")
    except csv.Error:
        dialect = csv.excel
    bands, errors = [], []
    for n, row in enumerate(csv.reader(io.StringIO(text), dialect), start=1):
        cells = [c.strip() for c in row if c.strip()]
        if len(cells) < 3:
            continue
        a, b, p = parse_number(cells[0]), parse_number(cells[1]), parse_number(cells[2])
        if a is None or b is None or p is None:
            if n > 1:
                errors.append(f"Línea {n}: no se pudo leer '{' | '.join(cells)}'")
            continue
        bands.append((int(a), int(b), p))
    return bands, errors


def validate_bands(bands: list[tuple[int, int, float]]) -> list[str]:
    errors = []
    ordered = sorted(bands)
    for a, b, p in ordered:
        if a > b:
            errors.append(f"El rango {a}-{b} tiene la edad mínima mayor que la máxima")
        if p <= 0:
            errors.append(f"El rango {a}-{b} tiene prima inválida")
    for (a1, b1, _), (a2, _, _) in zip(ordered, ordered[1:]):
        if a2 <= b1:
            errors.append(f"Los rangos {a1}-{b1} y desde {a2} se solapan")
    return errors


def save_bands(tariff_id: int, bands: list[tuple[int, int, float]]) -> None:
    with db.get_conn() as conn:
        conn.execute("DELETE FROM tariff_bands WHERE tariff_id=?", (tariff_id,))
        conn.executemany(
            "INSERT INTO tariff_bands (tariff_id, edad_min, edad_max, prima_anual) VALUES (?, ?, ?, ?)",
            [(tariff_id, a, b, p) for a, b, p in sorted(bands)],
        )
        conn.execute("UPDATE tariffs SET updated_at=? WHERE id=?", (db.now_iso(), tariff_id))


def find_band(bands: list[dict[str, Any]], age: int) -> dict[str, Any] | None:
    for b in bands:
        if b["edad_min"] <= age <= b["edad_max"]:
            return b
    return None


def quick_quote(insureds: list[dict[str, Any]], tariff_ids: list[int]) -> list[dict[str, Any]]:
    """Calcula la prima de cada tarifario para la lista de asegurados."""
    results = []
    for tid in tariff_ids:
        t = get_tariff(tid)
        if t is None or not t["active"]:
            continue
        lines, total, complete = [], 0.0, True
        for person in insureds:
            band = find_band(t["bands"], person["edad"])
            prima = band["prima_anual"] if band else None
            if prima is None:
                complete = False
            else:
                total += prima
            lines.append({"nombre": person["nombre"], "edad": person["edad"], "prima": prima})
        t["lines"] = lines
        t["total"] = total if complete else None
        t["complete"] = complete
        results.append(t)
    return results


def coverage_matrix(tariffs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    order, labels, cells = [], {}, {}
    for t in tariffs:
        for cov in t["coberturas"]:
            name = (cov.get("nombre") or "").strip()
            if not name:
                continue
            key = re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()
            if key not in labels:
                labels[key] = name
                order.append(key)
                cells[key] = {}
            cells[key][t["id"]] = cov
    return [{"nombre": labels[k], "por_tarifa": cells[k]} for k in order]
