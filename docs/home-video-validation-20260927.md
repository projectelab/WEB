# HOME DESORDEN — 27/09/2026

Base: `origin/main` — `969127233536ade6e36579decf0ed2b38013aa34`.
Rama: `feat/home-video-structure-20260927`.

## Cambio

- HOME con VÍDEOS, MODERNITZA'T y LABS. Menú con las mismas tres anclas en las 25 páginas públicas; interacción existente conservada.
- Seis desplegables HTML nativos en flujo vertical. Nutrikom, Pucnator, Esgrima y Marina abiertos; The Club Padel y Suro cerrados.
- Logotipo DESORDEN exacto del Drive. Logotipo VIU SVC existente completo y protagonista en HOME y `/projectes/viu-svc/`.
- David reproduce al cargar; SURO al entrar en viewport. Ambos sin loop ni controles, sin reiniciar por scroll y conservando el fotograma final.
- Vídeos de proyectos con carga al entrar en viewport, bloqueo de carga mientras están plegados y controles existentes de pausa/repetición manual.
- Anclas antiguas conservadas como alias. Contacto, formulario, WhatsApp, email, Worker, infraestructura, sitemap, titles, descriptions, canonicals y JSON-LD conservados.

## Assets

Fuente: carpeta Drive `WEB_DESORDEN_ASSETS_2026-09-27` proporcionada en el encargo.
Los nueve originales están descargados e incorporados en las carpetas de assets existentes. Ninguna URL de Drive se sirve en la web.

Los ocho originales de vídeo usan HEVC. Para reproducción en navegador se han generado copias H.264 mediante FFmpeg: `libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart -an`. Se mantienen resolución, frecuencia y número de fotogramas. Las copias para reproducción silenciosa omiten audio. Los originales permanecen intactos.

Los posters se extraen de los clips. Las imágenes `.last.webp` muestran el último fotograma para movimiento reducido. El final de reproducción conserva el fotograma nativo del elemento video, sin volver a cargarlo ni hacer seek.

Hashes, tamaños y metadatos: `media-home-20260927.json`.

## Validación

| Comprobación | Resultado |
| --- | --- |
| `npm test` | PASS — 52/52 |
| `node --check` — los dos JS nuevos | PASS |
| `git diff --check` | PASS |
| `npx wrangler deploy --dry-run --config wrangler.jsonc` | PASS — Wrangler 4.115.0, sin despliegue |
| Chrome 390 × 844 | PASS |
| Chrome 1440 × 900 | PASS |
| Menú, Escape y las tres anclas | PASS |
| Seis desplegables con Enter/Espacio; estado inicial | PASS |
| Sin stack, superposiciones ni overflow horizontal | PASS |
| Ocho vídeos: reproducción natural hasta ended, sin errores | PASS |
| David y SURO: último frame y sin repetición al volver | PASS |
| Inicialmente solo carga el MP4 de David | PASS |
| The Club Padel y SURO permanecen sin src mientras están plegados | PASS |
| Logos completos, proporción y object-fit contain | PASS |
| VIU SVC en URL existente, móvil/escritorio | PASS |
| Movimiento reducido: sin descargar vídeos automáticamente; proyectos reproducibles mediante control | PASS |
| Sin JavaScript: desplegables nativos y sin overflow | PASS |
| Contacto y SEO de HOME comparados exactamente con la base | PASS |
| Móvil físico / Safari | NOT_RUN |
| Producción | NOT_RUN — pendiente de revisión visual y merge autorizado |

La verificación visual usa un servidor estático local y Chrome. No equivale a una comprobación del Worker desplegado. No se ha enviado ningún formulario.

`npm ci` informa de cuatro avisos de vulnerabilidad alta en las dependencias ya fijadas; package.json y package-lock.json no se han modificado.

## Preview local

Desde el worktree:

```powershell
python -m http.server 4173 --bind 127.0.0.1 --directory public
```

Abrir `http://127.0.0.1:4173/`. Es una preview local, no una URL publicada.

## Archivos

- `docs/home-video-validation-20260927.md`
- `docs/media-home-20260927.json`
- `public/assets/DESORDEN_LOGO_OFICIAL.jpg`
- `public/assets/home-structure.20260927.css`
- `public/assets/home.once.20260927.js`
- `public/assets/media.20260927.js`
- `public/assets/viu-brand.20260927.css`
- `public/automatitzacio-sistemes/index.html`
- `public/avis-legal/index.html`
- `public/cookies/index.html`
- `public/disseny-web/index.html`
- `public/index.html`
- `public/laboratori/experiments/index.html`
- `public/laboratori/ia-visual/index.html`
- `public/laboratori/index.html`
- `public/laboratori/lip-sync/index.html`
- `public/laboratori/marina/index.html`
- `public/laboratori/suro/index.html`
- `public/laboratori/territori/index.html`
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
- `public/privadesa/index.html`
- `public/produccio-audiovisual/dron-video-aeri/index.html`
- `public/produccio-audiovisual/index.html`
- `public/projectes/ajuntament-sant-vicenc/index.html`
- `public/projectes/federacio-catalana-esgrima/index.html`
- `public/projectes/index.html`
- `public/projectes/nutrikom/index.html`
- `public/projectes/pata-negra/index.html`
- `public/projectes/percussio/index.html`
- `public/projectes/producte-digital/index.html`
- `public/projectes/pugnator-nox-bellum/index.html`
- `public/projectes/the-club-padel/index.html`
- `public/projectes/viu-svc/index.html`
- `tests/home-structure.mjs`
- `tests/media-lifecycle.mjs`
- `tests/portfolio-smoke.mjs`
- `tests/project-stack.mjs`
- `tests/public-site.mjs`
