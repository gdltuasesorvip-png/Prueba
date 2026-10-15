# Cotizador comparativo de seguros

Herramienta web para un equipo de corredores de seguros que trabaja con **Mercantil Seguros**,
**Oceánica de Seguros** e **Hispana de Seguros** en los ramos de **Salud, Hogar y PyME**.

Las aseguradoras no ofrecen API ni tarifas digitales, así que el flujo es:

1. El agente cotiza en el portal de cada compañía como siempre y descarga el PDF.
2. Sube los PDFs a la app, varios a la vez, dentro de una "comparativa" del cliente. Claude detecta
   de qué compañía es cada uno.
3. Claude lee cada PDF y extrae **todos los planes** que contenga, cada uno con prima anual, prima total,
   pago fraccionado, suma asegurada, deducible, coberturas con sus límites y exclusiones. El agente revisa
   y corrige lo que haga falta, y marca qué planes entran en la comparativa.
4. La app arma la tabla comparativa con un plan por columna (pueden ser varios de la misma compañía),
   marca la prima más baja y, con un clic, Claude redacta el análisis con ventajas, desventajas y
   recomendación.
5. Cada comparativa tiene un **enlace para el cliente** (sin usuario), botón de **WhatsApp**, **PDF
   descargable** y una vista con los planes ordenados del más económico al más caro. Los datos de la
   oficina que aparecen en esa vista se configuran en el menú **Oficina**.

### Cotizador rápido por tarifario

Además de los PDFs, la app tiene **tarifarios por rango de edad** para salud. El administrador carga,
por compañía y plan, la prima anual de cada rango (a mano o importando un CSV con tres columnas:
edad mínima, edad máxima, prima). Con ellos cualquier agente usa el **cotizador rápido**: indica la edad
de cada asegurado y obtiene al instante la prima de cada plan, sin entrar a los portales. El resultado se
puede guardar como comparativa preliminar en el historial del cliente.

Al arrancar por primera vez se cargan tres tarifarios de **EJEMPLO** con primas inventadas, solo para
probar la pantalla. Reemplázalos con los tarifarios reales.

Incluye usuarios con clave y dos roles: **administrador** (crea y desactiva usuarios, restablece claves,
elimina comparativas) y **agente** (clientes, comparativas y cotizaciones).

## Puesta en marcha local

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # edita SECRET_KEY, ADMIN_PASSWORD y ANTHROPIC_API_KEY
uvicorn app.main:app --reload
```

Abre http://localhost:8000 e inicia sesión con el usuario y clave de `ADMIN_USER` / `ADMIN_PASSWORD`.
El administrador inicial solo se crea la primera vez, cuando la base de datos está vacía.

## Con Docker

```bash
cp .env.example .env        # edita las variables
docker compose up -d --build
```

La base de datos SQLite y los PDFs quedan en la carpeta `data/`. Respáldala.

## Variables de entorno

| Variable | Para qué sirve |
|---|---|
| `ANTHROPIC_API_KEY` | Clave de API de Anthropic. Sin ella los PDFs se guardan pero hay que cargar los datos a mano. |
| `SECRET_KEY` | Firma las sesiones. Usa una cadena larga y aleatoria. |
| `ADMIN_USER`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Administrador inicial. |
| `DATA_DIR` | Carpeta de la base de datos y los PDFs. Por defecto `./data`. |
| `CLAUDE_MODEL` | Modelo usado para leer los PDFs. Por defecto `claude-opus-5-5`. |
| `MAX_UPLOAD_MB` | Tamaño máximo de cada PDF. Por defecto 20. |

La clave de API se obtiene en https://console.anthropic.com. Cada PDF leído cuesta unos centavos de dólar.

## Pruebas

```bash
pip install -r requirements-dev.txt
pytest
```

## Estructura

```
app/
  main.py         rutas web (login, clientes, comparativas, cotizaciones, usuarios)
  extraction.py   lectura de PDFs y análisis comparativo con Claude
  tarifas.py      tarifarios por edad y cotizador rápido
  db.py           esquema SQLite
  auth.py         usuarios, claves y sesiones
  templates/      páginas HTML
  static/         estilos
tests/            pruebas automáticas
```

## Plugin OmniRoute para Claude Code

El repositorio incluye el plugin **omniroute** (carpeta `plugins/omniroute/`), que conecta Claude Code con un
gateway [OmniRoute](https://github.com/diegosouzapw/OmniRoute) local por MCP. Al abrir este proyecto con
Claude Code el plugin se habilita solo gracias a `.claude/settings.json`. En otro proyecto se instala con:

```
/plugin install omniroute --marketplace gdltuasesorvip-png/Prueba
```

Requiere OmniRoute corriendo en el puerto 20128 y un token de acceso en la variable `OMNIROUTE_API_KEY`.
El script `scripts/omniroute-setup.sh` instala OmniRoute, lo arranca, crea el token y te muestra la línea
`export` que debes agregar a tu shell. Más detalles en `plugins/omniroute/README.md`.

## Publicarla para el equipo

Cualquier servidor con Docker sirve (un VPS pequeño, Railway, Render, Fly.io). Pon la app detrás de HTTPS
(por ejemplo con Caddy o el proxy del proveedor) porque las claves de los usuarios viajan en el formulario
de inicio de sesión.
