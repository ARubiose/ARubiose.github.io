# 0008 CV derivado de la wiki, en PDF desde la build

- Estado: aceptada
- Fecha: 2026-10-19

## Contexto

El portfolio necesita un CV descargable, y conviene poder adaptarlo a cada oferta. Un CV
mantenido a mano (Word, Overleaf) se desincroniza de la wiki en cuanto cambia una página. Los
filtros de candidaturas (ATS) leen el texto del PDF: necesitan texto seleccionable, en un
orden de lectura lineal y con títulos de sección reconocibles.

## Decisión

- **El CV es una selección sobre la wiki, no un texto nuevo.** Un bloque opcional `cv:` en el
  perfil dice qué se muestra, en qué orden y con qué énfasis (pilares, highlights, entradas
  compactas, grupos de habilidades, idiomas, foto por idioma). Sin él, el CV lo muestra todo.
- **Una página y un PDF por idioma.** `/cv/` pinta la hoja en HTML; una integración de Astro
  la imprime con Chromium (Playwright) al terminar la build. La build falla si el CV pasa de
  una página.
- **La hoja es papel, no una skin.** `src/styles/cv.css` tiene sus propios tokens `--cv-*`,
  en una columna y sin nada posicionado que contenga texto. Es una excepción a «los
  componentes usan solo clases semánticas de skin».
- **El CV adaptado es solo local.** `pnpm cv:tailor` construye con un `cv.yml` en un
  directorio temporal, y la skill `cv` lo escribe a partir de una oferta, junto con una nota de
  compatibilidad. Nunca se publica.

Descartado:

- **Overleaf o LaTeX:** duplican el contenido y obligan a mantener otro sistema de estilos.
- **Formulario público para que un reclutador suba su oferta:** exige un backend con la clave
  de un modelo, límites de uso contra el abuso y defensa ante la inyección de instrucciones en
  la oferta. Para un sitio estático en GitHub Pages no compensa.
- **Dos formatos (uno visual y otro para ATS):** con una columna y texto real, un solo diseño
  sirve para los dos, y mantener dos plantillas cuesta el doble.

## Consecuencias

- El CV se actualiza solo cuando cambia la wiki, y su contrato lo validan los mismos esquemas.
- La build necesita Chromium (el workflow ya lo instala para los e2e) y tarda unos segundos
  más; `CV_PDF=0` lo salta.
- El orden de lectura del PDF depende de cómo pinta Chromium: hay un test que lo comprueba.
- La hoja no cambia con la skin: su aspecto es fijo y está pensado para imprimirse.
