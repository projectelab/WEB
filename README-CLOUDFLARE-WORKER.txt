DESORDEN — CLOUDFLARE WORKER + STATIC ASSETS
================================================

ESTADO
------
Producción:
https://www.desorden.cat

Repositorio canónico:
https://github.com/projectelab/WEB

Rama de producción:
main

Worker:
webl

Configuración:
wrangler.jsonc

Estado operativo vigente:
docs/WEB_ESTADO_ACTUAL.md

ARQUITECTURA
------------
- src/worker.js
- public/
- Cloudflare Worker + Static Assets
- ASSETS con run_worker_first=true
- 404 real para recursos inexistentes
- rutas activas para:
  - www.desorden.cat/*
  - desorden.cat/*

BINDINGS
--------
- CONTACT_LEADS: Durable Object
- CONTACT_RATE_LIMITER: rate limit
- LEAD_EMAIL: Send Email
- ASSETS: Static Assets

PUBLICACIÓN
-----------
La publicación de producción se ejecuta desde GitHub Actions al hacer push/merge
sobre main.

Workflow:
.github/workflows/deploy-cloudflare.yml

Flujo:
1. npm ci
2. npm test
3. normalización y validación de credenciales Cloudflare
4. npx wrangler whoami
5. npx wrangler deploy --config wrangler.jsonc
6. verificación autenticada de la versión activa con wrangler
7. smoke checks HTTP públicos
8. verificación de cabeceras de seguridad y API de contacto cuando Cloudflare
   permite la comprobación desde el runner

VALIDACIÓN LOCAL
----------------
npm test

npx wrangler deploy --dry-run --config wrangler.jsonc

MANAGED CHALLENGE
-----------------
Los runners alojados por GitHub pueden recibir:

HTTP 403
cf-mitigated: challenge

Cuando ocurre exactamente este caso, el workflow marca la comprobación HTTP
pública como INCONCLUSA y genera un warning.

Una URL desafiada:
- NO se cuenta como contenido verificado;
- NO se cuenta como redirect verificado;
- NO hace fallar por sí sola un deploy cuya versión activa ya fue confirmada
  mediante el plano de control autenticado de Wrangler.

El workflow SÍ falla ante:
- estados HTTP inesperados distintos de Managed Challenge;
- 403 ordinario;
- contenido obligatorio ausente;
- contenido prohibido;
- redirect incorrecto;
- versión activa distinta de la desplegada.

RUTAS SEO PRINCIPALES
---------------------
- /produccio-audiovisual/
- /produccio-audiovisual/dron-video-aeri/
- /automatitzacio-sistemes/
- /disseny-web/

Redirect legado:
- /automatizacion/
  -> 301
  -> /automatitzacio-sistemes/

El redirect conserva query string.

DOMINIO
-------
Mantener:
- https://www.desorden.cat como URL canónica pública;
- desorden.cat redirigido a www cuando corresponda.

No asociar los mismos hostnames simultáneamente a otro Worker o proyecto Pages.

DOCUMENTACIÓN
-------------
Estado actual:
docs/WEB_ESTADO_ACTUAL.md

Requisitos de deploy:
docs/DEPLOYMENT_REQUIREMENTS.md

Cloudflare Static Assets:
https://developers.cloudflare.com/workers/static-assets/

GitHub Actions:
https://docs.github.com/actions
