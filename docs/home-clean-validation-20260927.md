# HOME limpia — DESORDEN — 27/09/2026

Base: `origin/main` — `969127233536ade6e36579decf0ed2b38013aa34`.
Rama: `feat/home-clean-start-20260927`.

## Alcance

HOME construida con una hoja de estilos propia y únicamente los bloques pedidos. Sin menú por indicación expresa del usuario. No carga el botón flotante, menú, stack, efectos de texto ni hojas de estilos de la HOME anterior.

Secuencia: claim → David → logotipo oficial / significado → VÍDEOS → VIU SVC destacado → MODERNITZA'T → LABS → contacto y legales → SURO como último elemento.

Los seis vídeos quedan unidos, sin separación, con el nombre dentro de cada vídeo en la esquina inferior izquierda. Todo el recuadro es el activador de un desplegable HTML nativo cerrado inicialmente. Al abrirlo, el nombre pasa debajo del vídeo y aparece la descripción; al cerrarlo vuelve al interior. Los vídeos cargan al entrar por primera vez en viewport y continúan en bucle aunque se haga scroll o se abra/cierre el texto. No tienen controles. Con preferencia inicial de movimiento reducido se mantienen los posters.

El claim «Si no et veuen, no et trien.» abre la página por encima del vídeo de David. Logotipo DESORDEN reducido un 20% adicional sobre el tamaño anterior: 168 px en móvil y 249,6 px en escritorio (reducción acumulada del 52%). VIU SVC reducido un 30% en HOME y página propia: 245 px en móvil y 448 px en escritorio. Las medidas se verifican a 390 y 1440 px, respectivamente.

David reproduce al cargar y SURO al entrar en viewport. Ambos sin loop ni controles y sin reiniciar por scroll. Movimiento reducido utiliza posters finales sin descargar esos vídeos.

Solo se modifica la HOME y la presentación del logo en la ruta existente `/projectes/viu-svc/`. Las demás páginas permanecen en la base, incluyendo su navegación existente. El menú de la nueva HOME se definirá en una fase posterior.

Se conservan las anclas antiguas como alias, las URLs existentes, metadatos y JSON-LD, sitemap, contacto, formulario, WhatsApp, email y Worker. La sección de contacto y el SEO de HOME se compararon exactamente contra la base. El JavaScript de contacto no se modifica.

## Assets

Los nueve originales proceden de la carpeta Drive proporcionada en el encargo y están incorporados en `public/assets`, `public/media/hero` y `public/media/portfolio`. Ningún vídeo se sirve desde Drive.

Los ocho originales de vídeo usan HEVC. Se conservan intactos y se generan copias H.264 para navegador con `libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart -an`. Las copias silenciosas conservan resolución, frecuencia y número de fotogramas. Posters extraídos de los clips.

Hashes, tamaños y metadatos: `media-home-20260927.json`.

## Validación

| Comprobación | Resultado |
| --- | --- |
| `npm test` | PASS — 55/55 |
| Sintaxis JS y `git diff --check` | PASS |
| Wrangler 4.115.0 `deploy --dry-run --config wrangler.jsonc` | PASS — sin despliegue |
| Chrome 390 × 844 y 1440 × 900 | PASS |
| HOME sin menú ni botón heredados | PASS |
| Desplegables con Enter/Espacio y estado inicial | PASS |
| Seis vídeos sin separación; nombres dentro al cerrar y fuera al abrir | PASS — 390 × 844 y 1440 × 900 |
| Apertura/cierre desde esquinas y centro del vídeo; reproducción sin pausas | PASS — seis proyectos en ambos tamaños |
| Sin stack ni overflow horizontal | PASS |
| Reproducción completa de los ocho clips | PASS |
| David y SURO mantienen el último frame al volver con scroll | PASS |
| Inicialmente solo carga el MP4 de David | PASS |
| Seis proyectos: texto cerrado, vídeo visible y bucle real incluso fuera de viewport | PASS |
| Logotipos completos y proporcionales | PASS |
| VIU SVC en página propia centrado: 245 px móvil / 448 px escritorio | PASS |
| Preferencia inicial de movimiento reducido sin descarga automática de proyectos | PASS |
| Desplegables nativos sin JavaScript, sin overflow | PASS |
| Contacto: validación local y foco en primer campo inválido | PASS — sin envío |
| Contacto y SEO de HOME idénticos a la base | PASS |
| Móvil físico / Safari | NOT_RUN |
| Producción | NOT_RUN — sin merge ni despliegue |

La revisión visual utiliza Chrome y un servidor estático local; no equivale a verificar el Worker publicado.

`npm ci` informa de cuatro avisos de vulnerabilidad alta en las dependencias ya fijadas. No se modifican package.json, package-lock.json ni infraestructura.

## Preview

Desde el worktree:

```powershell
python -m http.server 4173 --bind 127.0.0.1 --directory public
```

Abrir `http://127.0.0.1:4173/`. Preview local, sin publicación.

## Archivos

- `docs/home-clean-validation-20260927.md`
- `docs/media-home-20260927.json`
- `public/assets/DESORDEN_LOGO_OFICIAL.jpg`
- `public/assets/home-clean.20260927.css`
- `public/assets/home-project-media.20260927.js`
- `public/assets/home.once.20260927.js`
- `public/assets/viu-brand.20260927.css`
- `public/index.html`
- `public/media/hero/HERO_DAVID_VENDA_GROGA.h264.mp4`
- `public/media/hero/HERO_DAVID_VENDA_GROGA.last.webp`
- `public/media/hero/HERO_DAVID_VENDA_GROGA.mp4`
- `public/media/hero/HERO_DAVID_VENDA_GROGA.webp`
- `public/media/portfolio/FEDERACIO_CATALANA_ESGRIMA_COPA_MON_SATELLIT_2025.h264.mp4`
- `public/media/portfolio/FEDERACIO_CATALANA_ESGRIMA_COPA_MON_SATELLIT_2025.mp4`
- `public/media/portfolio/FEDERACIO_CATALANA_ESGRIMA_COPA_MON_SATELLIT_2025.webp`
- `public/media/portfolio/MARINA_PERSONATGE_IA.h264.mp4`
- `public/media/portfolio/MARINA_PERSONATGE_IA.mp4`
- `public/media/portfolio/MARINA_PERSONATGE_IA.webp`
- `public/media/portfolio/NUTRIKOM_SURO.h264.mp4`
- `public/media/portfolio/NUTRIKOM_SURO.mp4`
- `public/media/portfolio/NUTRIKOM_SURO.webp`
- `public/media/portfolio/PUCNATOR_NOX_BELLUM.h264.mp4`
- `public/media/portfolio/PUCNATOR_NOX_BELLUM.mp4`
- `public/media/portfolio/PUCNATOR_NOX_BELLUM.webp`
- `public/media/portfolio/SURO_SANT_VICENC_DE_CASTELLET.h264.mp4`
- `public/media/portfolio/SURO_SANT_VICENC_DE_CASTELLET.mp4`
- `public/media/portfolio/SURO_SANT_VICENC_DE_CASTELLET.webp`
- `public/media/portfolio/SURO_TANCAMENT_WEB.h264.mp4`
- `public/media/portfolio/SURO_TANCAMENT_WEB.last.webp`
- `public/media/portfolio/SURO_TANCAMENT_WEB.mp4`
- `public/media/portfolio/SURO_TANCAMENT_WEB.webp`
- `public/media/portfolio/THE_CLUB_PADEL_A1PADEL_CATALUNYA_OPEN.h264.mp4`
- `public/media/portfolio/THE_CLUB_PADEL_A1PADEL_CATALUNYA_OPEN.mp4`
- `public/media/portfolio/THE_CLUB_PADEL_A1PADEL_CATALUNYA_OPEN.webp`
- `public/projectes/viu-svc/index.html`
- `tests/home-project-media.mjs`
- `tests/home-structure.mjs`
- `tests/portfolio-smoke.mjs`
- `tests/project-stack.mjs`
- `tests/public-site.mjs`
