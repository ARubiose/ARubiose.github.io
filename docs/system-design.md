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
      (agente)                 │   Markdown +     glob + Zod     Astro           HTML
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
| Componentes | `src/components/` | Piezas reutilizables: `Header` (menú móvil con popover), `LanguageSwitcher`, `Icon`, `Window`, `ProfilePhoto` (visor con `<dialog>`), `Timeline`/`TimelineItem`, `ProjectCard`, `SkillBuilder`, `Footer` | Sí |
| Lógica | `src/lib/` | Funciones puras: esquemas Zod (`schemas.ts`), fechas, ordenación, iconos (`icons.ts`), XP y build (`skills.ts`, `build.ts`), skins (`skins.ts`) y vista de la portada (`home.ts`) | Sí |
| Scripts | `src/scripts/` | Mejora progresiva en el cliente: navegación activa, visor de la foto, creador de personaje, flechas de pestañas, animaciones GSAP | Sí |
| i18n | `src/i18n/` | Diccionario de interfaz (`ui.ts`) y `useTranslations`/`localize` | Sí |
| Colecciones | `src/content.config.ts` | Colecciones de Astro sobre `wiki/public/` | Sí |
| Tests | `tests/` | Unitarios, contrato, componentes, privacidad y E2E (§3.7) | Sí |
| Estilos | `src/styles/` | `global.css` (Tailwind, tokens semánticos y variante `timeline-single`), `base.css` (reset y tokens de distribución en `@layer base`), `states.css` (reglas de estado sin capa) y `skins/` (una hoja por skin, en `@layer components`) | Sí |
| Assets | `src/assets/`, `public/` | Imágenes de la interfaz que Astro optimiza / archivos que se sirven tal cual | Sí |
| Configuración | `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts` | i18n, plugin de Tailwind, alias de importación, tests | Sí |
| Wiki pública | `wiki/public/` | Contenido publicable; fuente de datos del portfolio | Sí |
| Wiki privada | `wiki/private/` | Notas personales, síntesis, log | No |
| Fuentes | `raw/` | Material original (CV, LinkedIn…) | No |
| Agente | `.claude/` | Regla de la wiki, skills `ingest`/`query`/`lint`, permisos | Sí |
| Docs | `docs/` | Este documento, las decisiones (`decisions/`) y las maquetas (`design/mockups/`) | Sí |

## 3. Portfolio (Astro)

### 3.1 Stack

- **Astro 7.3** (Vite 8, compilador en Rust) con salida estática (`output: "static"`, el
  valor por defecto). Sin framework de UI: el HTML se genera completo en build y unos
  módulos pequeños de `src/scripts/` lo mejoran en el cliente.
- **Fuentes** con la API de fuentes de Astro vía Fontsource (Terminal: Space Grotesk e IBM Plex
  Mono, precargadas; Táctico: Chakra Petch, Barlow y JetBrains Mono, sin precarga), descargadas
  en el build y servidas desde `/_astro/fonts/`. El build necesita red.
- **GSAP 3.15** (licencia gratuita, también comercial) con ScrollTrigger y ScrambleTextPlugin.
- **Iconos:** `simple-icons` y `@phosphor-icons/core`, como SVG en línea.
- **Tailwind CSS 4.3** como plugin de Vite (`@tailwindcss/vite`), configurado desde CSS
  (`@import "tailwindcss"` + `@theme`), sin `tailwind.config.js`.
- **TypeScript estricto** (`astro/tsconfigs/strict`).
- **SEO:** `@astrojs/sitemap` (sitemap con alternativas por idioma); ver §3.8.
- **Node 24** (`.nvmrc` y mínimo en `engines`; Astro 7 exige ≥ 22.12) y **pnpm 12**, que solo ejecuta scripts de
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
pages/en/index.astro  ─┴─▶ layouts/HomePage.astro ─▶ Layout.astro (lang, data-skin, fuentes, meta)
                           │ getCollection + buildHomeView     ├─ Header (popover)     ─▶ LanguageSwitcher
                           │ (localiza, ordena, calcula XP)    ├─ sections/intro       ─▶ ProfilePhoto (<dialog>)
                           └──── props localizadas ──────────▶ ├─ sections/experience  ─▶ Timeline ─▶ Window
                                                               ├─ sections/projects    ─▶ ProjectCard ─▶ Window
                                                               ├─ sections/skills      ─▶ SkillBuilder ─▶ Icon
                                                               ├─ sections/education   ─▶ Timeline ─▶ Window
                                                               ├─ sections/contact
                                                               └─ Footer
src/scripts/: nav · lightbox · skill-builder (+ tab-edges) · skin-switcher · motion   (mejora progresiva)
```

- **Una sola composición.** Las páginas de idioma solo montan `HomePage` con su `locale`.
- **Las secciones reciben props, no leen colecciones.** `HomePage` lee las colecciones y
  `buildHomeView` (`src/lib/home.ts`, pura) las localiza, ordena y formatea. Así las
  secciones se prueban con la Container API sin `astro:content`.
- **Secciones vacías.** Una sección sin elementos no se renderiza y la navegación no la
  enlaza (`HomeView.sections`).
- **Componentes** reutilizables que reciben props y no saben de dónde vienen los datos.
- **Mejora progresiva.** Sin JavaScript o con `prefers-reduced-motion` todo el contenido se
  ve: el creador de personaje se muestra como lista por categorías y las animaciones solo
  usan `gsap.from()` dentro de `gsap.matchMedia()`. El script de cliente se mantiene por
  debajo de 60 KB comprimidos (test de presupuesto).
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

Arquitectura de **skins** ([fase 5](superpowers/specs/2026-10-02-terminal-skin-design.md),
[fase 5b](superpowers/specs/2026-10-03-tactical-skin-design.md),
[fase 5b, 2/2](superpowers/specs/2026-10-03-game-skin-design.md)). Skins: **Terminal**
(predeterminada), **Táctico** y **Juego**.

- **Registro** (`src/lib/skins.ts`): `skinRegistry` lista cada skin con su muestra de color y su
  modo de línea de tiempo (`alternate` o `single`). Un script en línea en `<head>`
  (`skinBootScript`, generado a partir de `resolveSkin`) aplica `data-skin` y `data-timeline` en
  `<html>` antes de pintar; `Layout` escribe los de la predeterminada para cuando no hay JS.
- **Hoja por skin** en `src/styles/skins/<skin>.css`, dentro de `@layer components`: variables
  `--skin-*` (colores, fuentes, radio), tokens de distribución y decoración bajo
  `[data-skin="<skin>"]`. Las utilidades ganan siempre a la skin; lo que la skin oculta y una
  utilidad muestra se oculta con propiedades que ninguna utilidad toca (`visibility`).
- **Distribución por skin:** tokens con los valores de Terminal en `base.css`, que los
  componentes leen con utilidades como `md:grid-cols-(--hero-cols)`: hero (`--hero-cols`,
  `--hero-gap`, `--hero-photo-order`, `--hero-photo-max`), tipografía (`--hero-name-size`/`-md`,
  `--hero-name-leading`, `--hero-name-weight`, `--section-title-size`/`-md`, `--handle-size`/`-md`),
  menú móvil (`--menu-link-size`, `--menu-link-leading`, `--menu-link-border`) e inventario del
  creador (`--inventory-cols`, `--inventory-gap`). Y la variante `timeline-single:` (lee
  `data-timeline="single"`) para la línea de tiempo de una columna. `body` es contenedor de
  consultas (`container-type: inline-size`): `100cqw` mide la página sin la barra de
  desplazamiento, a diferencia de `100vw`.
- **Color del rol del hero:** lo declara cada hoja (`.hero-role`), no una utilidad.
- **Adornos por skin:** los textos decorativos (`whoami`, `personaje.sav`, `Registro de
  misiones`…) están en `adorns` de `src/i18n/ui.ts`, con un texto por skin. `Adorn.astro` pinta
  un `<span aria-hidden data-for-skin>` por skin; `states.css` los oculta todos y muestra solo los
  de la activa (un test exige la regla de cada skin registrada), así que una skin sin adorno, o
  fuera del registro, no pinta nada. Un fragmento entre `[[` y `]]` del diccionario sale como
  `<span class="adorn-mark">`, que la skin resalta (el «//» del indicativo de Táctico).
- **Selector** (`SkinSwitcher.astro`, en la cabecera y en el menú móvil): oculto sin JS;
  `skin-switcher.ts` aplica la skin con `applySkin`, la guarda, sincroniza `aria-pressed`, la
  anuncia por `aria-live` y emite `skinchange` (que `motion.ts` usa para recalcular
  ScrollTrigger, también cuando llegan las fuentes de la skin nueva, y `nav.ts` para recalcular la
  sección activa).
- **Intro por skin:** `motion.ts` elige un preset según `data-skin` al cargar; una skin sin
  preset usa el de Terminal sin la escritura del prompt.

**Añadir una skin:** entrada en `skinRegistry`; hoja en `src/styles/skins/` importada en
`global.css`; regla de adornos en `states.css`; nombre `skin.<id>` en `ui.ts`; adornos y preset
de intro opcionales; fuentes en `astro.config.mjs` (`<Font>` sin precarga en `Layout`); proyectos
`desktop-<id>`/`mobile-<id>` en `playwright.config.ts` (los e2e filtran por skin con `skinOf()`
de `tests/e2e/support.ts`) y capturas solo de esos proyectos con `--update-snapshots`. Si la skin
necesita otro valor de algo que hoy fija una utilidad del marcado, conviértelo en token con el
valor actual en `base.css` (las capturas de las demás skins deben seguir pasando sin
regenerarse). Con `clip-path`, el contorno de foco va por dentro del elemento: por fuera lo recorta.
- `global.css` declara los tokens **semánticos** con `@theme inline` (`bg`, `surface`,
  `line`, `text`, `muted`, `accent`, `warn`, `font-display`, `font-mono`…) apuntando a las
  variables de la skin, y Tailwind los expone como utilidades (`bg-surface`, `text-accent`).
- **Regla de componentes:** maquetación con utilidades; aspecto con clases semánticas
  estables (`window`, `prompt`, `timeline`, `tile`…) que estiliza la skin. Ningún componente
  usa colores ni fuentes concretos.
- `base.css` va en `@layer base` para que las utilidades puedan sobrescribir el reset.

### 3.5 Imágenes

Las imágenes del contenido (foto de perfil, y en el futuro logos o capturas) viven en
`wiki/public/` junto a la página que las usa y se citan desde su frontmatter con una ruta
relativa (`photo: ./profile.jpg`). El esquema Zod de `src/lib/schemas.ts` valida la ruta y
`src/content.config.ts` la sustituye por el helper `image()`, así que Astro las optimiza
(WebP en varios tamaños con `<Image />`) y en la web nunca se sirve el original. Ver la
decisión [0004](decisions/0004-content-images-in-wiki.md).

`src/assets/` queda para imágenes de la interfaz y `public/` para lo que se sirve sin
procesar (`favicon.svg`).

### 3.6 Build y despliegue

`pnpm build` genera HTML estático en `dist/`. Se publica en **GitHub Pages**
(`https://arubiose.github.io`, repo de usuario `ARubiose.github.io`, sin `base`) con el
workflow `.github/workflows/deploy.yml`:

- En cada push y PR ejecuta `pnpm check`, `pnpm test` y `pnpm test:e2e`, con el historial
  completo de git para el test de privacidad.
- En `main`, sube como artefacto de Pages el mismo `dist/` que han construido y escaneado los
  e2e, y lo despliega con `actions/deploy-pages`. Si falla un test, no se publica nada.

Solo necesita lo que está en el repo, porque el portfolio consume únicamente `wiki/public/`.

### 3.7 Tests

| Nivel | Herramienta | Qué cubre | Ruta |
| --- | --- | --- | --- |
| Unitario | Vitest | `localize`, `formatPeriod`, `useTranslations`, ordenación, vista | `tests/unit/` |
| Contrato | Vitest + Zod | Fixtures válidos/inválidos y toda la wiki pública real | `tests/content/` |
| Componentes | Vitest + Container API | Secciones y cabecera en ambos idiomas y con listas vacías | `tests/components/` |
| Privacidad | Vitest | Teléfono, dirección, código postal y nacimiento en `wiki/public/` y `dist/`; credenciales y rutas personales en todos los archivos versionados, los mensajes de commit y las líneas añadidas del historial; en ambos, `wiki/private/forbidden-strings.txt` si existe | `tests/privacy/` |
| E2E | Playwright + axe | `/` y `/en/` en escritorio (1280) y móvil (390): navegación, menú, visor, creador de personaje, sin JS, movimiento reducido, desbordamiento, CLS, accesibilidad con diálogos abiertos; canonical, hreflang, JSON-LD, sitemap y robots | `tests/e2e/` |
| Regresión visual | Playwright `toHaveScreenshot` | Portada completa en ambos tamaños e idiomas y en las tres skins (12 capturas), con movimiento reducido | `tests/e2e/visual.spec.ts-snapshots/` |
| Presupuesto | Vitest | JavaScript de la portada ≤ 60 KB comprimido | `tests/perf/` |

Scripts: `pnpm test` (todo salvo E2E), `pnpm test:e2e` (build + preview + Playwright, y
después la privacidad y el presupuesto sobre `dist/`), `pnpm test:visual:update` (regenera
las capturas de referencia tras un cambio de diseño intencionado) y `pnpm check`
(`astro check`). Notas de entorno:

- La Container API es `experimental_AstroContainer` en Astro 7.3; si cambia en una versión
  menor, E2E hace de red.
- El preview de Playwright usa `--ignore-lock`: Astro 7 lanza `astro preview` en segundo
  plano cuando detecta un agente de IA, y Playwright lo interpreta como una salida temprana.
- TypeScript está en la versión 6 porque `@astrojs/check` aún no admite la 7.
- En desarrollo, la Container API añade atributos `data-astro-source-*`; los tests los
  quitan con `tests/support/render.ts` antes de comprobar el HTML.
- Las capturas de referencia dependen del entorno (fuentes, renderizado): hay que
  generarlas en el mismo sistema que las compara.
- Astro guarda las colecciones en `node_modules/.astro/data-store.json` y no lo invalida al
  cambiar un esquema: tras añadir un campo con valor por defecto, borra ese archivo antes de
  construir, o las páginas sin cambios conservan los datos antiguos (en CI siempre es limpio).

### 3.8 SEO

Todo sale de `site` y de la wiki pública; no hay datos escritos a mano.

- **`<head>`** (`Layout.astro`): `canonical` (la URL servida), una alternativa `hreflang` por
  idioma (`localeTags` de `src/i18n/ui.ts`: `es-ES`, `en-US`) más `x-default` al idioma por
  defecto, y un JSON-LD `Person`.
- **JSON-LD** (`personJsonLd` en `src/lib/seo.ts`): nombre, cargo, resumen, foto optimizada,
  localidad, LinkedIn y GitHub (`sameAs`), puesto actual (`worksFor`), instituciones de los
  títulos (`alumniOf`, `kind: degree`), certificaciones (`hasCredential`, `kind: certificate`)
  y habilidades (`knowsAbout`). Sin email. `jsonLdScript` escapa `<`.
- **Sitemap:** `@astrojs/sitemap` con los mismos `localeTags` (`sitemap-index.xml`).
- **`robots.txt`:** endpoint (`src/pages/robots.txt.ts`) que apunta al sitemap con el dominio
  de `site`.
- La imagen al compartir (`public/og-image.png`) es única y no se deriva de la wiki.

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

## 7. Estado y hoja de ruta

El estado, las fases pendientes, las mejoras aplazadas y las cuestiones abiertas están en los
[issues del repositorio](https://github.com/ARubiose/ARubiose.github.io/issues), que son la
única fuente de la hoja de ruta; lo terminado queda en `git log`
([0005](decisions/0005-roadmap-in-github-issues.md)).

## 8. Decisiones

| Decisión | Alternativa descartada | Motivo |
| --- | --- | --- |
| Wiki pública/privada en un solo repo | Plantilla + instancia privada + repo de salida | Mucho más simple. [0001](decisions/0001-public-private-wiki.md) |
| Esquema repartido entre una regla con ámbito de rutas y las skills | Todo en `CLAUDE.md` o en un `SCHEMA.md` | Contexto solo cuando hace falta, sin indirecciones. [0002](decisions/0002-claude-code-native-schema.md) |
| Inmutabilidad de `raw/` por permisos | Solo una instrucción | Determinista |
| Sitio estático con mejora progresiva | SSR o SPA | El contenido cambia poco y GitHub Pages solo sirve estáticos; el JS solo añade interacción |
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
| Skins por atributo y tokens `--skin-*` | Un único tema fijo | Añadir skins sin tocar el marcado |
| Distribución por tokens y variante `timeline-single` | Reglas de skin que pisan utilidades | Cada skin decide la distribución sin romper el orden de capas |
| Adornos por skin en el diccionario, un span por skin | Textos neutros; cambiarlos con JS | Personalidad por skin, cambio instantáneo y sin depender de JS |
| Sitemap con `@astrojs/sitemap` | Endpoint propio | Oficial y crece con el proyecto (`filter`, `serialize`, `lastmod`); mismos códigos que el `<head>` |
| Hoja de ruta en GitHub issues | `docs/tasks.md`; GitHub Project | El archivo crecía sin límite; un Project sobra para una persona. [0005](decisions/0005-roadmap-in-github-issues.md) |
| GSAP + CSS para animaciones | Solo CSS, Motion | Efectos de terminal (ScrambleText) y ScrollTrigger sin framework de UI |
| Integridad de `skills` con `findBrokenSkillRefs` | `reference()` de Astro | Los esquemas se prueban sin `astro:content`; el build falla igual |
| XP calculada a partir de los puestos | Niveles escritos a mano | Sin datos inventados |

## 9. Referencias

- Andrej Karpathy, *LLM Wiki*: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- Artículo: https://medium.com/@urvvil08/andrej-karpathys-llm-wiki-create-your-own-knowledge-base-8779014accd5
- Astro: [content collections](https://docs.astro.build/en/guides/content-collections/), [i18n](https://docs.astro.build/en/guides/internationalization/), [despliegue en GitHub Pages](https://docs.astro.build/en/guides/deploy/github/)
- Tailwind CSS 4: [configuración con `@theme`](https://tailwindcss.com/docs/theme)
- Claude Code: [memoria y reglas](https://code.claude.com/docs/en/memory), [skills](https://code.claude.com/docs/en/skills), [permisos](https://code.claude.com/docs/en/settings)
