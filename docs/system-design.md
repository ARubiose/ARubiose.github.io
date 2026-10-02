# Diseño del sistema

Cómo está construido el proyecto: los módulos y cómo se comunican, el portfolio Astro, la
capa de contenido, el agente que la mantiene, los patrones de diseño y lo que queda por
desarrollar.

## 1. Visión general

Un portfolio estático cuyo contenido no se escribe en los componentes, sino que sale de una
base de conocimiento en Markdown mantenida por un agente LLM (adaptación de la *LLM Wiki*
de Karpathy a Claude Code).

```text
 solo local                    │ repo público
                               │
 raw/ ──ingest──▶ wiki/private/│
  │   (agente)    notas, log   │
  │                            │
  └──ingest──────────────────────▶ wiki/public/ ──collections──▶ src/ ──build──▶ dist/ ──▶ GitHub Pages
      (agente)                 │   Markdown +     [pendiente]    Astro           HTML
                               │   frontmatter                                   estático
```

Tres subsistemas con responsabilidades separadas:

| Subsistema | Responsabilidad | Detalle |
| --- | --- | --- |
| **Portfolio** (`src/`) | Presentar el contenido: maquetación, i18n, estilos, build estática | §3 |
| **Contenido** (`wiki/`, `raw/`) | Guardar el conocimiento estructurado y trazable | §4 y [.claude/rules/wiki.md](../.claude/rules/wiki.md) |
| **Agente** (`.claude/`) | Mantener el contenido: ingerir fuentes, responder, revisar | §5 |

El flujo de datos va en un solo sentido: `raw/` → `wiki/` → `src/` → `dist/`. El portfolio
nunca escribe en la wiki y el agente nunca escribe en `raw/`.

## 2. Módulos

| Módulo | Ruta | Responsabilidad | En git |
| --- | --- | --- | --- |
| Páginas | `src/pages/` | Rutas: `/` (es) y `/en/` (en) | Sí |
| Layouts | `src/layouts/` | `Layout.astro` (documento HTML, `lang`, metadatos) y `HomePage.astro` (carga colecciones y compone la portada) | Sí |
| Secciones | `src/sections/` | Bloques de la página: `intro`, `experience`, `projects`, `skills`, `education`, `contact` | Sí |
| Componentes | `src/components/` | Piezas reutilizables: `Header`, `LanguageSwitcher`, `ProfileAvatar`, `TimelineItem`, `ProjectCard`, `SkillGroup` | Sí |
| Lógica | `src/lib/` | Esquemas Zod (`schemas.ts`), fechas, ordenación y vista de la portada (`home.ts`); funciones puras | Sí |
| i18n | `src/i18n/` | Diccionario de interfaz (`ui.ts`) y `useTranslations`/`localize` | Sí |
| Colecciones | `src/content.config.ts` | Colecciones de Astro sobre `wiki/public/` | Sí |
| Tests | `tests/` | Unitarios, contrato, componentes, privacidad y E2E (§3.7) | Sí |
| Estilos | `src/styles/global.css` | Tailwind 4 y tokens de diseño (`@theme`) | Sí |
| Assets | `src/assets/`, `public/` | Imágenes que Astro optimiza / archivos que se sirven tal cual | Sí |
| Configuración | `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts` | i18n, plugin de Tailwind, alias de importación, tests | Sí |
| Wiki pública | `wiki/public/` | Contenido publicable; fuente de datos del portfolio | Sí |
| Wiki privada | `wiki/private/` | Notas personales, síntesis, log | No |
| Fuentes | `raw/` | Material original (CV, LinkedIn…) | No |
| Agente | `.claude/` | Regla de la wiki, skills `ingest`/`query`/`lint`, permisos | Sí |
| Docs | `docs/` | Este documento y las decisiones (`decisions/`) | Sí |

## 3. Portfolio (Astro)

### 3.1 Stack

- **Astro 7.3** (Vite 8, compilador en Rust) con salida estática (`output: "static"`, el
  valor por defecto). Sin framework de UI ni JavaScript de cliente por ahora: todo se
  renderiza en build.
- **Tailwind CSS 4.3** como plugin de Vite (`@tailwindcss/vite`), configurado desde CSS
  (`@import "tailwindcss"` + `@theme`), sin `tailwind.config.js`.
- **TypeScript estricto** (`astro/tsconfigs/strict`).
- **Node 24** (`.nvmrc`; Astro 7 exige ≥ 22.12) y **pnpm 11**, que solo ejecuta scripts de
  instalación de los paquetes aprobados en `pnpm-workspace.yaml`.

Comportamientos de Astro 7 que hay que tener en cuenta al desarrollar:

- **HTML estricto:** el compilador en Rust rechaza etiquetas sin cerrar o mal anidadas.
- **Espacios en blanco:** `compressHTML: 'jsx'` elimina los espacios entre elementos en
  línea. Si un texto necesita uno, hay que ponerlo explícito (`{" "}`).
- **Markdown con Sätteri:** el pipeline nativo sustituye a remark/rehype. Si se renderiza el
  cuerpo de las páginas de la wiki y hace falta un plugin de remark, habrá que instalar
  `@astrojs/markdown-remark`.

### 3.2 Composición

```text
pages/index.astro     ─┐ locale "es"
pages/en/index.astro  ─┴─▶ layouts/HomePage.astro ─▶ Layout.astro (lang, <title>, meta, global.css)
                           │ getCollection + buildHomeView     ├─ Header ─▶ LanguageSwitcher
                           │ (localiza, ordena, formatea)      ├─ sections/intro       ─▶ ProfileAvatar
                           └──── props localizadas ──────────▶ ├─ sections/experience  ─▶ TimelineItem
                                                               ├─ sections/projects    ─▶ ProjectCard
                                                               ├─ sections/skills      ─▶ SkillGroup
                                                               ├─ sections/education   ─▶ TimelineItem
                                                               └─ sections/contact
```

- **Una sola composición.** Las páginas de idioma solo montan `HomePage` con su `locale`.
- **Las secciones reciben props, no leen colecciones.** `HomePage` lee las colecciones y
  `buildHomeView` (`src/lib/home.ts`, pura) las localiza, ordena y formatea. Así las
  secciones se prueban con la Container API sin `astro:content`.
- **Secciones vacías.** Una sección sin elementos no se renderiza y la navegación no la
  enlaza (`HomeView.sections`).
- **Componentes** reutilizables que reciben props y no saben de dónde vienen los datos.
- **Alias de importación:** `@layouts`, `@sections`, `@components`, `@styles`, `@assets`,
  `@lib`, `@i18n`.

### 3.3 Internacionalización

- **Rutas:** i18n nativo de Astro: `es` por defecto y sin prefijo (`/`), `en` en `/en/`.
  `getRelativeLocaleUrl()` genera los enlaces del selector de idioma.
- **Textos de interfaz:** diccionario propio en `src/i18n/ui.ts` (receta oficial de Astro),
  tipado para que ambos idiomas tengan las mismas claves.
- **Contenido:** bloque `en:` en el frontmatter de cada página de la wiki; `localize()` elige
  los campos según el idioma.
- **Paraglide JS:** descartado por ahora (no hay JS de cliente que optimizar, solapa el
  routing de Astro y añade herramientas a la plantilla). Pasar a él si entra un tercer
  idioma, el texto de interfaz crece a decenas de cadenas o se necesitan plurales; el cambio
  queda limitado a `ui.ts` y sus usos.
- No se usan `fallback`, `Astro.preferredLocale` ni `domains`: el sitio es estático y los dos
  idiomas existen siempre. Las etiquetas `hreflang` irán con el despliegue (necesitan `site`).

### 3.4 Estilos

- Tokens de diseño en `@theme` dentro de `global.css` (p. ej. `--color-mint-500`), que
  Tailwind expone como utilidades (`bg-mint-500`).
- Utilidades de Tailwind para la maquetación; `<style>` con ámbito solo cuando una sección
  necesite algo que las utilidades no expresen bien.

### 3.5 Imágenes

Las imágenes del contenido van en `src/assets/` para que Astro las optimice
(`astro:assets`, componente `<Image />`). `public/` queda para lo que se sirve sin procesar
(`favicon.svg`).

### 3.6 Build y despliegue

`pnpm build` genera HTML estático en `dist/`. El despliegue previsto es **GitHub Pages**
mediante GitHub Actions (`withastro/action`). Solo necesita lo que está en el repo, porque el
portfolio consume únicamente `wiki/public/`.

### 3.7 Tests

| Nivel | Herramienta | Qué cubre | Ruta |
| --- | --- | --- | --- |
| Unitario | Vitest | `localize`, `formatPeriod`, `useTranslations`, ordenación, vista | `tests/unit/` |
| Contrato | Vitest + Zod | Fixtures válidos/inválidos y toda la wiki pública real | `tests/content/` |
| Componentes | Vitest + Container API | Secciones y cabecera en ambos idiomas y con listas vacías | `tests/components/` |
| Privacidad | Vitest | Teléfono, dirección, código postal y nacimiento en `wiki/public/` y `dist/`, más `wiki/private/forbidden-strings.txt` si existe | `tests/privacy/` |
| E2E | Playwright + axe | `/` y `/en/`: idioma, secciones, enlaces, selector, accesibilidad | `tests/e2e/` |

Scripts: `pnpm test` (todo salvo E2E), `pnpm test:e2e` (build + preview + Playwright),
`pnpm check` (`astro check`). Notas de entorno:

- La Container API es `experimental_AstroContainer` en Astro 7.3; si cambia en una versión
  menor, E2E hace de red.
- El preview de Playwright usa `--ignore-lock`: Astro 7 lanza `astro preview` en segundo
  plano cuando detecta un agente de IA, y Playwright lo interpreta como una salida temprana.
- TypeScript está en la versión 6 porque `@astrojs/check` aún no admite la 7.

## 4. Capa de contenido

### 4.1 La wiki

- **`raw/`**: fuentes originales, inmutables y locales.
- **Web**: URLs públicas como fuente secundaria. El agente presenta lo que extrae y solo lo
  usa si el humano lo valida; se cita con la URL y la fecha de consulta.
- **`wiki/public/`**: una página Markdown por entidad publicable (`profile.md`,
  `experience/`, `projects/`, `skills/`, `education/`), con frontmatter normalizado.
- **`wiki/private/`**: lo que no debe publicarse, el log y las síntesis.

Las convenciones completas (estructura, privacidad, frontmatter, índices y log) están en
[.claude/rules/wiki.md](../.claude/rules/wiki.md) y no se repiten aquí.

### 4.2 Contrato con el portfolio

El **frontmatter es la interfaz** entre la wiki y Astro, y el portfolio usa **solo el
frontmatter** (el cuerpo es prosa de wiki y no se publica). Los esquemas Zod de
[`src/lib/schemas.ts`](../src/lib/schemas.ts) definen el contrato; los usan
[`src/content.config.ts`](../src/content.config.ts) (la build falla si una página no lo
cumple) y los tests de contrato. Los campos por tipo están en la regla de la wiki.

| Origen | Colección | Sección |
| --- | --- | --- |
| `wiki/public/profile.md` | `profile` | `intro`, `contact` |
| `wiki/public/experience/` | `experience` | `experience` |
| `wiki/public/projects/` | `projects` | `projects` |
| `wiki/public/skills/` | `skills` | `skills` (agrupadas por `category`) |
| `wiki/public/education/` | `education` | `education` |

## 5. Agente (Claude Code)

### 5.1 Del patrón de Karpathy a Claude Code

Karpathy concentra el esquema en un único documento. Aquí cada parte va al mecanismo que la
carga solo cuando hace falta o que la hace cumplir sin depender del modelo:

| Concepto | Implementación | Por qué |
| --- | --- | --- |
| Fuentes inmutables | `raw/` + `deny` de `Edit`/`Write` en `.claude/settings.json` | Lo impide el sistema de permisos, no una instrucción |
| Convenciones | `.claude/rules/wiki.md` con `paths: wiki/**, raw/**` | Se carga sola al tocar la wiki y no ocupa contexto al trabajar en `src/` |
| Procedimientos | Skills `ingest`, `query`, `lint` | Cada uno se carga solo al ejecutarse |
| Lint | `context: fork` (subagente) | Lee toda la wiki sin llenar el contexto principal |
| Índice | `wiki/index.md`, `wiki/private/index.md` + Grep | Punto de entrada barato; Grep sustituye al buscador que Karpathy propone para wikis grandes |
| Log | `wiki/private/log.md` | Continuidad entre sesiones |
| Contexto global | `CLAUDE.md` corto | Solo lo que aplica en toda sesión |

### 5.2 Operaciones

- **Ingest:** lee una fuente (archivo de `raw/` o URL), propone qué extrae y qué páginas toca (públicas y privadas),
  espera confirmación y después escribe páginas, enlaces, índices y log.
- **Query:** índices → páginas relevantes → respuesta citada. Opcionalmente, la respuesta se
  guarda como síntesis privada.
- **Lint:** en un subagente, busca fugas de privacidad, enlaces rotos, páginas huérfanas,
  contradicciones y huecos; corrige lo trivial y devuelve un informe.

## 6. Patrones de diseño

### Agentes de IA

- **Memoria externa persistente.** El conocimiento vive en archivos, no en el contexto del
  modelo; cada sesión entra por el índice en lugar de releer las fuentes.
- **Esquema como contrato.** La regla y las skills fijan formatos y procedimientos. Cambiar
  el comportamiento es editar archivos, no reescribir prompts.
- **Contexto progresivo.** `CLAUDE.md` siempre, la regla de la wiki al tocar sus archivos,
  cada skill al invocarla.
- **Barreras deterministas.** Lo que nunca debe pasar se impide con permisos y `.gitignore`.
- **Humano en el bucle.** El agente propone antes de escribir y señala las contradicciones.
- **Delegación a subagentes.** `lint` corre aislado y devuelve solo el informe.
- **Reflexión.** `lint` revisa el trabajo acumulado del propio agente.

### Software

- **Separación fuente / derivado.** `raw/` es inmutable; la wiki es una proyección regenerable.
- **Single source of truth.** El portfolio no contiene datos propios; los lee de la wiki.
- **Contrato validado por esquema.** Zod, en las content collections, comprueba en build lo
  que escribe el agente.
- **Separación por visibilidad.** Lo público y lo privado van en carpetas distintas, y git
  hace cumplir el límite.
- **Composición por secciones.** Una página es un layout más secciones autocontenidas; los
  componentes no conocen la fuente de datos.
- **Generación estática.** Sin servidor ni JavaScript de cliente: más rápido, más barato y
  desplegable en GitHub Pages.

## 7. Estado actual y hoja de ruta

### Estado (2026-10-02)

| Área | Estado |
| --- | --- |
| Configuración Astro + Tailwind + i18n | Hecha |
| Dependencias | Actualizadas a Astro 7.3 y Tailwind 4.3; build y servidor de desarrollo verificados |
| Layout y composición | `lang`, `<title>` y metadatos por idioma; composición única para `/` y `/en/` |
| Secciones | Las seis con datos reales; maquetación sobria con Tailwind |
| Contenido | Primera ingesta hecha (CV, LinkedIn, puesto actual, GitHub) |
| Content collections | Hechas, validadas con Zod |
| Tests | Unitarios, contrato, componentes, privacidad y E2E con axe |
| Diseño visual | Pendiente |
| Despliegue | No configurado (`site` sin definir, sin workflow) |

### Fases

1. ✅ **Contenido inicial.** Dejar el CV y otras fuentes en `raw/` y ejecutar `/ingest`. Sin
   datos reales no tiene sentido diseñar las secciones.
2. ✅ **Base del sitio.**
   - Importar `global.css` en el layout, no en cada página.
   - `lang` y `<title>` según el idioma, y metadatos básicos (description, Open Graph).
   - Una única composición de página compartida por `/` y `/en/`, para no duplicarla.
   - Diccionario de textos de interfaz (`src/i18n/`).
3. ✅ **Contrato de contenido.** `src/content.config.ts` con las colecciones y los esquemas de
   §4.2; la build falla si la wiki no cumple el contrato.
4. ✅ **Secciones.** Las seis secciones, `Header` con navegación y selector de idioma.
5. **Diseño visual.** Dirección de arte, tipografía y tokens de color en `@theme`.
6. **Despliegue.** `site` en `astro.config.mjs` y workflow de GitHub Actions a GitHub Pages,
   con `pnpm check`, `pnpm test` y `pnpm test:e2e` en CI, y etiquetas `hreflang`.

### Cuestiones abiertas

- **Imágenes del contenido** (logos de empresas, capturas de proyectos): ¿van en
  `wiki/public/` junto a la página o en `src/assets/`?
- **Dominio:** `arubiose.github.io` (repo de usuario) o `/<repo>/` (requiere `base`).

## 8. Decisiones

| Decisión | Alternativa descartada | Motivo |
| --- | --- | --- |
| Wiki pública/privada en un solo repo | Plantilla + instancia privada + repo de salida | Mucho más simple. [0001](decisions/0001-public-private-wiki.md) |
| Esquema repartido entre una regla con ámbito de rutas y las skills | Todo en `CLAUDE.md` o en un `SCHEMA.md` | Contexto solo cuando hace falta, sin indirecciones. [0002](decisions/0002-claude-code-native-schema.md) |
| Inmutabilidad de `raw/` por permisos | Solo una instrucción | Determinista |
| Sitio estático sin JS de cliente | SSR o SPA | El contenido cambia poco y GitHub Pages solo sirve estáticos |
| Contenido validado con Zod en build | Leer el Markdown sin validar | El agente escribe la wiki; el esquema detecta sus errores antes de publicar |
| Enlaces Markdown relativos | `[[wikilinks]]` | Funcionan en GitHub, Obsidian y Astro sin plugins |
| Índice mantenido por el LLM | Búsqueda vectorial / RAG | Volumen pequeño; sin infraestructura extra |
| Sin hook de privacidad en `git commit` | Hook con regex | No detecta fugas semánticas; lo cubre `lint` |
| Contenido en español, rutas en inglés | Todo en un idioma | Rutas estables y reutilizables como plantilla |
| Fuentes web y declaraciones del humano, con validación | Solo `raw/` | Menos fricción sin perder trazabilidad. [0003](decisions/0003-web-and-human-sources.md) |
| Traducción en el frontmatter (`en:`) | Páginas por idioma, traducción en build | Una página por entidad; Zod exige cada traducción |
| Diccionario propio para la interfaz | Paraglide JS | Sin JS de cliente que optimizar; ver §3.3 |
| Secciones con props, datos cargados en `HomePage` | Secciones que leen colecciones | Testeables con la Container API |
| Fechas `start`/`end` (`AAAA-MM`) | `period` en texto libre | Ordenables y formateables por idioma |

## 9. Referencias

- Andrej Karpathy, *LLM Wiki*: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- Artículo: https://medium.com/@urvvil08/andrej-karpathys-llm-wiki-create-your-own-knowledge-base-8779014accd5
- Astro: [content collections](https://docs.astro.build/en/guides/content-collections/), [i18n](https://docs.astro.build/en/guides/internationalization/), [despliegue en GitHub Pages](https://docs.astro.build/en/guides/deploy/github/)
- Tailwind CSS 4: [configuración con `@theme`](https://tailwindcss.com/docs/theme)
- Claude Code: [memoria y reglas](https://code.claude.com/docs/en/memory), [skills](https://code.claude.com/docs/en/skills), [permisos](https://code.claude.com/docs/en/settings)
