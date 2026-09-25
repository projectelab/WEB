# WEB — ESTADO ACTUAL

Actualizado: **25-09-2026**

## Producción y repositorio

- Producción: https://www.desorden.cat
- Repositorio canónico: https://github.com/projectelab/WEB
- Rama de producción: `main`
- Baseline funcional de producción verificado antes de esta sincronización documental: `f4f3dd0844b532c36830a3621a394cdde0586237`
- Para obtener el SHA vivo de `main`, consultar GitHub u `origin/main`; no se fija aquí para evitar que el propio commit documental lo deje obsoleto.

## Últimos cambios relevantes

### PR #69 — refinamiento visual, logo Esgrima y vídeo

Estado: **MERGED**

Cambios vigentes:
- bloque VISUAL / DIGITAL / SISTEMES sin efecto vertical/sticky ni huecos artificiales;
- nuevo logotipo de Federació Catalana d'Esgrima en ficha y marquesina;
- eliminado el módulo/botón de ampliar vídeo;
- vídeos de contenido sin loop;
- cada vídeo reproduce una vez, conserva el último fotograma y no vuelve a arrancar al reentrar en viewport;
- al finalizar, el punto de control pasa a blanco;
- una pulsación manual reinicia el vídeo desde 0;
- el hero inicial mantiene su comportamiento independiente.

### PR #70 — arquitectura SEO por servicios

Estado: **MERGED**

Rama:
`feat/seo-service-clusters-20260925`

Commit:
`226267daa3b4c22b1c039e2aa20240106a0a8000`

Merge commit:
`a925ade91ecfe8995182d307bc66aa4ed8faf592`

URLs añadidas:
- `/produccio-audiovisual/`
- `/produccio-audiovisual/dron-video-aeri/`
- `/automatitzacio-sistemes/`
- `/disseny-web/`

Redirect:
- `/automatizacion/` → **301** → `/automatitzacio-sistemes/`
- conserva query string.

SEO técnico:
- titles únicos;
- meta descriptions;
- canonicals;
- H1 único;
- sitemap actualizado;
- interlinking entre servicios y proyectos;
- `Service` structured data;
- `BreadcrumbList`;
- sin `FAQPage`;
- sin `VideoObject`.

Validación PR #70:
- tests: **46/46 PASS**;
- QA 390×844: PASS;
- QA 1440×900: PASS;
- sin overflow;
- Wrangler dry-run: PASS;
- CI: PASS.

### PR #71 — Managed Challenge en smoke checks

Estado: **MERGED**

Rama:
`fix/deploy-smoke-managed-challenge-20260925`

Commit:
`e1dcaf84379dec7a839cc0e1e0a18480f0a1f1c3`

Merge commit:
`f4f3dd0844b532c36830a3621a394cdde0586237`

Corrección:
- un HTTP 403 con `cf-mitigated: challenge` ya no se interpreta como fallo real de producción;
- el check queda **INCONCLUSO** y genera warning;
- una respuesta desafiada no cuenta como página ni redirect verificado;
- otros estados inesperados, contenido incorrecto, 403 ordinario o destino de redirect erróneo siguen fallando.

Validación PR #71:
- tests: **46/46 PASS**;
- sintaxis Bash: PASS;
- simulación Managed Challenge: PASS;
- respuestas correctas: PASS;
- 403 ordinario: detectado correctamente;
- redirect erróneo: detectado correctamente;
- CI: PASS.

Deploy de `main`:
- workflow: **Deploy DESORDEN to Cloudflare**
- run: `36109437885`
- conclusión: **SUCCESS**
- SHA desplegado: `f4f3dd0844b532c36830a3621a394cdde0586237`

## Producción verificada

Estado informado y comprobado tras PR #71:

- `/produccio-audiovisual/` → **200**
- `/produccio-audiovisual/dron-video-aeri/` → **200**
- `/automatitzacio-sistemes/` → **200**
- `/disseny-web/` → **200**
- `/automatizacion/` → **301**
- el redirect conserva query string.

## Search Console — 25/09/2026

Propiedad:
`https://www.desorden.cat/`

### Sitemap

- sitemap: `/sitemap.xml`
- estado: **Correcto**
- última lectura: **25/09/2026**
- páginas descubiertas: **25**
- vídeos descubiertos: **0**

El sitemap fue reenviado una sola vez después del lanzamiento y Search Console confirmó su procesamiento.

### Nuevas páginas SEO

- `/produccio-audiovisual/`
- `/produccio-audiovisual/dron-video-aeri/`
- `/automatitzacio-sistemes/`
- `/disseny-web/`

Estado actual en inspección:
- **La URL no está en Google**
- último rastreo: **N/D**
- sitemap de referencia mostrado por inspección: ninguno todavía
- Google aún no ha rastreado/reconocido individualmente estas URLs
- solicitud manual de indexación individual: **NO REALIZADA**

### Rendimiento

Datos disponibles hasta:
**22/09/2026**

Estado:
- 0 clics
- 0 impresiones
- sin filas por página

Estos datos son anteriores al lanzamiento de los clusters del 25/09/2026 y no sirven todavía para evaluar su rendimiento.

## Estado actual

### Técnico

- repositorio: estable;
- tests: 46/46 PASS en el último cambio estructural/CI;
- deploy: PASS;
- Managed Challenge: tratado correctamente como verificación inconclusa;
- no hay una incidencia técnica abierta asociada al deploy de PR #71.

### SEO

- sitemap: procesado correctamente;
- nuevas URLs: publicadas y accesibles;
- rastreo de las nuevas URLs: pendiente;
- indexación: pendiente;
- métricas: pendientes.

## Próximos pasos

1. Solicitar indexación una vez para cada una de las cuatro páginas nuevas.
2. No reenviar repetidamente el sitemap.
3. Esperar señales reales de rastreo e indexación.
4. Revisar Search Console cuando aparezca fecha de rastreo, indexación o primeras impresiones.
5. No crear más páginas SEO hasta disponer de datos reales.
6. No cambiar titles, canonicals o arquitectura sin una señal concreta que lo justifique.

## Regla de actualización

Los SHA incrustados en este documento identifican baselines funcionales o commits de cambios concretos, no pretenden ser un puntero autorreferencial al último commit documental de `main`.

Este documento debe reflejar el estado operativo vigente. No sustituye el historial de PRs ni auditorías fechadas. Los documentos históricos conservan su fecha y contexto original.
