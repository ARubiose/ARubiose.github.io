# Diseño: contenido del portfolio, i18n y tests

- Fecha: 2026-10-02
- Estado: implementada
- Alcance: fases 1–4 de la hoja de ruta ([tasks.md](../../tasks.md))
  (contenido inicial, base del sitio, contrato de contenido y secciones), más la estrategia
  de tests.

## 1. Objetivo

Portfolio de **marca personal**: cuenta quién es el autor y a qué se dedica ahora, en
español (`/`) e inglés (`/en/`). Todo el contenido sale de `wiki/public/`; en `src/` solo
hay maquetación, lógica de presentación y los textos de interfaz.

**Criterios de éxito**

- `/` y `/en/` muestran perfil, experiencia, proyectos, habilidades, formación y contacto
  con datos reales de la wiki.
- Añadir un proyecto, un puesto o una habilidad es añadir una página a la wiki; no se toca
  `src/`.
- Una página de la wiki que no cumple el contrato (campo o traducción ausente) rompe
  `pnpm test` y `pnpm build`.
- Ningún dato privado (regla de privacidad de la wiki) aparece en `wiki/public/` ni en
  `dist/`.

**Fuera de alcance** (fases posteriores): diseño visual (tipografía, color, dirección de
arte), despliegue a GitHub Pages y `hreflang`, CV descargable. La maquetación de esta fase
es sobria y funcional con Tailwind.

## 2. Modelo de contenido

### 2.1 Principios

- **La web usa solo el frontmatter.** El cuerpo de cada página es prosa de wiki (contexto,
  `## Relacionado`, `## Fuentes`) para el humano y el agente; no se renderiza.
- **Traducción en el mismo archivo.** Todo texto visible en la web tiene su versión inglesa
  en un bloque `en:` del frontmatter. Los nombres propios (empresas, instituciones,
  tecnologías) no se traducen. El español es el idioma base.
- **Fechas estructuradas.** `start` y `end` en formato `AAAA-MM` (o `AAAA` si la fuente
  solo da el año); `end: null` significa «actualidad». Sustituyen al campo libre `period`.

### 2.2 Campos

Comunes a todas las colecciones públicas (además de los obligatorios de la regla:
`type`, `sources`, `updated`):

| Campo | Tipo | Traducible (`en:`) |
| --- | --- | --- |
| `title` | string | Sí, salvo nombres propios |
| `summary` | string | Sí |
| `tags` | string[] | No |

Por colección:

| Colección | Origen | Campos propios | Traducibles |
| --- | --- | --- | --- |
| `profile` | `wiki/public/profile.md` | `name`, `headline`, `location`, `links: { email, linkedin, github }` | `headline`, `summary` |
| `experience` | `wiki/public/experience/*.md` | `company`, `role`, `start`, `end`, `highlights: string[]` | `role`, `summary`, `highlights` |
| `projects` | `wiki/public/projects/*.md` | `repo`, `url?`, `status` (`active` · `paused` · `done`), `start`, `highlights` | `title`, `summary`, `highlights` |
| `skills` | `wiki/public/skills/*.md` | `category` (`backend` · `ai` · `frontend` · `devops` · `security`) | `summary` |
| `education` | `wiki/public/education/*.md` | `institution`, `degree`, `start`, `end`, `grade?` | `degree`, `summary` |

Validaciones además de los tipos: `end ≥ start`; si un campo traducible existe en español,
existe en `en:`; `highlights` y `en.highlights` tienen la misma longitud; URLs válidas en
`links`, `repo` y `url`.

Ejemplo:

```yaml
---
title: Empresa Ejemplo
type: experience
company: Empresa Ejemplo
role: Ingeniero de software
start: 2024-03
end: null
summary: Una frase sobre el puesto.
highlights:
  - Logro uno.
  - Logro dos.
tags: [backend, python]
en:
  role: Software engineer
  summary: One sentence about the role.
  highlights:
    - Achievement one.
    - Achievement two.
sources: [raw/cv.pdf, "humano (2026-10-02)"]
updated: 2026-10-02
---
```

### 2.3 Orden de presentación

- `experience`, `education`, `projects`: por `start` descendente; a igualdad, las que
  tienen `end: null` primero.
- `skills`: agrupadas por `category` en el orden de la tabla anterior; dentro de cada
  grupo, por `title`.

### 2.4 Imágenes

La foto de perfil vive en `src/assets/images/profile.jpg` y la usa la sección `intro` con
`<Image>`; no forma parte del frontmatter. Las imágenes de contenido (logos, capturas)
quedan fuera de esta fase.

## 3. Arquitectura del sitio

### 3.1 Composición

```text
pages/index.astro     ─┐ locale "es"
pages/en/index.astro  ─┴─▶ HomePage.astro ─▶ Layout.astro (lang, <title>, meta, global.css)
                                              ├─ Header          (navegación + selector ES/EN)
                                              ├─ sections/intro       ← profile
                                              ├─ sections/experience  ← experience
                                              ├─ sections/projects    ← projects   (nueva)
                                              ├─ sections/skills      ← skills     (nueva)
                                              ├─ sections/education   ← education
                                              └─ sections/contact     ← profile.links
```

- Las dos páginas de idioma son triviales: montan `HomePage`, que contiene la composición
  única. Cada página pasa su `locale` a `HomePage`.
- **`HomePage`** lee las colecciones (`getCollection` / `getEntry`) y `buildHomeView` las
  localiza, ordena y formatea; las **secciones** reciben props ya localizadas (así se prueban
  con la Container API).
- **Componentes** reciben props ya localizadas y no conocen la fuente:
  `TimelineItem` (experiencia y formación), `ProjectCard`, `SkillGroup`, `ProfileAvatar`,
  `LanguageSwitcher`.
- `global.css` se importa en `Layout.astro`, no en cada página.

### 3.2 Módulos de lógica (testeables sin Astro)

| Módulo | Responsabilidad |
| --- | --- |
| `src/lib/schemas.ts` | Esquemas Zod de cada colección, exportados |
| `src/lib/home.ts` | `buildHomeView`: datos de la wiki → vista localizada de la portada |
| `src/content.config.ts` | Define las colecciones con `glob()` sobre `wiki/public/` y los esquemas |
| `src/i18n/ui.ts` | Diccionario de textos de interfaz por idioma (tipado `as const`) |
| `src/i18n/utils.ts` | `useTranslations(locale)`, `localize(entry, locale)` |
| `src/lib/dates.ts` | `formatPeriod(start, end, locale)` con `Intl.DateTimeFormat` |
| `src/lib/order.ts` | Ordenación por fecha y agrupación de skills |

### 3.3 Internacionalización

- **Rutas:** i18n nativo de Astro (ya configurado): `es` por defecto sin prefijo, `en` en
  `/en/`. `getRelativeLocaleUrl()` para el selector de idioma.
- **Textos de interfaz:** diccionario propio en `src/i18n/ui.ts` siguiendo la receta oficial
  de Astro; `useTranslations` vuelve al español si falta una clave.
- **Contenido:** bloque `en:` de la wiki vía `localize`.
- No se usan `fallback`, `Astro.preferredLocale` ni `domains`: el sitio es estático y ambos
  idiomas existen siempre.
- **Paraglide JS** se descarta por ahora (no hay JS de cliente que optimizar, solapa el
  routing de Astro y añade herramientas a la plantilla). Pasar a él es una opción si entra
  un tercer idioma, el texto de interfaz crece a decenas de cadenas o se necesitan plurales;
  el cambio quedaría limitado a `ui.ts` y sus usos.

## 4. Cambios en la wiki

### 4.1 Regla (`.claude/rules/wiki.md`)

- Bloque `en:` obligatorio para los campos traducibles de las páginas públicas.
- `start`/`end` sustituyen a `period`.
- Campos nuevos: `highlights`, `category`, `links`, `name`, `headline`, `location`,
  `company`, `role`, `institution`, `degree`, `grade`, `repo`, `url`, `status`.
- Principio de que el portfolio usa solo el frontmatter.

### 4.2 Primera ingesta

Una sola operación `/ingest` con todas las fuentes iniciales (CV, perfil de LinkedIn en
PDF, declaraciones del humano y perfil público de GitHub validado), para resolver los
conflictos de una vez:

- **Prioridad ante conflictos:** manda el CV. LinkedIn aporta precisión (meses) donde no lo
  contradice. Cada conflicto y su resolución se registra en una nota privada.
- **Páginas públicas:** `profile.md`, una por puesto, una por estudio o certificación, una
  por tecnología o dominio relevante y el proyecto de esta plantilla.
- **Páginas privadas:** datos personales (los que la regla prohíbe publicar) y la nota de
  conflictos entre fuentes.
- El resumen del perfil se redacta de nuevo: los extractos de las fuentes describen un
  puesto anterior como actual.

## 5. Estrategia de tests

Se desarrolla con TDD: primero el test, luego la implementación.

| Nivel | Herramienta | Qué cubre |
| --- | --- | --- |
| Unitario | Vitest | `localize`, `formatPeriod`, `useTranslations`, ordenación y agrupación |
| Contrato | Vitest + Zod | Fixtures válidos/inválidos contra cada esquema; validación de todo `wiki/public/` real |
| Componentes | Vitest + Container API de Astro | Cada sección renderizada con datos de prueba en ambos idiomas y con listas vacías |
| E2E | Playwright sobre `dist/` | `/` y `/en/`: carga, `lang`, secciones con contenido, selector de idioma, enlaces internos, axe sin violaciones graves |
| Privacidad | Vitest | Patrones de teléfono, dirección y fecha de nacimiento en `wiki/public/` y `dist/` |

Detalles:

- **Vitest** usa `getViteConfig()` de Astro para compartir alias y configuración.
- **Fixtures** en `tests/fixtures/wiki/`, separados de la wiki real; cada caso inválido
  documenta qué regla rompe (`missing-en-summary.md`, `end-before-start.md`…).
- **Container API:** en Astro 7.3 sigue siendo `experimental_AstroContainer`. Se usa con la
  versión de Astro fijada; si una actualización la rompe, ese nivel se apoya en E2E hasta
  adaptarlo.
- **Privacidad:** patrones genéricos versionados. Si existe `wiki/private/forbidden-strings.txt`
  (una cadena por línea, ignorado por git), el test busca también esas cadenas; los valores concretos nunca están en
  el repo. Complementa a `/lint`, que detecta las fugas que un patrón no ve.
- **E2E:** los enlaces externos se comprueban por formato, sin peticiones de red.

**Scripts**

| Script | Hace |
| --- | --- |
| `pnpm test` | Unitarios, contrato, componentes y privacidad |
| `pnpm test:e2e` | `astro build` + Playwright |
| `pnpm check` | `astro check` |

En la fase de despliegue, el workflow de CI ejecuta `check`, `test` y `test:e2e` antes de
publicar.

## 6. Orden de implementación

1. Infraestructura de tests (Vitest, Playwright, scripts).
2. Esquemas Zod y tests de contrato con fixtures.
3. Actualización de la regla de la wiki.
4. Primera ingesta; el test de contrato sobre la wiki real pasa.
5. `localize`, `formatPeriod`, `useTranslations`, ordenación (TDD).
6. Base del sitio: `Layout`, `HomePage`, `Header`, selector de idioma.
7. Secciones y componentes (TDD con Container API).
8. E2E, accesibilidad y test de privacidad.
9. Actualizar `docs/system-design.md` (estado, decisiones, cuestiones resueltas).

## 7. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La Container API cambia en una versión menor | Versión de Astro fijada; E2E como red |
| El agente olvida traducciones | Esquema Zod + test de contrato sobre la wiki real |
| Fuga de un dato privado | Regla de privacidad, `/lint` y test de patrones |
| Dos idiomas desincronizados en un mismo archivo | `highlights` y `en.highlights` con la misma longitud; revisión en cada ingesta |
