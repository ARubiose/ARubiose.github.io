# 0007 Páginas de detalle de proyecto con cuerpo publicado

- Estado: aceptada
- Fecha: 2026-10-15

## Contexto
Algunos proyectos no caben en una tarjeta. El portfolio solo publicaba el frontmatter de la
wiki; el cuerpo era prosa interna, solo en español, con enlaces a otras páginas y secciones
de trazabilidad. Los proyectos son muy distintos entre sí: unos campos estructurados
(problema, solución, resultados…) forzarían el contenido y llevarían prosa larga a YAML.

## Decisión
Cada proyecto puede tener una carpeta `projects/<slug>/` con `es.md` y `en.md` cuyo **cuerpo
Markdown sí se publica** en `/projects/<slug>/` y `/en/projects/<slug>/`. Es la única
excepción a «solo frontmatter». El cuerpo es texto para la web: sin HTML crudo, enlaces solo
web o de ancla, imágenes de su carpeta y sin secciones de wiki; la build lo valida con el
mismo analizador que usa Astro (`satteri`). Esto amplía la
[0004](0004-content-images-in-wiki.md): las imágenes de un detalle se referencian desde el
cuerpo, no desde el frontmatter. Los redacta el agente con la skill `detail` y los revisa el
humano.

## Consecuencias
- Cada proyecto se cuenta con la estructura que le encaja, y los dos idiomas se mantienen a
  la par por contrato.
- Publicar un cuerpo amplía lo que puede filtrarse: además del escáner de privacidad, hacen
  falta la validación de enlaces y HTML y la revisión humana de las imágenes, que ningún
  test inspecciona.
- La paridad entre idiomas se comprueba por archivo, no por campo: el contenido de las dos
  versiones puede divergir y lo vigila la revisión.
