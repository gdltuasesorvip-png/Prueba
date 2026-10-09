"""Usuarios, contraseñas y sesiones."""
from typing import Any

import bcrypt
from fastapi import HTTPException, Request, status
from itsdangerous import BadSignature, URLSafeTimedSerializer

from . import config, db

_serializer = URLSafeTimedSerializer(config.SECRET_KEY, salt="sesion-cotizador")
COOKIE_NAME = "cotizador_sesion"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_user(username: str, password: str, full_name: str, role: str = "agente") -> int:
    username = username.strip().lower()
    if role not in config.ROLES:
        raise ValueError("Rol inválido")
    if len(password) < 6:
        raise ValueError("La clave debe tener al menos 6 caracteres")
    with db.get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO users (username, password_hash, full_name, role, active, created_at) "
            "VALUES (?, ?, ?, ?, 1, ?)",
            (username, hash_password(password), full_name.strip(), role, db.now_iso()),
        )
        return int(cur.lastrowid)


def ensure_admin() -> None:
    """Crea el administrador inicial si no existe ningún usuario."""
    with db.get_conn() as conn:
        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if count == 0 and config.ADMIN_PASSWORD:
        create_user(config.ADMIN_USER, config.ADMIN_PASSWORD, config.ADMIN_NAME, "admin")


def authenticate(username: str, password: str) -> dict[str, Any] | None:
    with db.get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE username = ? AND active = 1", (username.strip().lower(),)
        ).fetchone()
    if row is None or not verify_password(password, row["password_hash"]):
        return None
    return dict(row)


def make_session_token(user_id: int) -> str:
    return _serializer.dumps({"uid": user_id})


def read_session_token(token: str | None) -> int | None:
    if not token:
        return None
    try:
        data = _serializer.loads(token, max_age=config.SESSION_MAX_AGE)
    except BadSignature:
        return None
    return data.get("uid")


def get_user_by_id(user_id: int) -> dict[str, Any] | None:
    with db.get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ? AND active = 1", (user_id,)).fetchone()
    return dict(row) if row else None


def current_user(request: Request) -> dict[str, Any] | None:
    uid = read_session_token(request.cookies.get(COOKIE_NAME))
    if uid is None:
        return None
    return get_user_by_id(uid)


def require_user(request: Request) -> dict[str, Any]:
    user = current_user(request)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_303_SEE_OTHER,
            headers={"Location": f"/login?next={request.url.path}"},
        )
    return user


def require_admin(request: Request) -> dict[str, Any]:
    user = require_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo el administrador puede hacer esto")
    return user
