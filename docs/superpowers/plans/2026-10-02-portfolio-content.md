# Contenido del portfolio, i18n y tests — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que `/` y `/en/` muestren perfil, experiencia, proyectos, habilidades, formación y contacto leyendo solo el frontmatter de `wiki/public/`, con el contrato validado por Zod y cubierto por tests unitarios, de contrato, de componentes, de privacidad y E2E.

**Architecture:** Los esquemas Zod (`src/lib/schemas.ts`) son el contrato entre la wiki y Astro, y los usan tanto `src/content.config.ts` como los tests. `HomePage.astro` carga las colecciones, las pasa por funciones puras (`localize`, `formatPeriod`, ordenación) y entrega a las secciones props ya localizadas. Las secciones y componentes no leen colecciones, así que se renderizan en tests con la Container API.

**Tech Stack:** Astro 7.3 (content collections con `glob()`, i18n nativo, Zod 4 vía `astro/zod`), Tailwind 4.3, TypeScript estricto, Vitest 5, Playwright 1.63 + @axe-core/playwright, gray-matter, pnpm 11, Node 24.

**Spec:** [docs/superpowers/specs/2026-10-02-portfolio-content-design.md](../specs/2026-10-02-portfolio-content-design.md)

## Global Constraints

- Node 24 (`.nvmrc`). Antes de cualquier comando: `source ~/.nvm/nvm.sh && nvm use`. La shell arranca en Node 18 y Astro 7 exige ≥ 22.12.
- pnpm 11: si una dependencia nueva necesita scripts de instalación, se aprueba con `pnpm approve-builds` y queda en `pnpm-workspace.yaml`.
- Idiomas: `es` (por defecto, sin prefijo, `/`) y `en` (`/en/`). Tipo `Locale = "es" | "en"`.
- El contenido sale **solo** de `wiki/public/`. Lo único escrito a mano en `src/` es el diccionario de interfaz `src/i18n/ui.ts`.
- La web usa solo el frontmatter; el cuerpo Markdown de la wiki no se renderiza.
- Fechas `start`/`end` en formato `AAAA-MM` o `AAAA`; `end: null` = actualidad.
- Nada de `raw/` ni `wiki/private/` en archivos versionados ni en mensajes de commit. Los tests de privacidad no contienen valores personales reales.
- Nombres de archivos en inglés; textos y comentarios de documentación en español; código (identificadores) en inglés.
- Commits como `ARubiose` (identidad personal), terminando con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Paraglide JS: no se usa. Queda anotado como opción en `docs/system-design.md` (Task 12).

## Review Focus

- **Años sin mes en YAML** (`start: 2015`): YAML los lee como número, no como string. Esperado: se aceptan y se muestran como «2015». Test en Task 3 (`yearMonth acepta números`) y Task 4 (fixture `education-year-only.md`).
- **`start` y `end` en el mismo año, uno sin mes** (`start: 2022-06`, `end: 2022`). Esperado: es válido (no «fin antes que inicio») y se muestra «jun 2022 – 2022». Test en Task 3 (`compareYearMonth` por año) y Task 4.
- **Colección vacía** (aún no hay proyectos). Esperado: la sección no se renderiza y el menú no enlaza a ella. Test en Task 9 (`Projects` con `items: []`) y Task 8 (`Header` con secciones filtradas).
- **Texto `undefined` o `[object Object]` en la página** por un campo localizado mal. Esperado: nunca aparece. Test E2E en Task 11.
- **Número que parece un teléfono en el HTML generado** (hashes de assets). Esperado: el test de privacidad mira solo el texto visible, no atributos ni scripts. Test en Task 10 (`ignora atributos y scripts`).

---

## Mapa de archivos

| Archivo | Responsabilidad |
| --- | --- |
| `vitest.config.ts` | Vitest con `getViteConfig()` de Astro |
| `playwright.config.ts` | E2E sobre `astro preview` |
| `src/i18n/ui.ts` | Diccionario de interfaz y tipo `Locale` |
| `src/i18n/utils.ts` | `useTranslations`, `localize` |
| `src/lib/dates.ts` | `yearMonth` (parseo), `compareYearMonth`, `formatPeriod` |
| `src/lib/order.ts` | `sortByStartDesc`, `groupSkills` |
| `src/lib/schemas.ts` | Esquemas Zod de las cinco colecciones y sus tipos |
| `src/lib/home.ts` | `buildHomeView` (puro) |
| `src/content.config.ts` | Colecciones sobre `wiki/public/` |
| `src/layouts/Layout.astro` | `<html lang>`, `<head>`, `global.css` |
| `src/layouts/HomePage.astro` | Carga colecciones y compone la página |
| `src/components/Header.astro` | Navegación + selector |
| `src/components/LanguageSwitcher.astro` | Enlaces ES/EN |
| `src/components/ProfileAvatar.astro` | Foto con `<Image>` |
| `src/components/TimelineItem.astro` | Elemento de experiencia/formación |
| `src/components/ProjectCard.astro` | Tarjeta de proyecto |
| `src/components/SkillGroup.astro` | Grupo de habilidades |
| `src/sections/*.astro` | `intro`, `experience`, `projects` (nueva), `skills` (nueva), `education`, `contact` |
| `tests/unit/` | Unitarios |
| `tests/content/` | Contrato (fixtures y wiki real) |
| `tests/components/` | Container API |
| `tests/privacy/` | Detector y escaneo |
| `tests/e2e/` | Playwright |
| `tests/fixtures/wiki/` | Páginas de prueba válidas e inválidas |

Las secciones reciben datos por props en lugar de leer colecciones (cambio menor respecto a la spec §3.1, que se actualiza en Task 12): así se pueden probar con la Container API sin `astro:content`.

---

### Task 1: Infraestructura de tests

**Files:**
- Modify: `package.json`, `tsconfig.json`, `pnpm-workspace.yaml` (si `approve-builds` lo pide)
- Create: `vitest.config.ts`, `playwright.config.ts`, `tests/components/smoke.test.ts`, `tests/fixtures/components/Hello.astro`, `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Produces: scripts `pnpm test`, `pnpm test:e2e`, `pnpm check`; alias `@lib/*` → `src/lib/*`, `@i18n/*` → `src/i18n/*`.

- [ ] **Step 1: Instalar dependencias de desarrollo**

```bash
source ~/.nvm/nvm.sh && nvm use
pnpm add -D vitest @playwright/test @axe-core/playwright gray-matter @astrojs/check typescript
pnpm exec playwright install chromium
```

Si pnpm avisa de scripts de instalación no aprobados, ejecutar `pnpm approve-builds`, aprobar solo los paquetes listados y comprobar que `pnpm-workspace.yaml` los recoge. Si `playwright install` pide dependencias del sistema, ejecutar `pnpm exec playwright install-deps chromium` (requiere sudo; pedirlo al humano).

- [ ] **Step 2: Scripts y alias**

En `package.json`, dentro de `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test",
"check": "astro check"
```

En `tsconfig.json`, añadir a `compilerOptions.paths` (y quitar la coma final tras el último elemento, que hoy deja JSON no estricto):

```json
"@lib/*": ["src/lib/*"],
"@i18n/*": ["src/i18n/*"]
```

- [ ] **Step 3: Configurar Vitest**

`vitest.config.ts`:

```ts
/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

export default getViteConfig({
    test: {
        include: ["tests/**/*.test.ts"],
        exclude: ["tests/e2e/**", "node_modules/**"],
    },
});
```

- [ ] **Step 4: Test de humo de la Container API**

`tests/fixtures/components/Hello.astro`:

```astro
---
interface Props {
    name: string;
}
const { name } = Astro.props;
---

<p>Hola, {name}</p>
```

`tests/components/smoke.test.ts`:

```ts
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { expect, test } from "vitest";
import Hello from "../fixtures/components/Hello.astro";

test("la Container API renderiza un componente con props", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Hello, { props: { name: "Ada" } });
    expect(html).toContain("Hola, Ada");
});
```

- [ ] **Step 5: Ejecutar**

Run: `pnpm test`
Expected: 1 test PASS. Si la Container API falla con Vitest 5, probar `pnpm add -D vitest@^4` y volver a ejecutar; anotar la versión que funciona en el commit.

- [ ] **Step 6: Configurar Playwright y test de humo**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

const PORT = 4322;

export default defineConfig({
    testDir: "tests/e2e",
    use: { baseURL: `http://127.0.0.1:${PORT}` },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: {
        command: `pnpm build && pnpm preview --host 127.0.0.1 --port ${PORT}`,
        url: `http://127.0.0.1:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
```

`tests/e2e/smoke.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("la portada responde", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
});
```

Añadir a `.gitignore`:

```gitignore
# tests
test-results/
playwright-report/
```

- [ ] **Step 7: Ejecutar E2E y check**

Run: `pnpm test:e2e`
Expected: 1 test PASS.

Run: `pnpm check`
Expected: 0 errors (pueden aparecer hints).

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json vitest.config.ts playwright.config.ts .gitignore tests/
git commit -m "test: Add Vitest, Container API and Playwright infrastructure"
```

---

### Task 2: Diccionario de interfaz y localización

**Files:**
- Create: `src/i18n/ui.ts`, `src/i18n/utils.ts`
- Test: `tests/unit/i18n.test.ts`

**Interfaces:**
- Produces:
  - `type Locale = "es" | "en"`, `const locales: readonly Locale[]`, `const defaultLocale: Locale`
  - `type UiKey = keyof typeof ui.es`
  - `useTranslations(locale: Locale): (key: UiKey) => string`
  - `type Localized<T> = Omit<T, "en">`
  - `localize<T extends { en: object }>(entry: T, locale: Locale): Localized<T>`

- [ ] **Step 1: Test que falla**

`tests/unit/i18n.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { ui } from "@i18n/ui";
import { localize, useTranslations } from "@i18n/utils";

describe("useTranslations", () => {
    test("devuelve la cadena del idioma pedido", () => {
        expect(useTranslations("es")("section.experience")).toBe("Experiencia");
        expect(useTranslations("en")("section.experience")).toBe("Experience");
    });

    test("ambos idiomas tienen exactamente las mismas claves", () => {
        expect(Object.keys(ui.en).sort()).toEqual(Object.keys(ui.es).sort());
    });
});

describe("localize", () => {
    const entry = {
        company: "Acme",
        role: "Ingeniero",
        highlights: ["Uno"],
        en: { role: "Engineer", highlights: ["One"] },
    };

    test("en español quita el bloque en y deja los campos originales", () => {
        expect(localize(entry, "es")).toEqual({
            company: "Acme",
            role: "Ingeniero",
            highlights: ["Uno"],
        });
    });

    test("en inglés sustituye los campos traducidos y conserva los propios", () => {
        expect(localize(entry, "en")).toEqual({
            company: "Acme",
            role: "Engineer",
            highlights: ["One"],
        });
    });

    test("no muta la entrada", () => {
        localize(entry, "en");
        expect(entry.role).toBe("Ingeniero");
    });
});
```

- [ ] **Step 2: Comprobar que falla**

Run: `pnpm test tests/unit/i18n.test.ts`
Expected: FAIL, no se resuelve `@i18n/ui`.

- [ ] **Step 3: Implementar**

`src/i18n/ui.ts`:

```ts
export const locales = ["es", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es";

export const ui = {
    es: {
        "nav.label": "Secciones",
        "section.experience": "Experiencia",
        "section.projects": "Proyectos",
        "section.skills": "Habilidades",
        "section.education": "Formación",
        "section.contact": "Contacto",
        "period.present": "actualidad",
        "skills.category.backend": "Backend",
        "skills.category.ai": "Inteligencia artificial",
        "skills.category.frontend": "Frontend y móvil",
        "skills.category.devops": "DevOps y calidad",
        "skills.category.security": "Ciberseguridad",
        "projects.repo": "Código",
        "projects.visit": "Ver proyecto",
        "projects.status.active": "En desarrollo",
        "projects.status.paused": "En pausa",
        "projects.status.done": "Terminado",
        "education.grade": "Nota media",
        "contact.email": "Email",
        "contact.linkedin": "LinkedIn",
        "contact.github": "GitHub",
        "lang.label": "Idioma",
        "lang.es": "Español",
        "lang.en": "English",
    },
    en: {
        "nav.label": "Sections",
        "section.experience": "Experience",
        "section.projects": "Projects",
        "section.skills": "Skills",
        "section.education": "Education",
        "section.contact": "Contact",
        "period.present": "present",
        "skills.category.backend": "Backend",
        "skills.category.ai": "Artificial intelligence",
        "skills.category.frontend": "Frontend & mobile",
        "skills.category.devops": "DevOps & quality",
        "skills.category.security": "Cybersecurity",
        "projects.repo": "Code",
        "projects.visit": "View project",
        "projects.status.active": "In progress",
        "projects.status.paused": "Paused",
        "projects.status.done": "Finished",
        "education.grade": "Average grade",
        "contact.email": "Email",
        "contact.linkedin": "LinkedIn",
        "contact.github": "GitHub",
        "lang.label": "Language",
        "lang.es": "Español",
        "lang.en": "English",
    },
} as const satisfies Record<Locale, Record<string, string>>;

export type UiKey = keyof (typeof ui)["es"];
```

`src/i18n/utils.ts`:

```ts
import { defaultLocale, ui, type Locale, type UiKey } from "./ui";

export function useTranslations(locale: Locale) {
    return (key: UiKey): string => ui[locale][key] ?? ui[defaultLocale][key];
}

export type Localized<T> = Omit<T, "en">;

export function localize<T extends { en: object }>(entry: T, locale: Locale): Localized<T> {
    const { en, ...base } = entry;
    return (locale === "en" ? { ...base, ...en } : base) as Localized<T>;
}
```

- [ ] **Step 4: Comprobar que pasa**

Run: `pnpm test tests/unit/i18n.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/i18n tests/unit/i18n.test.ts
git commit -m "feat(i18n): Add UI dictionary and content localization helpers"
```

---

### Task 3: Fechas (`yearMonth`, comparación y formato)

**Files:**
- Create: `src/lib/dates.ts`
- Test: `tests/unit/dates.test.ts`

**Interfaces:**
- Consumes: `Locale`, `useTranslations` (Task 2)
- Produces:
  - `yearMonth`: esquema Zod que acepta `string | number` y devuelve `string` con formato `AAAA` o `AAAA-MM`
  - `compareYearMonth(a: string, b: string): number` (negativo si `a` es anterior; si a uno le falta el mes, compara solo por año)
  - `formatPeriod(start: string, end: string | null, locale: Locale): string`

- [ ] **Step 1: Test que falla**

`tests/unit/dates.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { compareYearMonth, formatPeriod, yearMonth } from "@lib/dates";

describe("yearMonth", () => {
    test("acepta AAAA-MM y AAAA como string", () => {
        expect(yearMonth.parse("2026-06")).toBe("2026-06");
        expect(yearMonth.parse("2015")).toBe("2015");
    });

    test("acepta números (YAML lee 2015 como número)", () => {
        expect(yearMonth.parse(2015)).toBe("2015");
    });

    test("rechaza meses imposibles y otros formatos", () => {
        expect(yearMonth.safeParse("2026-13").success).toBe(false);
        expect(yearMonth.safeParse("2026-6").success).toBe(false);
        expect(yearMonth.safeParse("junio 2026").success).toBe(false);
    });
});

describe("compareYearMonth", () => {
    test("ordena por año y mes", () => {
        expect(compareYearMonth("2022-08", "2026-06")).toBeLessThan(0);
        expect(compareYearMonth("2026-06", "2026-01")).toBeGreaterThan(0);
        expect(compareYearMonth("2026-06", "2026-06")).toBe(0);
    });

    test("si a uno le falta el mes, compara solo el año", () => {
        expect(compareYearMonth("2022", "2022-06")).toBe(0);
        expect(compareYearMonth("2021", "2022-06")).toBeLessThan(0);
    });
});

describe("formatPeriod", () => {
    test("meses abreviados según el idioma", () => {
        expect(formatPeriod("2022-08", "2026-06", "es")).toBe("ago 2022 – jun 2026");
        expect(formatPeriod("2022-08", "2026-06", "en")).toBe("Aug 2022 – Jun 2026");
    });

    test("end null es actualidad", () => {
        expect(formatPeriod("2026-06", null, "es")).toBe("jun 2026 – actualidad");
        expect(formatPeriod("2026-06", null, "en")).toBe("Jun 2026 – present");
    });

    test("solo años", () => {
        expect(formatPeriod("2015", "2020", "es")).toBe("2015 – 2020");
    });

    test("mismo inicio y fin se muestra una vez", () => {
        expect(formatPeriod("2017", "2017", "en")).toBe("2017");
    });

    test("mezcla de año y año-mes", () => {
        expect(formatPeriod("2022-06", "2022", "es")).toBe("jun 2022 – 2022");
    });
});
```

- [ ] **Step 2: Comprobar que falla**

Run: `pnpm test tests/unit/dates.test.ts`
Expected: FAIL, no se resuelve `@lib/dates`.

- [ ] **Step 3: Implementar**

`src/lib/dates.ts`:

```ts
import { z } from "astro/zod";
import type { Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";

const YEAR_MONTH = /^\d{4}(-(0[1-9]|1[0-2]))?$/;

export const yearMonth = z
    .union([z.string(), z.number()])
    .transform(String)
    .pipe(z.string().regex(YEAR_MONTH, "Formato esperado: AAAA o AAAA-MM"));

function parts(value: string): { year: number; month?: number } {
    const [year, month] = value.split("-").map(Number);
    return month ? { year, month } : { year };
}

export function compareYearMonth(a: string, b: string): number {
    const pa = parts(a);
    const pb = parts(b);
    if (pa.year !== pb.year) return pa.year - pb.year;
    if (pa.month === undefined || pb.month === undefined) return 0;
    return pa.month - pb.month;
}

function formatOne(value: string, locale: Locale): string {
    const { year, month } = parts(value);
    if (!month) return String(year);
    return new Intl.DateTimeFormat(locale, {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function formatPeriod(start: string, end: string | null, locale: Locale): string {
    const from = formatOne(start, locale);
    if (end === start) return from;
    const to = end === null ? useTranslations(locale)("period.present") : formatOne(end, locale);
    return `${from} – ${to}`;
}
```

- [ ] **Step 4: Comprobar que pasa**

Run: `pnpm test tests/unit/dates.test.ts`
Expected: 10 tests PASS. Si fallan solo los textos de meses, comprobar con `node -e` qué devuelve `Intl` en Node 24 (se verificó: `jun 2026`, `sept 2026`, `Jun 2026`, `Sep 2026`) y que se ejecuta con `nvm use`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dates.ts tests/unit/dates.test.ts
git commit -m "feat(lib): Add year-month parsing, comparison and period formatting"
```

---

### Task 4: Esquemas Zod y tests de contrato con fixtures

**Files:**
- Create: `src/lib/schemas.ts`, `tests/content/schemas.test.ts`, `tests/support/frontmatter.ts`, fixtures en `tests/fixtures/wiki/{valid,invalid}/`

**Interfaces:**
- Consumes: `yearMonth`, `compareYearMonth` (Task 3)
- Produces:
  - `profileSchema`, `experienceSchema`, `projectSchema`, `skillSchema`, `educationSchema`
  - `skillCategories = ["backend", "ai", "frontend", "devops", "security"] as const`, `type SkillCategory`
  - `projectStatuses = ["active", "paused", "done"] as const`
  - Tipos: `ProfileData`, `ExperienceData`, `ProjectData`, `SkillData`, `EducationData` (= `z.output<typeof …Schema>`)
  - `schemasByType: Record<"profile" | "experience" | "project" | "skill" | "education", ZodType>`
  - `readFrontmatter(path: string): Record<string, unknown>` (en `tests/support/frontmatter.ts`)

- [ ] **Step 1: Fixtures válidos**

`tests/fixtures/wiki/valid/profile.md`:

```markdown
---
title: Perfil
type: profile
name: Ada Lovelace
headline: Ingeniera de software
location: Londres
summary: Programadora del motor analítico.
links:
  email: ada@example.com
  linkedin: https://www.linkedin.com/in/ada-example/
  github: https://github.com/ada-example
tags: []
en:
  headline: Software engineer
  summary: Analytical engine programmer.
sources: ["humano (2026-10-02)"]
updated: 2026-10-02
---

# Perfil
```

`tests/fixtures/wiki/valid/experience.md`:

```markdown
---
title: Acme
type: experience
company: Acme
role: Ingeniera de software
start: 2022-08
end: null
summary: Backend en Python.
highlights:
  - Diseño de la API.
tags: [backend]
en:
  role: Software engineer
  summary: Python backend.
  highlights:
    - API design.
sources: [raw/cv.pdf]
updated: 2026-10-02
---
```

`tests/fixtures/wiki/valid/project.md`:

```markdown
---
title: Este portfolio
type: project
repo: https://github.com/ada-example/portfolio
status: active
start: 2026-10
summary: Portfolio generado desde una wiki.
highlights: []
tags: [astro]
en:
  title: This portfolio
  summary: Portfolio generated from a wiki.
  highlights: []
sources: ["humano (2026-10-02)"]
updated: 2026-10-02
---
```

`tests/fixtures/wiki/valid/skill.md`:

```markdown
---
title: Python
type: skill
category: backend
summary: Lenguaje principal.
tags: []
en:
  summary: Main language.
sources: [raw/cv.pdf]
updated: 2026-10-02
---
```

`tests/fixtures/wiki/valid/education-year-only.md`:

```markdown
---
title: Doble grado
type: education
institution: Universidad Ejemplo
degree: Doble grado en Informática y ADE
start: 2015
end: 2020
grade: 8.55
summary: Grado de cinco años.
tags: []
en:
  degree: Double degree in Computer Engineering and Business
  summary: Five-year degree.
sources: [raw/cv.pdf]
updated: 2026-10-02
---
```

`tests/fixtures/wiki/valid/education-mixed-precision.md`: igual que el anterior pero con `start: 2022-06` y `end: 2022` y sin `grade`.

- [ ] **Step 2: Fixtures inválidos**

Cada uno es una copia de `valid/experience.md` (o del válido indicado) con un solo cambio, y su nombre dice qué regla rompe:

| Archivo | Base | Cambio |
| --- | --- | --- |
| `invalid/missing-en-summary.md` | experience | quitar `en.summary` |
| `invalid/missing-en-block.md` | experience | quitar todo el bloque `en:` |
| `invalid/end-before-start.md` | experience | `start: 2026-06`, `end: 2022-08` |
| `invalid/bad-month.md` | experience | `start: 2026-13` |
| `invalid/highlights-mismatch.md` | experience | `en.highlights` con dos elementos |
| `invalid/unknown-category.md` | skill | `category: databases` |
| `invalid/bad-repo-url.md` | project | `repo: github.com/sin-esquema` |
| `invalid/bad-email.md` | profile | `links.email: ada-at-example` |
| `invalid/no-sources.md` | experience | `sources: []` |

Escribir cada archivo completo (frontmatter entero con el cambio aplicado).

- [ ] **Step 3: Lector de frontmatter para tests**

`tests/support/frontmatter.ts`:

```ts
import { readFileSync } from "node:fs";
import matter from "gray-matter";

export function readFrontmatter(path: string): Record<string, unknown> {
    return matter(readFileSync(path, "utf8")).data;
}
```

- [ ] **Step 4: Test que falla**

`tests/content/schemas.test.ts`:

```ts
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { schemasByType } from "@lib/schemas";
import { readFrontmatter } from "../support/frontmatter";

const FIXTURES = join(import.meta.dirname, "../fixtures/wiki");

function validate(path: string) {
    const data = readFrontmatter(path);
    const schema = schemasByType[data.type as keyof typeof schemasByType];
    if (!schema) throw new Error(`type desconocido en ${path}: ${String(data.type)}`);
    return schema.safeParse(data);
}

describe("fixtures válidos", () => {
    for (const file of readdirSync(join(FIXTURES, "valid"))) {
        test(file, () => {
            const result = validate(join(FIXTURES, "valid", file));
            expect(result.error?.issues ?? []).toEqual([]);
        });
    }
});

describe("fixtures inválidos", () => {
    for (const file of readdirSync(join(FIXTURES, "invalid"))) {
        test(file, () => {
            expect(validate(join(FIXTURES, "invalid", file)).success).toBe(false);
        });
    }
});

test("los años sin mes se normalizan a string", () => {
    const result = validate(join(FIXTURES, "valid/education-year-only.md"));
    expect(result.success && result.data).toMatchObject({ start: "2015", end: "2020", grade: "8.55" });
});
```

- [ ] **Step 5: Comprobar que falla**

Run: `pnpm test tests/content/schemas.test.ts`
Expected: FAIL, no se resuelve `@lib/schemas`.

- [ ] **Step 6: Implementar**

`src/lib/schemas.ts`:

```ts
import { z } from "astro/zod";
import { compareYearMonth, yearMonth } from "./dates";

export const skillCategories = ["backend", "ai", "frontend", "devops", "security"] as const;
export type SkillCategory = (typeof skillCategories)[number];
export const projectStatuses = ["active", "paused", "done"] as const;

const text = z.string().trim().min(1);
const highlights = z.array(text).default([]);

const meta = {
    title: text,
    summary: text,
    tags: z.array(z.string()).default([]),
    sources: z.array(z.string()).min(1),
    updated: z.coerce.date(),
};

type Dated = { start: string; end: string | null };
const endAfterStart = (d: Dated) => d.end === null || compareYearMonth(d.end, d.start) >= 0;
const endAfterStartIssue = { message: "end es anterior a start", path: ["end"] };

type WithHighlights = { highlights: string[]; en: { highlights: string[] } };
const sameHighlights = (d: WithHighlights) => d.highlights.length === d.en.highlights.length;
const sameHighlightsIssue = {
    message: "highlights y en.highlights deben tener la misma longitud",
    path: ["en", "highlights"],
};

export const profileSchema = z.object({
    ...meta,
    type: z.literal("profile"),
    name: text,
    headline: text,
    location: text,
    links: z.object({ email: z.email(), linkedin: z.url(), github: z.url() }),
    en: z.object({ headline: text, summary: text }),
});

export const experienceSchema = z
    .object({
        ...meta,
        type: z.literal("experience"),
        company: text,
        role: text,
        start: yearMonth,
        end: yearMonth.nullable(),
        highlights,
        en: z.object({ role: text, summary: text, highlights }),
    })
    .refine(endAfterStart, endAfterStartIssue)
    .refine(sameHighlights, sameHighlightsIssue);

export const projectSchema = z
    .object({
        ...meta,
        type: z.literal("project"),
        repo: z.url(),
        url: z.url().optional(),
        status: z.enum(projectStatuses),
        start: yearMonth,
        highlights,
        en: z.object({ title: text, summary: text, highlights }),
    })
    .refine(sameHighlights, sameHighlightsIssue);

export const skillSchema = z.object({
    ...meta,
    type: z.literal("skill"),
    category: z.enum(skillCategories),
    en: z.object({ summary: text }),
});

export const educationSchema = z
    .object({
        ...meta,
        type: z.literal("education"),
        institution: text,
        degree: text,
        start: yearMonth,
        end: yearMonth.nullable(),
        grade: z.union([z.string(), z.number()]).transform(String).optional(),
        en: z.object({ degree: text, summary: text }),
    })
    .refine(endAfterStart, endAfterStartIssue);

export const schemasByType = {
    profile: profileSchema,
    experience: experienceSchema,
    project: projectSchema,
    skill: skillSchema,
    education: educationSchema,
};

export type ProfileData = z.output<typeof profileSchema>;
export type ExperienceData = z.output<typeof experienceSchema>;
export type ProjectData = z.output<typeof projectSchema>;
export type SkillData = z.output<typeof skillSchema>;
export type EducationData = z.output<typeof educationSchema>;
```

- [ ] **Step 7: Comprobar que pasa**

Run: `pnpm test tests/content/schemas.test.ts`
Expected: todos PASS (6 válidos, 9 inválidos, 1 de normalización). Si un inválido pasa, el esquema tiene un hueco: corregir el esquema, no el fixture.

- [ ] **Step 8: Commit**

```bash
git add src/lib/schemas.ts tests/content tests/support tests/fixtures/wiki
git commit -m "feat(content): Add Zod contract for wiki collections with fixtures"
```

---

### Task 5: Colecciones de Astro y regla de la wiki

**Files:**
- Create: `src/content.config.ts`
- Modify: `.claude/rules/wiki.md` (sección *Páginas*)

**Interfaces:**
- Consumes: esquemas de Task 4
- Produces: colecciones `profile`, `experience`, `projects`, `skills`, `education` (ids = nombre de archivo sin `.md`; el perfil tiene id `profile`)

- [ ] **Step 1: Definir colecciones**

`src/content.config.ts`:

```ts
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import {
    educationSchema,
    experienceSchema,
    profileSchema,
    projectSchema,
    skillSchema,
} from "@lib/schemas";

const wiki = (pattern: string, base: string) => glob({ pattern, base: `./wiki/public/${base}` });

export const collections = {
    profile: defineCollection({ loader: wiki("profile.md", ""), schema: profileSchema }),
    experience: defineCollection({ loader: wiki("*.md", "experience"), schema: experienceSchema }),
    projects: defineCollection({ loader: wiki("*.md", "projects"), schema: projectSchema }),
    skills: defineCollection({ loader: wiki("*.md", "skills"), schema: skillSchema }),
    education: defineCollection({ loader: wiki("*.md", "education"), schema: educationSchema }),
};
```

- [ ] **Step 2: Actualizar la regla de la wiki**

En `.claude/rules/wiki.md`, sustituir el bloque de frontmatter de la sección *Páginas* y la línea de opcionales por:

````markdown
- **Frontmatter obligatorio** (comunes): `title`, `type`, `summary`, `tags`, `sources`,
  `updated`. El portfolio usa **solo el frontmatter**; el cuerpo es prosa de wiki y no se
  publica.
- **Campos por tipo** (los esquemas Zod de `src/lib/schemas.ts` son la referencia exacta;
  si una página no los cumple, la build falla):

  | `type` | Campos propios | Traducibles en `en:` |
  | --- | --- | --- |
  | `profile` | `name`, `headline`, `location`, `links: {email, linkedin, github}` | `headline`, `summary` |
  | `experience` | `company`, `role`, `start`, `end`, `highlights` | `role`, `summary`, `highlights` |
  | `project` | `repo`, `url?`, `status` (`active`·`paused`·`done`), `start`, `highlights` | `title`, `summary`, `highlights` |
  | `skill` | `category` (`backend`·`ai`·`frontend`·`devops`·`security`) | `summary` |
  | `education` | `institution`, `degree`, `start`, `end`, `grade?` | `degree`, `summary` |

- **Fechas:** `start`/`end` como `AAAA-MM` o `AAAA`; `end: null` es «actualidad».
- **Traducción:** cada campo traducible lleva su versión inglesa en el bloque `en:`.
  `highlights` y `en.highlights` tienen la misma longitud. Los nombres propios no se
  traducen. Las páginas privadas (`note`, `synthesis`) no llevan `en:`.

  ```yaml
  ---
  title: Acme Corp
  type: experience
  company: Acme Corp
  role: Ingeniero de software
  start: 2023-03
  end: null
  summary: Una frase; se usa en el índice y en el portfolio.
  highlights:
    - Un logro concreto.
  tags: [backend, typescript]
  en:
    role: Software engineer
    summary: One sentence; used in the index and the portfolio.
    highlights:
      - A concrete achievement.
  sources: [raw/cv-2026.pdf, "https://github.com/usuario (2026-10-02)", "humano (2026-10-02)"]
  updated: 2026-10-01
  ---
  ```

  Una fuente web se cita con su URL y la fecha de consulta entre paréntesis.
````

Mantener intactas las líneas de *Nombre*, *Enlaces*, *Respaldo* y *Cierre*.

- [ ] **Step 3: Comprobar que Astro carga las colecciones**

Run: `pnpm check`
Expected: 0 errors. El build aún fallará porque `wiki/public/profile.md` es una plantilla sin campos; es lo esperado hasta Task 6. Las carpetas vacías pueden dar avisos de colección vacía; no son errores.

- [ ] **Step 4: Commit**

```bash
git add src/content.config.ts .claude/rules/wiki.md
git commit -m "feat(content): Define wiki collections and document page fields"
```

---

### Task 6: Primera ingesta y contrato sobre la wiki real

> **Interactiva.** La skill `ingest` exige presentar lo extraído y esperar la validación del humano antes de escribir. No se puede delegar en un subagente sin humano.

**Files:**
- Create: páginas en `wiki/public/{experience,projects,skills,education}/`, `wiki/private/notes/personal-data.md`, `wiki/private/notes/source-conflicts.md`, `tests/content/wiki.test.ts`
- Modify: `wiki/public/profile.md`, `wiki/index.md`, `wiki/private/index.md`, `wiki/private/log.md`

**Interfaces:**
- Consumes: esquemas (Task 4), regla actualizada (Task 5)
- Produces: contenido real que cumple el contrato

- [ ] **Step 1: Test que falla**

`tests/content/wiki.test.ts`:

```ts
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { schemasByType } from "@lib/schemas";
import { readFrontmatter } from "../support/frontmatter";

const WIKI = join(import.meta.dirname, "../../wiki/public");

const folders = {
    experience: "experience",
    projects: "project",
    skills: "skill",
    education: "education",
} as const;

test("existe el perfil y cumple el contrato", () => {
    const path = join(WIKI, "profile.md");
    expect(existsSync(path)).toBe(true);
    const result = schemasByType.profile.safeParse(readFrontmatter(path));
    expect(result.error?.issues ?? []).toEqual([]);
});

for (const [folder, type] of Object.entries(folders)) {
    describe(`wiki/public/${folder}`, () => {
        const dir = join(WIKI, folder);
        const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md")) : [];

        for (const file of files) {
            test(file, () => {
                const data = readFrontmatter(join(dir, file));
                expect(data.type).toBe(type);
                const result = schemasByType[type].safeParse(data);
                expect(result.error?.issues ?? []).toEqual([]);
            });
        }
    });
}

test("hay al menos un puesto, un proyecto, una habilidad y un estudio", () => {
    for (const folder of Object.keys(folders)) {
        const files = readdirSync(join(WIKI, folder)).filter((f) => f.endsWith(".md"));
        expect(files.length, folder).toBeGreaterThan(0);
    }
});
```

- [ ] **Step 2: Comprobar que falla**

Run: `pnpm test tests/content/wiki.test.ts`
Expected: FAIL; el perfil es una plantilla y las carpetas están vacías.

- [ ] **Step 3: Ejecutar la ingesta**

Invocar la skill `ingest` con las fuentes:

- `raw/assets/Curriculum_Vitae___English_Variation.pdf` (manda en los conflictos)
- `raw/assets/Linkedin_profile.pdf` (aporta meses donde no contradice al CV)
- `humano (2026-10-02)`: puesto actual en SKIN AI, desarrollo de una aplicación web y móvil con Expo y backend en FastAPI para reconocer enfermedades capilares con IA; el único proyecto por ahora es esta plantilla; se publican email, LinkedIn, GitHub, foto y notas medias.
- `https://github.com/ARubiose (2026-10-02)`: validar con el humano en el paso de presentación.

Páginas previstas (confirmar en la presentación):

- Públicas: `profile.md`; `experience/{skin-ai,zalcu,gofore,oesia}.md`; `projects/portfolio-llm-wiki.md`; `education/{upm-emse,urjc-double-degree,groningen-erasmus,ccna,ielts}.md`; `skills/` con una página por tecnología o dominio relevante de las fuentes (Python, FastAPI, Django, Celery, Redis, Docker, pytest, GitHub Actions, React, Expo, HTML/CSS/JavaScript, deep learning y visión por computador, ciberseguridad/OSINT), cada una con su `category`.
- Privadas: `notes/personal-data.md` (fecha de nacimiento, dirección, teléfono) y `notes/source-conflicts.md` (cada discrepancia CV/LinkedIn y su resolución).
- El `summary` del perfil se redacta de nuevo: los extractos de las fuentes presentan como actual un puesto anterior.

- [ ] **Step 4: Comprobar que pasa**

Run: `pnpm test tests/content/wiki.test.ts`
Expected: PASS. Si falla, corregir la página de la wiki (no relajar el esquema).

Run: `pnpm build`
Expected: build correcta.

- [ ] **Step 5: Lint de la wiki**

Invocar la skill `lint`. Expected: sin fugas de privacidad ni enlaces rotos. Resolver lo que reporte antes de seguir.

- [ ] **Step 6: Commit**

Solo lo versionado (lo privado está en `.gitignore`); revisar `git status` antes:

```bash
git add wiki/public wiki/index.md tests/content/wiki.test.ts
git commit -m "feat(wiki): Ingest CV, LinkedIn profile and current role"
```

---

### Task 7: Ordenación y vista de la portada

**Files:**
- Create: `src/lib/order.ts`, `src/lib/home.ts`
- Test: `tests/unit/order.test.ts`, `tests/unit/home.test.ts`

**Interfaces:**
- Consumes: `compareYearMonth`, `formatPeriod` (Task 3), `localize`, `useTranslations` (Task 2), tipos de Task 4
- Produces:
  - `sortByStartDesc<T extends { start: string; end?: string | null }>(items: T[]): T[]`
  - `groupSkills<T extends { category: SkillCategory; title: string }>(skills: T[]): { category: SkillCategory; items: T[] }[]`
  - `type SectionId = "experience" | "projects" | "skills" | "education" | "contact"`
  - `buildHomeView(data: HomeData, locale: Locale): HomeView` con:

```ts
type HomeData = {
    profile: ProfileData;
    experience: ExperienceData[];
    projects: ProjectData[];
    skills: SkillData[];
    education: EducationData[];
};

type HomeView = {
    profile: Localized<ProfileData>;
    experience: (Localized<ExperienceData> & { period: string })[];
    projects: Localized<ProjectData>[];
    skillGroups: { category: SkillCategory; label: string; items: Localized<SkillData>[] }[];
    education: (Localized<EducationData> & { period: string })[];
    sections: { id: SectionId; label: string }[]; // solo las que tienen contenido, en orden de página
};
```

- [ ] **Step 1: Tests que fallan**

`tests/unit/order.test.ts`:

```ts
import { expect, test } from "vitest";
import { groupSkills, sortByStartDesc } from "@lib/order";

test("ordena por inicio descendente", () => {
    const items = [{ start: "2020-01" }, { start: "2026-06" }, { start: "2022-08" }];
    expect(sortByStartDesc(items).map((i) => i.start)).toEqual(["2026-06", "2022-08", "2020-01"]);
});

test("a igual inicio, lo vigente (end null) va primero", () => {
    const items = [
        { start: "2022", end: "2023" },
        { start: "2022", end: null },
    ];
    expect(sortByStartDesc(items)[0].end).toBeNull();
});

test("no muta el array original", () => {
    const items = [{ start: "2020" }, { start: "2026" }];
    sortByStartDesc(items);
    expect(items[0].start).toBe("2020");
});

test("agrupa por categoría en orden fijo, omite las vacías y ordena por título", () => {
    const skills = [
        { category: "devops" as const, title: "Docker" },
        { category: "backend" as const, title: "Python" },
        { category: "backend" as const, title: "FastAPI" },
    ];
    expect(groupSkills(skills)).toEqual([
        { category: "backend", items: [skills[2], skills[1]] },
        { category: "devops", items: [skills[0]] },
    ]);
});
```

`tests/unit/home.test.ts`:

```ts
import { expect, test } from "vitest";
import { buildHomeView, type HomeData } from "@lib/home";

const meta = { tags: [], sources: ["x"], updated: new Date("2026-10-02") };

const data: HomeData = {
    profile: {
        ...meta,
        type: "profile",
        title: "Perfil",
        name: "Ada",
        headline: "Ingeniera",
        location: "Londres",
        summary: "Resumen",
        links: { email: "a@example.com", linkedin: "https://linkedin.com/in/a", github: "https://github.com/a" },
        en: { headline: "Engineer", summary: "Summary" },
    },
    experience: [
        {
            ...meta,
            type: "experience",
            title: "Old",
            company: "Old",
            role: "Becaria",
            start: "2020-01",
            end: "2020-07",
            summary: "s",
            highlights: [],
            en: { role: "Intern", summary: "s", highlights: [] },
        },
        {
            ...meta,
            type: "experience",
            title: "New",
            company: "New",
            role: "Ingeniera",
            start: "2026-06",
            end: null,
            summary: "s",
            highlights: [],
            en: { role: "Engineer", summary: "s", highlights: [] },
        },
    ],
    projects: [],
    skills: [
        { ...meta, type: "skill", title: "Python", category: "backend", summary: "s", en: { summary: "s" } },
    ],
    education: [],
};

test("localiza, ordena y formatea periodos", () => {
    const view = buildHomeView(data, "en");
    expect(view.profile.headline).toBe("Engineer");
    expect(view.experience.map((e) => e.role)).toEqual(["Engineer", "Intern"]);
    expect(view.experience[0].period).toBe("Jun 2026 – present");
});

test("las categorías de skills llevan su etiqueta traducida", () => {
    expect(buildHomeView(data, "es").skillGroups[0].label).toBe("Backend");
});

test("las secciones vacías no aparecen en la navegación", () => {
    expect(buildHomeView(data, "es").sections.map((s) => s.id)).toEqual([
        "experience",
        "skills",
        "contact",
    ]);
});
```

- [ ] **Step 2: Comprobar que fallan**

Run: `pnpm test tests/unit/order.test.ts tests/unit/home.test.ts`
Expected: FAIL, módulos no encontrados.

- [ ] **Step 3: Implementar**

`src/lib/order.ts`:

```ts
import { compareYearMonth } from "./dates";
import { skillCategories, type SkillCategory } from "./schemas";

export function sortByStartDesc<T extends { start: string; end?: string | null }>(items: T[]): T[] {
    return [...items].sort((a, b) => {
        const byStart = compareYearMonth(b.start, a.start);
        if (byStart !== 0) return byStart;
        return Number(b.end === null) - Number(a.end === null);
    });
}

export function groupSkills<T extends { category: SkillCategory; title: string }>(skills: T[]) {
    return skillCategories
        .map((category) => ({
            category,
            items: skills
                .filter((s) => s.category === category)
                .sort((a, b) => a.title.localeCompare(b.title, "es")),
        }))
        .filter((group) => group.items.length > 0);
}
```

`src/lib/home.ts`:

```ts
import type { Locale } from "@i18n/ui";
import { localize, useTranslations, type Localized } from "@i18n/utils";
import { formatPeriod } from "./dates";
import { groupSkills, sortByStartDesc } from "./order";
import type {
    EducationData,
    ExperienceData,
    ProfileData,
    ProjectData,
    SkillCategory,
    SkillData,
} from "./schemas";

export type SectionId = "experience" | "projects" | "skills" | "education" | "contact";

export type HomeData = {
    profile: ProfileData;
    experience: ExperienceData[];
    projects: ProjectData[];
    skills: SkillData[];
    education: EducationData[];
};

export type HomeView = {
    profile: Localized<ProfileData>;
    experience: (Localized<ExperienceData> & { period: string })[];
    projects: Localized<ProjectData>[];
    skillGroups: { category: SkillCategory; label: string; items: Localized<SkillData>[] }[];
    education: (Localized<EducationData> & { period: string })[];
    sections: { id: SectionId; label: string }[];
};

export function buildHomeView(data: HomeData, locale: Locale): HomeView {
    const t = useTranslations(locale);
    const withPeriod = <T extends { start: string; end: string | null }>(item: T) => ({
        ...item,
        period: formatPeriod(item.start, item.end, locale),
    });

    const experience = sortByStartDesc(data.experience).map((e) => withPeriod(localize(e, locale)));
    const education = sortByStartDesc(data.education).map((e) => withPeriod(localize(e, locale)));
    const projects = sortByStartDesc(data.projects).map((p) => localize(p, locale));
    const skillGroups = groupSkills(data.skills.map((s) => localize(s, locale))).map((g) => ({
        ...g,
        label: t(`skills.category.${g.category}`),
    }));

    const counts: Record<SectionId, number> = {
        experience: experience.length,
        projects: projects.length,
        skills: skillGroups.length,
        education: education.length,
        contact: 1,
    };
    const sections = (Object.keys(counts) as SectionId[])
        .filter((id) => counts[id] > 0)
        .map((id) => ({ id, label: t(`section.${id}`) }));

    return { profile: localize(data.profile, locale), experience, projects, skillGroups, education, sections };
}
```

- [ ] **Step 4: Comprobar que pasan**

Run: `pnpm test tests/unit`
Expected: todos PASS. `pnpm check` sin errores (las claves `skills.category.${…}` y `section.${…}` deben tipar como `UiKey`; si TypeScript no lo infiere, declarar el template literal con `as const`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/order.ts src/lib/home.ts tests/unit/order.test.ts tests/unit/home.test.ts
git commit -m "feat(lib): Build localized, ordered home view from wiki data"
```

---

### Task 8: Base del sitio (layout, cabecera, selector de idioma, páginas)

**Files:**
- Modify: `src/layouts/Layout.astro`, `src/components/Header.astro`, `src/pages/index.astro`, `src/pages/en/index.astro`
- Create: `src/layouts/HomePage.astro`, `src/components/LanguageSwitcher.astro`
- Test: `tests/components/header.test.ts`

**Interfaces:**
- Consumes: `buildHomeView`, `HomeView`, `SectionId` (Task 7), colecciones (Task 5)
- Produces:
  - `Layout` props: `{ locale: Locale; title: string; description: string }`
  - `LanguageSwitcher` props: `{ locale: Locale; urls: Record<Locale, string> }`
  - `Header` props: `{ locale: Locale; sections: { id: SectionId; label: string }[]; urls: Record<Locale, string> }`
  - `HomePage` props: `{ locale: Locale }`
  - Ids de ancla en la página: `experience`, `projects`, `skills`, `education`, `contact`

- [ ] **Step 1: Test que falla**

`tests/components/header.test.ts`:

```ts
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { expect, test } from "vitest";
import Header from "@components/Header.astro";

const urls = { es: "/", en: "/en/" };

test("enlaza solo las secciones recibidas", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Header, {
        props: { locale: "es", urls, sections: [{ id: "experience", label: "Experiencia" }] },
    });
    expect(html).toContain('href="#experience"');
    expect(html).not.toContain('href="#projects"');
});

test("el selector marca el idioma actual y enlaza al otro", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Header, {
        props: { locale: "en", urls, sections: [] },
    });
    expect(html).toMatch(/<a[^>]*href="\/"[^>]*hreflang="es"/);
    expect(html).toMatch(/aria-current="true"[^>]*>English|>English<\/span>/);
});
```

- [ ] **Step 2: Comprobar que falla**

Run: `pnpm test tests/components/header.test.ts`
Expected: FAIL (Header vacío no renderiza enlaces).

- [ ] **Step 3: Implementar componentes**

`src/components/LanguageSwitcher.astro`:

```astro
---
import { locales, type Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";

interface Props {
    locale: Locale;
    urls: Record<Locale, string>;
}
const { locale, urls } = Astro.props;
const t = useTranslations(locale);
---

<nav aria-label={t("lang.label")}>
    <ul class="flex gap-3 text-sm">
        {
            locales.map((l) => (
                <li>
                    {l === locale ? (
                        <span aria-current="true" class="font-semibold">{t(`lang.${l}`)}</span>
                    ) : (
                        <a href={urls[l]} hreflang={l} lang={l} class="underline">
                            {t(`lang.${l}`)}
                        </a>
                    )}
                </li>
            ))
        }
    </ul>
</nav>
```

`src/components/Header.astro`:

```astro
---
import type { Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";
import type { SectionId } from "@lib/home";
import LanguageSwitcher from "./LanguageSwitcher.astro";

interface Props {
    locale: Locale;
    sections: { id: SectionId; label: string }[];
    urls: Record<Locale, string>;
}
const { locale, sections, urls } = Astro.props;
const t = useTranslations(locale);
---

<header class="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
    <nav aria-label={t("nav.label")}>
        <ul class="flex flex-wrap gap-4">
            {sections.map((s) => <li><a href={`#${s.id}`}>{s.label}</a></li>)}
        </ul>
    </nav>
    <LanguageSwitcher locale={locale} urls={urls} />
</header>
```

`src/layouts/Layout.astro`:

```astro
---
import "@styles/global.css";
import type { Locale } from "@i18n/ui";

interface Props {
    locale: Locale;
    title: string;
    description: string;
}
const { locale, title, description } = Astro.props;
---

<!doctype html>
<html lang={locale}>
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:locale" content={locale === "es" ? "es_ES" : "en_US"} />
    </head>
    <body class="bg-white text-neutral-900">
        <slot />
    </body>
</html>
```

`src/layouts/HomePage.astro` (las secciones se añaden en Task 9; aquí solo cabecera y `<main>` vacío):

```astro
---
import { getCollection, getEntry } from "astro:content";
import { getRelativeLocaleUrl } from "astro:i18n";
import { locales, type Locale } from "@i18n/ui";
import { buildHomeView } from "@lib/home";
import Layout from "./Layout.astro";
import Header from "@components/Header.astro";

interface Props {
    locale: Locale;
}
const { locale } = Astro.props;

const profile = await getEntry("profile", "profile");
if (!profile) throw new Error("Falta wiki/public/profile.md");

const view = buildHomeView(
    {
        profile: profile.data,
        experience: (await getCollection("experience")).map((e) => e.data),
        projects: (await getCollection("projects")).map((e) => e.data),
        skills: (await getCollection("skills")).map((e) => e.data),
        education: (await getCollection("education")).map((e) => e.data),
    },
    locale,
);

const urls = Object.fromEntries(locales.map((l) => [l, getRelativeLocaleUrl(l, "")])) as Record<Locale, string>;
---

<Layout locale={locale} title={`${view.profile.name} · ${view.profile.headline}`} description={view.profile.summary}>
    <Header locale={locale} sections={view.sections} urls={urls} />
    <main class="mx-auto max-w-3xl px-6"></main>
</Layout>
```

`src/pages/index.astro`:

```astro
---
import HomePage from "@layouts/HomePage.astro";
---

<HomePage locale="es" />
```

`src/pages/en/index.astro`:

```astro
---
import HomePage from "@layouts/HomePage.astro";
---

<HomePage locale="en" />
```

- [ ] **Step 4: Comprobar**

Run: `pnpm test tests/components/header.test.ts`
Expected: PASS.

Run: `pnpm build && pnpm check`
Expected: build correcta; `dist/index.html` con `<html lang="es">` y `dist/en/index.html` con `<html lang="en">`. Comprobar `getRelativeLocaleUrl("es", "")` → `/` y `("en", "")` → `/en/` mirando el HTML; si devuelve otra forma (sin barra final), ajustar las URLs del test de Step 1 a lo real.

- [ ] **Step 5: Commit**

```bash
git add src/layouts src/components/Header.astro src/components/LanguageSwitcher.astro src/pages tests/components/header.test.ts
git commit -m "feat(site): Add shared home composition, header and language switcher"
```

---

### Task 9: Secciones y componentes de contenido

**Files:**
- Modify: `src/sections/intro.astro`, `src/sections/experience.astro`, `src/sections/education.astro`, `src/sections/contact.astro`, `src/components/ProfileAvatar.astro`, `src/layouts/HomePage.astro`
- Create: `src/sections/projects.astro`, `src/sections/skills.astro`, `src/components/TimelineItem.astro`, `src/components/ProjectCard.astro`, `src/components/SkillGroup.astro`
- Test: `tests/components/sections.test.ts`

**Interfaces:**
- Consumes: `HomeView` (Task 7), `useTranslations` (Task 2)
- Produces (props):
  - `Intro`: `{ profile: HomeView["profile"] }`
  - `Experience`: `{ items: HomeView["experience"]; locale: Locale }`
  - `Projects`: `{ items: HomeView["projects"]; locale: Locale }`
  - `Skills`: `{ groups: HomeView["skillGroups"]; locale: Locale }`
  - `Education`: `{ items: HomeView["education"]; locale: Locale }`
  - `Contact`: `{ links: HomeView["profile"]["links"]; locale: Locale }`
  - `TimelineItem`: `{ title: string; subtitle: string; period: string; summary: string; highlights?: string[]; note?: string }`
  - `ProjectCard`: `{ title: string; summary: string; highlights: string[]; repo: string; url?: string; statusLabel: string; repoLabel: string; visitLabel: string }`
  - `SkillGroup`: `{ label: string; items: { title: string; summary: string }[] }`
  - `ProfileAvatar`: `{ alt: string }`

- [ ] **Step 1: Tests que fallan**

`tests/components/sections.test.ts`:

```ts
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { beforeAll, describe, expect, test } from "vitest";
import Experience from "@sections/experience.astro";
import Projects from "@sections/projects.astro";
import Skills from "@sections/skills.astro";
import Education from "@sections/education.astro";
import Contact from "@sections/contact.astro";
import Intro from "@sections/intro.astro";

let container: AstroContainer;
beforeAll(async () => {
    container = await AstroContainer.create();
});

const job = {
    type: "experience" as const,
    title: "Acme",
    company: "Acme",
    role: "Engineer",
    start: "2026-06",
    end: null,
    period: "Jun 2026 – present",
    summary: "Python backend.",
    highlights: ["API design."],
    tags: [],
    sources: ["x"],
    updated: new Date(),
};

describe("Experience", () => {
    test("muestra título traducido, puesto, empresa, periodo y logros", async () => {
        const html = await container.renderToString(Experience, { props: { items: [job], locale: "en" } });
        expect(html).toContain('id="experience"');
        expect(html).toContain("Experience");
        for (const text of ["Engineer", "Acme", "Jun 2026 – present", "API design."]) {
            expect(html).toContain(text);
        }
    });

    test("sin elementos no renderiza nada", async () => {
        const html = await container.renderToString(Experience, { props: { items: [], locale: "es" } });
        expect(html.trim()).toBe("");
    });
});

describe("Projects", () => {
    const project = {
        type: "project" as const,
        title: "This portfolio",
        repo: "https://github.com/ada/portfolio",
        status: "active" as const,
        start: "2026-10",
        summary: "Portfolio from a wiki.",
        highlights: [],
        tags: [],
        sources: ["x"],
        updated: new Date(),
    };

    test("tarjeta con estado traducido y enlace al repo", async () => {
        const html = await container.renderToString(Projects, { props: { items: [project], locale: "es" } });
        expect(html).toContain('id="projects"');
        expect(html).toContain("En desarrollo");
        expect(html).toContain('href="https://github.com/ada/portfolio"');
    });

    test("sin proyectos no renderiza nada", async () => {
        const html = await container.renderToString(Projects, { props: { items: [], locale: "es" } });
        expect(html.trim()).toBe("");
    });
});

test("Skills agrupa con la etiqueta de cada categoría", async () => {
    const groups = [
        {
            category: "backend" as const,
            label: "Backend",
            items: [{ type: "skill" as const, title: "Python", category: "backend" as const, summary: "Main.", tags: [], sources: ["x"], updated: new Date() }],
        },
    ];
    const html = await container.renderToString(Skills, { props: { groups, locale: "es" } });
    expect(html).toContain('id="skills"');
    expect(html).toContain("Backend");
    expect(html).toContain("Python");
});

test("Education muestra la nota con su etiqueta", async () => {
    const item = {
        type: "education" as const,
        title: "Degree",
        institution: "Uni",
        degree: "Double degree",
        start: "2015",
        end: "2020",
        period: "2015 – 2020",
        grade: "8.55",
        summary: "Five years.",
        tags: [],
        sources: ["x"],
        updated: new Date(),
    };
    const html = await container.renderToString(Education, { props: { items: [item], locale: "en" } });
    expect(html).toContain("Average grade: 8.55");
});

test("Contact enlaza email, LinkedIn y GitHub", async () => {
    const links = { email: "a@example.com", linkedin: "https://linkedin.com/in/a", github: "https://github.com/a" };
    const html = await container.renderToString(Contact, { props: { links, locale: "es" } });
    expect(html).toContain('id="contact"');
    expect(html).toContain('href="mailto:a@example.com"');
    expect(html).toContain('href="https://linkedin.com/in/a"');
    expect(html).toContain('href="https://github.com/a"');
});

test("Intro muestra nombre como h1, titular y resumen", async () => {
    const profile = {
        type: "profile" as const,
        title: "Perfil",
        name: "Ada Lovelace",
        headline: "Engineer",
        location: "London",
        summary: "Analytical engine.",
        links: { email: "a@example.com", linkedin: "https://linkedin.com/in/a", github: "https://github.com/a" },
        tags: [],
        sources: ["x"],
        updated: new Date(),
    };
    const html = await container.renderToString(Intro, { props: { profile } });
    expect(html).toMatch(/<h1[^>]*>Ada Lovelace<\/h1>/);
    expect(html).toContain("Engineer");
    expect(html).toContain("Analytical engine.");
});
```

Si el test de `Intro` falla solo por `<Image>` dentro de la Container API (servicio de imágenes no disponible), quitar la aserción de imagen de este test, dejar el resto y cubrir la foto en E2E (Task 11 ya comprueba el `alt`). Anotarlo en el commit.

- [ ] **Step 2: Comprobar que fallan**

Run: `pnpm test tests/components/sections.test.ts`
Expected: FAIL (secciones de marcador de posición; `projects` y `skills` no existen).

- [ ] **Step 3: Implementar componentes**

`src/components/TimelineItem.astro`:

```astro
---
interface Props {
    title: string;
    subtitle: string;
    period: string;
    summary: string;
    highlights?: string[];
    note?: string;
}
const { title, subtitle, period, summary, highlights = [], note } = Astro.props;
---

<li class="py-4">
    <h3 class="text-lg font-semibold">{title}</h3>
    <p class="text-neutral-700">{subtitle} · <span class="text-neutral-500">{period}</span></p>
    <p class="mt-2">{summary}</p>
    {note && <p class="mt-1 text-sm text-neutral-600">{note}</p>}
    {highlights.length > 0 && (
        <ul class="mt-2 list-disc pl-5">
            {highlights.map((h) => <li>{h}</li>)}
        </ul>
    )}
</li>
```

`src/components/ProjectCard.astro`:

```astro
---
interface Props {
    title: string;
    summary: string;
    highlights: string[];
    repo: string;
    url?: string;
    statusLabel: string;
    repoLabel: string;
    visitLabel: string;
}
const { title, summary, highlights, repo, url, statusLabel, repoLabel, visitLabel } = Astro.props;
---

<article class="rounded border border-neutral-200 p-4">
    <h3 class="text-lg font-semibold">{title}</h3>
    <p class="text-sm text-neutral-500">{statusLabel}</p>
    <p class="mt-2">{summary}</p>
    {highlights.length > 0 && (
        <ul class="mt-2 list-disc pl-5">
            {highlights.map((h) => <li>{h}</li>)}
        </ul>
    )}
    <p class="mt-3 flex gap-4">
        <a href={repo} class="underline">{repoLabel}</a>
        {url && <a href={url} class="underline">{visitLabel}</a>}
    </p>
</article>
```

`src/components/SkillGroup.astro`:

```astro
---
interface Props {
    label: string;
    items: { title: string; summary: string }[];
}
const { label, items } = Astro.props;
---

<div class="py-2">
    <h3 class="font-semibold">{label}</h3>
    <ul class="mt-1 flex flex-wrap gap-2">
        {items.map((s) => <li class="rounded bg-neutral-100 px-2 py-1 text-sm" title={s.summary}>{s.title}</li>)}
    </ul>
</div>
```

`src/components/ProfileAvatar.astro`:

```astro
---
import { Image } from "astro:assets";
import profileImage from "@assets/images/profile.jpg";

interface Props {
    alt: string;
}
const { alt } = Astro.props;
---

<Image src={profileImage} alt={alt} width={240} height={240} class="size-40 rounded-full object-cover" />
```

- [ ] **Step 4: Implementar secciones**

`src/sections/intro.astro`:

```astro
---
import ProfileAvatar from "@components/ProfileAvatar.astro";
import type { HomeView } from "@lib/home";

interface Props {
    profile: HomeView["profile"];
}
const { profile } = Astro.props;
---

<section id="about" class="flex flex-col items-start gap-6 py-12 sm:flex-row sm:items-center">
    <ProfileAvatar alt={profile.name} />
    <div>
        <h1 class="text-3xl font-bold">{profile.name}</h1>
        <p class="text-xl text-neutral-700">{profile.headline}</p>
        <p class="text-neutral-500">{profile.location}</p>
        <p class="mt-4">{profile.summary}</p>
    </div>
</section>
```

`src/sections/experience.astro`:

```astro
---
import TimelineItem from "@components/TimelineItem.astro";
import type { Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";
import type { HomeView } from "@lib/home";

interface Props {
    items: HomeView["experience"];
    locale: Locale;
}
const { items, locale } = Astro.props;
const t = useTranslations(locale);
---

{items.length > 0 && (
    <section id="experience" class="py-8">
        <h2 class="text-2xl font-bold">{t("section.experience")}</h2>
        <ol>
            {items.map((e) => (
                <TimelineItem title={e.role} subtitle={e.company} period={e.period} summary={e.summary} highlights={e.highlights} />
            ))}
        </ol>
    </section>
)}
```

`src/sections/education.astro`:

```astro
---
import TimelineItem from "@components/TimelineItem.astro";
import type { Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";
import type { HomeView } from "@lib/home";

interface Props {
    items: HomeView["education"];
    locale: Locale;
}
const { items, locale } = Astro.props;
const t = useTranslations(locale);
---

{items.length > 0 && (
    <section id="education" class="py-8">
        <h2 class="text-2xl font-bold">{t("section.education")}</h2>
        <ol>
            {items.map((e) => (
                <TimelineItem
                    title={e.degree}
                    subtitle={e.institution}
                    period={e.period}
                    summary={e.summary}
                    note={e.grade ? `${t("education.grade")}: ${e.grade}` : undefined}
                />
            ))}
        </ol>
    </section>
)}
```

`src/sections/projects.astro`:

```astro
---
import ProjectCard from "@components/ProjectCard.astro";
import type { Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";
import type { HomeView } from "@lib/home";

interface Props {
    items: HomeView["projects"];
    locale: Locale;
}
const { items, locale } = Astro.props;
const t = useTranslations(locale);
---

{items.length > 0 && (
    <section id="projects" class="py-8">
        <h2 class="text-2xl font-bold">{t("section.projects")}</h2>
        <div class="mt-4 grid gap-4">
            {items.map((p) => (
                <ProjectCard
                    title={p.title}
                    summary={p.summary}
                    highlights={p.highlights}
                    repo={p.repo}
                    url={p.url}
                    statusLabel={t(`projects.status.${p.status}`)}
                    repoLabel={t("projects.repo")}
                    visitLabel={t("projects.visit")}
                />
            ))}
        </div>
    </section>
)}
```

`src/sections/skills.astro`:

```astro
---
import SkillGroup from "@components/SkillGroup.astro";
import type { Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";
import type { HomeView } from "@lib/home";

interface Props {
    groups: HomeView["skillGroups"];
    locale: Locale;
}
const { groups, locale } = Astro.props;
const t = useTranslations(locale);
---

{groups.length > 0 && (
    <section id="skills" class="py-8">
        <h2 class="text-2xl font-bold">{t("section.skills")}</h2>
        {groups.map((g) => <SkillGroup label={g.label} items={g.items} />)}
    </section>
)}
```

`src/sections/contact.astro`:

```astro
---
import type { Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";
import type { HomeView } from "@lib/home";

interface Props {
    links: HomeView["profile"]["links"];
    locale: Locale;
}
const { links, locale } = Astro.props;
const t = useTranslations(locale);
---

<section id="contact" class="py-8">
    <h2 class="text-2xl font-bold">{t("section.contact")}</h2>
    <ul class="mt-4 flex flex-wrap gap-6">
        <li><a href={`mailto:${links.email}`} class="underline">{t("contact.email")}</a></li>
        <li><a href={links.linkedin} class="underline">{t("contact.linkedin")}</a></li>
        <li><a href={links.github} class="underline">{t("contact.github")}</a></li>
    </ul>
</section>
```

- [ ] **Step 5: Montar las secciones en `HomePage`**

En `src/layouts/HomePage.astro`, añadir los imports:

```astro
import Intro from "@sections/intro.astro";
import Experience from "@sections/experience.astro";
import Projects from "@sections/projects.astro";
import Skills from "@sections/skills.astro";
import Education from "@sections/education.astro";
import Contact from "@sections/contact.astro";
```

y sustituir `<main class="mx-auto max-w-3xl px-6"></main>` por:

```astro
<main class="mx-auto max-w-3xl px-6">
    <Intro profile={view.profile} />
    <Experience items={view.experience} locale={locale} />
    <Projects items={view.projects} locale={locale} />
    <Skills groups={view.skillGroups} locale={locale} />
    <Education items={view.education} locale={locale} />
    <Contact links={view.profile.links} locale={locale} />
</main>
```

El orden de las secciones debe coincidir con el de `sections` en `buildHomeView`.

- [ ] **Step 6: Comprobar**

Run: `pnpm test`
Expected: todos PASS.

Run: `pnpm build && pnpm check`
Expected: sin errores. Abrir `pnpm dev` y revisar `/` y `/en/` a ojo: todas las secciones con datos reales.

- [ ] **Step 7: Commit**

```bash
git add src/sections src/components src/layouts/HomePage.astro tests/components/sections.test.ts
git commit -m "feat(site): Render profile, experience, projects, skills, education and contact"
```

---

### Task 10: Test de privacidad

**Files:**
- Create: `tests/support/privacy.ts`, `tests/privacy/detector.test.ts`, `tests/privacy/scan.test.ts`

**Interfaces:**
- Produces:
  - `visibleText(html: string): string`
  - `findLeaks(text: string, extra?: string[]): { rule: string; match: string }[]`
  - `loadForbiddenStrings(path: string): string[]` (vacío si el archivo no existe)

- [ ] **Step 1: Test del detector que falla**

`tests/privacy/detector.test.ts` (solo datos inventados):

```ts
import { describe, expect, test } from "vitest";
import { findLeaks, visibleText } from "../support/privacy";

describe("findLeaks", () => {
    test.each([
        ["teléfono", "Llámame al +34 600 111 222"],
        ["teléfono", "tel. 600111222"],
        ["dirección", "Vivo en C/ Inventada, 3"],
        ["dirección", "Calle Falsa 123"],
        ["código postal", "28999 Madrid"],
        ["nacimiento", "Fecha de nacimiento: 1 de enero"],
        ["nacimiento", "Date of birth: Jan 1"],
    ])("detecta %s: %s", (_rule, text) => {
        expect(findLeaks(text)).not.toEqual([]);
    });

    test.each([
        "Doble grado 2015 – 2020, nota media 8.55",
        "Ingeniero de software en Madrid",
        "Contacto: ada@example.com",
        "Repositorio con 1234567 estrellas",
    ])("no da falsos positivos: %s", (text) => {
        expect(findLeaks(text)).toEqual([]);
    });

    test("añade cadenas prohibidas extra sin distinguir mayúsculas", () => {
        expect(findLeaks("Vivo en VILLA SECRETA", ["villa secreta"])).toHaveLength(1);
    });
});

describe("visibleText", () => {
    test("ignora atributos y scripts", () => {
        const html = '<img src="/_astro/a600111222b.jpg"><script>var t="600111222"</script><p>Hola</p>';
        expect(visibleText(html)).toBe("Hola");
    });
});
```

- [ ] **Step 2: Comprobar que falla**

Run: `pnpm test tests/privacy/detector.test.ts`
Expected: FAIL, módulo no encontrado.

- [ ] **Step 3: Implementar el detector**

`tests/support/privacy.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";

const RULES: { rule: string; pattern: RegExp }[] = [
    { rule: "teléfono", pattern: /(?:\+34[\s.-]?)?\b[6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/ },
    { rule: "dirección", pattern: /\b(?:C\/|Calle|Avda\.?|Avenida|Plaza|Paseo)\s+[A-ZÁÉÍÓÚÑ]/ },
    { rule: "código postal", pattern: /\b(?:0[1-9]|[1-4]\d|5[0-2])\d{3}\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+/ },
    { rule: "nacimiento", pattern: /fecha de nacimiento|date of birth|nacid[oa] el|born on/i },
];

export function findLeaks(text: string, extra: string[] = []) {
    const leaks = RULES.flatMap(({ rule, pattern }) => {
        const m = text.match(pattern);
        return m ? [{ rule, match: m[0] }] : [];
    });
    const lower = text.toLowerCase();
    for (const s of extra) {
        if (s && lower.includes(s.toLowerCase())) leaks.push({ rule: "cadena prohibida", match: s });
    }
    return leaks;
}

export function visibleText(html: string): string {
    return html
        .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function loadForbiddenStrings(path: string): string[] {
    if (!existsSync(path)) return [];
    return readFileSync(path, "utf8")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"));
}
```

Run: `pnpm test tests/privacy/detector.test.ts`
Expected: PASS. Si «Repositorio con 1234567 estrellas» da positivo, el patrón de teléfono está demasiado laxo: debe exigir 9 dígitos empezando por 6–9.

- [ ] **Step 4: Escaneo de la wiki y de `dist/`**

`tests/privacy/scan.test.ts`:

```ts
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { findLeaks, loadForbiddenStrings, visibleText } from "../support/privacy";

const ROOT = join(import.meta.dirname, "../..");
const extra = loadForbiddenStrings(join(ROOT, "wiki/private/forbidden-strings.txt"));

function filesUnder(dir: string, ext: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { recursive: true, encoding: "utf8" })
        .filter((f) => f.endsWith(ext))
        .map((f) => join(dir, f));
}

describe("wiki pública sin datos privados", () => {
    for (const file of [...filesUnder(join(ROOT, "wiki/public"), ".md"), join(ROOT, "wiki/index.md")]) {
        test(file.replace(ROOT, ""), () => {
            expect(findLeaks(readFileSync(file, "utf8"), extra)).toEqual([]);
        });
    }
});

const html = filesUnder(join(ROOT, "dist"), ".html");
describe.skipIf(html.length === 0)("dist sin datos privados", () => {
    for (const file of html) {
        test(file.replace(ROOT, ""), () => {
            expect(findLeaks(visibleText(readFileSync(file, "utf8")), extra)).toEqual([]);
        });
    }
});
```

- [ ] **Step 5: Comprobar**

Run: `pnpm build && pnpm test tests/privacy`
Expected: PASS. Si salta en la wiki real, es una fuga: mover el dato a `wiki/private/` (no tocar el patrón salvo que sea un falso positivo evidente; en ese caso añadir el caso a los negativos del detector).

Sugerir al humano crear `wiki/private/forbidden-strings.txt` con su teléfono, calle y fecha de nacimiento (una por línea). No crearlo con datos reales desde el plan.

- [ ] **Step 6: Commit**

```bash
git add tests/support/privacy.ts tests/privacy
git commit -m "test(privacy): Scan public wiki and built site for personal data"
```

---

### Task 11: E2E y accesibilidad

**Files:**
- Create: `tests/e2e/home.spec.ts`
- Delete: `tests/e2e/smoke.spec.ts` (lo sustituye `home.spec.ts`)

- [ ] **Step 1: Escribir los tests**

`tests/e2e/home.spec.ts`:

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
    { path: "/", lang: "es", other: "/en/", otherLabel: "English" },
    { path: "/en/", lang: "en", other: "/", otherLabel: "Español" },
];

for (const p of pages) {
    test.describe(`portada ${p.lang}`, () => {
        test("idioma, título y nombre", async ({ page }) => {
            await page.goto(p.path);
            await expect(page.locator("html")).toHaveAttribute("lang", p.lang);
            await expect(page).toHaveTitle(/\S/);
            await expect(page.locator("h1")).toHaveCount(1);
            await expect(page.locator("h1")).not.toBeEmpty();
        });

        test("todas las secciones del menú existen y tienen contenido", async ({ page }) => {
            await page.goto(p.path);
            const anchors = await page.locator('header a[href^="#"]').evaluateAll((els) =>
                els.map((e) => e.getAttribute("href")!),
            );
            expect(anchors.length).toBeGreaterThan(0);
            for (const href of anchors) {
                const section = page.locator(href);
                await expect(section, href).toHaveCount(1);
                await expect(section.locator("h2"), href).not.toBeEmpty();
            }
        });

        test("no se cuelan valores sin resolver", async ({ page }) => {
            await page.goto(p.path);
            const text = await page.locator("body").innerText();
            expect(text).not.toMatch(/undefined|\[object Object\]|NaN/);
        });

        test("la foto de perfil tiene texto alternativo", async ({ page }) => {
            await page.goto(p.path);
            await expect(page.locator("#about img")).toHaveAttribute("alt", /\S/);
        });

        test("enlaces externos bien formados", async ({ page }) => {
            await page.goto(p.path);
            const hrefs = await page.locator("#contact a").evaluateAll((els) =>
                els.map((e) => e.getAttribute("href")!),
            );
            expect(hrefs.some((h) => /^mailto:[^@\s]+@[^@\s]+\.[a-z]+$/i.test(h))).toBe(true);
            expect(hrefs.some((h) => h.startsWith("https://www.linkedin.com/in/"))).toBe(true);
            expect(hrefs.some((h) => h.startsWith("https://github.com/"))).toBe(true);
        });

        test("el selector lleva al otro idioma", async ({ page }) => {
            await page.goto(p.path);
            await page.getByRole("link", { name: p.otherLabel }).click();
            await expect(page).toHaveURL(new RegExp(`${p.other}$`));
        });

        test("sin violaciones de accesibilidad graves", async ({ page }) => {
            await page.goto(p.path);
            const results = await new AxeBuilder({ page }).analyze();
            const serious = results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
            expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
        });
    });
}
```

- [ ] **Step 2: Ejecutar**

Run: `pnpm test:e2e`
Expected: 14 tests PASS. Si axe reporta contraste u otra violación, corregir el marcado o las clases de Tailwind (no excluir la regla).

- [ ] **Step 3: Commit**

```bash
git rm tests/e2e/smoke.spec.ts
git add tests/e2e/home.spec.ts
git commit -m "test(e2e): Cover both locales, navigation, links and accessibility"
```

---

### Task 12: Documentación

**Files:**
- Modify: `docs/system-design.md`, `docs/superpowers/specs/2026-10-02-portfolio-content-design.md`, `README.md`, `CLAUDE.md`

- [ ] **Step 1: `docs/system-design.md`**

- §2 *Módulos*: añadir `src/lib/` (esquemas, fechas, orden, vista), `src/i18n/` y `tests/`.
- §3.2 *Composición*: sustituir el diagrama por el de la spec §3.1 con `HomePage.astro` y las seis secciones; explicar que las secciones reciben props y no leen colecciones.
- §3.3 *Internacionalización*: rutas nativas + `ui.ts` + bloque `en:`; añadir el párrafo de Paraglide: «Descartado por ahora (sin JS de cliente que optimizar, solapa el routing de Astro, añade herramientas a la plantilla). Pasar a él si entra un tercer idioma, el texto de interfaz crece a decenas de cadenas o se necesitan plurales; el cambio queda limitado a `ui.ts` y sus usos.»
- §4.2 *Contrato*: sustituir el bloque de código «propuesta» por una referencia a `src/lib/schemas.ts` y `src/content.config.ts` y actualizar la tabla (projects y skills ya tienen sección).
- Nueva subsección *Tests* con la tabla de niveles y los scripts (copiar de la spec §5).
- §7 *Estado*: actualizar la tabla (layout, secciones, colecciones, contenido hechos; diseño visual y despliegue pendientes). Fases 1–4 hechas.
- §7 *Cuestiones abiertas*: quitar «Contenido en inglés» y «Cuerpo de las páginas» (resueltas).
- §8 *Decisiones*: añadir filas «Traducción en el frontmatter (`en:`) | Páginas por idioma, traducción en build | Una página por entidad, validada por Zod», «Diccionario propio para la interfaz | Paraglide JS | Sin JS de cliente; ver §3.3» y «Secciones con props | Secciones que leen colecciones | Testeables con la Container API».

- [ ] **Step 2: Spec**

En la spec, §3.1: «Secciones leen colecciones» → «`HomePage` lee las colecciones y pasa props localizadas a las secciones»; §3.2: `src/content/schemas.ts` → `src/lib/schemas.ts` y añadir `src/lib/home.ts`. Cambiar `Estado: pendiente de revisión` por `Estado: implementada`.

- [ ] **Step 3: README y CLAUDE.md**

- `README.md`: en *Puesta en marcha*, añadir `pnpm test`, `pnpm test:e2e` y `pnpm check`, y la nota de `pnpm exec playwright install chromium`.
- `CLAUDE.md`: en *Portfolio*, secciones `intro`, `experience`, `projects`, `skills`, `education`, `contact`; alias `@lib`, `@i18n`; comandos de test.

- [ ] **Step 4: Verificación final**

Run: `pnpm check && pnpm test && pnpm test:e2e`
Expected: todo en verde.

- [ ] **Step 5: Commit**

```bash
git add docs README.md CLAUDE.md
git commit -m "docs: Document content contract, i18n and test strategy"
```
