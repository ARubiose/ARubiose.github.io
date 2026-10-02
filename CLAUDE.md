# CLAUDE.md

Portfolio personal en **Astro 7 + Tailwind 4** cuyo contenido sale de una base de
conocimiento mantenida por el agente (adaptación de la *LLM Wiki* de Karpathy a Claude Code).
El repo es **público**: se despliega en GitHub Pages y sirve como plantilla.

## Mapa del repo

| Ruta | Qué es | En git |
| --- | --- | --- |
| `src/` | Sitio Astro | Sí |
| `docs/` | Conocimiento de desarrollo: [system-design.md](docs/system-design.md), [decisions/](docs/decisions/) | Sí |
| `wiki/public/` | Contenido publicable que alimenta la web | Sí |
| `wiki/private/`, `raw/` | Fuentes y datos personales | **No** (`.gitignore`) |
| `.claude/` | Regla de la wiki (`rules/wiki.md`), skills `ingest`/`query`/`lint`, permisos | Sí |

Las convenciones de la wiki se cargan solas al trabajar en `wiki/` o `raw/`.

## Reglas globales

- Nada de `raw/` ni de `wiki/private/` puede acabar en archivos versionados (`src/`,
  `docs/`, `wiki/public/`) ni en mensajes de commit. Ante la duda, es privado.
- `raw/` es de solo lectura (bloqueado también por permisos).

## Portfolio (`src/`)

- Stack: Astro 7, Tailwind CSS 4 (plugin de Vite), pnpm 11, Node 24 (`.nvmrc`; usa `nvm use`). i18n con `es` (por defecto) y `en`.
- Alias de importación: `@layouts`, `@sections`, `@components`, `@styles`, `@assets` (ver `tsconfig.json`).
- Secciones en `src/sections/`: `intro`, `education`, `experience`, `contact`.
- El contenido se deriva **solo** de `wiki/public/`; no se inventa en los componentes.
- Comandos: `pnpm dev`, `pnpm build`, `pnpm preview`.

## Convenciones

- Nombres de archivos y carpetas en inglés; contenido en español.
- Si cambia la arquitectura, actualiza `docs/system-design.md`. Si se toma una decisión
  relevante, propón registrarla en `docs/decisions/` (formato en su README).
