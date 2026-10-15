---
name: detail
description: Redacta o actualiza la página de detalle de un proyecto del portfolio (español e inglés) a partir de la wiki. Úsala cuando el usuario pida escribir, ampliar o actualizar el detalle, la página o la explicación en profundidad de un proyecto.
argument-hint: <slug del proyecto>
---

Redacta el detalle del proyecto `$ARGUMENTS` siguiendo *Detalles de proyecto* en
`.claude/rules/wiki.md`.

1. Lee la ficha `wiki/public/projects/$ARGUMENTS.md`, las páginas que enlaza y sus fuentes,
   y el detalle actual si ya existe. Si la ficha no existe, para y dilo.
2. Propón un índice de 3–6 secciones (`##`) adaptado al proyecto (por ejemplo: problema,
   cómo funciona, arquitectura, decisiones, resultados o lo aprendido) y qué imágenes o
   diagramas harían falta y de dónde saldrían. Espera la confirmación.
3. Redacta `es.md` y `en.md` a la vez, con el mismo contenido. Todo dato concreto sale de
   una fuente que se cita en `sources`. Nada privado (regla de privacidad) ni enlaces a la
   wiki.
4. **Antes de escribir**, presenta el texto de los dos idiomas y las imágenes propuestas.
   Las imágenes se versionan en un repo público: el humano las revisa siempre.
5. Escribe los archivos, enlaza el detalle desde el `## Relacionado` de la ficha, añade la
   línea a `wiki/index.md` y una entrada `detail` en `wiki/private/log.md`.
6. Ejecuta `pnpm vitest run tests/content` y termina sugiriendo `pnpm build` y revisar la
   página en `pnpm dev`.
