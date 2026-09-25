# AGENTS.md — WEB / desorden.cat

## Ámbito

Este repositorio corresponde únicamente a **www.desorden.cat**.

No mezclar trabajo de:
- LAB
- UREMA
- SATECH
- otros repositorios o aplicaciones

## Fuente de verdad

Repositorio canónico:

https://github.com/projectelab/WEB

GitHub manda sobre memoria, conversaciones, copias locales, capturas y ramas antiguas.

Estado operativo actual:

`docs/WEB_ESTADO_ACTUAL.md`

Antes de cambios importantes:
1. `git fetch origin`
2. verificar `origin/main`
3. revisar solo los archivos afectados
4. crear rama nueva desde `origin/main`
5. no trabajar directamente sobre `main`

## Producción

https://www.desorden.cat

Después de publicar, verificar producción real.

## Identidad

Marca: **DESORDEN**

Estética:
- negro
- amarillo/ámbar
- minimalista
- directa
- visual
- mobile-first

Claim:
**“Si no et veuen, no et trien.”**

Evitar:
- estética SaaS
- cards genéricas
- fondos blancos innecesarios
- dashboards
- degradados decorativos
- componentes ajenos al diseño actual

## Idioma

Contenido nuevo de la web: **catalán**.

Explicaciones operativas al usuario: español.

## Contenido

La home debe seguir siendo visual y de portfolio. No llenarla de texto SEO.

Mantener separación entre:
- servicios
- proyectos
- laboratorio
- producto digital
- automatización
- contacto

No duplicar contenido masivamente.

Usar proyectos reales como prueba de servicios.

No inventar:
- clientes
- métricas
- testimonios
- premios
- colaboraciones
- certificaciones

## SEO

Priorizar:
- contenido real
- titles únicos
- meta descriptions útiles
- H1 único
- jerarquía H2/H3 coherente
- canonicals
- sitemap
- interlinking
- structured data real
- rendimiento
- mobile-first

Ámbito geográfico cuando tenga sentido:
- Sant Vicenç de Castellet
- Manresa
- Bages
- Catalunya Central
- Catalunya

No:
- keyword stuffing
- doorway pages
- páginas clonadas por ciudad

Structured data permitido cuando corresponda:
- Organization
- Person
- Service
- BreadcrumbList
- VideoObject

No publicar dirección privada sin autorización.

## Vídeo

No cambiar el comportamiento de vídeo en tareas no relacionadas.

Estado actual importante:
- vídeos de contenido sin loop;
- reproducen una vez;
- conservan el último frame;
- no reinician al reentrar en viewport;
- control blanco al finalizar;
- una pulsación manual reinicia desde 0;
- el hero mantiene comportamiento independiente.

Validar:
- móvil
- overflow
- controles
- carga
- reproducción
- último frame
- interacción

## Contacto

Contacto principal:
`lab@desorden.cat`

No tocar formulario, WhatsApp, Worker o email salvo tarea específica.

## Rendimiento

Mantener la web ligera.

Evitar dependencias nuevas.

Preferir HTML/CSS/JS existente.

## Git

Flujo:
1. fetch
2. rama nueva
3. cambio
4. tests
5. commit
6. push
7. PR
8. CI
9. merge solo si PASS
10. deploy
11. verificar producción

## Validación

Habitualmente:

```bash
npm test
npx wrangler deploy --dry-run --config wrangler.jsonc
```

Cambios visuales:
- móvil 390 × 844
- escritorio 1440 × 900 cuando corresponda

Revisar:
- scroll horizontal
- overflow
- navegación
- menú
- vídeos
- tipografía
- espaciado
- assets
- producción real

## Cloudflare Managed Challenge

Los checks públicos desde GitHub Actions pueden recibir:

`403 + cf-mitigated: challenge`

Ese caso se considera **INCONCLUSO**, no verificado.

No debe contarse como página/redirect verificado.

Otros estados inesperados, contenido incorrecto o redirects erróneos sí deben fallar.

## Estado SEO actual

Consultar siempre:

`docs/WEB_ESTADO_ACTUAL.md`

A 25/09/2026:
- sitemap procesado correctamente por Search Console;
- 25 páginas descubiertas;
- cuatro nuevas páginas SEO publicadas;
- rastreo/indexación de esas cuatro páginas todavía pendientes;
- no se ha solicitado indexación individual todavía.

No ampliar la arquitectura SEO sin datos reales de Search Console.

## Prioridades

1. estabilidad
2. rendimiento
3. claridad
4. coherencia visual
5. SEO
6. nuevas funciones

Regla general:

**preservar antes que reinventar.**
