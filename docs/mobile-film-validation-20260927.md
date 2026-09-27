# Dirección visual móvil — 2026-09-27

## Resultado

La HOME conserva su composición editorial negra y ámbar. La apertura reúne el claim y David en una pantalla móvil. Los vídeos de apertura, portfolio y cierre comparten un tratamiento cálido casi monocromo aplicado por CSS; los archivos originales y los logotipos permanecen intactos.

Los seis vídeos del portfolio cambian suavemente de perspectiva con el desplazamiento: hasta 5 grados y escala mínima .955 en móvil, planos al pasar por el centro. El escritorio usa una intensidad secundaria de 2 grados. El contenedor conserva su tamaño; el efecto se aplica únicamente a la imagen del vídeo. Las descripciones se abren al tocar el recuadro y la imagen queda plana mientras están abiertas.

Referencia visual: [Tilted Card de React Bits](https://github.com/DavidHDev/react-bits/blob/main/src/content/Components/TiltedCard/TiltedCard.jsx). Su patrón de perspectiva se adapta aquí al scroll móvil con JavaScript nativo; no se incorpora código ni dependencias de React/Motion. La implementación mantiene una animación Web Animations pausada por vídeo y actualiza solo los visibles en un frame solicitado por eventos. No hay un bucle de animación permanente ni escrituras de estilos inline.

## Validación de este cambio

| Comprobación | Resultado |
| --- | --- |
| `npm test` | PASS — 77/77, incluidos cinco tests del ciclo de vida del efecto |
| `git diff --check` | PASS |
| `npx wrangler deploy --dry-run --config wrangler.jsonc` | PASS — empaquetado local sin despliegue |
| Chrome, viewport táctil 390 × 844 | PASS |
| Chrome, viewport táctil 360 × 740 | PASS |
| Chrome, escritorio 1440 × 900 | PASS |
| Claim y David dentro de la primera pantalla móvil | PASS |
| Tratamiento visual idéntico en los ocho vídeos; logos sin filtro | PASS |
| Sin overflow horizontal | PASS |
| Apertura táctil y cierre con teclado de la descripción | PASS |
| Vídeo sigue reproduciéndose al abrir; efecto cancelado mientras está abierto | PASS |
| Preferencia de movimiento reducido cancela el efecto y evita reiniciarlo al desplazar | PASS |
| Ausencia de estilos inline y errores JavaScript en las tres vistas | PASS |
| Entrada, visibilidad, salida de viewport y soporte incompleto de Web Animations | PASS — tests de ciclo de vida |
| Revisión visual de capturas móvil y escritorio | PASS |
| Safari y teléfono físico | NOT_RUN |
| Merge y despliegue | NOT_RUN |

La revisión en Chrome emula el viewport y el tacto; no mide el rendimiento de un teléfono físico. Los bucles y la carga de vídeos siguen a cargo del código de medios existente. La preferencia de movimiento reducido conserva la alternativa estática.

Preview local: `http://127.0.0.1:4173/?preview=film-mobile`.
