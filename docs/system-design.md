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
| Layout | `src/layouts/Layout.astro` | Documento HTML base: `<head>`, metadatos, slot de contenido | Sí |
| Secciones | `src/sections/` | Bloques de la página: `intro`, `education`, `experience`, `contact` | Sí |
| Componentes | `src/components/` | Piezas reutilizables dentro de las secciones: `Header`, `ProfileAvatar` | Sí |
| Estilos | `src/styles/global.css` | Tailwind 4 y tokens de diseño (`@theme`) | Sí |
| Assets | `src/assets/`, `public/` | Imágenes que Astro optimiza / archivos que se sirven tal cual | Sí |
| Configuración | `astro.config.mjs`, `tsconfig.json` | i18n, plugin de Tailwind, alias de importación | Sí |
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
pages/index.astro (es)  ─┐
pages/en/index.astro    ─┴─▶ Layout.astro ─▶ <slot/>
                                              ├─ sections/intro.astro      ─▶ components/ProfileAvatar
                                              ├─ sections/education.astro
                                              ├─ sections/experience.astro
                                              └─ sections/contact.astro
```

- **Página única con secciones.** Cada página monta las secciones en orden dentro del layout.
  Cada sección es autocontenida: su marcado y sus estilos con ámbito (`<style>` de Astro,
  aislado por componente).
- **Secciones frente a componentes.** Una sección es un bloque de la página ligado a una
  fuente de datos (una colección de la wiki). Un componente es una pieza visual
  reutilizable que recibe props y no sabe de dónde vienen los datos.
- **Alias de importación:** `@layouts`, `@sections`, `@components`, `@styles`, `@assets`.

### 3.3 Internacionalización

Enrutado i18n nativo de Astro (`astro.config.mjs`): `es` por defecto y sin prefijo (`/`),
`en` con prefijo (`/en/`). Hoy cada idioma tiene su propia página, que repite la misma
composición; todavía no hay textos traducidos ni detección del idioma en el layout.

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

El **frontmatter es la interfaz** entre la wiki y Astro. El plan es exponer cada carpeta de
`wiki/public/` como una *content collection* con un esquema Zod. Así se valida en build lo
que escribe el agente, y si una página no cumple el esquema, la build falla:

```ts
// src/content.config.ts (propuesta)
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod"; // Zod 4

const base = z.object({
  title: z.string(),
  summary: z.string(),
  tags: z.array(z.string()).default([]),
  updated: z.coerce.date(),
});

const experience = defineCollection({
  loader: glob({ pattern: "*.md", base: "./wiki/public/experience" }),
  schema: base.extend({
    type: z.literal("experience"),
    company: z.string(),
    role: z.string(),
    period: z.string(),
  }),
});

// projects, skills, education y profile siguen el mismo patrón
export const collections = { experience /* , ... */ };
```

| Origen | Colección | Sección |
| --- | --- | --- |
| `wiki/public/profile.md` | `profile` | `intro` |
| `wiki/public/experience/` | `experience` | `experience` |
| `wiki/public/education/` | `education` | `education` |
| `wiki/public/projects/` | `projects` | *(sección por crear)* |
| `wiki/public/skills/` | `skills` | *(dentro de `intro` o en una sección propia)* |

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

### Estado (2026-10-01)

| Área | Estado |
| --- | --- |
| Configuración Astro + Tailwind + i18n | Hecha |
| Dependencias | Actualizadas a Astro 7.3 y Tailwind 4.3; build y servidor de desarrollo verificados |
| Layout | Mínimo: `lang="en"` fijo, sin metadatos. El `<title>` usa un `<slot>`, que no funciona dentro de `<title>`, así que sale vacío |
| Secciones | Marcadores de posición (bloque de color a pantalla completa) |
| `Header`, `ProfileAvatar` | Archivos vacíos |
| Página `/en/` | No importa `global.css`, así que se queda sin Tailwind |
| Wiki y agente | Estructura, regla y skills listas; sin contenido ingerido |
| Content collections | No existen |
| Despliegue | No configurado (`site` sin definir, sin workflow) |

### Fases

1. **Contenido inicial.** Dejar el CV y otras fuentes en `raw/` y ejecutar `/ingest`. Sin
   datos reales no tiene sentido diseñar las secciones.
2. **Base del sitio.**
   - Importar `global.css` en el layout, no en cada página.
   - `lang` y `<title>` según el idioma, y metadatos básicos (description, Open Graph).
   - Una única composición de página compartida por `/` y `/en/`, para no duplicarla.
   - Diccionario de textos de interfaz (`src/i18n/`).
3. **Contrato de contenido.** `src/content.config.ts` con las colecciones y los esquemas de
   §4.2; la build falla si la wiki no cumple el contrato.
4. **Secciones.** Implementar `intro`, `experience`, `education` y `contact` con datos de las
   colecciones, crear `projects` y decidir dónde van `skills`. `Header` con navegación y
   selector de idioma.
5. **Diseño visual.** Dirección de arte, tipografía y tokens de color en `@theme`.
6. **Despliegue.** `site` en `astro.config.mjs` y workflow de GitHub Actions a GitHub Pages,
   con `astro check` y `astro build` en CI.

### Cuestiones abiertas

- **Contenido en inglés.** La wiki está en español. Opciones: campos traducidos en el
  frontmatter (`summary_en`), páginas paralelas por idioma o traducción en build. Hay que
  decidirlo antes de la fase 3, porque afecta al esquema.
- **Cuerpo de las páginas.** ¿El portfolio usa solo el frontmatter o también renderiza el
  cuerpo? Si lo renderiza, hay que quitar o transformar `## Relacionado`, `## Fuentes` y los
  enlaces relativos entre páginas de la wiki.
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

## 9. Referencias

- Andrej Karpathy, *LLM Wiki*: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- Artículo: https://medium.com/@urvvil08/andrej-karpathys-llm-wiki-create-your-own-knowledge-base-8779014accd5
- Astro: [content collections](https://docs.astro.build/en/guides/content-collections/), [i18n](https://docs.astro.build/en/guides/internationalization/), [despliegue en GitHub Pages](https://docs.astro.build/en/guides/deploy/github/)
- Tailwind CSS 4: [configuración con `@theme`](https://tailwindcss.com/docs/theme)
- Claude Code: [memoria y reglas](https://code.claude.com/docs/en/memory), [skills](https://code.claude.com/docs/en/skills), [permisos](https://code.claude.com/docs/en/settings)
