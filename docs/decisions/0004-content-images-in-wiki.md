# 0004 Imágenes del contenido en la wiki pública

- Estado: aceptada
- Fecha: 2026-10-04

## Contexto

La foto de perfil estaba en `src/assets/images/`, fuera de la wiki, aunque es contenido
igual que el texto del perfil. Quedaba abierta la duda de dónde poner futuras imágenes del
contenido (logos de empresas, capturas de proyectos) y si hacía falta guardar a mano una
versión optimizada para la web.

## Decisión

Las imágenes del contenido van en `wiki/public/`, junto a la página que las usa, y se
referencian desde su frontmatter con una ruta relativa (`photo: ./profile.jpg`).

- El esquema Zod compartido valida solo la forma de la ruta, para que los tests de contrato
  sigan funcionando sin Astro.
- `src/content.config.ts` extiende el esquema con `image()`, y Astro genera las versiones
  WebP durante la build. No se versiona ninguna copia optimizada a mano.
- Un test de contrato comprueba que el archivo existe junto a la página.

## Consecuencias

- Todo el contenido, imágenes incluidas, sale de `wiki/public/`, y una plantilla nueva solo
  tiene que tocar la wiki.
- El original se versiona en el repo público, así que una imagen de la wiki es tan pública
  como su página.
- Los componentes reciben la imagen por props en lugar de importarla.
