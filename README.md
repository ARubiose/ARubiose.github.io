# Portfolio + LLM Wiki

Portfolio personal hecho con **Astro** cuyo contenido sale de una **base de conocimiento
mantenida por un agente LLM**, siguiendo el patrón *LLM Wiki* de Andrej Karpathy.

## Qué hace el agente

Tú dejas material en bruto (CV, exportación de LinkedIn, notas de proyectos) en `raw/` o le
pasas URLs públicas, cuyos datos validas antes de que entren en la wiki.
El agente (Claude Code) lo convierte en una wiki
estructurada en `wiki/`: una página por puesto, proyecto, habilidad y formación, enlazadas
entre sí, con un índice y un registro de cambios. Tiene tres operaciones:

| Comando | Qué hace |
| --- | --- |
| `/ingest raw/<archivo>` o `/ingest <URL>` | Lee una fuente nueva y crea o actualiza las páginas afectadas |
| `/query <pregunta>` | Responde a partir de la wiki y puede guardar la respuesta como síntesis |
| `/lint` | Busca enlaces rotos, páginas huérfanas, contradicciones y huecos |

El portfolio (`src/`) presenta ese contenido como sitio web en español e inglés.

## Requisitos previos

- **Node.js** 22.12 o superior. El proyecto fija Node 24 en `.nvmrc`: `nvm use`
- **pnpm** 11 (`corepack enable` o `npm i -g pnpm`)
- **Claude Code** para las operaciones de la wiki (`npm i -g @anthropic-ai/claude-code`)
- Opcional: **Obsidian** para navegar `wiki/` como un grafo

## Puesta en marcha

```sh
nvm use
pnpm install
pnpm dev          # http://localhost:4321
```

Tests (la primera vez, `pnpm exec playwright install chromium`):

```sh
pnpm check        # tipos (astro check)
pnpm test         # unitarios, contrato de contenido, componentes y privacidad
pnpm test:e2e     # build + Playwright en / y /en/, con axe, y escaneo de privacidad de dist/
```

pnpm 11 solo ejecuta scripts de instalación de los paquetes aprobados en
`pnpm-workspace.yaml` (`esbuild`, `sharp`, `@tailwindcss/oxide`). Si una dependencia nueva
los necesita, apruébala con `pnpm approve-builds`.

Para alimentar la wiki:

```sh
cp ~/Descargas/cv.pdf raw/cv-2026.pdf
claude
> /ingest raw/cv-2026.pdf
```

Revisa los cambios con `git diff wiki/` y haz commit.

### Público y privado

El repo es público (se despliega en GitHub Pages y sirve como plantilla), así que la wiki
está dividida:

- **Se versiona:** el código y la configuración del agente (`src/`, `docs/`, `CLAUDE.md`,
  `.claude/`) y `wiki/public/`, que contiene lo mismo que muestra la web.
- **🔒 Solo en local (`.gitignore`):** `raw/` y `wiki/private/`, con datos de contacto,
  notas personales, síntesis y el log. **Haz tú la copia de seguridad** (carpeta
  sincronizada, disco externo…), porque git no la guarda.

El agente decide qué va a cada lado según la regla de privacidad de [.claude/rules/wiki.md](.claude/rules/wiki.md); ante la
duda, a privado. Antes de cada commit conviene pasar `/lint`, que busca fugas.

### Usarlo como plantilla

Haz un fork o pulsa *Use this template*, borra el contenido de `wiki/public/`, deja tus
fuentes en `raw/` y ejecuta `/ingest`.

## Estructura

```text
.
├── CLAUDE.md               # Instrucciones generales para el agente
├── raw/                    # 🔒 Fuentes inmutables (las escribes tú)
├── wiki/                   # Base de conocimiento (la escribe el agente)
│   ├── index.md            #   catálogo de páginas públicas
│   ├── public/             #   publicable: profile.md, experience/, projects/, skills/, education/
│   └── private/            #   🔒 index.md, log.md, notes/, synthesis/
├── .claude/
│   ├── rules/wiki.md       # convenciones de la wiki (se cargan al tocar wiki/ o raw/)
│   ├── skills/             # /ingest, /query, /lint
│   └── settings.json       # permisos: raw/ es de solo lectura
├── docs/
│   ├── system-design.md    # Flujo, patrones de diseño y módulos
│   └── decisions/          # Decisiones de arquitectura
└── src/                    # Portfolio Astro
    ├── layouts/  components/  sections/  pages/  styles/
```

## Scripts

| Comando | Acción |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo en `localhost:4321` |
| `pnpm build` | Genera el sitio en `dist/` |
| `pnpm preview` | Sirve la build localmente |

## Más información

- [docs/system-design.md](docs/system-design.md): arquitectura y patrones
- [.claude/rules/wiki.md](.claude/rules/wiki.md): convenciones de la wiki
- [CLAUDE.md](CLAUDE.md): instrucciones generales para el agente
