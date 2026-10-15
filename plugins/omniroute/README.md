# Plugin OmniRoute para Claude Code

Conecta Claude Code con un gateway [OmniRoute](https://github.com/diegosouzapw/OmniRoute) que
corra en tu máquina, usando su servidor MCP (`http://localhost:20128/api/mcp/stream`). Expone las
herramientas de OmniRoute (enrutamiento, proveedores, combos, caché, compresión y memoria) dentro de
Claude Code. No agrega skills, comandos ni hooks.

Es una copia del plugin
[projectsaibg/omniroute-claude-plugin](https://github.com/projectsaibg/omniroute-claude-plugin)
(licencia MIT, archivo `LICENSE`). El único cambio es que el servidor MCP declara `"type": "http"`,
sin lo cual Claude Code 2.1.x rechaza el manifiesto al instalarlo.

## Requisitos

OmniRoute debe estar instalado y corriendo antes de abrir Claude Code:

```bash
npm install -g omniroute
omniroute            # escucha en el puerto 20128
```

## Instalación

Dentro de este repositorio el plugin ya queda habilitado por `.claude/settings.json`. Para usarlo
en otro proyecto:

```
/plugin install omniroute --marketplace gdltuasesorvip-png/Prueba
```

## Otro puerto, otro host o token

Edita `url` en `.claude-plugin/plugin.json`. Si tu instancia exige token, agrega:

```json
"headers": { "Authorization": "Bearer TU_TOKEN" }
```
