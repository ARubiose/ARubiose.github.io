[English](README.md) · **Español**

# LLM Wiki Portfolio

Plantilla de portfolio hecha con **Astro** cuyo contenido sale de una **base de conocimiento
mantenida por un agente LLM** (Claude Code), siguiendo el patrón *LLM Wiki* de Andrej Karpathy.

**Demo:** https://arubiose.github.io/llm-wiki-portfolio/ (contenido ficticio)

## Inicio rápido

1. Pulsa **Use this template** → *Create a new repository*.
2. Arráncalo en local:

   ```sh
   nvm use
   pnpm install
   pnpm dev          # http://localhost:4321, con el perfil de demostración (Ada)
   ```

3. Sigue la [guía](docs/guide.es.md) para cambiar el contenido de demostración por el tuyo y
   publicarlo en GitHub Pages.

## Qué hace el agente

Tú dejas material en bruto (CV, exportación de LinkedIn, notas de proyectos) en `raw/` o le
pasas URLs públicas, cuyos datos validas antes de que entren en la wiki. El agente (Claude
Code) lo convierte en una wiki estructurada en `wiki/`: una página por puesto, proyecto,
habilidad y formación, enlazadas entre sí, con un índice y un registro de cambios. Tiene tres
operaciones:

| Comando | Qué hace |
| --- | --- |
| `/ingest raw/<archivo>` o `/ingest <URL>` | Lee una fuente nueva y crea o actualiza las páginas afectadas |
| `/query <pregunta>` | Responde a partir de la wiki y puede guardar la respuesta como síntesis |
| `/lint` | Busca enlaces rotos, páginas huérfanas, contradicciones y huecos |

El portfolio (`src/`) presenta ese contenido como sitio web en español e inglés, con tres
skins visuales (Terminal, Táctico y Juego).

## Requisitos previos

- **Node.js** 24 o superior (`engines` en `package.json`). El proyecto fija Node 24 en `.nvmrc`: `nvm use`
- **pnpm** 12 (`corepack enable` o `npm i -g pnpm`)
- **Claude Code** para las operaciones de la wiki (`npm i -g @anthropic-ai/claude-code`)
- Opcional: **Obsidian** para navegar `wiki/` como un grafo

## Desarrollo

Tests (la primera vez, `pnpm exec playwright install chromium`):

```sh
pnpm check        # tipos (astro check)
pnpm test         # unitarios, contrato de contenido, componentes y privacidad
pnpm test:e2e     # Playwright sobre el contenido de demostración, smoke sobre el tuyo, privacidad y presupuesto de JS
pnpm test:visual:update   # regenera las capturas de referencia tras un cambio de diseño intencionado
```

pnpm 12 solo ejecuta scripts de instalación de los paquetes aprobados en
`pnpm-workspace.yaml` (`esbuild`, `sharp`, `@tailwindcss/oxide`). Si una dependencia nueva
los necesita, apruébala con `pnpm approve-builds`.

Para alimentar la wiki, copia tus fuentes (CV, exportación de LinkedIn, notas…) a `raw/` y
ejecuta:

```sh
claude
> /ingest raw/<archivo>
```

Revisa los cambios con `git diff wiki/` y haz commit.

### Público y privado

El repo es público (se despliega en GitHub Pages), así que la wiki está dividida:

- **Se versiona:** el código y la configuración del agente (`src/`, `docs/`, `CLAUDE.md`,
  `.claude/`) y `wiki/public/`, que contiene lo mismo que muestra la web.
- **🔒 Solo en local (`.gitignore`):** `raw/` y `wiki/private/`, con datos de contacto,
  notas personales, síntesis y el log. **Haz tú la copia de seguridad** (carpeta
  sincronizada, disco externo…), porque git no la guarda.

El agente decide qué va a cada lado según la regla de privacidad de
[.claude/rules/wiki.md](.claude/rules/wiki.md); ante la duda, a privado. Antes de cada commit
conviene pasar `/lint`, que busca fugas.

### Analítica (opcional)

El sitio puede contar visitas con [Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/),
que es gratis, no usa cookies y no necesita banner de consentimiento. Viene **desactivada**: sin
token no se carga ningún script ni se envía nada. Ver la [guía](docs/guide.es.md#5-analítica-opcional).

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
│   ├── guide.es.md         # Cómo usar la plantilla
│   ├── system-design.md    # Flujo, patrones de diseño y módulos
│   └── decisions/          # Decisiones de arquitectura
├── tests/                  # Unitarios, contrato, componentes, privacidad, e2e, smoke
└── src/                    # Portfolio Astro
```

## Scripts

| Comando | Acción |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo en `localhost:4321` |
| `pnpm build` | Genera el sitio en `dist/` |
| `pnpm preview` | Sirve la build localmente |

## Más información

- [docs/guide.es.md](docs/guide.es.md): cómo usar la plantilla, paso a paso
- [docs/system-design.md](docs/system-design.md): arquitectura y patrones
- [.claude/rules/wiki.md](.claude/rules/wiki.md): convenciones de la wiki
- [CLAUDE.md](CLAUDE.md): instrucciones generales para el agente

## Licencia

El código está bajo la [licencia MIT](LICENSE). El contenido de `wiki/public/` y las imágenes
de `public/` son de quien publica el sitio; en esta plantilla son ficticios.
