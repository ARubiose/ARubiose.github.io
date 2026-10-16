# 0005 Hoja de ruta en GitHub issues

- Estado: aceptada
- Fecha: 2026-10-05

## Contexto
`docs/tasks.md` era la única fuente de la hoja de ruta: una tabla *Hecho* y una lista
*Pendiente*. La tabla *Hecho* crecía sin límite y repetía lo que ya está en `git log`, así que
el archivo se volvía cada vez más largo de leer y de mantener, también para el agente.

## Decisión
La hoja de ruta pasa a los issues del repositorio y `docs/tasks.md` desaparece.

- Lo pendiente (fases, mejoras aplazadas, fallos) es un issue, con archivo y línea cuando
  aplica. Cada issue lleva **una** etiqueta de tipo: `type:feature`, `type:bug`, `type:test`
  (cobertura o tests intermitentes), `type:docs` o `type:chore` (dependencias, herramientas,
  configuración). Además: `wontfix` (decisiones de no hacer algo, cerradas como *not planned*
  para que quede constancia) y `duplicate`. Un sitio derivado puede añadir las suyas (p. ej.
  `local`: acción en la máquina, sin cambios versionados). *Actualizado el 2026-10-16: antes
  se usaban `enhancement`, `bug`, `dependencies` y `documentation`.*
- Lo que mejora la plantilla (código, tests, docs, skills) va en los issues de la plantilla;
  lo que solo afecta a un sitio (su contenido o su despliegue), en los de ese sitio.
- Lo terminado se cierra desde el commit o la PR con `Closes #n`; el historial queda en git.
- No se usa un GitHub Project: con una sola persona, las etiquetas cubren lo necesario.

## Consecuencias
- Sin archivo que crezca: los issues cerrados no estorban y se pueden buscar.
- Los issues de un repo público son públicos: nunca deben contener datos de `raw/` ni de
  `wiki/private/`, igual que los archivos versionados.
- Leer la hoja de ruta requiere red y `gh` (`gh issue list`).
- Quien use el repo como plantilla no hereda los issues; el historial anterior sigue en git.
