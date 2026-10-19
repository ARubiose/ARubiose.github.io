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
| Páginas | `src/pages/` | Rutas: `/` (es) y `/en/` (en), el detalle de cada proyecto que lo tenga (`projects/[slug].astro` y `en/projects/[slug].astro`) y el CV (`cv.astro` y `en/cv.astro`) | Sí |
| Layouts | `src/layouts/` | `Layout.astro` (documento HTML, `lang`, metadatos) `HomePage.astro` (compone la portada) `ProjectPage.astro` (compone el detalle de un proyecto) y `CvPage.astro` (la hoja del CV y su botón de descarga); cargan las colecciones con `src/lib/content.ts` | Sí |
| Secciones | `src/sections/` | Bloques de la página: `intro`, `experience`, `projects`, `skills`, `education`, `contact` | Sí |
| Componentes | `src/components/` | Piezas reutilizables: `Header` (menú móvil con popover), `LanguageSwitcher`, `Icon`, `Window`, `ProfilePhoto` (visor con `<dialog>`), `Timeline`/`TimelineItem`, `ProjectCard`, `SkillBuilder`, `Cv` (hoja imprimible del CV), `Footer` | Sí |
| Lógica | `src/lib/` | Funciones puras: esquemas Zod (`schemas.ts`), fechas, ordenación, iconos (`icons.ts`), XP y build (`skills.ts`, `build.ts`), skins (`skins.ts`), vista de la portada (`home.ts`), vista del CV (`cv.ts`) e impresión a PDF (`cv-pdf.ts`) | Sí |
| Scripts | `src/scripts/` | Mejora progresiva en el cliente: navegación activa, visor de la foto y de las imágenes de los detalles, creador de personaje, flechas de pestañas, animaciones GSAP | Sí |
| i18n | `src/i18n/` | Diccionario de interfaz (`ui.ts`) y `useTranslations`/`localize` | Sí |
| Colecciones | `src/content.config.ts` | Colecciones de Astro sobre `wiki/public/` | Sí |
| Tests | `tests/` | Unitarios, contrato, componentes, privacidad y E2E (§3.7) | Sí |
| Estilos | `src/styles/` | `global.css` (Tailwind, tokens semánticos y variante `timeline-single`), `base.css` (reset y tokens de distribución en `@layer base`), `states.css` (reglas de estado sin capa), `skins/` (una hoja por skin, en `@layer components`) y `cv.css` (la hoja del CV, con tokens `--cv-*` propios) | Sí |
| Assets | `src/assets/`, `public/` | Imágenes de la interfaz que Astro optimiza / archivos que se sirven tal cual | Sí |
| Integraciones | `src/integrations/` | `cv-pdf`: imprime el CV a PDF al terminar la build (§3.11) | Sí |
| Configuración | `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts` | i18n, plugin de Tailwind, alias de importación, tests | Sí |
| Wiki pública | `wiki/public/` | Contenido publicable; fuente de datos del portfolio | Sí |
| Wiki privada | `wiki/private/` | Notas personales, síntesis, log | No |
| Fuentes | `raw/` | Material original (CV, LinkedIn…) | No |
| Agente | `.claude/` | Regla de la wiki, skills `ingest`/`query`/`lint`/`detail`/`cv`, permisos | Sí |
| Docs | `docs/` | Este documento, las decisiones (`decisions/`) y la guía de uso (`guide.md`, `guide.es.md`) | Sí |

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
- **Analítica opcional:** Cloudflare Web Analytics; ver §3.9.
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
src/scripts/: nav · lightbox · figure-zoom · skill-builder (+ tab-edges) · skin-switcher · motion   (mejora progresiva)
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
  debajo de 60 KB comprimidos en cada página (test de presupuesto).
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

`pnpm build` genera HTML estático en `dist/`. Se publica en **GitHub Pages** con el workflow
`.github/workflows/deploy.yml`. `site` y `base` se deducen de `GITHUB_REPOSITORY` en
`src/lib/site.ts` (`pagesTarget`): un repo `<owner>.github.io` se publica en la raíz y
cualquier otro en `/<repo>/` (la demo de la plantilla está en
`https://arubiose.github.io/llm-wiki-portfolio/`). `SITE_URL` y `BASE_PATH` (variables del repo, que `deploy.yml` ya pasa) lo fuerzan, y sin
nada de eso (desarrollo local) es `http://localhost:4321`. Todas las URLs internas usan
`import.meta.env.BASE_URL` o las funciones de `astro:i18n`.

- En cada push y PR ejecuta `pnpm check`, `pnpm test` y `pnpm test:e2e`, con el historial
  completo de git para el test de privacidad.
- En `main`, sube como artefacto de Pages el mismo `dist/` que han construido el smoke y el
  escaneo (los e2e construyen el fixture aparte, en `.fixture-dist/`), y lo despliega con
  `actions/deploy-pages`. Si falla un test, no se publica nada.

Solo necesita lo que está en el repo, porque el portfolio consume únicamente `wiki/public/`.

### 3.7 Tests

| Nivel | Herramienta | Qué cubre | Ruta |
| --- | --- | --- | --- |
| Unitario | Vitest | `localize`, `formatPeriod`, `useTranslations`, ordenación, vista | `tests/unit/` |
| Contrato | Vitest + Zod | Fixtures válidos/inválidos y toda la wiki pública real | `tests/content/` |
| Componentes | Vitest + Container API | Secciones y cabecera en ambos idiomas y con listas vacías | `tests/components/` |
| Privacidad | Vitest | Teléfono, dirección, código postal y nacimiento en `wiki/public/`, `dist/` y el texto de los PDF del CV; credenciales y rutas personales en todos los archivos versionados, los mensajes de commit y las líneas añadidas del historial; en ambos, `wiki/private/forbidden-strings.txt` si existe | `tests/privacy/` |
| E2E | Playwright + axe | `/` y `/en/` en escritorio (1280) y móvil (390): navegación, menú, visor, creador de personaje, sin JS, movimiento reducido, desbordamiento, CLS, accesibilidad con diálogos abiertos; canonical, hreflang, JSON-LD, sitemap y robots. Detalle de proyecto: tarjeta → detalle, volver, cambio de idioma, SEO, cuerpo publicado y axe en las tres skins. CV: enlaces desde la portada, hoja, foto por idioma, descarga del PDF, cambio de idioma, SEO, axe y desbordamiento en las tres skins. Sobre el fixture `tests/fixtures/site/` (Ada), construido con `WIKI_DIR` en `.fixture-dist/` | `tests/e2e/` |
| Regresión visual | Playwright `toHaveScreenshot` | Portada completa en ambos tamaños e idiomas y en las tres skins (12 capturas), el detalle de Ada en español en ambos tamaños y las tres skins (6 capturas) y el CV en ambos idiomas, tamaños y skins (12 capturas), con movimiento reducido | `tests/e2e/visual.spec.ts-snapshots/` |
| Presupuesto | Vitest | JavaScript de cada página (portadas y detalles, también los módulos en línea) ≤ 60 KB comprimido | `tests/perf/` |
| Smoke | Playwright | Contenido real (`wiki/public/`) con su `base`: `/` y `/en/` cargan sin errores, con `h1`, secciones con contenido y sin desbordamiento; lo mismo para cada detalle de proyecto que tenga la wiki y para el CV, cuyo PDF se descarga | `tests/smoke/` |
| Build | Vitest | Construido bajo `/demo/`, ninguna URL interna apunta a la raíz del dominio y el PDF del CV se genera; el PDF del fixture ocupa una página, incrusta sus fuentes y su texto sigue el orden de lectura; `CV_PDF=0`; un CV de más de una página rompe la build; `pnpm cv:tailor` (PDF junto al YAML, códigos 0/1/2, nunca en `dist/`). En serie: las builds comparten `.astro/` | `tests/build/` |

Scripts: `pnpm test` (todo salvo E2E y build), `pnpm test:e2e` (Playwright sobre el fixture,
smoke sobre el build real, el test de build con `base` y después la privacidad y el
presupuesto sobre `dist/`), `pnpm test:build` (solo los de build), `pnpm test:visual:update` (regenera
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
  Cada `WIKI_DIR` tiene su propia caché (`buildDirs` en `src/lib/site.ts`), para que un build
  del fixture no deje sus colecciones en el build real.
- La XP y el año de la ficha se calculan con el mes del build (`buildMonth`). El build del
  fixture lo fija con `BUILD_DATE` (`playwright.config.ts`): sin eso, las capturas cambiarían
  con el paso del tiempo y romperían el CI de todos los sitios sin que nadie tocara nada.
- Vitest pone en `process.env` las variables de Vite (`BASE_URL`…); `tests/build/` las quita
  antes de lanzar `astro build`, porque pisarían la `base`.

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

### 3.9 Analítica

Opcional y desactivada por defecto, para que la plantilla no envíe nada sin configurarla.

- **Variable:** `PUBLIC_CF_ANALYTICS_TOKEN`, declarada en el esquema `env` de
  `astro.config.mjs` (`astro:env/client`, pública y opcional). En CI sale de la variable del
  repo `CF_ANALYTICS_TOKEN`.
- **Activación** (`analyticsBeacon` en `src/lib/analytics.ts`): token no vacío y build de
  producción. `HomePage.astro` calcula el resultado una vez y lo pasa a `Layout.astro`, que
  añade el `beacon.min.js` diferido de Cloudflare, y a `Footer.astro`, que muestra el aviso
  `footer.analytics` (marcado con `data-analytics-note`).
- **Tests:** las capturas visuales ocultan el aviso para valer con y sin token; un e2e
  comprueba que el aviso aparece si y solo si está el beacon; Playwright resuelve
  `static.cloudflareinsights.com` a nada para no contar las pruebas como visitas, y el
  presupuesto de JS solo cuenta scripts servidos desde `dist/` (o en línea).

### 3.10 Plantilla y sitios derivados

El código vive en la plantilla `ARubiose/llm-wiki-portfolio`, con contenido ficticio (Ada) y
una demo en Pages. Cada sitio derivado tiene su propio repo y trae las mejoras con
`pnpm sync:upstream` ([guía](guide.es.md), [0006](decisions/0006-template-and-upstream.md)).

- **Historial:** el sitio del autor comparte historial con la plantilla (nació de este mismo
  repo). Un repo creado con «Use this template» no lo comparte: su primer merge necesita
  `--allow-unrelated-histories` (el script lo añade solo si no hay ancestro común).
- **Archivos de contenido:** son los únicos que difieren entre la plantilla y un sitio
  derivado: `wiki/public/**`, `wiki/index.md` y `public/og-image.png`. `pnpm sync:upstream`
  (`scripts/sync-upstream.mjs`) hace el merge sin commit y los deja exactamente como estaban
  en `HEAD`, quitando también las páginas que solo trae la plantilla. Un driver `merge=ours`
  no basta: solo actúa cuando los dos lados tocaron el mismo archivo, así que una página nueva
  de Ada entraría sin conflicto.
- **Todo lo demás es compartido** (código, tests, `CLAUDE.md`, `docs/`) y se cambia en la
  plantilla; un cambio local dará conflictos al traer `upstream`.
- **Tests:** los e2e y las capturas usan `tests/fixtures/site/` (`WIKI_DIR`), así que
  cambiar el contenido no exige tocarlos (§3.7).

### 3.11 CV en PDF

Una página `/cv/` (y `/en/cv/`) muestra el CV como una hoja A4 sobre la skin activa, con un
botón que descarga su PDF; la portada lo enlaza desde la navegación, la intro y el contacto
([decisión 0008](decisions/0008-cv-from-wiki.md)).

- **Contenido:** el CV es una selección sobre la wiki. `buildCvView` (`src/lib/cv.ts`, pura)
  aplica el bloque opcional `cv:` del perfil (orden, highlights, entradas compactas,
  pilares, grupos de habilidades, idiomas, foto por idioma); sin él, muestra todo por fecha.
  `loadCvData` (`src/lib/content.ts`) valida las referencias y la build falla si alguna no
  existe.
- **Hoja:** `Cv.astro` con `src/styles/cv.css`, que es papel y no una skin: tokens `--cv-*`
  propios, una columna y orden DOM lineal. Nada con texto va posicionado, porque Chromium
  escribe en el PDF lo posicionado después del resto y un ATS leería los títulos lejos de su
  contenido. En pantalla estrecha fluye en una columna; al imprimir es A4 sin márgenes.
- **PDF:** la integración `src/integrations/cv-pdf.ts`, en `astro:build:done`, sirve la build
  bajo su `base`, abre cada CV en Chromium (Playwright), espera a las fuentes y lo imprime en
  `cv/cv-<nombre>-<idioma>.pdf`. Si ocupa más de una página, la build falla. `CV_PDF=0` la
  salta. El workflow ya instala Chromium antes de `pnpm build`.
- **CV adaptado (local):** `pnpm cv:tailor <cv.yml> [--lang es|en]` construye en un
  directorio temporal con `CV_SPEC` (el YAML sustituye al bloque `cv:`) y la integración, en
  modo adaptado (`CV_PDF_OUT`, `CV_LANG`), deja el PDF junto al YAML. Sale con 2 si pasa de
  una página. `assertCvSpecTarget` impide construir `dist/` con `CV_SPEC`. Lo usa la skill
  `cv` (§5.2).

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
| `wiki/public/profile.md` | `profile` | `intro`, `contact`; su bloque `cv:`, la página `/cv/` |
| `wiki/public/experience/` | `experience` | `experience` |
| `wiki/public/projects/` | `projects` | `projects` |
| `wiki/public/skills/` | `skills` | `skills` (agrupadas por `category`) |
| `wiki/public/education/` | `education` | `education` |
| `wiki/public/projects/<slug>/{es,en}.md` | `projectDetails` | página `/projects/<slug>/` (y `/en/…`) |

La única excepción al «solo frontmatter» son los **detalles de proyecto**: su cuerpo Markdown
se publica. [`src/lib/project-details.ts`](../src/lib/project-details.ts) valida la paridad
de idiomas, que exista la ficha y las normas del cuerpo (sin HTML crudo, enlaces solo web,
imágenes de su carpeta, sin `# h1` ni secciones de wiki) con `satteri`, el mismo analizador
que usa Astro; [`src/lib/content.ts`](../src/lib/content.ts) lo ejecuta en la build y falla
con archivo y línea. Ver la [decisión 0007](decisions/0007-project-detail-pages.md).

## 5. Agente (Claude Code)

### 5.1 Del patrón de Karpathy a Claude Code

Karpathy concentra el esquema en un único documento. Aquí cada parte va al mecanismo que la
carga solo cuando hace falta o que la hace cumplir sin depender del modelo:

| Concepto | Implementación | Por qué |
| --- | --- | --- |
| Fuentes inmutables | `raw/` + `deny` de `Edit`/`Write` en `.claude/settings.json` | Lo impide el sistema de permisos, no una instrucción |
| Convenciones | `.claude/rules/wiki.md` con `paths: wiki/**, raw/**` | Se carga sola al tocar la wiki y no ocupa contexto al trabajar en `src/` |
| Procedimientos | Skills `ingest`, `query`, `lint`, `detail`, `cv` | Cada uno se carga solo al ejecutarse |
| Lint | `context: fork` (subagente) | Lee toda la wiki sin llenar el contexto principal |
| Índice | `wiki/index.md`, `wiki/private/index.md` + Grep | Punto de entrada barato; Grep sustituye al buscador que Karpathy propone para wikis grandes |
| Log | `wiki/private/log.md` | Continuidad entre sesiones |
| Contexto global | `CLAUDE.md` corto | Solo lo que aplica en toda sesión |

### 5.2 Operaciones

- **Ingest:** lee una fuente (archivo de `raw/` o URL), propone qué extrae y qué páginas toca (públicas y privadas),
  espera confirmación y después escribe páginas, enlaces, índices y log.
- **Query:** índices → páginas relevantes → respuesta citada. Opcionalmente, la respuesta se
  guarda como síntesis privada.
- **CV:** lee una oferta (texto, PDF, DOCX o URL) como datos, escribe un `cv.yml` adaptado en
  `wiki/private/applications/`, genera su PDF con `pnpm cv:tailor` y responde con una nota de
  compatibilidad justificada, que no se guarda.
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
issues de cada repositorio (la plantilla y cada sitio derivado tienen los suyos), que son la
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
| CV como selección sobre la wiki, PDF con Chromium en la build | Overleaf/LaTeX; un formulario público con backend | Una sola fuente y sin servidor. [0008](decisions/0008-cv-from-wiki.md) |
| Plantilla y sitios derivados con `upstream`; e2e sobre un fixture fijo | Un solo repo con el contenido del autor | Reutilizable sin tocar código ni tests. [0006](decisions/0006-template-and-upstream.md) |

## 9. Referencias

- Andrej Karpathy, *LLM Wiki*: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- Artículo: https://medium.com/@urvvil08/andrej-karpathys-llm-wiki-create-your-own-knowledge-base-8779014accd5
- Astro: [content collections](https://docs.astro.build/en/guides/content-collections/), [i18n](https://docs.astro.build/en/guides/internationalization/), [despliegue en GitHub Pages](https://docs.astro.build/en/guides/deploy/github/)
- Tailwind CSS 4: [configuración con `@theme`](https://tailwindcss.com/docs/theme)
- Claude Code: [memoria y reglas](https://code.claude.com/docs/en/memory), [skills](https://code.claude.com/docs/en/skills), [permisos](https://code.claude.com/docs/en/settings)
