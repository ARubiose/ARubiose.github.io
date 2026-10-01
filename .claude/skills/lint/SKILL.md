---
name: lint
description: Revisión de salud de la LLM Wiki del portfolio: fugas de datos privados en wiki/public/, enlaces rotos, páginas huérfanas, contradicciones y fuentes sin ingerir. Úsala antes de hacer commit de cambios en wiki/ o cuando el usuario pida revisar la wiki.
context: fork
agent: general-purpose
---

Revisa toda la wiki (`wiki/`) contra sus convenciones y devuelve un informe.

Busca, en este orden de gravedad:

1. **Fugas de privacidad:** datos de la regla de privacidad en `wiki/public/` o
   `wiki/index.md`, o enlaces de lo público a `wiki/private/`.
2. **Enlaces rotos** entre páginas.
3. **Páginas huérfanas:** sin enlaces entrantes o ausentes de su índice.
4. **Frontmatter** incompleto o con un `type` inválido. Un `sources` que apunta a un archivo
   inexistente es solo un aviso, porque `raw/` no está en git.
5. **Contradicciones** entre páginas y datos desactualizados.
6. **Huecos:** entidades mencionadas sin página propia y archivos de `raw/` que no aparecen
   en ningún `sources`.

Corrige solo lo trivial: entradas de índice que faltan, enlaces rotos con una corrección
evidente y campos de frontmatter deducibles. No toques las fugas de privacidad ni las
contradicciones; repórtalas.

Añade una entrada `lint` a `wiki/private/log.md` con el resumen. Devuelve los hallazgos
agrupados por gravedad, cada uno con archivo y línea, y la lista de correcciones aplicadas.
