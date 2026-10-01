---
name: ingest
description: Incorpora una fuente de raw/ (CV, exportación de LinkedIn, notas, certificados) a la LLM Wiki del portfolio. Úsala cuando el usuario añada material a raw/ o pida meter, ingerir o procesar información personal o profesional en la wiki.
argument-hint: <ruta en raw/>
---

Ingiere la fuente `$ARGUMENTS` en la wiki.

1. Lee la fuente completa y después `wiki/index.md` y `wiki/private/index.md`, para saber
   qué páginas existen ya.
2. **Antes de escribir nada**, presenta al usuario:
   - 3–5 puntos con lo que has extraído.
   - Las páginas que vas a crear o actualizar, separadas en públicas y privadas.
   - Los datos dudosos de privacidad y las contradicciones con lo que ya hay.

   Espera su confirmación.
3. Crea o actualiza las páginas. Una fuente suele tocar varias: puesto, proyectos,
   habilidades, formación, perfil y notas privadas. Prefiere actualizar a duplicar.
4. Añade enlaces cruzados en ambos sentidos, sin enlazar nunca de lo público a lo privado.
5. Actualiza los dos índices y añade una entrada `ingest` a `wiki/private/log.md`.
6. Termina con la lista de archivos tocados y sugiere revisar con `git diff wiki/`.
