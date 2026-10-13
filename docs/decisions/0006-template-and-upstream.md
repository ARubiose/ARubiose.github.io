# 0006 Plantilla y sitios derivados con `upstream`

- Estado: aceptada
- Fecha: 2026-10-13

## Contexto
El proyecto debía servir de plantilla, pero el código, los tests y los docs estaban ligados al
contenido y al dominio de su autor.

## Decisión
Dos repos: la plantilla (`llm-wiki-portfolio`, contenido ficticio de Ada y demo en Pages) y
los sitios derivados, que traen las mejoras desde un remoto `upstream`. El sitio del autor
comparte historial con la plantilla. `site` y `base` se deducen del repo. Los e2e y las
capturas corren sobre un fixture fijo; el contenido real lo validan los esquemas, la
privacidad, el presupuesto y un smoke genérico. Los archivos de contenido se protegen con
`merge=ours`.

## Consecuencias
Cambiar el contenido no exige tocar tests y la plantilla funciona con cualquier nombre de repo.
Se pierde la regresión visual del contenido real. Las mejoras deben hacerse en la plantilla, y
cada clon tiene que configurar el driver `merge.ours` a mano.
