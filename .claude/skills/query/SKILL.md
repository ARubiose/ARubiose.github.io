---
name: query
description: Responde preguntas sobre la trayectoria, proyectos o habilidades del autor del portfolio usando la LLM Wiki. Úsala para preguntas del tipo «¿qué experiencia tengo con X?» o para preparar resúmenes adaptados a una oferta.
argument-hint: <pregunta>
---

Responde con la wiki a: $ARGUMENTS

1. Lee `wiki/index.md` y `wiki/private/index.md` y elige las páginas relevantes. Lee solo
   esas, y usa Grep sobre `wiki/` si el índice no basta.
2. Responde citando cada página usada con su enlace. Si la wiki no tiene la información,
   dilo y sugiere qué fuente añadir a `raw/`; no completes con suposiciones.
3. Si la respuesta tiene valor duradero (un resumen para una oferta, una comparación),
   ofrece guardarla. Si el usuario acepta:
   - Guárdala en `wiki/private/synthesis/<slug>.md` con `type: synthesis`.
   - Añádela a `wiki/private/index.md`.
   - Registra una entrada `query` en `wiki/private/log.md`.
