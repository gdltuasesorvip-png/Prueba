"""Configuración de la aplicación leída desde variables de entorno."""
import os
from pathlib import Path


def _load_dotenv() -> None:
    """Carga un archivo .env sencillo si existe (sin dependencias externas)."""
    env_path = Path(os.environ.get("ENV_FILE", ".env"))
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_dotenv()

DATA_DIR = Path(os.environ.get("DATA_DIR", "./data")).resolve()
UPLOAD_DIR = DATA_DIR / "uploads"
DB_PATH = DATA_DIR / "cotizador.sqlite3"

SECRET_KEY = os.environ.get("SECRET_KEY", "clave-insegura-solo-para-desarrollo")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-opus-5-5")

ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
ADMIN_NAME = os.environ.get("ADMIN_NAME", "Administrador")

MAX_UPLOAD_MB = int(os.environ.get("MAX_UPLOAD_MB", "20"))
SESSION_MAX_AGE = 60 * 60 * 12  # 12 horas

COMPANIAS = {
    "mercantil": "Mercantil Seguros",
    "oceanica": "Oceánica de Seguros",
    "hispana": "Hispana de Seguros",
}

RAMOS = {
    "salud": "Salud",
    "hogar": "Hogar",
    "pyme": "PyME",
}

ROLES = {
    "admin": "Administrador",
    "agente": "Agente",
}
