# HOME limpia — DESORDEN — 27/09/2026

Base: `origin/main` — `969127233536ade6e36579decf0ed2b38013aa34`.
Rama: `feat/home-clean-start-20260927`.

## Alcance

HOME construida con una hoja de estilos propia y únicamente los bloques pedidos. Sin menú por indicación expresa del usuario. No carga el botón flotante, menú, stack, efectos de texto ni hojas de estilos de la HOME anterior.

Secuencia: entrada audiovisual / consentimiento → claim → David → logotipo oficial / significado → VÍDEOS → VIU SVC destacado → MODERNITZA'T → LABS → Qui soc / acreditaciones → contacto y legales → SURO como último elemento.

Los seis vídeos quedan unidos, sin separación, con el nombre dentro de cada vídeo en la esquina inferior izquierda. Todo el recuadro es el activador de un desplegable HTML nativo cerrado inicialmente. Al abrirlo, el nombre pasa debajo del vídeo y aparece la descripción; al cerrarlo vuelve al interior. Los vídeos cargan al entrar por primera vez en viewport y continúan en bucle aunque se haga scroll o se abra/cierre el texto. No tienen controles. Con preferencia inicial de movimiento reducido se mantienen los posters.

El claim «Si no et veuen, no et trien.» abre la página por encima del vídeo de David. Logotipo DESORDEN reducido un 20% adicional sobre el tamaño anterior: 168 px en móvil y 249,6 px en escritorio (reducción acumulada del 52%). VIU SVC reducido un 30% en HOME y página propia: 245 px en móvil y 448 px en escritorio. Las medidas se verifican a 390 y 1440 px, respectivamente.

David reproduce cuando empieza el fundido de entrada y SURO al entrar en viewport. Ambos sin loop ni controles y sin reiniciar por scroll. Movimiento reducido utiliza posters finales sin descargar esos vídeos.

Se modifica la HOME, la presentación del logo en la ruta existente `/projectes/viu-svc/` y una frase de `/cookies/`, autorizada expresamente para describir las nuevas preferencias. Las demás páginas permanecen en la base, incluyendo su navegación existente. El menú de la nueva HOME se definirá en una fase posterior.

Se conservan las anclas antiguas como alias, las URLs existentes, metadatos y JSON-LD, sitemap, contacto, formulario, WhatsApp, email y Worker. El formulario y el SEO de HOME se conservan; el footer añade «Revisar cookies». El JavaScript de contacto no se modifica.

## Assets

Los nueve originales proceden de la carpeta Drive proporcionada en el encargo y están incorporados en `public/assets`, `public/media/hero` y `public/media/portfolio`. Ningún vídeo se sirve desde Drive.

Los ocho originales de vídeo usan HEVC. Se conservan intactos y se generan copias H.264 para navegador con `libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart -an`. Las copias silenciosas conservan resolución, frecuencia y número de fotogramas. Posters extraídos de los clips.

Hashes, tamaños y metadatos: `media-home-20260927.json`.

## Validación

| Comprobación | Resultado |
| --- | --- |
| `npm test` | PASS — 72/72 |
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
| Entrada: solo MP4 de introducción y preparación de David; portfolio diferido | PASS |
| Seis proyectos: texto cerrado, vídeo visible y bucle real incluso fuera de viewport | PASS |
| Logotipos completos y proporcionales | PASS |
| VIU SVC en página propia centrado: 245 px móvil / 448 px escritorio | PASS |
| Preferencia inicial de movimiento reducido sin descarga automática de proyectos | PASS |
| Desplegables nativos sin JavaScript, sin overflow | PASS |
| Contacto: validación local y foco en primer campo inválido | PASS — sin envío |
| Formulario y SEO conservados; preferencias añadidas al footer | PASS |
| Móvil físico / Safari | NOT_RUN |
| Producción | NOT_RUN — sin merge ni despliegue |

La revisión visual utiliza Chrome y un servidor estático local; no equivale a verificar el Worker publicado.

`npm ci` informa de cuatro avisos de vulnerabilidad alta en las dependencias ya fijadas. No se modifican package.json, package-lock.json ni infraestructura.

## Ampliación: entrada audiovisual y Qui soc

La entrada se integra con `home-entry.20260927.js`, independiente del antiguo menú y efectos. El script externo inicia la capa tras analizar el HTML, sin depender de los scripts diferidos de contacto. El contenido existe desde el principio; un diálogo modal, `inert` y el bloqueo de scroll controlan el acceso. Los botones tienen el mismo estilo, atrapan Tab/Shift+Tab y no aceptan por espera, Escape o scroll.

Progreso audiovisual monotónico mediante `currentTime / duration`, `requestVideoFrameCallback` o `timeupdate`; se detienen las actualizaciones al terminar. La disponibilidad del hero/poster/fuente se comprueba aparte. Timeout de recursos: 10 s; timeout de vídeo: 12 s. Ambos resuelven fallos, nunca sustituyen la elección de cookies. Fundido de 550 ms (80 ms con movimiento reducido); David permanece en tiempo 0 hasta que comienza a verse. La capa se retira y devuelve foco al contenido. El portfolio conserva carga diferida y bucles.

Consentimiento: `localStorage` en `desorden:consent:v1`, con versión y fecha, válido durante 180 días; aceptación y rechazo reciben el mismo trato. Frecuencia de entrada: `sessionStorage` en `desorden:intro:v1`. Si el almacenamiento está bloqueado se respeta la decisión durante la visita. No existen servicios de analítica configurados y no se añade ninguno. La versión de consentimiento deberá cambiar antes de incorporar servicios nuevos. El footer permite revisar ambas opciones; una frase de la política se actualiza con autorización expresa.

Con movimiento reducido se usan imágenes estáticas y no se descargan los MP4 de entrada/hero. Sin JavaScript, la HOME sigue visible y los desplegables nativos funcionan; no se activa analítica.

Assets nuevos: cinco originales locales sin transformación. Vídeo H.264: 1080 × 1080, 60 fps, 6,633 s, 1.135.337 bytes. Se inspeccionó antes de elegir `object-fit: contain`; no se añadieron efectos. La fuente `PRELOADER_DESORDEN_D_A_N.mp4` no se descarga porque la versión optimizada funciona. Hashes y procedencia: `media-entry-20260927.json`.

Los JPG de AESA y Google contienen únicamente logotipos; se muestran completos en una columna móvil y dos columnas de escritorio. «Qui soc» es un bloque secundario antes de contacto. No se añaden datos personales ni identificadores.

Validación acotada en Chrome: 390 × 844 y 1440 × 900 PASS. Aceptación temprana, rechazo, decisión tras finalizar, persistencia, nueva sesión con decisión guardada, una introducción por sesión, progreso real a 100%, ausencia de MP4 de portfolio al entrar, hero pausado y solicitudes solo locales: PASS. Error de vídeo, autoplay bloqueado, timeout sin consentimiento implícito, storage denegado, fallback sin requestVideoFrameCallback, reduced motion y JavaScript desactivado: PASS. Teclado, retorno de foco, scroll bloqueado, fondo negro y recuperación con script diferido pendiente: PASS. La suite existente y nuevas pruebas se ejecutó una vez al final: 72/72.

Incidencia del material recibido: el vídeo y el último fotograma suministrados terminan visualmente en D, no en N. Se conservan intactos; el porcentaje llega a 100% al finalizar. Safari y móvil físico: NOT_RUN. Sin merge ni despliegue.

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

- `docs/media-entry-20260927.json`
- `public/assets/home-entry.20260927.js`
- `public/cookies/index.html`
- `public/media/intro/PRELOADER_DESORDEN_WEB_H264.mp4`
- `public/media/intro/PRELOADER_DESORDEN_POSTER.webp`
- `public/media/intro/PRELOADER_DESORDEN_LAST_FRAME.webp`
- `public/media/acreditacions/ACREDITACION_AESA.jpg`
- `public/media/acreditacions/ACREDITACION_GOOGLE_MARKETING.jpg`
- `tests/home-entry.mjs`
