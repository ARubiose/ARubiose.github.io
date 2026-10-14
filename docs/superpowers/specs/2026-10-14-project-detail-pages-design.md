# Diseño: páginas de detalle de proyecto

- Fecha: 2026-10-14
- Estado: propuesta
- Alcance: la función se hace en la **plantilla** (`ARubiose/llm-wiki-portfolio`, rama que sale
  de `template-main`); el contenido real, en el **repo personal** (`main`) después de
  `pnpm sync:upstream`. Este spec vive solo en el repo personal (`docs/superpowers/` no pasa a
  la plantilla).

## 1. Objetivo

Que cada proyecto pueda tener, de forma opcional, una página propia que lo explique en
detalle, enlazada desde su tarjeta en la portada. El primer caso real es el propio portfolio
(`portfolio-llm-wiki`), cuya historia (wiki mantenida por un agente → web en Astro) no cabe
en una tarjeta.

Los proyectos son muy distintos entre sí, así que el detalle es **Markdown libre**, no
campos estructurados. Lo redacta el agente a petición y lo revisa el humano.

**Criterios de éxito:**

- Un proyecto con detalle tiene una página en `/projects/<slug>/` y otra en
  `/en/projects/<slug>/`, enlazadas desde su tarjeta con «Ver más» / «Read more». Un proyecto
  sin detalle se ve igual que hoy.
- La build falla con un mensaje claro si falta un idioma, si una carpeta de detalle no tiene
  su ficha o si el cuerpo incumple §3.3 (HTML crudo, enlaces prohibidos, `# h1`, secciones de
  cierre de wiki).
- El escáner de privacidad cubre el cuerpo publicado (ya recorre `wiki/public/**/*.md` y
  `dist/**/*.html`).
- La página respeta las tres skins (capturas en todas) y pasa axe sin violaciones.
- La demo de la plantilla (Ada) y el fixture de los e2e incluyen un detalle de ejemplo.
- En el repo personal, `pnpm sync:upstream` trae la función sin traer el detalle de Ada
  (`scripts/sync-upstream.mjs` restaura `wiki/public/` desde `HEAD`), y el detalle de
  `portfolio-llm-wiki` se publica.

**Fuera de alcance:**

- Páginas de detalle para experiencia o formación.
- Índice de proyectos aparte de la sección de la portada.
- Imagen OG propia por proyecto (se usa la del sitio).
- Diagramas renderizados en el cliente (Mermaid…): un diagrama es un archivo de imagen.

## 2. Reparto entre los dos repos

| Qué | Dónde |
| --- | --- |
| Colección, esquema, validación, rutas, layout, estilos de prosa, «Ver más», i18n de interfaz | Plantilla |
| Tests (unitarios, contrato, componentes, e2e, capturas, presupuesto, smoke) | Plantilla |
| Detalle de ejemplo de «Motor de notas» en `wiki/public/` (demo) y en `tests/fixtures/site/` | Plantilla |
| Regla de la wiki, skill `detail`, `lint`, `CLAUDE.md`, `docs/system-design.md`, decisión 0007, guía | Plantilla |
| Detalle real de `portfolio-llm-wiki` (texto ES/EN, diagrama), su línea en `wiki/index.md` y el enlace desde la ficha | Personal, tras el sync |
| Este spec y su plan | Personal |

Ninguna mejora se hace directamente en archivos compartidos del repo personal: si al escribir
el detalle real aparece un hueco en la función, se corrige en la plantilla y se vuelve a
sincronizar.

## 3. Contenido y contrato

### 3.1 Ubicación

```
wiki/public/projects/
  portfolio-llm-wiki.md        ← ficha
  portfolio-llm-wiki/          ← detalle (opcional)
    es.md
    en.md
    architecture.svg           ← imágenes que use el cuerpo
```

El loader de `projects` (`*.md`) no entra en subcarpetas. Colección nueva `projectDetails`
con patrón `*/{es,en}.md` sobre `${wikiDir}/projects`. El slug es el nombre de la carpeta y
el idioma, el nombre del archivo.

### 3.2 Frontmatter

```yaml
---
title: Cómo está hecho este portfolio
type: project-detail
summary: Una frase; meta description de la página.
tags: []
sources: ["humano (2026-10-14)", "https://github.com/… (2026-10-14)"]
updated: 2026-10-14
---
```

`projectDetailSchema` en `src/lib/schemas.ts` reutiliza los campos comunes (`meta`: `title`,
`summary`, `tags` con `[]` por defecto, `sources` ≥1, `updated`) más
`type: "project-detail"`. Sin bloque `en:`: cada archivo ya es de un idioma.

### 3.3 Cuerpo

Markdown que **sí se publica**: es la excepción explícita a «el portfolio usa solo el
frontmatter». Es texto escrito para la web, no prosa de wiki. Normas:

- **Sin HTML crudo** (ni en bloque ni en línea): todo es Markdown.
- **Enlaces** (en línea, por referencia y autoenlaces): solo `http(s)://` y anclas `#…`.
  Prohibidos los enlaces a `.md`, las rutas relativas o absolutas y otros esquemas
  (`mailto:`, `javascript:`, `data:`…). El contacto ya está en el perfil.
- **Imágenes:** solo rutas relativas a su carpeta sin salir de ella (`./x.svg`), con
  extensión `jpg`, `jpeg`, `png`, `webp`, `avif` o `svg`, y con texto alternativo no vacío.
- **Encabezados:** sin `# h1` (el `h1` lo pone la página con `title`); el cuerpo empieza en
  `##`. Sin secciones de cierre de wiki (`## Relacionado`, `## Fuentes`, `## Related`,
  `## Sources`): las fuentes van en el frontmatter.

### 3.4 Validación

Lógica pura en `src/lib/project-details.ts`, usada por la build y por los tests:

- `pairDetails(projectIds, detailIds)`: empareja por slug los ids de la colección
  (`<slug>/es`, `<slug>/en`); devuelve los pares y los errores (idioma que falta, carpeta sin
  ficha `<slug>.md`).
- `bodyIssues(markdown)` (asíncrona): analiza el cuerpo con `markdownToMdast` de `satteri`,
  el procesador de Markdown de Astro 7 (vía `@astrojs/markdown-satteri`). Pasa a dependencia
  directa con la misma versión que trae Astro, para validar con el mismo analizador que
  renderiza. Recorre el árbol: nodos `html`, `link`, `definition` (destino de los
  `linkReference`), `image` y `heading`. Devuelve cada incumplimiento de §3.3 con su línea.
- `detailUrl(slug, locale, base)`: URL de la página por idioma, con el `base` del sitio.

Las dos rutas llaman a `loadProjectDetails()` (helper de `src/lib/`, junto a la carga de la
portada), que ejecuta `pairDetails` y `bodyIssues` sobre todos los detalles y lanza un error
con archivo, línea y motivo si hay alguno. La build falla así aunque nadie ejecute los tests.
Los tests de contrato ejecutan lo mismo sobre la wiki real y sobre el fixture.

## 4. Rutas y página

### 4.1 Rutas

`src/pages/projects/[slug].astro` y `src/pages/en/projects/[slug].astro`: `getStaticPaths`
devuelve solo los proyectos con detalle y las dos delegan en `src/layouts/ProjectPage.astro`
con `locale` y `slug`.

### 4.2 Datos

- `HomeData` (`src/lib/home.ts`) gana `detailSlugs?: string[]` y `base?: string` (por defecto
  `[]` y `"/"`), opcionales para no romper los fixtures de `tests/unit/home.test.ts`.
  `buildHomeView` rellena `detailUrl?` en cada `ProjectView` con `detailUrl()`.
- La carga de colecciones que hoy hace `HomePage.astro` pasa a un helper compartido
  (`loadHomeData()`), que también usa `ProjectPage`. `ProjectPage` llama a `buildHomeView`
  igual que la portada y toma de ahí las secciones y el handle de la cabecera, `siteRepo` y
  la analítica del pie, y el `ProjectView` localizado del proyecto.
- **Habilidades:** la cabecera del proyecto muestra sus `skills` como chips de texto con el
  `title` de cada habilidad (nombres propios, sin traducir), con la clase semántica `.badge`
  que ya existe. Sin iconos.

### 4.3 Página

`ProjectPage.astro` usa `Layout` (skins, fuentes, SEO, analítica igual que la portada) y
compone:

1. **Cabecera** del sitio. `Header` recibe un prefijo para los enlaces de sección (vacío en
   la portada; la URL de la portada del idioma en el detalle, p. ej. `<base>#projects` o
   `<base>en/#projects`). El selector de idioma lleva al detalle equivalente del otro idioma.
   `nav.ts` solo vigila enlaces `#…`, así que en el detalle no hay scroll-spy; es lo
   esperado, porque los enlaces llevan a otra página.
2. **Volver:** «← Proyectos» / «← Projects» a `#projects` de la portada del idioma.
3. **Cabecera del proyecto:** `h1` (`title` del detalle), estado, resumen de la ficha, chips
   de habilidades y enlaces a repo y web.
4. **Cuerpo** renderizado con `render()` de `astro:content` dentro de `.prose-detail`. Los
   estilos de prosa (encabezados, párrafos, listas, código, citas, tablas, imágenes) se
   definen con tokens semánticos en `global.css`; cada skin puede ajustarlos en su hoja. Las
   imágenes relativas las procesa Astro (optimización; los SVG se copian tal cual).
5. **Pie** del sitio, con la nota de analítica si está activa.

### 4.4 Portada, i18n y SEO

- `ProjectCard` muestra «Ver más» / «Read more» junto a repo y visitar solo si `detailUrl`
  existe.
- Claves nuevas en `src/i18n/ui.ts`: `projects.more` y `projects.back`.
- `<title>` = `title` del detalle · nombre del perfil; `description` = `summary` del
  detalle; `canonical` y `hreflang` (con `x-default`, vía `alternateLinks`) entre los dos
  idiomas; JSON-LD `SoftwareSourceCode` (`name`, `description`, `codeRepository`, `url`,
  `inLanguage`, `author` → la persona). Las páginas entran solas en el sitemap
  (`@astrojs/sitemap` con i18n). `robots.txt` no cambia.
- **JavaScript:** ninguno nuevo; solo los scripts que ya trae la cabecera (`nav.ts`,
  `skin-switcher.ts`) y el arranque de skins de `Layout`.

## 5. Agente y wiki

- **`.claude/rules/wiki.md`:**
  - Añade `project-detail` a la lista de tipos y a la tabla de campos.
  - Documenta la ubicación (§3.1) y las normas del cuerpo (§3.3). Es la única página pública
    cuyo cuerpo se publica, y por eso está exenta del cierre `## Relacionado` / `## Fuentes`.
  - Las imágenes de un detalle se referencian desde el cuerpo, no desde el frontmatter: es
    una excepción a la norma de imágenes.
  - El español y el inglés se escriben a la vez.
  - En `wiki/index.md`, cada detalle tiene una línea en la sección de proyectos (enlazando a
    `es.md`), y la ficha lo enlaza en su `## Relacionado`. Así `lint` no lo marca como
    huérfano.
- **Skill nueva `detail`** (`.claude/skills/detail/SKILL.md`), para peticiones como «escribe
  el detalle de X» o «actualiza el detalle de X»:
  1. Lee la ficha, las páginas que enlaza y sus fuentes.
  2. Propone un índice de secciones.
  3. Redacta en español y en inglés sin datos privados.
  4. Presenta el texto y las imágenes al humano antes de escribirlos.
  5. Actualiza el índice, la ficha y el log.

  Las imágenes se versionan en un repo público ([decisión 0004](../../decisions/0004-content-images-in-wiki.md)),
  así que el humano las revisa siempre.
- **`lint`** añade:
  - la paridad de idiomas;
  - las carpetas sin ficha;
  - `bodyIssues`;
  - el ítem 3 (huérfanas), que cuenta la línea del índice y el enlace desde la ficha;
  - un aviso si un detalle tiene `updated` anterior a su ficha.

## 6. Tests (TDD, `docs/system-design.md` §3.7)

- **Unitarios** (`tests/unit/project-details.test.ts`):
  - `pairDetails`: par completo, idioma que falta y carpeta sin ficha.
  - `bodyIssues`:
    - HTML crudo en bloque y en línea (`<a>`, `<img>`, `<script>`);
    - enlaces en línea, por referencia y autoenlaces;
    - `.md`, `../`, rutas absolutas, `mailto:`, `javascript:`, `data:`;
    - imágenes válidas, fuera de la carpeta, con extensión no permitida o sin `alt`;
    - `# h1` y secciones de cierre en ES y EN;
    - un cuerpo válido no da avisos.
  - `detailUrl` con y sin `base`.
  - `buildHomeView` con y sin `detailSlugs`.
- **Contrato** (`tests/content/`): esquema `project-detail`, emparejamiento y `bodyIssues`
  sobre la wiki real y sobre el fixture.
- **Componentes:** `ProjectCard` con y sin `detailUrl`; `Header` con y sin prefijo de enlaces.
- **E2E** (fixture Ada):
  - De la tarjeta al detalle.
  - «Volver» lleva a `#projects`.
  - El selector de idioma lleva al detalle equivalente.
  - `canonical`, `hreflang` y JSON-LD.
  - axe sin violaciones.
  - Capturas visuales del detalle en español con las tres skins, en escritorio y móvil: 6
    capturas nuevas.
- **Presupuesto:** `tests/perf/budget.test.ts` pasa de medir solo `dist/index.html` a medir
  cada `dist/**/index.html` con el mismo límite.
- **Privacidad:** sin cambios de código. Los `.md` del detalle y su HTML ya están cubiertos.
  Las imágenes las revisa el humano (§5).
- **Smoke:** encuentra los detalles leyendo `projects/*/es.md` en el directorio de la wiki
  (`WIKI_DIR`, por defecto `wiki/public`). Para cada uno comprueba que `projects/<slug>/` y
  `en/projects/<slug>/` responden 200, tienen un solo `h1` no vacío y no desbordan.

## 7. Documentación

- **`CLAUDE.md`** (plantilla): la línea «el contenido se deriva solo del frontmatter» pasa a
  mencionar la excepción del detalle, y la lista de skills incluye `detail`.
- **`docs/system-design.md`:**
  - §4.2: añade la colección nueva a la tabla y explica la excepción al contrato.
  - §3.7: actualiza el número de capturas, el presupuesto (todas las páginas), el smoke
    (detalles) y el E2E del detalle.
  - La descripción de `src/pages` incluye las rutas nuevas.
- **`docs/decisions/0007-project-detail-pages.md`:** «páginas de detalle con cuerpo
  publicado».
  - Contexto: proyectos heterogéneos; Markdown libre frente a campos estructurados.
  - Decisión: cuerpo publicado validado, con imágenes en el cuerpo. Amplía la 0004, que
    las colocaba solo en el frontmatter.
  - Consecuencias: el cuerpo publicado obliga a validar enlaces y HTML, y a revisar las
    imágenes a mano.
- **`docs/guide.md`** y **`docs/guide.es.md`:** cómo pedir, revisar y actualizar un detalle.

## 8. Después, en el repo personal

1. `pnpm sync:upstream` con la función ya en `upstream/main`; tests y e2e en verde.
2. Pedir con la skill `detail` el detalle de `portfolio-llm-wiki` (ES/EN), que cubra:
   - qué es el patrón LLM Wiki;
   - la wiki pública y la privada;
   - el contrato con Zod;
   - las skills;
   - la plantilla con `upstream`;
   - las skins y los tests.

   Debe incluir un diagrama en SVG del flujo raw → wiki → Astro.
3. Revisión humana del texto y del diagrama, `lint`, build, capturas de escritorio y móvil,
   commit.
