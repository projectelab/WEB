# WEB — desorden.cat

Repositorio canónico de **https://www.desorden.cat**.

## Fuente de verdad

GitHub `projectelab/WEB` manda sobre memoria, conversaciones, copias locales, capturas y ramas antiguas.

Estado operativo vigente:

- [docs/WEB_ESTADO_ACTUAL.md](docs/WEB_ESTADO_ACTUAL.md)

Documentación de despliegue:

- [docs/DEPLOYMENT_REQUIREMENTS.md](docs/DEPLOYMENT_REQUIREMENTS.md)
- [README-CLOUDFLARE-WORKER.txt](README-CLOUDFLARE-WORKER.txt)
- [VALIDACION.txt](VALIDACION.txt)

## Producción

- Web: https://www.desorden.cat
- Runtime: Cloudflare Worker + Static Assets
- Rama de producción: `main`

## Flujo

`fetch → rama → cambio → tests → commit → push → PR → CI → merge → deploy → producción`

No trabajar directamente sobre `main`.

## Validación habitual

```bash
npm test
npx wrangler deploy --dry-run --config wrangler.jsonc
```

Para cambios visuales, validar como mínimo móvil 390×844 y escritorio 1440×900 cuando corresponda.
