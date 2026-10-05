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
  aplica. Etiquetas: `enhancement`, `bug`, `dependencies`, `documentation`, `local` (acción
  en la máquina, sin cambios versionados) y `wontfix` (decisiones de no hacer algo, cerradas
  como *not planned* para que quede constancia).
- Lo terminado se cierra desde el commit o la PR con `Closes #n`; el historial queda en git.
- No se usa un GitHub Project: con una sola persona, las etiquetas cubren lo necesario.

## Consecuencias
- Sin archivo que crezca: los issues cerrados no estorban y se pueden buscar.
- Los issues de un repo público son públicos: nunca deben contener datos de `raw/` ni de
  `wiki/private/`, igual que los archivos versionados.
- Leer la hoja de ruta requiere red y `gh` (`gh issue list`).
- Quien use el repo como plantilla no hereda los issues; el historial anterior sigue en git.
