#!/usr/bin/env bash
# Instala OmniRoute, lo arranca en el puerto 20128 y crea el token que usa el
# plugin de Claude Code (plugins/omniroute). Ejecutar en tu computadora:
#   bash scripts/omniroute-setup.sh
# Al terminar imprime la línea `export OMNIROUTE_API_KEY=...` que debes agregar a
# tu shell antes de abrir Claude Code. El token nunca se guarda en el repositorio.
set -euo pipefail

PORT="${OMNIROUTE_PORT:-20128}"
BASE="http://localhost:${PORT}"

if ! command -v omniroute >/dev/null 2>&1; then
  echo "Instalando OmniRoute con npm..."
  npm install -g omniroute
fi

if ! curl -sS -m 3 -o /dev/null "${BASE}/"; then
  echo "Arrancando OmniRoute en ${BASE}..."
  omniroute serve --daemon --no-open --port "${PORT}"
  for _ in $(seq 1 30); do
    curl -sS -m 3 -o /dev/null "${BASE}/" && break
    sleep 1
  done
fi
omniroute health

if [ -z "${OMNIROUTE_ADMIN_PASSWORD:-}" ]; then
  read -r -s -p "Clave de administrador de OmniRoute (nueva o la actual): " OMNIROUTE_ADMIN_PASSWORD
  echo
fi
omniroute setup --non-interactive --password "${OMNIROUTE_ADMIN_PASSWORD}" >/dev/null

COOKIES="$(mktemp)"
trap 'rm -f "${COOKIES}"' EXIT
curl -sS -m 10 -c "${COOKIES}" -o /dev/null -f -X POST "${BASE}/api/auth/login" \
  -H 'content-type: application/json' \
  -d "{\"password\":\"${OMNIROUTE_ADMIN_PASSWORD}\"}"

RESP="$(curl -sS -m 10 -b "${COOKIES}" -f -X POST "${BASE}/api/cli/tokens" \
  -H 'content-type: application/json' \
  -d '{"name":"claude-code-mcp","scope":"read"}')"
TOKEN="$(printf '%s' "${RESP}" | grep -oE 'oma_[A-Za-z0-9._-]+' | head -1)"
if [ -z "${TOKEN}" ]; then
  echo "No se pudo leer el token. Respuesta del servidor:" >&2
  echo "${RESP}" >&2
  exit 1
fi

echo
echo "Token creado. Agrega esta línea a tu ~/.bashrc o ~/.zshrc y abre Claude Code dentro del proyecto:"
echo "export OMNIROUTE_API_KEY=${TOKEN}"
