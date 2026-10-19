# CLAUDE.md

Portfolio en **Astro 7 + Tailwind 4** cuyo contenido sale de una base de conocimiento
mantenida por el agente (adaptación de la *LLM Wiki* de Karpathy a Claude Code). Es la
plantilla `ARubiose/llm-wiki-portfolio`: los sitios creados desde ella traen sus mejoras con
`pnpm sync:upstream` ([guía](docs/guide.es.md)). El repo es **público** y se despliega en
GitHub Pages.

## Mapa del repo

| Ruta | Qué es | En git |
| --- | --- | --- |
| `src/` | Sitio Astro | Sí |
| `docs/` | Conocimiento de desarrollo: [system-design.md](docs/system-design.md), [decisions/](docs/decisions/) y la guía de uso ([guide.md](docs/guide.md)). La hoja de ruta está en los GitHub issues | Sí |
| `wiki/public/` | Contenido publicable que alimenta la web | Sí |
| `wiki/private/`, `raw/` | Fuentes y datos personales | **No** (`.gitignore`) |
| `.claude/` | Regla de la wiki (`rules/wiki.md`), skills `ingest`/`query`/`lint`/`detail`/`cv`, permisos | Sí |

Las convenciones de la wiki se cargan solas al trabajar en `wiki/` o `raw/`.

## Reglas globales

- Nada de `raw/` ni de `wiki/private/` puede acabar en archivos versionados (`src/`,
  `docs/`, `wiki/public/`) ni en mensajes de commit. Ante la duda, es privado.
- `raw/` es de solo lectura (bloqueado también por permisos).

## Portfolio (`src/`)

- Stack: Astro 7, Tailwind CSS 4 (plugin de Vite), pnpm 12, Node 24 (`.nvmrc`; usa `nvm use`). i18n con `es` (por defecto) y `en`.
- Alias de importación: `@layouts`, `@sections`, `@components`, `@styles`, `@assets`, `@lib`, `@i18n` (ver `tsconfig.json`).
- Secciones en `src/sections/`: `intro`, `experience`, `projects`, `skills`, `education`, `contact`.
  Reciben props; `src/layouts/HomePage.astro` carga las colecciones.
- El contenido se deriva **solo** de `wiki/public/`: el frontmatter y, en los detalles de
  proyecto (`projects/<slug>/{es,en}.md`), también el cuerpo. Lo único escrito a mano es el
  diccionario de interfaz `src/i18n/ui.ts`. El contrato son los esquemas Zod de
  `src/lib/schemas.ts`. El directorio se puede cambiar con `WIKI_DIR`, y `site`/`base` se
  deducen del repo (`src/lib/site.ts`).
- Los e2e y las capturas usan el fixture fijo `tests/fixtures/site/` (Ada); el contenido real
  lo validan los esquemas, la privacidad, el presupuesto y el smoke (`tests/smoke/`).
- Comandos: `pnpm dev`, `pnpm build`, `pnpm preview`, `pnpm check`, `pnpm test`, `pnpm test:e2e`,
  `pnpm cv:tailor <cv.yml>` (CV adaptado, local; lo usa la skill `cv`).
- Estilos por skins: tokens semánticos en `src/styles/global.css` y una hoja por skin en
  `src/styles/skins/`; los componentes usan clases semánticas, nunca colores ni fuentes
  concretos.
- El CV (`/cv/` y su PDF, generado en la build) es la excepción: `src/styles/cv.css` es papel,
  no una skin, con tokens `--cv-*` propios ([decisión 0008](docs/decisions/0008-cv-from-wiki.md)).
- JavaScript de cliente solo como mejora progresiva en `src/scripts/`; la lógica testeable
  va en `src/lib/`.
- Desarrollo con TDD; ver la estrategia de tests en `docs/system-design.md` §3.7.

## Convenciones

- Nombres de archivos y carpetas en inglés; contenido en español.
- La hoja de ruta son los GitHub issues ([decisión 0005](docs/decisions/0005-roadmap-in-github-issues.md)):
  los de la plantilla para código, tests, docs y skills; los del sitio para su contenido y
  despliegue. Cada issue lleva una etiqueta `type:feature`, `type:bug`, `type:test`,
  `type:docs` o `type:chore` (más `wontfix`/`duplicate` si aplica).
  Al terminar trabajo, ciérralo con `Closes #n` en el commit o la PR; lo aplazado se abre como
  issue con archivo y línea. Los issues son públicos: nada privado en ellos.
- Las mejoras se hacen en la plantilla, no en los sitios derivados: un cambio local en un
  archivo compartido dará conflictos al traer `upstream`.
- Si cambia la arquitectura, actualiza `docs/system-design.md`. Si se toma una decisión
  relevante, propón registrarla en `docs/decisions/` (formato en su README).
