# Marquesina de logotipos — 27/09/2026

Rama: `feat/home-clean-start-20260927`. PR: #78.

La HOME limpia no contenía la marquesina. El usuario autorizó recuperar únicamente el bloque de origin/main al final de VÍDEOS, con los siete PNG nuevos. Se reutilizan sus dos grupos, desplazamiento hacia la izquierda, pausa con hover/foco y alternativa con scroll para movimiento reducido. Solo se incorporan las reglas CSS de este componente; no se carga el antiguo stylesheet ni se añade JavaScript.

Los grupos miden 854 px en móvil y 1204 px en escritorio, suficientes para cubrir el contenedor durante todo el ciclo. La separación es 11/17 px. Los tiempos 39,6667/45,49 s mantienen aproximadamente los 21,53/26,47 px/s originales al incorporar siete logos. Las imágenes usan altura 64/76 px, anchura automática y object-fit contain; sus atributos intrínsecos reservan la proporción original.

Fuente: https://drive.google.com/drive/folders/1AqoDVay_3Ip6sPklE7KULHd5ZnGqJ27b

Siete PNG intactos, de 1400 × 900, RGBA, color opaco común RGB(242,181,29). Se verificó igualdad byte a byte con las descargas. Ningún recorte, recoloreado, transformación gráfica ni sustitución de logos de otras secciones.

| Archivo | Bytes | SHA-256 |
| --- | ---: | --- |
| 01_FEDERACIO_CATALANA_ESGRIMA.png | 141121 | d2b5c50e90255eb2fadd9a1e82e6bba2e6a2de98d027c5bae51d17c4ccca4cf7 |
| 02_PUGNATOR.png | 106301 | 3920459f83ee3ea72dc07805f22b4dc46110d48bac57aa20e673946b9b8ee01f |
| 03_LOGO_MARQUESINA.png | 55319 | efeca9ff7a35ef3c6170bee16c3cbe9e983ebba7d3284887ec9c3094d435ccd7 |
| 04_VIU_SVC.png | 65862 | 43c417f509815ba2c0ed6367e53945910951e71c54375e85d4a4e67e17932765 |
| 05_PATA_NEGRA.png | 84486 | bfc9512841024e0569426f1209ab3e1adbdf12c1a61b002155e34dc321cf05ce |
| 06_THE_CLUB_PADEL.png | 42872 | a195ee29ed27b1fa075bb6c9f324da921e328bf5dbd5870659b730eaff668f7d |
| 07_NTK.png | 41389 | 283e6af008f49905ad2753252b43c733db36d1785b27f7ff1f89c4c0d87f4ae7 |

## Validación proporcional

- Chrome 390 × 844 y 1440 × 900: PASS.
- Siete logos completos, proporción 14:9 del canvas, color sin filtros, centrado vertical y separación uniforme: PASS.
- Sin recorte vertical: margen de imagen 23,5 px móvil y 26,5 px escritorio, más el padding transparente del asset.
- Ciclo continuo y repetición sin salto: PASS. Desplazamiento entre 1 ms antes/después del ciclo de 0,043/0,053 px, correspondiente al movimiento normal.
- Dirección, velocidad aproximada, pausa con foco y reduced motion: PASS.
- Sin overflow horizontal de la página: PASS.
- Carga de PNG bloqueada y liberada: altura de la marquesina y posición del siguiente bloque idénticas en ambos tamaños; sin salto de layout: PASS.
- HTML, al retirar solo el bloque añadido, idéntico a HEAD anterior. CSS anterior conservado byte a byte como prefijo: PASS.
- `node --test tests/portfolio-smoke.mjs tests/public-site.mjs tests/home-structure.mjs`: 34/34 PASS.
- `git diff --check`: PASS.
- Safari, móvil físico y producción: NOT_RUN.

Sin merge ni despliegue.
