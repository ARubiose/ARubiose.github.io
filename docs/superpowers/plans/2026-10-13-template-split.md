# Plantilla reutilizable y repo personal con `upstream`: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir este repo en la plantilla `ARubiose/llm-wiki-portfolio` (contenido de Ada, demo en Pages) y dejar `ARubiose/ARubiose.github.io` como repo personal que trae las mejoras desde `upstream`.

**Architecture:** En la rama `feat/template` se hace que el sitio no dependa del dueño: `site`/`base` deducidos de `GITHUB_REPOSITORY`, contenido leído de `WIKI_DIR` y e2e sobre un fixture fijo (Ada). Después se cambia el contenido por el de Ada, se escriben la documentación y la guía y se publica como repo nuevo. Por último, el repo personal hace merge de `upstream/main` conservando su contenido y fija `merge=ours` para los archivos de contenido.

**Tech Stack:** Astro 7, Tailwind 4, Vitest 5, Playwright 1.63, sharp, pnpm 12, Node 24, GitHub Actions/Pages, `gh`.

**Spec:** [docs/superpowers/specs/2026-10-13-template-split-design.md](../specs/2026-10-13-template-split-design.md)

## Global Constraints

- Node 24: antes de `pnpm`, ejecutar `source ~/.nvm/nvm.sh && nvm use` (el shell trae Node 18).
- Identidad: commits con `user.email alvaro.rubio.segovia@gmail.com` y `commit.gpgsign false` (comprobar `git config --local`). Toda llamada a `gh` lleva el prefijo `GH_TOKEN=$(gh auth token --user ARubiose)`. Nunca usar la cuenta `ARubios`.
- Los commits terminan con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Nada de `raw/` ni de `wiki/private/` en archivos versionados ni en mensajes de commit.
- Nombres de archivos en inglés; contenido y comentarios en español (salvo `README.md` y `docs/guide.md`, que van en inglés).
- `deploy.yml` no cambia.
- Push y creación de repos: solo en las tareas 9 y 10, y con confirmación explícita del autor justo antes.
- Las capturas visuales se generan en este mismo Linux.

## Desviaciones del spec (decididas al planificar)

- **`public/favicon.svg` es el logo de Astro**, no un dato personal, así que se comparte y se queda fuera de `merge=ours`.
- **`wiki/index.md` es contenido** (catálogo de las páginas públicas): se añade a los archivos que difieren (§2.3 del spec) y a `merge=ours`.
- **Sin nota de licencia propia en el README personal.** El README de la plantilla dice, de forma genérica, que la licencia MIT cubre el código y que el contenido de `wiki/public/` y las imágenes de `public/` son de quien publica el sitio (en la plantilla, ficticios). Es cierto en los dos repos, así que los README no divergen.
- **Criterio de «sin datos del autor»:** se permiten `ARubiose/llm-wiki-portfolio` y `arubiose.github.io/llm-wiki-portfolio` (la plantilla tiene que nombrarse a sí misma) y el copyright de `LICENSE`.

## Review Focus

1. **Un build real después de uno del fixture usa contenido viejo de caché**: Astro guarda las colecciones en `cacheDir`. Cada `WIKI_DIR` necesita su propia caché, o la web personal podría publicarse con Ada. Lo prueba la tarea 3 (paso 6).
2. **Repo de plantilla con nombre propio (base `/<repo>/`)**: ningún enlace, script ni imagen puede apuntar a la raíz del dominio. Lo prueban las tareas 2 y 4.
3. **El presupuesto de JS con `base`** no puede dar «no se encontró ningún script propio» (hoy junta `dist/` con la URL completa). Lo prueba la tarea 2.
4. **`GITHUB_REPOSITORY` con mayúsculas o un `SITE_URL` sin barra final** (`ARubiose/ARubiose.github.io`, `https://x.dev`) tienen que dar la raíz y una URL bien formada. Lo prueba la tarea 1.
5. **El `dist/` que se publica tiene que ser el real** aunque los e2e construyan el fixture: el fixture se construye en otro `outDir`. Lo prueba la tarea 3 (paso 6).

---

### Task 1: `pagesTarget`: `site`, `base`, `outDir` y `cacheDir` desde el entorno

**Files:**
- Create: `src/lib/site.ts`
- Create: `tests/unit/site.test.ts`
- Modify: `astro.config.mjs:1-14`

**Interfaces:**
- Produces: `pagesTarget(env: Record<string, string | undefined>): { site: string; base: string }`, donde `base` empieza y acaba en `/`, y `buildDirs(env): { wikiDir: string; outDir: string; cacheDir: string }`.

- [ ] **Step 1: Crear la rama**

```bash
git switch -c feat/template
```

- [ ] **Step 2: Test que falla**

`tests/unit/site.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { buildDirs, pagesTarget } from "@lib/site";

describe("pagesTarget", () => {
    test("repo de usuario <owner>.github.io: raíz", () => {
        expect(pagesTarget({ GITHUB_REPOSITORY: "ada/ada.github.io" })).toEqual({ site: "https://ada.github.io", base: "/" });
    });

    test("sin distinguir mayúsculas y con el owner en minúsculas", () => {
        expect(pagesTarget({ GITHUB_REPOSITORY: "ARubiose/ARubiose.github.io" })).toEqual({ site: "https://arubiose.github.io", base: "/" });
    });

    test("cualquier otro repo: subruta /<repo>/", () => {
        expect(pagesTarget({ GITHUB_REPOSITORY: "ARubiose/llm-wiki-portfolio" })).toEqual({ site: "https://arubiose.github.io", base: "/llm-wiki-portfolio/" });
    });

    test("SITE_URL y BASE_PATH tienen prioridad y se normalizan", () => {
        expect(pagesTarget({ SITE_URL: "https://ada.dev/", BASE_PATH: "demo", GITHUB_REPOSITORY: "a/b" })).toEqual({ site: "https://ada.dev", base: "/demo/" });
    });

    test("SITE_URL sin BASE_PATH: raíz", () => {
        expect(pagesTarget({ SITE_URL: "https://ada.dev", GITHUB_REPOSITORY: "a/b" })).toEqual({ site: "https://ada.dev", base: "/" });
    });

    test("sin entorno (desarrollo local): localhost", () => {
        expect(pagesTarget({})).toEqual({ site: "http://localhost:4321", base: "/" });
    });
});

describe("buildDirs", () => {
    test("por defecto: wiki/public, dist y la caché de Astro de siempre", () => {
        expect(buildDirs({})).toEqual({ wikiDir: "./wiki/public", outDir: "./dist", cacheDir: "./node_modules/.astro" });
    });

    test("otro WIKI_DIR usa su propia caché para no mezclar colecciones", () => {
        expect(buildDirs({ WIKI_DIR: "tests/fixtures/site", OUT_DIR: ".fixture-dist" })).toEqual({
            wikiDir: "./tests/fixtures/site",
            outDir: "./.fixture-dist",
            cacheDir: "./node_modules/.astro-tests-fixtures-site",
        });
    });
});
```

- [ ] **Step 3: Comprobar que falla**

Run: `source ~/.nvm/nvm.sh && nvm use >/dev/null && pnpm vitest run tests/unit/site.test.ts`
Expected: FAIL (`Failed to resolve import "@lib/site"`).

- [ ] **Step 4: Implementación**

`src/lib/site.ts`:

```ts
type Env = Record<string, string | undefined>;

const DEFAULT_WIKI = "wiki/public";
const rel = (p: string) => `./${p.replace(/^\.\//, "").replace(/\/+$/, "")}`;
const slash = (p: string) => `/${p.replace(/^\/+|\/+$/g, "")}/`.replace(/\/{2,}/g, "/");

/**
 * Dónde se publica el sitio. Prioridad: SITE_URL (+ BASE_PATH), después GITHUB_REPOSITORY
 * (lo pone Actions: <owner>.github.io va a la raíz, cualquier otro repo a /<repo>/) y, sin
 * ninguno, localhost para desarrollo.
 */
export function pagesTarget(env: Env): { site: string; base: string } {
    if (env.SITE_URL?.trim()) return { site: env.SITE_URL.trim().replace(/\/+$/, ""), base: slash(env.BASE_PATH ?? "") };
    const [owner, repo] = (env.GITHUB_REPOSITORY ?? "").toLowerCase().split("/");
    if (!owner || !repo) return { site: "http://localhost:4321", base: "/" };
    const site = `https://${owner}.github.io`;
    return { site, base: repo === `${owner}.github.io` ? "/" : slash(repo) };
}

/** Directorios del build: la wiki que se lee, dónde se escribe y una caché de colecciones por wiki. */
export function buildDirs(env: Env): { wikiDir: string; outDir: string; cacheDir: string } {
    const wiki = (env.WIKI_DIR?.trim() || DEFAULT_WIKI).replace(/^\.\//, "").replace(/\/+$/, "");
    const cacheDir = wiki === DEFAULT_WIKI ? "./node_modules/.astro" : `./node_modules/.astro-${wiki.replace(/[^a-z0-9]+/gi, "-")}`;
    return { wikiDir: rel(wiki), outDir: rel(env.OUT_DIR?.trim() || "dist"), cacheDir };
}
```

- [ ] **Step 5: Comprobar que pasa**

Run: `pnpm vitest run tests/unit/site.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Llevarlo a `astro.config.mjs`**

Sustituir la cabecera hasta `site:` por:

```js
// @ts-check
import { defineConfig, envField, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import { defaultLocale, localeTags } from "./src/i18n/ui.ts";
import { buildDirs, pagesTarget } from "./src/lib/site.ts";

// site y base salen del entorno (GITHUB_REPOSITORY en Actions): la plantilla funciona con cualquier nombre de repo.
const { site, base } = pagesTarget(process.env);
const { outDir, cacheDir } = buildDirs(process.env);

// https://astro.build/config
export default defineConfig({
    site,
    base,
    outDir,
    cacheDir,
```

(El resto del archivo, desde `i18n:`, no cambia.)

- [ ] **Step 7: Verificar que el build por defecto sigue igual**

Run: `GITHUB_REPOSITORY=ARubiose/ARubiose.github.io pnpm build && grep -o '<link rel="canonical" href="[^"]*"' dist/index.html`
Expected: `<link rel="canonical" href="https://arubiose.github.io/"`.

Run: `pnpm check && pnpm test`
Expected: sin errores, todo en verde.

- [ ] **Step 8: Commit**

```bash
git add src/lib/site.ts tests/unit/site.test.ts astro.config.mjs
git commit -m "feat(site): Derive site, base and build dirs from the environment"
```

---

### Task 2: Rutas que respetan `base`

**Files:**
- Modify: `src/layouts/Layout.astro:20-21,30`
- Modify: `src/lib/seo.ts` (`robotsTxt`)
- Modify: `src/pages/robots.txt.ts`
- Modify: `tests/unit/seo.test.ts` (o el test existente de `robotsTxt`; buscarlo con `grep -rn robotsTxt tests`)
- Modify: `tests/perf/budget.test.ts:10-13,31-36`
- Create: `tests/build/base.test.ts`
- Create: `vitest.build.config.ts`
- Modify: `vitest.config.ts`, `package.json` (scripts)

**Interfaces:**
- Consumes: `pagesTarget` (tarea 1).
- Produces: `robotsTxt(site: URL, base: string): string`; script `pnpm test:build`.

- [ ] **Step 1: Test de `robotsTxt` con base, que falla**

Añadir al test existente de `robotsTxt`:

```ts
test("con base, el sitemap cuelga de la subruta", () => {
    expect(robotsTxt(new URL("https://ada.github.io"), "/demo/")).toBe("User-agent: *\nAllow: /\n\nSitemap: https://ada.github.io/demo/sitemap-index.xml\n");
});
```

y actualizar la llamada que ya existía a `robotsTxt(site, "/")`.

Run: `pnpm vitest run -t robots`
Expected: FAIL.

- [ ] **Step 2: Implementar**

`src/lib/seo.ts`:

```ts
export function robotsTxt(site: URL, base: string): string {
    return `User-agent: *\nAllow: /\n\nSitemap: ${new URL(`${base}sitemap-index.xml`, site).href}\n`;
}
```

`src/pages/robots.txt.ts`:

```ts
export const GET: APIRoute = ({ site }) =>
    new Response(robotsTxt(requireSite(site), import.meta.env.BASE_URL), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
```

Comprobar que `import.meta.env.BASE_URL` acaba en `/`. Astro lo da tal cual viene de `base`, y `pagesTarget` siempre añade la barra final.

`src/layouts/Layout.astro`, en el frontmatter:

```ts
const base = import.meta.env.BASE_URL;
const ogImage = new URL(`${base}og-image.png`, site).href;
```

y en el `<head>`: `<link rel="icon" type="image/svg+xml" href={`${base}favicon.svg`} />`.

`pageUrl` (`new URL(Astro.url.pathname, site)`) ya es correcto: `Astro.url.pathname` incluye la base.

Run: `pnpm vitest run -t robots`
Expected: PASS.

- [ ] **Step 3: Test de build con base, que falla**

`vitest.build.config.ts`:

```ts
import { defineConfig } from "vitest/config";

// Tests que construyen el sitio (lentos): fuera de `pnpm test`, dentro de `pnpm test:e2e`.
export default defineConfig({ test: { include: ["tests/build/**/*.test.ts"], testTimeout: 240_000 } });
```

En `vitest.config.ts`, añadir `"tests/build/**"` a `exclude`. En `package.json`, añadir `"test:build": "vitest run --config vitest.build.config.ts"` y cambiar `test:e2e` a `"playwright test && pnpm test:build && vitest run tests/privacy tests/perf"` (la tarea 4 añade el smoke).

`tests/build/base.test.ts`:

```ts
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";

const ROOT = join(import.meta.dirname, "../..");

// Repo de plantilla con nombre propio: todo lo que el HTML pide tiene que colgar de /<repo>/.
test("construido con base, ninguna URL interna apunta a la raíz del dominio", () => {
    const out = mkdtempSync(join(tmpdir(), "base-"));
    execFileSync("pnpm", ["exec", "astro", "build"], {
        cwd: ROOT,
        stdio: "pipe",
        env: { ...process.env, WIKI_DIR: "tests/fixtures/site", OUT_DIR: out, SITE_URL: "https://ada.github.io", BASE_PATH: "/demo/" },
    });
    const pages = readdirSync(out, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".html"));
    expect(pages.length).toBeGreaterThan(1);
    const offenders = pages.flatMap((page) =>
        [...readFileSync(join(out, page), "utf8").matchAll(/\b(?:href|src|srcset|content)="(\/(?!demo\/)[^"]*)"/g)].map((m) => `${page}: ${m[1]}`),
    );
    expect(offenders).toEqual([]);
    expect(readFileSync(join(out, "robots.txt"), "utf8")).toContain("https://ada.github.io/demo/sitemap-index.xml");
});
```

Nota: este test necesita el fixture `tests/fixtures/site/`, que crea la tarea 3. Hasta entonces se ejecuta con `WIKI_DIR` apuntando a `wiki/public`: cambiar la línea a `WIKI_DIR: "wiki/public"` en este paso y volver a `tests/fixtures/site` en la tarea 3, paso 5.

Run: `pnpm test:build`
Expected: FAIL. Lista al menos `/favicon.svg` y `/og-image.png`, o bien rutas de `_astro` si alguna se escapa.

- [ ] **Step 4: Corregir lo que liste el test**

Repetir `pnpm test:build` y corregir cada ruta que aparezca, usando `import.meta.env.BASE_URL` en componentes y `getRelativeLocaleUrl` para los enlaces de idioma (ya lo usan). Solo deben salir las del paso 2. Si sale algo de `src/scripts/` (rutas en JS), corregirlo igual y anotarlo en el commit.

Expected: PASS.

- [ ] **Step 5: El presupuesto de JS entiende `base`**

En `tests/perf/budget.test.ts`, que `localScripts` quite la base antes de juntar con `DIST`:

```ts
import { pagesTarget } from "../../src/lib/site";

// Con base (repo de plantilla con nombre propio), los src llevan /<repo>/ delante; dist/ no.
const BASE = pagesTarget(process.env).base;

/** Scripts propios de la página, relativos a dist/; los de terceros (analítica) no salen de dist/ ni cuentan. */
function localScripts(html: string, base = BASE): string[] {
    return [...html.matchAll(/<script[^>]*src="(\/[^/"][^"]*\.js)"/g)]
        .map((m) => m[1])
        .filter((src) => src.startsWith(base))
        .map((src) => `/${src.slice(base.length)}`);
}
```

Añadir un test unitario en el mismo archivo:

```ts
test("los scripts con base se resuelven dentro de dist/", () => {
    const html = '<script type="module" src="/demo/_astro/a.js"></script><script src="https://static.cloudflareinsights.com/beacon.min.js"></script>';
    expect(localScripts(html, "/demo/")).toEqual(["/_astro/a.js"]);
});
```

Run: `pnpm vitest run tests/perf/budget.test.ts`
Expected: PASS. Después, `GITHUB_REPOSITORY=ARubiose/llm-wiki-portfolio pnpm build && GITHUB_REPOSITORY=ARubiose/llm-wiki-portfolio pnpm vitest run tests/perf` también en PASS.

- [ ] **Step 6: Comprobación y commit**

Run: `pnpm build && pnpm check && pnpm test && pnpm test:e2e`
Expected: todo en verde (el e2e todavía sobre el contenido real).

```bash
git add -A src tests vitest.config.ts vitest.build.config.ts package.json
git commit -m "feat(site): Respect the base path in every internal URL"
```

---

### Task 3: Fixture de Ada y e2e sobre él

**Files:**
- Create: `tests/fixtures/site/**` (contenido de abajo) y `tests/fixtures/site/profile.jpg`
- Create: `scripts/make-placeholder-images.mjs`
- Modify: `src/content.config.ts:11`
- Modify: `playwright.config.ts`
- Modify: `.gitignore`
- Modify: `tests/e2e/support.ts`, `seo.spec.ts`, `home.spec.ts:43-68`, `motion.spec.ts`, `builder.spec.ts:36-42`, `game.spec.ts:96`
- Modify: `tests/content/wiki.test.ts` (valida también el fixture)
- Regenerate: `tests/e2e/visual.spec.ts-snapshots/*.png`

**Interfaces:**
- Consumes: `buildDirs` (tarea 1).
- Produces: `FIXTURE_SITE = "https://ada.example"` y `FIXTURE_NAME = "Ada Lovelace"`, exportados por `tests/e2e/support.ts`; el directorio `tests/fixtures/site/`; el script `scripts/make-placeholder-images.mjs` (lo usa la tarea 6).

- [ ] **Step 1: `content.config.ts` lee `WIKI_DIR`**

```ts
import { buildDirs } from "@lib/site";

// WIKI_DIR permite construir otra wiki (los e2e usan tests/fixtures/site); por defecto, wiki/public.
const { wikiDir } = buildDirs(process.env);
const wiki = (pattern: string, base: string) => glob({ pattern, base: `${wikiDir}/${base}` });
```

- [ ] **Step 2: Imágenes de ejemplo**

`scripts/make-placeholder-images.mjs`:

```js
// Imágenes genéricas de la plantilla (avatar e imagen al compartir), sin personas reales.
// Uso: node scripts/make-placeholder-images.mjs <profile.jpg> [og-image.png]
import sharp from "sharp";

const [photo, og] = process.argv.slice(2);
const avatar = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1f3a4d"/><stop offset="1" stop-color="#0d1b24"/></linearGradient></defs>
  <rect width="800" height="800" fill="url(#g)"/>
  <circle cx="400" cy="310" r="150" fill="#5fa8a0"/>
  <path d="M130 800c20-190 140-290 270-290s250 100 270 290z" fill="#5fa8a0"/>
</svg>`;
await sharp(Buffer.from(avatar)).jpeg({ quality: 85 }).toFile(photo);

if (og) {
    const card = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="627">
  <rect width="1200" height="627" fill="#0d1b24"/>
  <text x="80" y="300" font-family="monospace" font-size="72" fill="#e6edf3">Ada Lovelace</text>
  <text x="80" y="380" font-family="monospace" font-size="36" fill="#5fa8a0">Backend software engineer · demo</text>
  <text x="80" y="540" font-family="monospace" font-size="28" fill="#8b949e">llm-wiki-portfolio</text>
</svg>`;
    await sharp(Buffer.from(card)).png().toFile(og);
}
```

Run: `mkdir -p tests/fixtures/site && node scripts/make-placeholder-images.mjs tests/fixtures/site/profile.jpg && file tests/fixtures/site/profile.jpg`
Expected: `JPEG image data … 800x800`.

- [ ] **Step 3: Contenido de Ada en `tests/fixtures/site/`**

Todas las páginas llevan `sources: ["humano (2026-10-13)"]` y `updated: 2026-10-13`. El cuerpo es prosa corta de wiki (no se publica).

`profile.md`:

```markdown
---
title: Perfil
type: profile
name: Ada Lovelace
headline: Ingeniera de software backend
location: Londres
summary: Ingeniera de software que diseña backends en Python y aplica visión por computador. Perfil ficticio de demostración de la plantilla.
links:
  email: ada@example.com
  linkedin: https://www.linkedin.com/in/ada-example/
  github: https://github.com/ada-example
  source: https://github.com/ARubiose/llm-wiki-portfolio
photo: ./profile.jpg
tags: [demo]
en:
  headline: Backend software engineer
  summary: Software engineer who designs Python backends and applies computer vision. Fictitious demo profile for the template.
sources: ["humano (2026-10-13)"]
updated: 2026-10-13
---

# Perfil

Ada es un perfil ficticio para enseñar la plantilla. Sustitúyelo con `/ingest`.
```

`experience/analytical-engines.md`:

```markdown
---
title: Analytical Engines Ltd
type: experience
company: Analytical Engines Ltd
role: Desarrolladora backend
start: 2022-09
end: null
summary: Backends en Python para procesar archivos de forma asíncrona.
highlights:
  - Procesamiento asíncrono con FastAPI, Django, Celery y Redis.
  - Despliegue con Docker y CI/CD en GitHub Actions.
skills: [python, fastapi, django, celery, redis, software-architecture, docker, pytest, github-actions, react, web-fundamentals]
tags: [backend]
en:
  role: Backend developer
  summary: Python backends for asynchronous file processing.
  highlights:
    - Asynchronous processing with FastAPI, Django, Celery and Redis.
    - Deployment with Docker and CI/CD on GitHub Actions.
sources: ["humano (2026-10-13)"]
updated: 2026-10-13
---

# Analytical Engines Ltd

Empresa ficticia de la demo.
```

`experience/difference-labs.md`:

```markdown
---
title: Difference Labs
type: experience
company: Difference Labs
role: Investigadora en visión por computador
start: 2020-10
end: 2022-08
summary: Modelos de visión por computador y agentes LLM para prototipos de investigación.
highlights:
  - Segmentación de imágenes con deep learning.
skills: [python, computer-vision, llm-agents]
tags: [ia]
en:
  role: Computer vision researcher
  summary: Computer vision models and LLM agents for research prototypes.
  highlights:
    - Image segmentation with deep learning.
sources: ["humano (2026-10-13)"]
updated: 2026-10-13
---

# Difference Labs

Laboratorio ficticio de la demo.
```

`experience/jacquard-security.md`:

```markdown
---
title: Jacquard Security
type: experience
company: Jacquard Security
role: Becaria de ciberseguridad
start: 2019-06
end: 2019-12
summary: Prácticas en un equipo de seguridad, con herramientas OSINT en Python.
highlights: []
skills: [python, osint]
tags: [seguridad]
en:
  role: Cybersecurity intern
  summary: Internship in a security team, building OSINT tools in Python.
  highlights: []
sources: ["humano (2026-10-13)"]
updated: 2026-10-13
---

# Jacquard Security

Empresa ficticia de la demo.
```

`projects/note-engine.md`:

```markdown
---
title: Motor de notas
type: project
repo: https://github.com/ada-example/note-engine
status: active
start: 2024-03
summary: App multiplataforma que organiza notas con un agente LLM.
highlights:
  - App en Expo con un backend en FastAPI.
skills: [expo, fastapi, llm-agents]
tags: [demo]
en:
  title: Note engine
  summary: Cross-platform app that organizes notes with an LLM agent.
  highlights:
    - Expo app with a FastAPI backend.
sources: ["humano (2026-10-13)"]
updated: 2026-10-13
---

# Motor de notas

Proyecto ficticio de la demo.
```

`education/university-of-example.md`:

```markdown
---
title: Grado en Ingeniería Informática
type: education
kind: degree
institution: University of Example
degree: Grado en Ingeniería Informática
start: 2015-09
end: 2019-06
grade: 8.7
summary: Grado con orientación a sistemas y datos.
tags: []
en:
  degree: BSc in Computer Science
  summary: Degree focused on systems and data.
sources: ["humano (2026-10-13)"]
updated: 2026-10-13
---

# Grado en Ingeniería Informática

Universidad ficticia de la demo.
```

`education/example-institute.md`:

```markdown
---
title: Máster en Ingeniería del Software
type: education
kind: degree
institution: Example Institute of Technology
degree: Máster en Ingeniería del Software
start: 2019-09
end: 2020-09
summary: Máster en diseño y arquitectura de software.
tags: []
en:
  degree: MSc in Software Engineering
  summary: Master's degree in software design and architecture.
sources: ["humano (2026-10-13)"]
updated: 2026-10-13
---

# Máster en Ingeniería del Software

Centro ficticio de la demo.
```

`education/cloud-certificate.md`:

```markdown
---
title: Certificación en arquitectura cloud
type: education
kind: certificate
institution: Example Certification Board
degree: Certificación en arquitectura cloud
start: 2021
end: 2021
summary: Certificación en diseño de sistemas en la nube.
tags: []
en:
  degree: Cloud Architecture Certification
  summary: Certification in cloud system design.
sources: ["humano (2026-10-13)"]
updated: 2026-10-13
---

# Certificación en arquitectura cloud

Certificación ficticia de la demo.
```

`skills/<id>.md`: una por fila, con esta forma exacta (title, category e icon de la tabla, que son los mismos ids que usan los e2e):

```markdown
---
title: <title>
type: skill
category: <category>
icon: <icon>
summary: <summary>
tags: []
en:
  summary: <en.summary>
sources: ["humano (2026-10-13)"]
updated: 2026-10-13
---

# <title>

<summary>
```

| id | title | category | icon | summary | en.summary |
| --- | --- | --- | --- | --- | --- |
| python | Python | backend | si:python | Lenguaje principal en backend y datos. | Main language for backend and data. |
| fastapi | FastAPI | backend | si:fastapi | APIs asíncronas en Python. | Asynchronous APIs in Python. |
| django | Django | backend | si:django | Framework web en Python. | Python web framework. |
| celery | Celery | backend | si:celery | Colas de tareas asíncronas. | Asynchronous task queues. |
| redis | Redis | backend | si:redis | Broker de mensajes y caché. | Message broker and cache. |
| software-architecture | Arquitectura de software | backend | ph:tree-structure | Diseño de sistemas escalables. | Designing scalable systems. |
| computer-vision | Deep learning y visión por computador | ai | ph:scan | Modelos de visión con deep learning. | Deep learning vision models. |
| llm-agents | Agentes LLM | ai | ph:robot | Agentes que usan herramientas y memoria. | Agents that use tools and memory. |
| react | React | frontend | si:react | Interfaces web con componentes. | Component-based web interfaces. |
| expo | Expo | frontend | si:expo | Apps web y móviles multiplataforma. | Cross-platform web and mobile apps. |
| web-fundamentals | HTML, CSS y JavaScript | frontend | si:html5 | Fundamentos de la web. | Web fundamentals. |
| docker | Docker | devops | si:docker | Contenedores para desarrollo y despliegue. | Containers for development and deployment. |
| pytest | pytest | devops | si:pytest | Tests en Python. | Testing in Python. |
| github-actions | GitHub Actions | devops | si:githubactions | Pipelines de CI/CD. | CI/CD pipelines. |
| osint | OSINT y ciberseguridad | security | ph:detective | Investigación en fuentes abiertas. | Open-source intelligence. |

- [ ] **Step 4: El contrato también valida el fixture**

En `tests/content/wiki.test.ts`, convertir `WIKI` en un bucle sobre las dos wikis:

```ts
const WIKIS = { "wiki/public": join(import.meta.dirname, "../../wiki/public"), "tests/fixtures/site": join(import.meta.dirname, "../fixtures/site") };

for (const [label, WIKI] of Object.entries(WIKIS)) {
    describe(label, () => {
        // …el cuerpo actual del archivo, sin cambios, usando WIKI…
    });
}
```

Run: `pnpm vitest run tests/content/wiki.test.ts`
Expected: PASS en las dos wikis (si falla un icono o una fecha del fixture, corregir el fixture).

- [ ] **Step 5: Playwright construye el fixture en su propio `outDir`**

`.gitignore`: añadir `.fixture-dist/` bajo `# build output`.

`playwright.config.ts`: sustituir el `webServer` por:

```ts
// Los e2e corren sobre Ada (tests/fixtures/site), en su propio outDir: el dist/ real no se toca.
const FIXTURE_ENV = "WIKI_DIR=tests/fixtures/site OUT_DIR=.fixture-dist SITE_URL=https://ada.example BASE_PATH=/";
```

```ts
    webServer: {
        command: `${FIXTURE_ENV} pnpm build && ${FIXTURE_ENV} pnpm preview --host 127.0.0.1 --port ${PORT} --ignore-lock`,
        url: `http://127.0.0.1:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
```

`tests/e2e/support.ts`, al final:

```ts
/** Contenido fijo de los e2e (tests/fixtures/site, construido con SITE_URL=FIXTURE_SITE). */
export const FIXTURE_SITE = "https://ada.example";
export const FIXTURE_NAME = "Ada Lovelace";
```

En `tests/build/base.test.ts`, volver a `WIKI_DIR: "tests/fixtures/site"`.

- [ ] **Step 6: Comprobar que los builds no se mezclan (Review Focus 1 y 5)**

```bash
pnpm build && grep -c "Ada Lovelace" dist/index.html                     # 0
WIKI_DIR=tests/fixtures/site OUT_DIR=.fixture-dist SITE_URL=https://ada.example pnpm build
grep -c "Ada Lovelace" .fixture-dist/index.html                          # >0
pnpm build && grep -c "Ada Lovelace" dist/index.html                     # 0
```

Expected: los tres valores indicados. Si el tercero no es 0, la caché se está compartiendo: revisar `cacheDir` en `astro.config.mjs`.

- [ ] **Step 7: Adaptar los e2e a Ada**

- `seo.spec.ts`: `import { FIXTURE_SITE as SITE } from "./support";` en lugar de la constante fija.
- `home.spec.ts`: importar `FIXTURE_SITE` y sustituir cada `"https://arubiose.github.io"` por `FIXTURE_SITE` (las líneas 45, 49 y 57).
- `motion.spec.ts`: importar `FIXTURE_NAME` y sustituir cada `"Álvaro Rubio Segovia"` por `FIXTURE_NAME`.
- `builder.spec.ts:36-41`: el título del test pasa a `"FastAPI + Celery + Docker se combinaron en Analytical Engines (3/3)"` y `"Zalcu Technologies"` a `"Analytical Engines Ltd"`.
- `game.spec.ts:96`: `"Supercalifragilisticoexpialidoso Lovelace"`.

Run: `pnpm exec playwright test --grep-invert "portada"`
Expected: PASS. Si falla un test por depender del contenido (un recuento, una pestaña), ajustar el **fixture** para que tenga ese caso, no el test. Esos tests prueban la interfaz, y el fixture está para eso.

- [ ] **Step 8: Regenerar las capturas y revisarlas**

Run: `pnpm test:visual:update`, y después leer con Read `tests/e2e/visual.spec.ts-snapshots/portada-1-desktop-linux.png` y `portada-1-mobile-game-linux.png`.
Expected: se ve a Ada, el avatar y ningún dato real.

- [ ] **Step 9: Suite completa y commit**

Run: `pnpm check && pnpm build && pnpm test && pnpm test:e2e`
Expected: todo en verde.

```bash
git add -A tests scripts src/content.config.ts playwright.config.ts .gitignore
git commit -m "test(e2e): Run end-to-end tests on a fixed fictitious wiki"
```

---

### Task 4: Smoke e2e sobre el build real

**Files:**
- Create: `playwright.smoke.config.ts`
- Create: `tests/smoke/home.smoke.ts`
- Modify: `package.json` (`test:e2e`)

**Interfaces:**
- Consumes: `pagesTarget` (tarea 1).

- [ ] **Step 1: Configuración**

`playwright.smoke.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";
import { pagesTarget } from "./src/lib/site";

// Smoke sobre el contenido REAL (wiki/public) y el dist/ que se publica, con la base de verdad.
const PORT = 4323;
const { base } = pagesTarget(process.env);
try { process.loadEnvFile(); } catch { /* sin .env: solo el entorno */ }

export default defineConfig({
    testDir: "tests/smoke",
    testMatch: "**/*.smoke.ts",
    use: { baseURL: `http://127.0.0.1:${PORT}${base}`, launchOptions: { args: ["--host-resolver-rules=MAP static.cloudflareinsights.com ~NOTFOUND"] } },
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
        { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    ],
    webServer: {
        command: `pnpm build && pnpm preview --host 127.0.0.1 --port ${PORT} --ignore-lock`,
        url: `http://127.0.0.1:${PORT}${base}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
```

- [ ] **Step 2: El test (rutas relativas, para que funcione con cualquier base)**

`tests/smoke/home.smoke.ts`:

```ts
import { expect, test } from "@playwright/test";

// Genérico: vale para cualquier contenido. No compara textos ni capturas.
for (const path of ["./", "./en/"]) {
    test(`portada ${path} carga limpia con el contenido real`, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("cloudflareinsights")) errors.push(m.text()); });
        const res = await page.goto(path);
        expect(res?.status()).toBe(200);
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.locator("h1")).not.toBeEmpty();
        // Cada enlace de la navegación lleva a una sección que existe y tiene contenido.
        const anchors = await page.locator('a[href^="#"]').evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("href")!))].filter((h) => h.length > 1));
        for (const href of anchors) await expect(page.locator(href)).not.toBeEmpty();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        await page.waitForLoadState("networkidle");
        expect(errors).toEqual([]);
    });
}
```

- [ ] **Step 3: Probarlo, también con base, y demostrar que detecta fallos**

Run: `pnpm exec playwright test -c playwright.smoke.config.ts`
Expected: PASS (4 tests).

Run: `GITHUB_REPOSITORY=ARubiose/llm-wiki-portfolio CI=1 pnpm exec playwright test -c playwright.smoke.config.ts`
Expected: PASS servido bajo `/llm-wiki-portfolio/`.

Mutación: añadir temporalmente `<div style="width:2000px">x</div>` en `src/sections/contact.astro`, ejecutar el smoke y comprobar que falla por desbordamiento. Después revertir con `git checkout src/sections/contact.astro`.

- [ ] **Step 4: Integrarlo en `test:e2e` y commit**

`package.json`: `"test:e2e": "playwright test && playwright test -c playwright.smoke.config.ts && pnpm test:build && vitest run tests/privacy tests/perf"`. El smoke reconstruye `dist/` con el contenido real justo antes del escaneo y del deploy, como hasta ahora.

Run: `pnpm test:e2e`
Expected: verde.

```bash
git add playwright.smoke.config.ts tests/smoke package.json
git commit -m "test(smoke): Check the real build loads cleanly for any content"
```

---

### Task 5: Fixtures unitarios y de componentes sin datos del autor

**Files:**
- Modify: `tests/unit/skills.test.ts:48-52,78-90,113-119`
- Modify: `tests/unit/home.test.ts:96,102`
- Modify: `tests/unit/adorns.test.ts:44-46`
- Modify: `tests/components/base.test.ts:13,17`
- Modify: `tests/components/sections.test.ts:52,78,104-112,167`
- Modify: `src/lib/home.ts:46` (comentario)

- [ ] **Step 1: Sustituciones**

| Antes | Después |
| --- | --- |
| id `zalcu` / `"Zalcu Technologies"` / `zalcu.log` | `analytical` / `"Analytical Engines Ltd"` / `analytical.log` |
| id `gofore` | `difference` |
| id `oesia` | `jacquard` |
| id `skin-ai` | `note-engine` |
| id `upm` / `upm.md` | `example-uni` / `example-uni.md` |
| `"Álvaro Rubio Segovia"` → `"alvaro"`, `"ÁLVARO RUBIO"` | `"Íñigo Montoya Ruiz"` → `"inigo"`, `"ÍÑIGO MONTOYA"` (conserva tildes y eñe, que es lo que prueban) |
| `{ first: "ÁLVARO", second: "RUBIO" }`, `"ÁLVARO // RUBIO"` y sus `parts` | `{ first: "ÍÑIGO", second: "MONTOYA" }`, `"ÍÑIGO // MONTOYA"`, `[{ text: "ÍÑIGO " }, { text: "//", mark: true }, { text: " MONTOYA" }]` |
| `src/lib/home.ts:46` «ÁLVARO RUBIO» | «ADA LOVELACE» |

Se renombran ids y textos a la vez: los tests comparan ids con ids, así que el renombrado es consistente dentro de cada test.

- [ ] **Step 2: Suite y mutación**

Run: `pnpm test`
Expected: verde. Mutación rápida: cambiar `"inigo"` por `"íñigo"` en la expectativa de `home.test.ts` → FAIL, y revertir.

- [ ] **Step 3: Comprobar que no queda nada en código ni tests**

Run: `grep -rniE "álvaro|alvaro|rubio|segovia|zalcu|skin ?ai|gofore|oesia|groningen|urjc|upm|emse" src tests --include=*.ts --include=*.astro --include=*.mjs`
Expected: sin resultados.

- [ ] **Step 4: Commit**

```bash
git add -A tests src/lib/home.ts
git commit -m "test: Use fictitious names in unit and component fixtures"
```

---

### Task 6: El contenido de la plantilla pasa a ser Ada

**Files:**
- Delete: `wiki/public/**` (actual), `docs/superpowers/**`, `docs/design/mockups/**`
- Create: `wiki/public/**` (copia de `tests/fixtures/site/`), `wiki/index.md` (Ada)
- Replace: `public/og-image.png`

- [ ] **Step 1: Sustituir el contenido**

```bash
git rm -rq wiki/public docs/superpowers docs/design/mockups
mkdir -p wiki/public && cp -r tests/fixtures/site/. wiki/public/
node scripts/make-placeholder-images.mjs wiki/public/profile.jpg public/og-image.png
file public/og-image.png   # PNG image data, 1200 x 627
```

(Los planes y specs quedan en el historial y, en el repo personal, en su árbol: tarea 10.)

- [ ] **Step 2: `wiki/index.md` de Ada**

```markdown
# Índice de la wiki

Catálogo de las páginas **públicas** (`wiki/public/`), mantenido por el LLM en cada
`ingest`. Las privadas tienen su propio índice en `wiki/private/index.md`, que no está en git. Convenciones en
[.claude/rules/wiki.md](../.claude/rules/wiki.md).

> Contenido ficticio de demostración (Ada). Sustitúyelo con `/ingest`.

## Perfil

- [Perfil](public/profile.md) — Ingeniera de software que diseña backends en Python y aplica visión por computador.

## Experiencia

- [Analytical Engines Ltd](public/experience/analytical-engines.md) — Backends en Python para procesar archivos de forma asíncrona.
- [Difference Labs](public/experience/difference-labs.md) — Modelos de visión por computador y agentes LLM para prototipos de investigación.
- [Jacquard Security](public/experience/jacquard-security.md) — Prácticas en un equipo de seguridad, con herramientas OSINT en Python.

## Proyectos

- [Motor de notas](public/projects/note-engine.md) — App multiplataforma que organiza notas con un agente LLM.

## Habilidades

- [Agentes LLM](public/skills/llm-agents.md) — Agentes que usan herramientas y memoria.
- [Arquitectura de software](public/skills/software-architecture.md) — Diseño de sistemas escalables.
- [Celery](public/skills/celery.md) — Colas de tareas asíncronas.
- [Deep learning y visión por computador](public/skills/computer-vision.md) — Modelos de visión con deep learning.
- [Django](public/skills/django.md) — Framework web en Python.
- [Docker](public/skills/docker.md) — Contenedores para desarrollo y despliegue.
- [Expo](public/skills/expo.md) — Apps web y móviles multiplataforma.
- [FastAPI](public/skills/fastapi.md) — APIs asíncronas en Python.
- [GitHub Actions](public/skills/github-actions.md) — Pipelines de CI/CD.
- [HTML, CSS y JavaScript](public/skills/web-fundamentals.md) — Fundamentos de la web.
- [OSINT y ciberseguridad](public/skills/osint.md) — Investigación en fuentes abiertas.
- [pytest](public/skills/pytest.md) — Tests en Python.
- [Python](public/skills/python.md) — Lenguaje principal en backend y datos.
- [React](public/skills/react.md) — Interfaces web con componentes.
- [Redis](public/skills/redis.md) — Broker de mensajes y caché.

## Formación

- [Grado en Ingeniería Informática](public/education/university-of-example.md) — Grado con orientación a sistemas y datos.
- [Máster en Ingeniería del Software](public/education/example-institute.md) — Máster en diseño y arquitectura de software.
- [Certificación en arquitectura cloud](public/education/cloud-certificate.md) — Certificación en diseño de sistemas en la nube.
```

Antes de sobrescribirlo, comprobar con `grep "^## " wiki/index.md` que el índice actual no tiene más secciones que estas. Si las tiene, conservar los encabezados (vacíos).

- [ ] **Step 3: Comprobación**

Run: `pnpm build && pnpm test && pnpm test:e2e`
Expected: verde (la wiki real es ahora Ada, y el smoke la sirve).

Run: `grep -rniE "álvaro|alvaro|rubio segovia|zalcu|skin ?ai|gofore|oesia|groningen|urjc|emse|ielts" --exclude-dir={node_modules,dist,.fixture-dist,.git,raw,test-results} . | grep -v "wiki/private"`
Expected: solo `docs/system-design.md`, `README.md` y `CLAUDE.md` (la tarea 7 los resuelve), y `LICENSE` cuando exista.

- [ ] **Step 4: Commit**

```bash
git add -A wiki public/og-image.png docs
git commit -m "feat(template): Replace the owner's content with the fictitious Ada demo"
```

---

### Task 7: Documentación: README bilingüe, guía, licencia, CLAUDE.md, system-design y decisión 0006

**Files:**
- Create: `LICENSE`, `README.es.md`, `docs/guide.md`, `docs/guide.es.md`, `docs/decisions/0006-template-and-upstream.md`
- Rewrite: `README.md` (inglés)
- Modify: `CLAUDE.md`, `docs/system-design.md` (§3.6, §3.7, §7, nueva §3.10), `docs/decisions/README.md` si tiene índice, y la tabla §8 de `system-design.md`

- [ ] **Step 1: `LICENSE`**

Texto MIT estándar con la línea `Copyright (c) 2026 Álvaro Rubio Segovia`.

- [ ] **Step 2: `README.md` (inglés)**

Leer el `README.md` actual entero y traducir su contenido (qué hace el agente, tabla de comandos, estructura, comandos de desarrollo) con estos cambios:

- Primera línea: `**English** · [Español](README.es.md)`.
- Título `# LLM Wiki Portfolio` y una frase: «An Astro portfolio template whose content comes from a knowledge base maintained by an LLM agent (Claude Code), following Andrej Karpathy's *LLM Wiki* pattern.»
- `**Live demo:** https://arubiose.github.io/llm-wiki-portfolio/ (fictitious content)`.
- `## Quick start`: «Use this template» → `nvm use && pnpm install && pnpm dev` → «Read the [guide](docs/guide.md) to replace the demo content with yours and publish it.»
- El bloque de alimentar la wiki queda genérico: «Copy your sources (CV, LinkedIn export, notes…) to `raw/` and run `/ingest raw/<file>`.» Sin `cp ~/Descargas`.
- `## License`: «Code under the [MIT license](LICENSE). The content in `wiki/public/` and the images in `public/` belong to whoever publishes the site; in this template they are fictitious.»
- Ninguna URL ni nombre del autor salvo la de la demo y la del repo de plantilla.

- [ ] **Step 3: `README.es.md`**

El mismo contenido en español, con `[English](README.md) · **Español**` en la primera línea.

- [ ] **Step 4: `docs/guide.md` (inglés) y `docs/guide.es.md`**

Primera línea con el selector de idioma, como en los README. Secciones, con los comandos exactos:

1. **Create your repo**: «Use this template» → «Create a new repository». Nombre `<user>.github.io`, que publica en `https://<user>.github.io/`, o cualquier otro, que publica en `https://<user>.github.io/<repo>/` (`site` y `base` se deducen solos de `GITHUB_REPOSITORY`; para un dominio propio, las variables `SITE_URL` y `BASE_PATH`). *Settings → Pages → Source: GitHub Actions*.
2. **Run it locally**: `nvm use`, `pnpm install`, `pnpm exec playwright install chromium`, `pnpm dev` → `http://localhost:4321` muestra a Ada.
3. **Replace Ada with your content**: `git rm -r wiki/public && mkdir -p wiki/public` (el fixture de los tests no se toca), copiar fuentes a `raw/`, `/ingest raw/<file>` (una vez por fuente), `/lint`, foto en `wiki/public/profile.jpg`, `public/og-image.png` de 1200×627, `pnpm build` (los esquemas Zod dicen qué falta).
4. **Tests**: la tabla de tres capas del spec (§3.3). Cambiar el contenido no exige tocar tests. Si cambias código, actualiza sus tests, y si el cambio es visual, `pnpm test:visual:update`. `wiki/private/forbidden-strings.txt` sirve para cadenas propias que nunca deben publicarse.
5. **Optional analytics**: variable de repo `CF_ANALYTICS_TOKEN` (Settings → Secrets and variables → Actions → Variables), según `docs/system-design.md` §3.9.
6. **Get template updates**:

```bash
git remote add upstream https://github.com/ARubiose/llm-wiki-portfolio.git
printf 'wiki/public/** merge=ours\nwiki/index.md merge=ours\npublic/og-image.png merge=ours\n' > .gitattributes
git config merge.ours.driver true    # local, no se versiona: repítelo en cada clon
git add .gitattributes && git commit -m "chore: Keep my content on template merges"
git fetch upstream
git merge upstream/main --allow-unrelated-histories   # solo la primera vez
```

En el primer merge, en los conflictos de contenido te quedas con lo tuyo (`git checkout --ours <path>`) y en el resto con lo de la plantilla (`git checkout --theirs <path>`); después, `pnpm test && pnpm test:e2e`. Los siguientes merges son `git pull upstream main`. Nota: `merge=ours` solo actúa cuando los dos lados cambiaron el archivo; por eso el primer merge se revisa a mano.

- [ ] **Step 5: `CLAUDE.md`**

Cambios mínimos (el resto se mantiene):

- Primer párrafo: «Plantilla de portfolio en **Astro 7 + Tailwind 4** … Es la plantilla `ARubiose/llm-wiki-portfolio`; los sitios creados desde ella traen las mejoras con `git pull upstream main` (ver `docs/guide.md`).»
- Tabla: `docs/`: añadir `guide.md`. Quitar «Maquetas de referencia en `docs/design/mockups/`».
- Portfolio: «El contenido se lee de `WIKI_DIR` (por defecto `wiki/public/`). Los e2e y las capturas usan el fixture fijo `tests/fixtures/site/` (Ada); el smoke (`tests/smoke/`) valida el contenido real.»
- Convenciones: «Las mejoras se hacen en la plantilla, no en los sitios derivados: un cambio local en un archivo compartido dará conflictos al traer `upstream`.»

- [ ] **Step 6: `docs/system-design.md`**

- §3.6: sustituir la URL y el repo del autor por «`site` y `base` se deducen de `GITHUB_REPOSITORY` (`src/lib/site.ts`): `<owner>.github.io` en la raíz y cualquier otro repo en `/<repo>/`; `SITE_URL`/`BASE_PATH` lo fuerzan». La demo de la plantilla es `https://arubiose.github.io/llm-wiki-portfolio/`.
- §3.7: añadir las filas «Smoke | Playwright | Contenido real: carga, consola, secciones y desbordamiento | `tests/smoke/`» y «Build | Vitest | Con `base`, ninguna URL interna apunta a la raíz | `tests/build/`». En la fila E2E, añadir «sobre el fixture `tests/fixtures/site/` (`WIKI_DIR`, `OUT_DIR=.fixture-dist`)». Añadir la nota de la caché por `WIKI_DIR` (`cacheDir`).
- Nueva §3.10 «Plantilla y sitios derivados»: los dos repos, el historial compartido en el caso del autor y no compartido con «Use this template», los archivos de contenido y `merge=ours`, y que el driver es configuración local.
- §7: la URL de issues pasa a ser relativa a cada repo: «los issues del repositorio».
- §8: añadir la fila de la decisión 0006.

- [ ] **Step 7: `docs/decisions/0006-template-and-upstream.md`**

```markdown
# 0006 Plantilla y sitios derivados con `upstream`

- Estado: aceptada
- Fecha: 2026-10-13

## Contexto
El proyecto debía servir de plantilla, pero el código, los tests y los docs estaban ligados al
contenido y al dominio de su autor.

## Decisión
Dos repos: la plantilla (`llm-wiki-portfolio`, contenido ficticio de Ada y demo en Pages) y
los sitios derivados, que traen las mejoras desde un remoto `upstream`. El sitio del autor
comparte historial con la plantilla. `site` y `base` se deducen del repo. Los e2e y las
capturas corren sobre un fixture fijo; el contenido real lo validan los esquemas, la
privacidad, el presupuesto y un smoke genérico. Los archivos de contenido se protegen con
`merge=ours`.

## Consecuencias
Cambiar el contenido no exige tocar tests y la plantilla funciona con cualquier nombre de repo.
Se pierde la regresión visual del contenido real. Las mejoras deben hacerse en la plantilla, y
cada clon tiene que configurar el driver `merge.ours` a mano.
```

- [ ] **Step 8: Verificación del criterio de éxito**

Run:

```bash
git grep -niE "álvaro|alvaro|rubio|segovia|zalcu|skin ?ai|gofore|oesia|groningen|urjc|upm|emse|ielts|arubiose" -- . ':!LICENSE' \
  | grep -viE "ARubiose/llm-wiki-portfolio|arubiose\.github\.io/llm-wiki-portfolio"
```

Expected: sin resultados.

Run: `pnpm check && pnpm build && pnpm test && pnpm test:e2e`
Expected: verde.

- [ ] **Step 9: Commit**

```bash
git add -A LICENSE README.md README.es.md CLAUDE.md docs
git commit -m "docs: Document the template, its guide and the upstream workflow"
```

---

### Task 8: Revisión final de la rama

- [ ] **Step 1:** Revisor nuevo (superpowers:requesting-code-review) sobre `main..feat/template`, contra el spec y este plan. Corregir con TDD lo Crítico e Importante. Lo menor se apunta para abrirlo como issue en la plantilla (tarea 9).
- [ ] **Step 2:** Capturas de la home de Ada en escritorio y móvil (memoria `ui-verification`), con `pnpm preview` sobre `.fixture-dist` o `dist`.

---

### Task 9: Publicar la plantilla (requiere confirmación explícita antes del paso 1)

- [ ] **Step 1: Crear el repo**

```bash
GH_TOKEN=$(gh auth token --user ARubiose) gh repo create ARubiose/llm-wiki-portfolio --public \
  --description "Astro portfolio template whose content is maintained by an LLM agent (Karpathy's LLM Wiki pattern)"
GH_TOKEN=$(gh auth token --user ARubiose) gh api -X PATCH repos/ARubiose/llm-wiki-portfolio -F is_template=true
GH_TOKEN=$(gh auth token --user ARubiose) gh api -X POST repos/ARubiose/llm-wiki-portfolio/pages -f build_type=workflow
```

- [ ] **Step 2: Subir la rama como `main`**

```bash
git remote add template git@github-portfolio:ARubiose/llm-wiki-portfolio.git
git push template feat/template:main
```

- [ ] **Step 3: Verificar CI y la demo**

```bash
GH_TOKEN=$(gh auth token --user ARubiose) gh run watch --repo ARubiose/llm-wiki-portfolio --exit-status
curl -s https://arubiose.github.io/llm-wiki-portfolio/ | grep -o '<link rel="canonical" href="[^"]*"'
curl -sI https://arubiose.github.io/llm-wiki-portfolio/favicon.svg | head -1
```

Expected: run verde, canonical `https://arubiose.github.io/llm-wiki-portfolio/` y `HTTP/2 200`. Si el primer deploy falla por permisos de Pages, revisar *Settings → Pages* y relanzarlo con `gh run rerun`.

- [ ] **Step 4:** Abrir en la plantilla los issues aplazados de la tarea 8 (con archivo y línea).

---

### Task 10: El repo personal trae `upstream`

**Files (en `main` del repo personal, rama `feat/upstream`):**
- Create: `.gitattributes`
- Resultado del merge: código, tests y docs de la plantilla; se mantienen `wiki/public/**`, `wiki/index.md`, `public/og-image.png`, `docs/superpowers/**` y `docs/design/mockups/**`.

- [ ] **Step 1: Remoto y rama**

```bash
git switch main && git switch -c feat/upstream
git remote rename template upstream   # o: git remote add upstream git@github-portfolio:ARubiose/llm-wiki-portfolio.git
git fetch upstream
```

- [ ] **Step 2: Merge sin commit y resolución**

```bash
git merge --no-commit --no-ff upstream/main || true
# wiki/public exactamente como en main: fuera los archivos de Ada, dentro los personales
git rm -rq --cached wiki/public && rm -rf wiki/public
git checkout main -- wiki/public
# Resto del contenido y documentos solo personales: versión de main
git checkout main -- wiki/index.md public/og-image.png docs/superpowers docs/design/mockups
git status
```

Comprobar a mano con `git status` y `git diff --cached --stat main`. Las únicas diferencias con `main` deben ser código, tests, `CLAUDE.md`, `docs/` compartidos, README, `LICENSE`, `scripts/`, `tests/fixtures/site/` y capturas. Nada dentro de `wiki/public/` ni `docs/superpowers/`.

- [ ] **Step 3: `.gitattributes` y driver**

```bash
printf 'wiki/public/** merge=ours\nwiki/index.md merge=ours\npublic/og-image.png merge=ours\n' > .gitattributes
git config merge.ours.driver true
git add .gitattributes
```

- [ ] **Step 4: Verificar con el contenido real**

```bash
source ~/.nvm/nvm.sh && nvm use >/dev/null
rm -rf node_modules/.astro dist .fixture-dist
pnpm install --frozen-lockfile && pnpm check && pnpm build && pnpm test && pnpm test:e2e
GITHUB_REPOSITORY=ARubiose/ARubiose.github.io pnpm build && grep -o '<link rel="canonical" href="[^"]*"' dist/index.html
grep -c "Ada Lovelace" dist/index.html
```

Expected: todo en verde, canonical `https://arubiose.github.io/` y `0`.

- [ ] **Step 5: Commit del merge**

```bash
git commit -m "Merge upstream template into the personal site

Keeps the personal content and development docs; takes the shared code, tests
and docs from llm-wiki-portfolio. Content files merge with merge=ours from now on.

Closes #8

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Probar que un pull futuro no pisa el contenido**

En una rama de usar y tirar: crear en `upstream/main` simulado (`git switch -c tmp-up upstream/main`) un commit que cambie `wiki/public/profile.md`, volver a `feat/upstream`, `git merge tmp-up` y comprobar que `wiki/public/profile.md` sigue siendo el personal. Después borrar las dos ramas temporales (`git merge --abort` si hiciera falta, `git reset --hard ORIG_HEAD` y `git branch -D tmp-up`).

- [ ] **Step 7: Merge a `main` y push**

Merge a `main` cuando el autor lo diga, y push solo cuando lo pida. Tras el push, comprobar el deploy y que `https://arubiose.github.io` muestra el contenido real con la analítica.
