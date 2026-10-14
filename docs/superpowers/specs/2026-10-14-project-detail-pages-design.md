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
- La build o los tests fallan si falta un idioma, si una carpeta de detalle no tiene su ficha
  o si el cuerpo enlaza a páginas de la wiki o fuera de su carpeta.
- El escáner de privacidad cubre el cuerpo publicado (ya recorre `wiki/public/**/*.md` y
  `dist/**/*.html`).
- La página respeta las skins: los componentes solo usan clases semánticas.
- La demo de la plantilla (Ada) y el fixture de los e2e incluyen un detalle de ejemplo.
- En el repo personal, `pnpm sync:upstream` trae la función sin traer el detalle de Ada
  (`wiki/public/` se restaura desde `HEAD`), y el detalle de `portfolio-llm-wiki` se publica.

**Fuera de alcance:**

- Páginas de detalle para experiencia o formación.
- Índice de proyectos aparte de la sección de la portada.
- Imagen OG propia por proyecto (se usa la del sitio).

## 2. Reparto entre los dos repos

| Qué | Dónde |
| --- | --- |
| Colección, esquema, validación, rutas, layout, estilos de prosa, «Ver más», i18n de interfaz | Plantilla |
| Tests (unitarios, contrato, componentes, e2e, capturas) | Plantilla |
| Detalle de ejemplo de «Motor de notas» en `wiki/public/` (demo) y en `tests/fixtures/site/` | Plantilla |
| Regla de la wiki (`project-detail`), skills `lint` e `ingest`, `docs/system-design.md`, decisión 0007, guía | Plantilla |
| Detalle real de `portfolio-llm-wiki` (texto ES/EN, diagramas) | Personal, tras el sync |
| Este spec y su plan | Personal |

Ninguna mejora se hace directamente en archivos compartidos del repo personal: si al escribir
el detalle real aparece un hueco en la función, se corrige en la plantilla y se vuelve a
sincronizar.

## 3. Contenido y contrato

### 3.1 Ubicación

```
wiki/public/projects/
  portfolio-llm-wiki.md        ← ficha (sin cambios)
  portfolio-llm-wiki/          ← detalle (opcional)
    es.md
    en.md
    architecture.png           ← imágenes que use el cuerpo
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
sources: ["humano (2026-10-14)", "https://github.com/… (2026-10-14)"]
updated: 2026-10-14
---
```

`projectDetailSchema` en `src/lib/schemas.ts`: `title`, `summary`, `sources` (≥1),
`updated`, `type: "project-detail"`. Sin bloque `en:`: cada archivo ya es de un idioma.
`tags` no se usa.

### 3.3 Cuerpo

Markdown libre que **sí se publica**: es la excepción explícita a «el portfolio usa solo el
frontmatter». Es texto escrito para la web, no prosa de wiki:

- No lleva `## Relacionado` ni `## Fuentes`; las fuentes van en el frontmatter.
- Enlaces permitidos: `http(s)://` y anclas `#…`. Imágenes: rutas relativas dentro de su
  carpeta (`./x.png`). Prohibido: enlaces a `.md`, rutas que salen de la carpeta (`../`),
  rutas absolutas y otros esquemas (`javascript:`, `data:`…).
- No empieza con un `# h1`: el `h1` lo pone la página con `title`. Los encabezados del
  cuerpo empiezan en `##`.

### 3.4 Validación

Lógica pura en `src/lib/project-details.ts`, usada por el contrato y por las rutas:

- `pairDetails(projects, details)`: empareja por slug; error si hay `es` sin `en` (o al
  revés) o una carpeta sin ficha `<slug>.md`.
- `invalidBodyLinks(markdown)`: devuelve los enlaces e imágenes que incumplen §3.3.
- `detailUrl(slug, locale, base)`: URL de la página por idioma.

`getStaticPaths` llama a `pairDetails` y la build falla con un mensaje claro si hay errores;
los tests de contrato lo ejecutan sobre la wiki real y sobre el fixture.

## 4. Rutas y página

- `src/pages/projects/[slug].astro` y `src/pages/en/projects/[slug].astro`: `getStaticPaths`
  solo para proyectos con detalle; delegan en `src/layouts/ProjectPage.astro`.
- `ProjectPage.astro` usa `Layout` (skins, fuentes, SEO) y compone:
  1. **Cabecera** del sitio con los enlaces de navegación apuntando a la portada
     (`<base>#projects`…, y `<base>en/#…` en inglés); el selector de idioma lleva a la página
     equivalente del otro idioma. `Header` recibe un prefijo de enlaces (vacío en la portada).
  2. **Volver:** «← Proyectos» / «← Projects» a `#projects` de la portada.
  3. **Cabecera del proyecto**, desde la ficha: `h1` (`title` del detalle), estado, resumen de
     la ficha, chips de habilidades citadas y enlaces a repo y web.
  4. **Cuerpo** renderizado (`render()` de Astro) dentro de `.prose-detail`. Los estilos de
     prosa (encabezados, párrafos, listas, código, citas, tablas, imágenes) se definen con
     tokens semánticos en `global.css`; cada skin puede ajustarlos en su hoja. Las imágenes
     pasan por la optimización de Astro.
  5. **Pie** del sitio.
- **Portada:** `buildHomeView` añade `detailUrl?` a `ProjectView`; `ProjectCard` muestra
  «Ver más» / «Read more» junto a repo y visitar solo si existe.
- **i18n:** claves nuevas en `src/i18n/ui.ts` (`projects.more`, `projects.back`).
- **SEO:** `<title>` = `title` del detalle · nombre del perfil; `description` = `summary`;
  `canonical` y `hreflang` entre los dos idiomas; JSON-LD `SoftwareSourceCode` (`name`,
  `description`, `codeRepository`, `url`, `inLanguage`, `author` → la persona). Las páginas
  nuevas entran solas en el sitemap (`@astrojs/sitemap` con i18n); `robots.txt` no cambia.
- **JavaScript:** ninguno nuevo; solo el arranque de skins que ya existe.

## 5. Agente y wiki

- `.claude/rules/wiki.md`: tipo `project-detail` con su ubicación, frontmatter y normas del
  cuerpo (§3.3); se aclara que es la única página pública cuyo cuerpo se publica y que el
  español y el inglés se escriben a la vez.
- `ingest`/redacción: a petición («escribe el detalle de X»), el agente redacta ES y EN a
  partir de la ficha, las páginas enlazadas y las fuentes, sin datos privados, y los presenta
  al humano antes de escribirlos.
- `lint`: añade paridad de idiomas, carpetas sin ficha, enlaces prohibidos en el cuerpo y
  detalles más antiguos (`updated`) que su ficha como aviso.

## 6. Tests (TDD, `docs/system-design.md` §3.7)

- **Unitarios** (`tests/unit/project-details.test.ts`): `pairDetails`, `invalidBodyLinks`
  (`.md`, `../`, absolutas, `javascript:`, `data:`, imágenes válidas y web válidas),
  `detailUrl` con y sin `base`.
- **Contrato** (`tests/content/`): esquema `project-detail`, emparejamiento y enlaces sobre la
  wiki real y el fixture.
- **Componentes:** `ProjectCard` con y sin `detailUrl`; `Header` con prefijo de enlaces.
- **E2E** (fixture Ada): tarjeta → detalle; «volver» lleva a `#projects`; el selector de
  idioma lleva al detalle equivalente; `canonical`, `hreflang` y JSON-LD; capturas visuales del
  detalle en escritorio y móvil (skin por defecto).
- **Privacidad:** sin cambios de código; se comprueba que el HTML del detalle está en `dist/`
  al escanear.
- **Presupuesto:** revisar que `tests/perf/budget.test.ts` cubre las páginas nuevas.
- **Smoke:** si la wiki tiene algún detalle, su página responde 200 y tiene `h1`.

## 7. Documentación

- `docs/system-design.md` §4.2: la colección nueva en la tabla y la excepción al contrato.
- `docs/decisions/0007-project-detail-pages.md`: decisión «páginas de detalle con cuerpo
  publicado» (contexto: proyectos heterogéneos y Markdown libre frente a campos
  estructurados; consecuencias: el cuerpo publicado exige validar enlaces y privacidad).
- `docs/guide.md` y `docs/guide.es.md`: cómo pedir y revisar un detalle.

## 8. Después, en el repo personal

1. `pnpm sync:upstream` con la función ya en `upstream/main`; tests y e2e en verde.
2. Pedir al agente el detalle de `portfolio-llm-wiki` (ES/EN): qué es el patrón LLM Wiki, la
   wiki pública/privada, el contrato con Zod, las skills, la plantilla con `upstream`, las
   skins y los tests. Con un diagrama del flujo raw → wiki → Astro.
3. Revisión humana, `lint`, build, capturas de escritorio y móvil, commit.
