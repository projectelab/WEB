# DESORDEN — Requisitos de despliegue

Actualizado: **25-09-2026**

## Producción

- Dominio canónico: https://www.desorden.cat
- Worker: `webl`
- Rama de producción: `main`
- Configuración: `wrangler.jsonc`

## Secretos de GitHub Actions

La publicación automática requiere:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

El token debe ser válido para la cuenta/zona correctas y disponer de los permisos que necesita Wrangler para desplegar el Worker y consultar su estado.

## Rutas Cloudflare

`wrangler.jsonc` define:

```text
www.desorden.cat/*
desorden.cat/*
```

Static Assets se sirven desde:

```text
./public/
```

con `run_worker_first=true`.

## Workflow de producción

Archivo:

`.github/workflows/deploy-cloudflare.yml`

El workflow:

1. instala dependencias con `npm ci`;
2. ejecuta `npm test`;
3. normaliza y valida credenciales Cloudflare;
4. ejecuta `npx wrangler whoami`;
5. despliega con `npx wrangler deploy --config wrangler.jsonc`;
6. compara la versión desplegada con la versión activa mediante `wrangler deployments status --json`;
7. realiza smoke checks HTTP públicos;
8. valida cabeceras de seguridad y el endpoint de contacto cuando el runner puede acceder sin challenge.

## Managed Challenge

Un runner alojado por GitHub puede recibir un Managed Challenge de Cloudflare.

Se reconoce únicamente cuando coinciden:

- HTTP `403`;
- header `cf-mitigated: challenge`.

En ese caso, el check HTTP se registra como **INCONCLUSO** y genera un warning.

La respuesta desafiada no se considera una página ni un redirect verificado.

El deploy no debe fallar solo por este challenge si la versión activa ya fue confirmada mediante el plano de control autenticado de Wrangler.

El workflow sigue fallando ante:

- estados HTTP inesperados que no sean Managed Challenge;
- 403 ordinario;
- contenido requerido ausente;
- contenido prohibido;
- redirect con destino incorrecto;
- versión activa diferente de la versión recién desplegada.

## Comandos locales

```bash
npm test
npx wrangler deploy --dry-run --config wrangler.jsonc
```

## Estado vigente

Consultar:

[WEB_ESTADO_ACTUAL.md](WEB_ESTADO_ACTUAL.md)

El baseline funcional de producción previo a la sincronización documental es:

`f4f3dd0844b532c36830a3621a394cdde0586237`

El deploy correspondiente terminó **SUCCESS**.

El SHA vivo de `main` debe consultarse en GitHub/origin-main para evitar referencias autorreferenciales obsoletas.
