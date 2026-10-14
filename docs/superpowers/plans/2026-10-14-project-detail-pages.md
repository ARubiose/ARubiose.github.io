# Páginas de detalle de proyecto: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada proyecto puede tener una página de detalle opcional en Markdown libre
(`/projects/<slug>/` y `/en/projects/<slug>/`), enlazada desde su tarjeta, validada en la
build y redactada por el agente con una skill nueva `detail`.

**Architecture:** Hay una colección nueva, `projectDetails`
(`wiki/public/projects/<slug>/{es,en}.md`), y un módulo puro, `src/lib/project-details.ts`,
que valida tres cosas: la paridad de idiomas, que cada carpeta tenga su ficha y el cuerpo
(analizado con `satteri`, el mismo motor Markdown que usa Astro 7).

Los cargadores que importan `astro:content` viven en `src/lib/content.ts` y los comparten la
portada y el detalle. La página `ProjectPage.astro` reutiliza `Layout`, `Header` (con prefijo
de enlaces) y `Footer`, y pinta el cuerpo con `render()` dentro de `.prose-detail`, que tiene
estilos semánticos por skin.

**Tech Stack:** Astro 7 (content layer, `astro:i18n`), Tailwind 4, Zod (`astro/zod`),
`satteri` 0.10.5, Vitest y AstroContainer, Playwright con axe.

**Spec:** [docs/superpowers/specs/2026-10-14-project-detail-pages-design.md](../specs/2026-10-14-project-detail-pages-design.md)
(solo en el repo personal; léela con `git show main:docs/superpowers/specs/2026-10-14-project-detail-pages-design.md`
desde la rama de la plantilla).

## Dónde se trabaja

- **Tareas 1–9:** en la **plantilla**, en la rama `feat/project-detail-pages`, que sale de
  `template-main` en este mismo clon. No hace falta worktree, pero `raw/` y `wiki/private/`
  sí son necesarios.
  - Este plan y la spec viven en `main`. Desde la rama, léelos con `git show main:<ruta>`.
  - Al terminar, merge en `template-main` y push a `upstream main` **solo cuando el humano lo
    pida**.
- **Tarea 10:** en el **repo personal** (`main`), con `pnpm sync:upstream`.
- Antes de usar `pnpm`, carga Node 24:
  `source ~/.nvm/nvm.sh && nvm use`.
- Commits y `gh` siempre como **ARubiose**. Los mensajes van en inglés con prefijo
  convencional y terminan con
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Global Constraints

- Nada de `raw/` ni de `wiki/private/` en archivos versionados ni en mensajes de commit.
- Nombres de archivo en inglés; contenido y comentarios en español.
- Los componentes solo usan clases semánticas o tokens (`--skin-*`), nunca colores ni
  fuentes concretos.
- No se añade JavaScript de cliente nuevo.
- Contenido del sitio: solo sale de `wiki/public/` (`WIKI_DIR`). El único texto de interfaz
  escrito a mano está en `src/i18n/ui.ts`.
- Cuerpo del detalle (§3.3 de la spec):
  - Sin HTML crudo.
  - Enlaces: solo `http(s)://` y `#…`.
  - Imágenes: `./…` sin `..`, con extensión `jpg|jpeg|png|webp|avif|svg` y `alt` no vacío.
  - Sin `# h1`.
  - Sin `## Relacionado|Fuentes|Related|Sources`.
- `satteri` como dependencia directa en la versión exacta `0.10.5`, la que trae Astro.
- TDD: cada cambio de código empieza por un test que falla.

## Review Focus

1. **Proyecto sin detalle:** la tarjeta no muestra «Ver más» y no se genera ninguna ruta.
   Con una wiki sin ninguna carpeta de detalle, la build pasa. Lo cubren las tareas 3 y 5:
   test de componente sin `detailUrl` y build de la wiki personal antes de escribir el
   detalle real.
2. **Sitio con `base`** (repo de plantilla con nombre propio, `/repo/`): «Ver más», «volver»,
   el selector de idioma y `canonical` llevan el prefijo. Lo cubren la tarea 3
   (`detailUrl` con base) y la tarea 9, que ejecuta `tests/build/base.test.ts` con
   `BASE_PATH`.
3. **Un error de validación tiene que señalar el archivo y la línea reales**, no los del
   cuerpo sin frontmatter. Lo cubre la tarea 1 (`lineOffset`) y la tarea 4 (mensaje de
   `loadProjectDetails`).
4. **Una imagen SVG o raster relativa en el cuerpo** se ve publicada (la ruta no queda rota
   en `dist/`). Lo cubre el E2E de la tarea 6, que comprueba `naturalWidth > 0`.
5. **Tablas y bloques de código anchos en móvil** no desbordan la página. Lo cubren el E2E
   de la tarea 6, que mide los desbordamientos en `mobile`, y el smoke de la tarea 7.

---

### Task 1: Validación pura de los detalles

**Files:**
- Create: `src/lib/project-details.ts`
- Create: `tests/unit/project-details.test.ts`
- Modify: `package.json` (dependencia `satteri`)

**Interfaces:**
- Produces:
  - `pairDetails(projectIds: string[], detailIds: string[]): { slugs: string[]; errors: string[] }`
  - `bodyIssues(markdown: string, lineOffset?: number): { line: number; message: string }[]`
  - `lineOffset(raw: string, body: string): number`
  - `detailUrl(slug: string, locale: Locale, base?: string): string`

- [ ] **Step 1: Crear la rama e instalar la dependencia**

```bash
git checkout template-main && git checkout -b feat/project-detail-pages
source ~/.nvm/nvm.sh && nvm use
pnpm add satteri@0.10.5 --save-exact
```

- [ ] **Step 2: Escribir los tests que fallan**

`tests/unit/project-details.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { bodyIssues, detailUrl, lineOffset, pairDetails } from "@lib/project-details";

describe("pairDetails", () => {
    test("empareja es y en de un proyecto que existe", () => {
        expect(pairDetails(["site", "other"], ["site/es", "site/en"])).toEqual({ slugs: ["site"], errors: [] });
    });

    test("falta un idioma", () => {
        const { slugs, errors } = pairDetails(["site"], ["site/es"]);
        expect(slugs).toEqual([]);
        expect(errors).toEqual(["projects/site/: falta en.md"]);
    });

    test("carpeta de detalle sin ficha", () => {
        const { slugs, errors } = pairDetails([], ["ghost/es", "ghost/en"]);
        expect(slugs).toEqual([]);
        expect(errors).toEqual(["projects/ghost/: no existe la ficha projects/ghost.md"]);
    });

    test("ordena los slugs", () => {
        expect(pairDetails(["b", "a"], ["b/es", "b/en", "a/en", "a/es"]).slugs).toEqual(["a", "b"]);
    });
});

describe("bodyIssues", () => {
    const messages = (md: string) => bodyIssues(md).map((i) => i.message);

    test("un cuerpo válido no da avisos", () => {
        const md = [
            "## Problema",
            "",
            "Texto con [web](https://example.com), [ancla](#problema) y <https://example.org>.",
            "",
            "![Diagrama del flujo](./architecture.svg)",
            "",
            "![Foto](./img/screen.webp)",
            "",
            "| a | b |",
            "| - | - |",
            "| 1 | 2 |",
            "",
            "```ts",
            "const x = 1;",
            "```",
        ].join("\n");
        expect(bodyIssues(md)).toEqual([]);
    });

    test.each([
        ["<div>x</div>", "HTML crudo no permitido"],
        ["texto <b>x</b>", "HTML crudo no permitido"],
        ["<script>alert(1)</script>", "HTML crudo no permitido"],
        ['<a href="javascript:alert(1)">x</a>', "HTML crudo no permitido"],
        ['<img src="/abs.png">', "HTML crudo no permitido"],
    ])("rechaza HTML crudo: %s", (md, message) => {
        expect(messages(md)).toContain(message);
    });

    test.each([
        "[x](../skills/python.md)",
        "[x](./otra.md)",
        "[x](/projects/a/)",
        "[x](otra-pagina)",
        "[x](mailto:a@example.com)",
        "[x](javascript:alert(1))",
        "[x](data:text/html,hola)",
        "[x][ref]\n\n[ref]: ../profile.md",
    ])("rechaza el enlace: %s", (md) => {
        expect(messages(md).some((m) => m.startsWith("Enlace no permitido"))).toBe(true);
    });

    test.each(["[x](https://a.example)", "[x](http://a.example)", "<https://a.example>", "[x](#seccion)", "[x][r]\n\n[r]: https://a.example"])(
        "acepta el enlace: %s",
        (md) => {
            expect(bodyIssues(md)).toEqual([]);
        },
    );

    test.each([
        ["![a](../profile.jpg)", "Imagen no permitida"],
        ["![a](./x/../../profile.jpg)", "Imagen no permitida"],
        ["![a](/abs.png)", "Imagen no permitida"],
        ["![a](https://example.com/x.png)", "Imagen no permitida"],
        ["![a](./x.gif)", "Imagen no permitida"],
        ["![](./x.png)", "Imagen sin texto alternativo"],
        ["![  ](./x.png)", "Imagen sin texto alternativo"],
    ])("rechaza la imagen: %s", (md, prefix) => {
        expect(messages(md).some((m) => m.startsWith(prefix))).toBe(true);
    });

    test("rechaza el h1: el título lo pone la página", () => {
        expect(messages("# Título")).toContain("Sin # h1: el título sale de `title`");
    });

    test.each(["Relacionado", "Fuentes", "Related", "Sources"])("rechaza la sección de cierre de wiki %s", (name) => {
        expect(messages(`## ${name}\n\n- x`)).toContain(`Sección de wiki no publicable: ## ${name}`);
    });

    test("da la línea del problema, desplazada por el frontmatter", () => {
        const md = "## A\n\ntexto\n\n[x](./a.md)";
        expect(bodyIssues(md)).toEqual([{ line: 5, message: "Enlace no permitido: ./a.md" }]);
        expect(bodyIssues(md, 7)).toEqual([{ line: 12, message: "Enlace no permitido: ./a.md" }]);
    });
});

describe("lineOffset", () => {
    test("cuenta las líneas anteriores al cuerpo", () => {
        const raw = "---\ntitle: x\n---\n\n## A\n";
        expect(lineOffset(raw, "\n## A\n")).toBe(3);
    });

    test("sin frontmatter o cuerpo vacío, 0", () => {
        expect(lineOffset("## A\n", "## A\n")).toBe(0);
        expect(lineOffset("---\na: 1\n---\n", "")).toBe(0);
    });
});

describe("detailUrl", () => {
    test.each([
        ["es", "/", "/projects/site/"],
        ["en", "/", "/en/projects/site/"],
        ["es", "/repo/", "/repo/projects/site/"],
        ["en", "/repo", "/repo/en/projects/site/"],
    ] as const)("%s con base %s", (locale, base, expected) => {
        expect(detailUrl("site", locale, base)).toBe(expected);
    });

    test("base por defecto: raíz", () => {
        expect(detailUrl("site", "es")).toBe("/projects/site/");
    });
});
```

- [ ] **Step 3: Ejecutar y ver que falla**

Run: `pnpm vitest run tests/unit/project-details.test.ts`
Expected: FAIL, porque no se puede resolver `@lib/project-details`.

- [ ] **Step 4: Implementar**

`src/lib/project-details.ts`:

```ts
import { markdownToMdast } from "satteri";
import { defaultLocale, type Locale } from "@i18n/ui";

const LANGS = ["es", "en"] as const;

/** Empareja los detalles (`<slug>/es`, `<slug>/en`) con las fichas de proyecto. */
export function pairDetails(projectIds: string[], detailIds: string[]): { slugs: string[]; errors: string[] } {
    const bySlug = new Map<string, Set<string>>();
    for (const id of detailIds) {
        const [slug, lang] = id.split("/");
        if (!bySlug.has(slug)) bySlug.set(slug, new Set());
        bySlug.get(slug)!.add(lang);
    }
    const slugs: string[] = [];
    const errors: string[] = [];
    for (const slug of [...bySlug.keys()].sort()) {
        const langs = bySlug.get(slug)!;
        const missing = LANGS.filter((l) => !langs.has(l));
        if (!projectIds.includes(slug)) errors.push(`projects/${slug}/: no existe la ficha projects/${slug}.md`);
        else if (missing.length) errors.push(...missing.map((l) => `projects/${slug}/: falta ${l}.md`));
        else slugs.push(slug);
    }
    return { slugs, errors };
}

type Node = {
    type: string;
    url?: string;
    alt?: string | null;
    depth?: number;
    value?: string;
    children?: Node[];
    position?: { start: { line: number } };
};

const CLOSING = new Set(["relacionado", "fuentes", "related", "sources"]);
const IMAGE = /^\.\/[^?#]*\.(jpe?g|png|webp|avif|svg)$/i;
const okLink = (url: string) => /^https?:\/\//i.test(url) || url.startsWith("#");
const okImage = (url: string) => IMAGE.test(url) && !url.split("/").includes("..");
const textOf = (n: Node): string => n.value ?? (n.children ?? []).map(textOf).join("");

/** Incumplimientos de las normas del cuerpo publicado (spec §3.3), con su línea en el archivo. */
export function bodyIssues(markdown: string, lineOffset = 0): { line: number; message: string }[] {
    const issues: { line: number; message: string }[] = [];
    const walk = (n: Node) => {
        const line = (n.position?.start.line ?? 1) + lineOffset;
        const add = (message: string) => issues.push({ line, message });
        if (n.type === "html") add("HTML crudo no permitido");
        if ((n.type === "link" || n.type === "definition") && !okLink(n.url ?? "")) add(`Enlace no permitido: ${n.url}`);
        if (n.type === "image") {
            if (!okImage(n.url ?? "")) add(`Imagen no permitida: ${n.url}`);
            else if (!(n.alt ?? "").trim()) add(`Imagen sin texto alternativo: ${n.url}`);
        }
        if (n.type === "heading" && n.depth === 1) add("Sin # h1: el título sale de `title`");
        if (n.type === "heading" && n.depth === 2 && CLOSING.has(textOf(n).trim().toLowerCase())) {
            add(`Sección de wiki no publicable: ## ${textOf(n).trim()}`);
        }
        for (const c of n.children ?? []) walk(c);
    };
    walk(markdownToMdast(markdown) as unknown as Node);
    return issues;
}

/** Líneas del archivo antes del cuerpo (el frontmatter), para dar líneas reales. */
export function lineOffset(raw: string, body: string): number {
    if (!body) return 0;
    const at = raw.indexOf(body);
    return at <= 0 ? 0 : raw.slice(0, at).split("\n").length - 1;
}

/** URL del detalle de un proyecto en un idioma, con el `base` del sitio. */
export function detailUrl(slug: string, locale: Locale, base = "/"): string {
    const root = base.endsWith("/") ? base : `${base}/`;
    return `${root}${locale === defaultLocale ? "" : `${locale}/`}projects/${slug}/`;
}
```

- [ ] **Step 5: Ejecutar y ver que pasa**

Run: `pnpm vitest run tests/unit/project-details.test.ts`
Expected: PASS.

Si algún test de `bodyIssues` falla porque `satteri` cambia la forma de un nodo (por ejemplo,
`alt` o la posición de los autoenlaces), inspecciona el árbol con
`node --input-type=module -e "import {markdownToMdast} from 'satteri'; console.dir(markdownToMdast('…'), {depth: 9})"`
y ajusta solo `Node` y `walk`, nunca el test.

- [ ] **Step 6: Comprobar los tests con una mutación** (memoria del usuario: probar los tests
  mutando el código)

Cambia `okLink` para que acepte cualquier URL (`() => true`) y ejecuta los tests. Tienen
que fallar los de «rechaza el enlace». Deshaz el cambio.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/project-details.ts tests/unit/project-details.test.ts
git commit -m "feat(details): Validate project detail pages and their bodies"
```

---

### Task 2: Esquema, colección y detalle de ejemplo (Ada)

**Files:**
- Modify: `src/lib/schemas.ts` (esquema y tipo nuevos, `schemasByType`)
- Modify: `src/content.config.ts` (colección `projectDetails`)
- Create: `tests/fixtures/site/projects/note-engine/es.md`, `en.md`, `architecture.svg`
- Create: `wiki/public/projects/note-engine/es.md`, `en.md`, `architecture.svg` (copia
  idéntica: la demo de la plantilla)
- Modify: `tests/fixtures/site/projects/note-engine.md` y `wiki/public/projects/note-engine.md`
  (`## Relacionado` con los dos enlaces)
- Modify: `wiki/index.md` (línea del detalle)
- Modify: `tests/content/wiki.test.ts`, `tests/content/schemas.test.ts`

**Interfaces:**
- Consumes: `pairDetails`, `bodyIssues` y `lineOffset` (tarea 1).
- Produces:
  - `projectDetailSchema` y `type ProjectDetailData`.
  - La colección `projectDetails`, con ids `<slug>/<es|en>`.
  - Los archivos de fixture `tests/fixtures/site/projects/note-engine/{es,en}.md`. El
    `title` en español es «Cómo funciona el motor de notas» y en inglés, «How the note
    engine works».

- [ ] **Step 1: Test de esquema que falla**

En `tests/content/schemas.test.ts`, añade (con el estilo de los casos que ya hay):

```ts
import { projectDetailSchema } from "@lib/schemas";

describe("project-detail", () => {
    const ok = { title: "Cómo funciona", type: "project-detail", summary: "Una frase.", sources: ["humano (2026-10-14)"], updated: "2026-10-14" };

    test("acepta el mínimo y pone tags vacías", () => {
        const r = projectDetailSchema.parse(ok);
        expect(r.tags).toEqual([]);
    });

    test.each(["title", "summary", "sources", "updated"])("exige %s", (field) => {
        const { [field]: _, ...rest } = ok as Record<string, unknown>;
        expect(projectDetailSchema.safeParse(rest).success).toBe(false);
    });

    test("no acepta otro type", () => {
        expect(projectDetailSchema.safeParse({ ...ok, type: "project" }).success).toBe(false);
    });
});
```

Run: `pnpm vitest run tests/content/schemas.test.ts`
Expected: FAIL (no existe `projectDetailSchema`).

- [ ] **Step 2: Implementar el esquema**

En `src/lib/schemas.ts`, después de `projectSchema`:

```ts
// Detalle de proyecto: una página por idioma (projects/<slug>/es.md, en.md) cuyo cuerpo sí se publica.
export const projectDetailSchema = z.object({
    ...meta,
    type: z.literal("project-detail"),
});
```

Añade `"project-detail": projectDetailSchema` a `schemasByType` y, junto a los otros tipos:

```ts
export type ProjectDetailData = z.output<typeof projectDetailSchema>;
```

Run: `pnpm vitest run tests/content/schemas.test.ts`
Expected: PASS.

- [ ] **Step 3: Colección**

En `src/content.config.ts`, importa `projectDetailSchema` y añade:

```ts
    // Detalles opcionales: una carpeta por proyecto con es.md y en.md (el loader de projects no entra en subcarpetas).
    projectDetails: defineCollection({ loader: wiki("*/{es,en}.md", "projects"), schema: projectDetailSchema }),
```

- [ ] **Step 4: Tests de contrato que fallan (sobre la wiki y el fixture)**

En `tests/content/wiki.test.ts`, dentro del `describe(label, …)` de cada wiki, añade el
bloque de abajo. Importa `pairDetails`, `bodyIssues` y `lineOffset` de
`@lib/project-details`, `matter` de `gray-matter` y `readFileSync` de `node:fs`.

```ts
        describe("detalles de proyecto", () => {
            const dir = join(WIKI, "projects");
            const detailFolders = existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];
            const detailIds = detailFolders.flatMap((slug) => readdirSync(join(dir, slug)).filter((f) => /^(es|en)\.md$/.test(f)).map((f) => `${slug}/${f.replace(/\.md$/, "")}`));
            const projectIds = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")) : [];

            test("cada carpeta tiene ficha y los dos idiomas", () => {
                expect(pairDetails(projectIds, detailIds).errors).toEqual([]);
            });

            for (const id of detailIds) {
                test(`${id}.md cumple el contrato y las normas del cuerpo`, () => {
                    const raw = readFileSync(join(dir, `${id}.md`), "utf8");
                    const { data, content } = matter(raw);
                    expect(data.type).toBe("project-detail");
                    expect(projectDetailSchema.safeParse(data).error?.issues ?? []).toEqual([]);
                    expect(bodyIssues(content, lineOffset(raw, content))).toEqual([]);
                });

                test(`${id}.md: las imágenes existen junto al detalle`, () => {
                    const { content } = matter(readFileSync(join(dir, `${id}.md`), "utf8"));
                    for (const [, src] of content.matchAll(/!\[[^\]]*\]\((\.\/[^)\s]+)\)/g)) {
                        expect(existsSync(join(dir, id.split("/")[0], src)), src).toBe(true);
                    }
                });
            }
        });
```

Y fuera del bucle de wikis (al final del archivo), un test solo para el fixture:

```ts
test("el fixture (Ada) incluye un detalle de ejemplo", () => {
    expect(existsSync(join(WIKIS["tests/fixtures/site"], "projects/note-engine/es.md"))).toBe(true);
    expect(existsSync(join(WIKIS["tests/fixtures/site"], "projects/note-engine/en.md"))).toBe(true);
});
```

Run: `pnpm vitest run tests/content/wiki.test.ts`
Expected: FAIL en «el fixture (Ada) incluye un detalle de ejemplo».

- [ ] **Step 5: Escribir el detalle de Ada**

`tests/fixtures/site/projects/note-engine/es.md`:

```markdown
---
title: Cómo funciona el motor de notas
type: project-detail
summary: Arquitectura del motor de notas, una app en Expo que organiza notas con un agente LLM.
tags: [demo]
sources: ["humano (2026-10-14)"]
updated: 2026-10-14
---

Proyecto ficticio de la demo: sirve de ejemplo de página de detalle.

## El problema

Las notas rápidas se acumulan sin orden. El motor de notas las clasifica y las enlaza entre
sí con un agente LLM, sin que haga falta etiquetarlas a mano.

## Arquitectura

![Diagrama: la app en Expo envía las notas a la API en FastAPI, que consulta al agente LLM](./architecture.svg)

- **App:** Expo, con un solo código para iOS, Android y web.
- **API:** FastAPI, que guarda las notas y orquesta al agente.
- **Agente:** propone etiquetas y enlaces entre notas; la persona los acepta o los descarta.

## Decisiones

| Decisión | Motivo |
| --- | --- |
| Expo | Un solo código para tres plataformas |
| FastAPI | Tipos y documentación de la API automáticos |
| Sugerencias, no cambios | El agente nunca modifica una nota sin confirmación |

```ts
type Suggestion = { noteId: string; tags: string[]; links: string[] };
```

El código está en el [repositorio](https://github.com/ada-example/note-engine).
```

`tests/fixtures/site/projects/note-engine/en.md`:

```markdown
---
title: How the note engine works
type: project-detail
summary: Architecture of the note engine, an Expo app that organizes notes with an LLM agent.
tags: [demo]
sources: ["humano (2026-10-14)"]
updated: 2026-10-14
---

A fictitious demo project: an example of a detail page.

## The problem

Quick notes pile up with no order. The note engine classifies and links them with an LLM
agent, so nobody has to tag them by hand.

## Architecture

![Diagram: the Expo app sends notes to the FastAPI API, which queries the LLM agent](./architecture.svg)

- **App:** Expo, one codebase for iOS, Android and the web.
- **API:** FastAPI, which stores the notes and orchestrates the agent.
- **Agent:** suggests tags and links between notes; the user accepts or dismisses them.

## Decisions

| Decision | Reason |
| --- | --- |
| Expo | One codebase for three platforms |
| FastAPI | Typed, self-documented API |
| Suggestions, not edits | The agent never changes a note without confirmation |

```ts
type Suggestion = { noteId: string; tags: string[]; links: string[] };
```

The code is in the [repository](https://github.com/ada-example/note-engine).
```

`tests/fixtures/site/projects/note-engine/architecture.svg`. Tiene colores fijos a propósito:
es contenido, no un componente, y una imagen no hereda los tokens de la skin.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 160" width="640" height="160" font-family="sans-serif" font-size="16">
  <rect width="640" height="160" fill="#f4f4f5"/>
  <g fill="#ffffff" stroke="#3f3f46" stroke-width="2">
    <rect x="20" y="50" width="160" height="60" rx="8"/>
    <rect x="240" y="50" width="160" height="60" rx="8"/>
    <rect x="460" y="50" width="160" height="60" rx="8"/>
  </g>
  <g fill="#18181b" text-anchor="middle">
    <text x="100" y="86">App (Expo)</text>
    <text x="320" y="86">API (FastAPI)</text>
    <text x="540" y="86">Agente LLM</text>
  </g>
  <g stroke="#3f3f46" stroke-width="2" marker-end="url(#a)">
    <line x1="180" y1="80" x2="236" y2="80"/>
    <line x1="400" y1="80" x2="456" y2="80"/>
  </g>
  <defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="#3f3f46"/></marker></defs>
</svg>
```

Cierra la ficha `tests/fixtures/site/projects/note-engine.md` con:

```markdown

## Relacionado

- Detalle: [español](note-engine/es.md) · [English](note-engine/en.md)
```

Copia los tres archivos del detalle y la ficha modificada a `wiki/public/projects/`. En
la plantilla, `wiki/public/` y el fixture son la misma Ada:

```bash
mkdir -p wiki/public/projects/note-engine
cp tests/fixtures/site/projects/note-engine/* wiki/public/projects/note-engine/
cp tests/fixtures/site/projects/note-engine.md wiki/public/projects/note-engine.md
```

En `wiki/index.md`, debajo de la línea de «Motor de notas» en `## Proyectos`:

```markdown
  - [Detalle: cómo funciona](public/projects/note-engine/es.md) — Arquitectura del motor de notas ([English](public/projects/note-engine/en.md)).
```

- [ ] **Step 6: Ejecutar los tests de contrato y de privacidad**

Run: `pnpm vitest run tests/content tests/privacy`
Expected: PASS.

- [ ] **Step 7: Comprobar que Astro carga la colección**

Run: `pnpm check && WIKI_DIR=tests/fixtures/site OUT_DIR=.fixture-dist pnpm build`
Expected: sin errores. Si `astro check` se queja de que `{es,en}` no es un patrón válido,
cambia el loader a `*/*.md`; `pairDetails` ya marca cualquier idioma que no sea `es` o `en`
como un idioma que falta.

- [ ] **Step 8: Commit**

```bash
git add src/lib/schemas.ts src/content.config.ts tests/content tests/fixtures/site/projects wiki/public/projects wiki/index.md
git commit -m "feat(details): Add the project detail collection and Ada's example"
```

---

### Task 3: «Ver más» en la tarjeta

**Files:**
- Modify: `src/lib/home.ts` (tipos `HomeData` y `ProjectView`, y `buildHomeView`)
- Modify: `src/components/ProjectCard.astro`
- Modify: `src/sections/projects.astro`
- Modify: `src/i18n/ui.ts` (`projects.more`, `projects.back`)
- Test: `tests/unit/home.test.ts`, `tests/components/sections.test.ts`

**Interfaces:**
- Consumes: `detailUrl` (tarea 1).
- Produces:
  - `HomeData.detailSlugs?: string[]` y `HomeData.base?: string`.
  - `ProjectView.detailUrl?: string`.
  - El prop `moreLabel: string` de `ProjectCard`.
  - Las claves de interfaz `projects.more` y `projects.back`.

- [ ] **Step 1: Tests que fallan**

En `tests/unit/home.test.ts`:

```ts
test("proyectos: detailUrl solo si el proyecto tiene detalle, con base e idioma", () => {
    expect(buildHomeView(data, "es", NOW).projects[0].detailUrl).toBeUndefined();
    const withDetail = { ...data, detailSlugs: ["site"], base: "/repo/" };
    expect(buildHomeView(withDetail, "es", NOW).projects[0].detailUrl).toBe("/repo/projects/site/");
    expect(buildHomeView(withDetail, "en", NOW).projects[0].detailUrl).toBe("/repo/en/projects/site/");
});
```

En `tests/components/sections.test.ts`:

```ts
test("Projects: «Ver más» solo en los proyectos con detalle", async () => {
    const without = clean(await container.renderToString(Projects, { props: { items: [project], locale: "es" } }));
    expect(without).not.toContain("Ver más");
    const withDetail = clean(await container.renderToString(Projects, { props: { items: [{ ...project, detailUrl: "/projects/my-site/" }], locale: "es" } }));
    expect(withDetail).toMatch(/<a[^>]*href="\/projects\/my-site\/"[^>]*>Ver más<\/a>/);
    // Enlace interno: misma pestaña.
    expect(withDetail).not.toMatch(/href="\/projects\/my-site\/"[^>]*target=/);
});
```

Run: `pnpm vitest run tests/unit/home.test.ts tests/components/sections.test.ts`
Expected: FAIL en los dos tests nuevos.

- [ ] **Step 2: Implementar**

`src/lib/home.ts`:
- Importa `import { detailUrl } from "./project-details";`.
- En `HomeData`, añade:

```ts
    /** Proyectos con página de detalle y base del sitio para enlazarla (opcionales: la portada funciona sin ellos). */
    detailSlugs?: string[];
    base?: string;
```

- En `ProjectView`, añade `detailUrl?: string`.
- Sustituye el `return` del `map` de `projects` por:

```ts
        const detail = data.detailSlugs?.includes(id) ? { detailUrl: detailUrl(id, locale, data.base) } : {};
        return { ...l, id, file: `${l.repo.split("/").filter(Boolean).pop()?.replace(/\.git$/, "")}/README.md`, statusLabel: t(`projects.status.${l.status}`), ...detail };
```

`src/i18n/ui.ts`: añade junto a `projects.visit`:
- en `es`: `"projects.more": "Ver más",` y `"projects.back": "Proyectos",`
- en `en`: `"projects.more": "Read more",` y `"projects.back": "Projects",`

`src/components/ProjectCard.astro`: añade `moreLabel: string` a `Props` y al
destructuring. El párrafo de enlaces queda así:

```astro
        <p class="mt-4 flex gap-4.5 text-accent">
            {project.detailUrl && <a class="border-b border-accent" href={project.detailUrl}>{moreLabel}</a>}
            <a class="border-b border-accent" href={project.repo} target="_blank" rel="noopener">{repoLabel}</a>
            {project.url && <a class="border-b border-accent" href={project.url} target="_blank" rel="noopener">{visitLabel}</a>}
        </p>
```

`src/sections/projects.astro`: pasa `moreLabel={t("projects.more")}` a `ProjectCard`.

- [ ] **Step 3: Ejecutar y ver que pasa**

Run: `pnpm vitest run tests/unit tests/components`
Expected: PASS. Si `tests/unit/i18n.test.ts` comprueba la paridad de claves, también pasa.

- [ ] **Step 4: Mutación**

Quita la condición `project.detailUrl &&` y comprueba que falla el test de componente.
Deshaz el cambio.

- [ ] **Step 5: Commit**

```bash
git add src/lib/home.ts src/components/ProjectCard.astro src/sections/projects.astro src/i18n/ui.ts tests/unit/home.test.ts tests/components/sections.test.ts
git commit -m "feat(details): Link project cards to their detail page"
```

---

### Task 4: Cargadores compartidos y prefijo de la cabecera

**Files:**
- Create: `src/lib/content.ts`
- Modify: `src/layouts/HomePage.astro` (usa `loadHomeData`)
- Modify: `src/components/Header.astro` (prop `sectionHref`)
- Test: `tests/components/header.test.ts`

**Interfaces:**
- Consumes: `pairDetails`, `bodyIssues` y `lineOffset` (tarea 1); la colección
  `projectDetails` (tarea 2); `HomeData.detailSlugs` y `base` (tarea 3).
- Produces:
  - `loadProjectDetails(): Promise<string[]>` devuelve los slugs válidos y lanza un `Error`
    con `archivo:línea motivo` si algo incumple.
  - `loadHomeData(): Promise<HomeData>`.
  - El prop de `Header` `sectionHref?: string`, por defecto `""`.

`src/lib/content.ts` importa `astro:content`, así que **no** se importa desde los tests de
Vitest. Lo cubren la build (tarea 5) y los e2e (tarea 6).

- [ ] **Step 1: Test de cabecera que falla**

En `tests/components/header.test.ts`:

```ts
test("con sectionHref, las secciones apuntan a la portada (página de detalle)", async () => {
    const container = await AstroContainer.create();
    const html = clean(await container.renderToString(Header, {
        props: { locale: "en", urls, sections: [{ id: "projects", label: "Projects" }], sectionHref: "/en/" },
    }));
    expect(html.match(/href="\/en\/#projects"/g)).toHaveLength(2);
    expect(html).not.toMatch(/href="#projects"/);
});
```

Run: `pnpm vitest run tests/components/header.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implementar el prefijo**

En `src/components/Header.astro`:
- Añade a `Props`: `/** Prefijo de los enlaces de sección: vacío en la portada, su URL fuera de ella. */ sectionHref?: string;`
- Desestructura `sectionHref = ""`.
- Cambia los dos `href={`#${s.id}`}` por `href={`${sectionHref}#${s.id}`}`.

Run: `pnpm vitest run tests/components/header.test.ts`
Expected: PASS.

- [ ] **Step 3: Cargadores**

`src/lib/content.ts`:

```ts
// Carga de colecciones compartida por la portada y el detalle. Importa astro:content: no lo usan los tests de Vitest.
import { readFileSync } from "node:fs";
import { getCollection, getEntry } from "astro:content";
import type { HomeData } from "./home";
import { bodyIssues, lineOffset, pairDetails } from "./project-details";
import { findBrokenSkillRefs } from "./skills";

/** Slugs con detalle válido; la build falla con archivo, línea y motivo si alguno incumple el contrato. */
export async function loadProjectDetails(): Promise<string[]> {
    const projects = await getCollection("projects");
    const details = await getCollection("projectDetails");
    const { slugs, errors } = pairDetails(projects.map((p) => p.id), details.map((d) => d.id));
    const issues = details.flatMap((d) => {
        const body = d.body ?? "";
        const raw = d.filePath ? readFileSync(d.filePath, "utf8") : body;
        return bodyIssues(body, lineOffset(raw, body)).map((i) => `${d.filePath}:${i.line} ${i.message}`);
    });
    const all = [...errors, ...issues];
    if (all.length) throw new Error(`Detalles de proyecto inválidos:\n${all.join("\n")}`);
    return slugs;
}

export async function loadHomeData(): Promise<HomeData> {
    const profile = await getEntry("profile", "profile");
    if (!profile) throw new Error("Falta wiki/public/profile.md");

    const experienceEntries = await getCollection("experience");
    const projectEntries = await getCollection("projects");
    const skillEntries = await getCollection("skills");
    const educationEntries = await getCollection("education");

    const broken = findBrokenSkillRefs(
        [...experienceEntries, ...projectEntries].map((e) => ({ id: e.id, skills: e.data.skills })),
        skillEntries.map((e) => e.id),
    );
    if (broken.length) throw new Error(`Habilidades inexistentes en la wiki: ${broken.map((b) => `${b.entry} → ${b.skill}`).join(", ")}`);

    return {
        profile: profile.data,
        experience: experienceEntries.map(({ id, data }) => ({ id, data })),
        projects: projectEntries.map(({ id, data }) => ({ id, data })),
        skills: skillEntries.map(({ id, data }) => ({ id, data })),
        education: educationEntries.map(({ id, data }) => ({ id, data })),
        detailSlugs: await loadProjectDetails(),
        base: import.meta.env.BASE_URL,
    };
}
```

En `src/layouts/HomePage.astro`:
- Sustituye el bloque desde `const profile = await getEntry(...)` hasta la construcción de
  `const data = {...}` por:

```ts
const data = await loadHomeData();
const now = buildMonth(process.env);
```

- `const view = buildHomeView(data, locale, now);` se mantiene.
- Para la foto, usa `getImage({ src: data.profile.photo, ... })`.
- Quita los imports que ya no se usan (`getCollection`, `getEntry`, `findBrokenSkillRefs`)
  y añade `import { loadHomeData } from "@lib/content";`.

- [ ] **Step 4: Verificar que la portada no cambia**

Run: `pnpm check && pnpm vitest run && pnpm test:e2e --project=desktop tests/e2e/home.spec.ts tests/e2e/visual.spec.ts`
Expected: PASS. Las capturas de la portada siguen igual salvo «Ver más» en la tarjeta de
Ada, que ya tiene detalle. Si `visual.spec` falla **solo** por ese enlace, revisa el diff
de la captura y actualízala con `pnpm test:e2e tests/e2e/visual.spec.ts --update-snapshots`
(las 6 skins y dispositivos). Cualquier otra diferencia es un bug.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content.ts src/layouts/HomePage.astro src/components/Header.astro tests/components/header.test.ts tests/e2e/visual.spec.ts-snapshots
git commit -m "refactor(home): Share content loading and let the header link back home"
```

---

### Task 5: Página de detalle, rutas, prosa y JSON-LD

**Files:**
- Modify: `src/lib/seo.ts` (`projectJsonLd`)
- Test: `tests/unit/seo.test.ts`
- Create: `src/layouts/ProjectPage.astro`
- Create: `src/pages/projects/[slug].astro`, `src/pages/en/projects/[slug].astro`
- Create: `src/styles/prose.css`
- Modify: `src/styles/global.css` (import)

**Interfaces:**
- Consumes: `loadHomeData` y `loadProjectDetails` (tarea 4); `buildHomeView` y `detailUrl`;
  `Header` con `sectionHref`; las claves `projects.back`, `projects.repo` y
  `projects.visit`.
- Produces:
  - `projectJsonLd(p: { name: string; description: string; repo: string; url: string; locale: Locale; author: { name: string; url: string } }): Record<string, unknown>`.
  - Las páginas `/projects/<slug>/` y `/en/projects/<slug>/`.
  - La clase `.prose-detail`.

- [ ] **Step 1: Test de JSON-LD que falla**

En `tests/unit/seo.test.ts`:

```ts
import { projectJsonLd } from "@lib/seo";

test("JSON-LD del detalle: SoftwareSourceCode con autor e idioma", () => {
    expect(projectJsonLd({
        name: "Cómo funciona", description: "Una frase.", repo: "https://github.com/ada/x",
        url: "https://ada.example/projects/x/", locale: "es", author: { name: "Ada Lovelace", url: "https://ada.example/" },
    })).toEqual({
        "@context": "https://schema.org",
        "@type": "SoftwareSourceCode",
        name: "Cómo funciona",
        description: "Una frase.",
        codeRepository: "https://github.com/ada/x",
        url: "https://ada.example/projects/x/",
        inLanguage: "es-ES",
        author: { "@type": "Person", name: "Ada Lovelace", url: "https://ada.example/" },
    });
});
```

Run: `pnpm vitest run tests/unit/seo.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implementar `projectJsonLd`**

En `src/lib/seo.ts`:

```ts
/** JSON-LD de una página de detalle de proyecto. */
export function projectJsonLd(p: { name: string; description: string; repo: string; url: string; locale: Locale; author: { name: string; url: string } }): Record<string, unknown> {
    return {
        "@context": "https://schema.org",
        "@type": "SoftwareSourceCode",
        name: p.name,
        description: p.description,
        codeRepository: p.repo,
        url: p.url,
        inLanguage: localeTags[p.locale],
        author: { "@type": "Person", name: p.author.name, url: p.author.url },
    };
}
```

Run: `pnpm vitest run tests/unit/seo.test.ts`
Expected: PASS.

- [ ] **Step 3: Layout de la página**

`src/layouts/ProjectPage.astro`:

```astro
---
import { getEntry, render } from "astro:content";
import { getAbsoluteLocaleUrl, getRelativeLocaleUrl } from "astro:i18n";
import { PUBLIC_CF_ANALYTICS_TOKEN } from "astro:env/client";
import { locales, type Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";
import { analyticsBeacon } from "@lib/analytics";
import { loadHomeData } from "@lib/content";
import { buildHomeView, handleFromName, shortNameFromName } from "@lib/home";
import { detailUrl } from "@lib/project-details";
import { alternateLinks, projectJsonLd, requireSite } from "@lib/seo";
import { buildMonth } from "@lib/site";
import Layout from "./Layout.astro";
import Header from "@components/Header.astro";
import Footer from "@components/Footer.astro";

interface Props {
    locale: Locale;
    slug: string;
}
const { locale, slug } = Astro.props;
const t = useTranslations(locale);

const data = await loadHomeData();
const view = buildHomeView(data, locale, buildMonth(process.env));
const project = view.projects.find((p) => p.id === slug);
const detail = await getEntry("projectDetails", `${slug}/${locale}`);
if (!project || !detail) throw new Error(`Falta el proyecto o el detalle ${slug}/${locale}`);
const { Content } = await render(detail);

const site = requireSite(Astro.site);
const base = import.meta.env.BASE_URL;
const home = getRelativeLocaleUrl(locale, "");
const urls = Object.fromEntries(locales.map((l) => [l, detailUrl(slug, l, base)])) as Record<Locale, string>;
const absoluteUrls = Object.fromEntries(locales.map((l) => [l, new URL(urls[l], site).href])) as Record<Locale, string>;
const skillTitles = new Map(data.skills.map((s) => [s.id, s.data.title]));
const skills = (project.skills ?? []).map((id) => skillTitles.get(id)).filter((s): s is string => Boolean(s));
const jsonLd = projectJsonLd({
    name: detail.data.title, description: detail.data.summary, repo: project.repo, url: absoluteUrls[locale], locale,
    author: { name: view.profile.name, url: getAbsoluteLocaleUrl(locale, "") },
});
const analytics = analyticsBeacon(PUBLIC_CF_ANALYTICS_TOKEN, import.meta.env.PROD);
---

<Layout locale={locale} title={`${detail.data.title} · ${view.profile.name}`} description={detail.data.summary} alternates={alternateLinks(absoluteUrls)} jsonLd={jsonLd} analytics={analytics}>
    <Header locale={locale} sections={view.sections} urls={urls} handle={handleFromName(view.profile.name)} shortName={shortNameFromName(view.profile.name)} sectionHref={home} />
    <main class="mx-auto max-w-3xl px-4 md:px-10">
        <p class="mt-8 text-[13px]">
            <a class="text-accent hover:text-text" href={`${home}#projects`} data-back><span aria-hidden="true">← </span>{t("projects.back")}</a>
        </p>
        <header class="mt-6">
            <h1 class="readme-title font-display text-[28px] leading-tight font-bold md:text-[40px]">{detail.data.title}</h1>
            <p class="mt-3"><span class="badge font-mono">{project.statusLabel}</span></p>
            <p class="mt-3 max-w-[72ch] text-[14.5px] text-body">{project.summary}</p>
            {skills.length > 0 && <ul class="mt-4 flex flex-wrap gap-2" aria-label={t("section.skills")}>{skills.map((s) => <li class="badge font-mono">{s}</li>)}</ul>}
            <p class="mt-4 flex gap-4.5 text-accent">
                <a class="border-b border-accent" href={project.repo} target="_blank" rel="noopener">{t("projects.repo")}</a>
                {project.url && <a class="border-b border-accent" href={project.url} target="_blank" rel="noopener">{t("projects.visit")}</a>}
            </p>
        </header>
        <article class="prose-detail mt-10">
            <Content />
        </article>
    </main>
    <Footer locale={locale} repo={view.siteRepo} analytics={analytics !== null} />
</Layout>
```

- [ ] **Step 4: Rutas**

`src/pages/projects/[slug].astro`:

```astro
---
import ProjectPage from "@layouts/ProjectPage.astro";
import { loadProjectDetails } from "@lib/content";

export async function getStaticPaths() {
    return (await loadProjectDetails()).map((slug) => ({ params: { slug } }));
}
const { slug } = Astro.params;
---

<ProjectPage locale="es" slug={slug} />
```

`src/pages/en/projects/[slug].astro`: igual que la anterior, con `locale="en"`.

- [ ] **Step 5: Estilos de prosa**

`src/styles/prose.css`. Usa solo variables de skin y los valores por defecto sirven para
las tres; cada skin puede sobrescribirlos en su hoja.

```css
/* Cuerpo publicado de las páginas de detalle: solo tokens de skin, nunca colores ni fuentes concretos. */
.prose-detail {
    max-width: 72ch;
    color: var(--skin-body);
    font-family: var(--skin-font-body, var(--skin-font-mono));
    font-size: 15px;
    line-height: 1.7;
    overflow-wrap: anywhere;
}
.prose-detail > * + * { margin-top: 1em; }
.prose-detail h2 {
    margin-top: 2.2em;
    color: var(--skin-text);
    font-family: var(--skin-font-display);
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.25;
}
.prose-detail h3 {
    margin-top: 1.8em;
    color: var(--skin-text);
    font-family: var(--skin-font-display);
    font-size: 1.15rem;
    font-weight: 700;
}
.prose-detail a { color: var(--skin-accent); border-bottom: 1px solid currentColor; }
.prose-detail strong { color: var(--skin-text); }
.prose-detail ul { list-style: square; padding-left: 1.25em; }
.prose-detail ol { list-style: decimal; padding-left: 1.25em; }
.prose-detail li + li { margin-top: 0.35em; }
.prose-detail code {
    font-family: var(--skin-font-mono);
    font-size: 0.9em;
    padding: 0.1em 0.35em;
    background: var(--skin-surface-2);
    border-radius: var(--skin-radius);
}
.prose-detail pre {
    overflow-x: auto;
    padding: 1rem;
    background: var(--skin-surface);
    border: 1px solid var(--skin-line);
    border-radius: var(--skin-radius);
}
.prose-detail pre code { padding: 0; background: none; }
.prose-detail blockquote { padding-left: 1rem; border-left: 2px solid var(--skin-accent); color: var(--skin-muted); }
.prose-detail table { display: block; overflow-x: auto; border-collapse: collapse; font-size: 0.92em; }
.prose-detail th, .prose-detail td { padding: 0.4em 0.75em; border-bottom: 1px solid var(--skin-line); text-align: left; }
.prose-detail th { color: var(--skin-text); }
.prose-detail img {
    max-width: 100%;
    height: auto;
    border: 1px solid var(--skin-line);
    border-radius: var(--skin-radius);
}
```

En `src/styles/global.css`, antes de los imports de las skins:

```css
@import "./prose.css" layer(components);
```

- [ ] **Step 6: Build y revisión visual**

```bash
pnpm check
WIKI_DIR=tests/fixtures/site OUT_DIR=.fixture-dist SITE_URL=https://ada.example BASE_PATH=/ BUILD_DATE=2026-10 pnpm build
ls .fixture-dist/projects/note-engine/index.html .fixture-dist/en/projects/note-engine/index.html
```

Expected: las dos páginas existen. Arranca
`pnpm preview --outDir .fixture-dist` (o la variante que use `playwright.config.ts`) y
haz capturas de `/projects/note-engine/` en escritorio (1280×800) y móvil (390×844) con
las tres skins (memoria del usuario: capturas tras trabajo de UI). Revísalas: jerarquía,
la tabla y el código sin desbordar, la imagen visible y el contraste. Corrige la
prosa por skin solo si alguna skin la rompe (por ejemplo, `game.css` añadiendo
`[data-skin="game"] .prose-detail h2 { ... }` con sus tokens).

Si `render()` no resuelve `./architecture.svg`, comprueba que Astro procesa las imágenes
relativas de colecciones con loader `glob`. Si los SVG quedan fuera, cambia el ejemplo a
`architecture.png` (generado con `scripts/make-placeholder-images.mjs` o exportando el
SVG) y quita `svg` de `IMAGE` en la tarea 1 y de §3.3 de la regla. Anótalo como desviación
en el informe final.

- [ ] **Step 7: Build de la wiki sin detalles**

Construye una copia temporal del fixture sin `projects/note-engine/`:

```bash
tmp=$(mktemp -d) && cp -r tests/fixtures/site/. "$tmp" && rm -rf "$tmp/projects/note-engine"
WIKI_DIR="$tmp" OUT_DIR="$tmp-dist" pnpm build && test ! -e "$tmp-dist/projects" && echo OK-sin-detalles
rm -rf "$tmp" "$tmp-dist"
```

Expected: `OK-sin-detalles`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/seo.ts tests/unit/seo.test.ts src/layouts/ProjectPage.astro src/pages/projects src/pages/en/projects src/styles/prose.css src/styles/global.css
git commit -m "feat(details): Render project detail pages in both languages"
```

---

### Task 6: E2E, sitemap y capturas del detalle

**Files:**
- Create: `tests/e2e/project-detail.spec.ts`
- Modify: `tests/e2e/seo.spec.ts` (URLs del sitemap)
- Modify: `tests/e2e/visual.spec.ts` (+ capturas nuevas)

**Interfaces:**
- Consumes: las páginas del fixture (tarea 5); `FIXTURE_SITE` y `FIXTURE_NAME` de
  `tests/e2e/support.ts`.

- [ ] **Step 1: Escribir los E2E**

`tests/e2e/project-detail.spec.ts`:

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { FIXTURE_NAME, FIXTURE_SITE as SITE } from "./support";

const PAGES = [
    { lang: "es", path: "/projects/note-engine/", other: "/en/projects/note-engine/", otherLang: "en", home: "/", more: "Ver más", back: "Proyectos", title: "Cómo funciona el motor de notas" },
    { lang: "en", path: "/en/projects/note-engine/", other: "/projects/note-engine/", otherLang: "es", home: "/en/", more: "Read more", back: "Projects", title: "How the note engine works" },
] as const;

for (const p of PAGES) {
    test.describe(`detalle ${p.lang}`, () => {
        test("todas las skins y dispositivos: sin violaciones graves de axe ni desbordamiento", async ({ page }) => {
            await page.emulateMedia({ reducedMotion: "reduce" });
            await page.goto(p.path);
            const results = await new AxeBuilder({ page }).analyze();
            expect(results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")).map((v) => `${v.id}: ${v.help}`)).toEqual([]);
            const offenders = await page.evaluate(() => {
                const vw = document.documentElement.clientWidth;
                const scrollsX = (el: Element) => ["auto", "scroll"].includes(getComputedStyle(el).overflowX);
                return [...document.querySelectorAll("body *")].filter((el) => {
                    const r = el.getBoundingClientRect();
                    if (r.width === 0 || r.height === 0 || r.right <= vw + 1) return false;
                    for (let a = el.parentElement; a; a = a.parentElement) if (scrollsX(a)) return false;
                    return getComputedStyle(el).visibility !== "hidden";
                }).map((el) => el.tagName.toLowerCase());
            });
            expect(offenders).toEqual([]);
        });

        test.describe("navegación y cabecera", () => {
            test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "no depende del dispositivo ni de la skin"));

            test("la tarjeta de la portada lleva al detalle", async ({ page, baseURL }) => {
                await page.goto(p.home);
                await page.locator("#projects").getByRole("link", { name: p.more }).click();
                await expect(page).toHaveURL(new URL(p.path, baseURL).href);
                await expect(page.locator("h1")).toHaveText(p.title);
                await expect(page).toHaveTitle(`${p.title} · ${FIXTURE_NAME}`);
            });

            test("«volver» lleva a la sección de proyectos de la portada", async ({ page, baseURL }) => {
                await page.goto(p.path);
                await page.locator("[data-back]").click();
                await expect(page).toHaveURL(new URL(`${p.home}#projects`, baseURL).href);
            });

            test("la navegación apunta a las secciones de la portada", async ({ page }) => {
                await page.goto(p.path);
                await expect(page.locator(`.site-nav a[href="${p.home}#projects"]`)).toHaveCount(1);
            });

            test("el selector de idioma lleva al detalle equivalente", async ({ page, baseURL }) => {
                await page.goto(p.path);
                await page.locator(`.header-lang a[hreflang="${p.otherLang}"]`).click();
                await expect(page).toHaveURL(new URL(p.other, baseURL).href);
                await expect(page.locator("html")).toHaveAttribute("lang", p.otherLang);
            });

            test("canonical, hreflang y JSON-LD", async ({ page }) => {
                await page.goto(p.path);
                await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${SITE}${p.path}`);
                const alternates = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((els) => els.map((e) => [e.getAttribute("hreflang"), e.getAttribute("href")]));
                expect(alternates.sort()).toEqual([
                    ["en-US", `${SITE}/en/projects/note-engine/`],
                    ["es-ES", `${SITE}/projects/note-engine/`],
                    ["x-default", `${SITE}/projects/note-engine/`],
                ]);
                const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
                expect(ld).toMatchObject({ "@type": "SoftwareSourceCode", name: p.title, codeRepository: "https://github.com/ada-example/note-engine", url: `${SITE}${p.path}` });
            });

            test("el cuerpo se publica: tabla, código e imagen cargada", async ({ page }) => {
                await page.goto(p.path);
                const body = page.locator("article.prose-detail");
                await expect(body.locator("h2").first()).toBeVisible();
                await expect(body.locator("table")).toHaveCount(1);
                await expect(body.locator("pre code")).toHaveCount(1);
                const img = body.locator("img");
                await expect(img).toHaveAttribute("alt", /.+/);
                await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
            });
        });
    });
}
```

Si el `href` de `.site-nav` en inglés sale como `/en#projects` en lugar de `/en/#projects`
(por cómo `getRelativeLocaleUrl` trata la barra final), corrige `home` en
`ProjectPage.astro` para que siempre acabe en `/`. No toques el test.

- [ ] **Step 2: Sitemap**

En `tests/e2e/seo.spec.ts`, el test del sitemap pasa a esperar las cuatro URLs:

```ts
        expect(locs(xml).sort()).toEqual([`${SITE}/`, `${SITE}/en/`, `${SITE}/en/projects/note-engine/`, `${SITE}/projects/note-engine/`]);
```

Renombra el test a «el sitemap lista las portadas y los detalles con las mismas URLs y
alternativas que el <head>».

- [ ] **Step 3: Capturas**

En `tests/e2e/visual.spec.ts`, añade después del bucle de portadas:

```ts
test("detalle /projects/note-engine/", async ({ page }) => {
    await page.goto("/projects/note-engine/");
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: "[data-analytics-note] { display: none !important; }" });
    await expect(page).toHaveScreenshot({ fullPage: true, animations: "disabled", maxDiffPixelRatio: 0.01 });
});
```

Run: `pnpm test:e2e tests/e2e/visual.spec.ts -g "detalle" --update-snapshots`
Expected: 6 capturas nuevas en `tests/e2e/visual.spec.ts-snapshots/`, una por proyecto de
Playwright. **Ábrelas y revísalas** antes del commit.

- [ ] **Step 4: Suite e2e completa**

Run: `pnpm test:e2e`
Expected: PASS.

- [ ] **Step 5: Mutación**

En `ProjectPage.astro`, cambia `sectionHref={home}` por `sectionHref=""` y comprueba que
falla «la navegación apunta a las secciones de la portada». Deshaz el cambio.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e
git commit -m "test(details): Cover navigation, SEO, accessibility and visuals of detail pages"
```

---

### Task 7: Presupuesto y smoke para todas las páginas

**Files:**
- Modify: `tests/perf/budget.test.ts`
- Create: `tests/smoke/support.ts`
- Modify: `tests/smoke/home.smoke.ts`
- Create: `tests/smoke/details.smoke.ts`

- [ ] **Step 1: El presupuesto mide cada página**

En `tests/perf/budget.test.ts`, importa `readdirSync` y sustituye el test
`` `JS de la portada ≤ ${BUDGET_KB} KB comprimido` `` por:

```ts
// Cada página del sitio (portadas y detalles), no solo la portada.
const PAGES = existsSync(DIST)
    ? readdirSync(DIST, { recursive: true, encoding: "utf8" }).filter((f) => f === "index.html" || f.endsWith("/index.html")).sort()
    : [];

test.skipIf(PAGES.length > 0 || !process.env.CI)("hay un build que medir", () => {
    expect(PAGES.length, "Ejecuta astro build antes de pnpm test").toBeGreaterThan(0);
});

for (const file of PAGES) {
    test(`JS de /${file} ≤ ${BUDGET_KB} KB comprimido`, () => {
        const html = readFileSync(join(DIST, file), "utf8");
        const scripts = localScripts(html);
        expect(scripts.length, "no se encontró ningún script propio: el presupuesto no mediría nada").toBeGreaterThan(0);
        const total = [...staticGraph(scripts)].reduce((sum, s) => sum + gzipSync(readFileSync(join(DIST, s))).length, 0);
        expect(total / 1024).toBeLessThanOrEqual(BUDGET_KB);
    });
}
```

Run: `pnpm build && pnpm vitest run tests/perf/budget.test.ts`
Expected: PASS, con un test por cada `index.html`, incluidos los dos de detalle.

- [ ] **Step 2: Extraer la medida de desbordamiento del smoke**

`tests/smoke/support.ts`. Mueve aquí, sin cambios, el `page.evaluate` que calcula
`offenders` en `home.smoke.ts`:

```ts
import type { Page } from "@playwright/test";

/** Elementos que se salen del viewport sin estar dentro de un contenedor con scroll horizontal. */
export function overflowOffenders(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const scrollsX = (el: Element) => ["auto", "scroll"].includes(getComputedStyle(el).overflowX);
        return [...document.querySelectorAll("body *")]
            .filter((el) => {
                const r = el.getBoundingClientRect();
                if (r.width === 0 || r.height === 0 || r.right <= vw + 1) return false;
                for (let a = el.parentElement; a; a = a.parentElement) if (scrollsX(a)) return false;
                return getComputedStyle(el).visibility !== "hidden";
            })
            .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 3).join(".")} → ${Math.round(el.getBoundingClientRect().right)}px`);
    });
}
```

En `home.smoke.ts`, sustituye el bloque por `const offenders = await overflowOffenders(page);`.

- [ ] **Step 3: Smoke de los detalles**

`tests/smoke/details.smoke.ts`:

```ts
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { overflowOffenders } from "./support";

// Genérico: los detalles que tenga la wiki que se publica (WIKI_DIR, por defecto wiki/public).
const dir = join(process.env.WIKI_DIR ?? "wiki/public", "projects");
const slugs = existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(dir, d.name, "es.md"))).map((d) => d.name)
    : [];

for (const slug of slugs) {
    for (const path of [`./projects/${slug}/`, `./en/projects/${slug}/`]) {
        test(`detalle ${path} carga limpio con el contenido real`, async ({ page }) => {
            const errors: string[] = [];
            page.on("pageerror", (e) => errors.push(e.message));
            page.on("console", (m) => { if (m.type() === "error" && !m.location().url.includes("cloudflareinsights")) errors.push(m.text()); });
            await page.emulateMedia({ reducedMotion: "reduce" });
            const res = await page.goto(path);
            expect(res?.status()).toBe(200);
            await expect(page.locator("h1")).toHaveCount(1);
            await expect(page.locator("h1")).not.toBeEmpty();
            expect(await overflowOffenders(page)).toEqual([]);
            await page.waitForLoadState("networkidle");
            expect(errors).toEqual([]);
        });
    }
}
```

Run: `pnpm exec playwright test -c playwright.smoke.config.ts`
Expected: PASS. En la plantilla, `wiki/public` es Ada y tiene un detalle: son 2 rutas × 2
dispositivos.

- [ ] **Step 4: Commit**

```bash
git add tests/perf/budget.test.ts tests/smoke
git commit -m "test: Budget and smoke-test every page, including project details"
```

---

### Task 8: Regla de la wiki, skill `detail`, `lint` y documentación

**Files:**
- Modify: `.claude/rules/wiki.md`
- Create: `.claude/skills/detail/SKILL.md`
- Modify: `.claude/skills/lint/SKILL.md`
- Modify: `CLAUDE.md`
- Modify: `docs/system-design.md` (mapa, §3.7, §4.2, §5.1/§5.2 y la descripción de `src/pages`)
- Create: `docs/decisions/0007-project-detail-pages.md`
- Modify: `docs/guide.md`, `docs/guide.es.md`

No hay tests de código. La verificación es que `pnpm test` siga en verde (los tests de
privacidad recorren todos los archivos versionados) y una relectura.

- [ ] **Step 1: Regla de la wiki** (`.claude/rules/wiki.md`)

- Línea de skills (8–10): «Las operaciones están en las skills `ingest`, `query`, `lint` y
  `detail`».
- Tras «Las imágenes del contenido van junto a la página…», añade: «Excepción: las imágenes
  de un detalle de proyecto se referencian desde su cuerpo (ver *Detalles de proyecto*).»
- En «Frontmatter obligatorio», añade `project-detail` a la lista de `type` y cambia la frase
  del cuerpo por: «El portfolio usa **solo el frontmatter**; el cuerpo es prosa de wiki y no
  se publica, salvo en los detalles de proyecto.»
- Fila nueva en la tabla de campos: `| project-detail | (solo los comunes; tags opcional) | — (un archivo por idioma) |`.
- En «Cierre», añade: «salvo los detalles de proyecto».
- Sección nueva, `## Detalles de proyecto`, antes de `## Índices`:

```markdown
## Detalles de proyecto

Página opcional que explica un proyecto en profundidad. Es la única página pública cuyo
**cuerpo se publica**: es texto escrito para la web, no prosa de wiki.

- **Ubicación:** `public/projects/<slug>/es.md` y `en.md`, junto a la ficha
  `public/projects/<slug>.md`, que tiene que existir. Siempre los dos idiomas a la vez. Las
  imágenes van en la misma carpeta.
- **Frontmatter:** `title` (el `h1` de la página), `type: project-detail`, `summary`
  (meta description), `sources`, `updated`; `tags` opcional. Sin bloque `en:`.
- **Cuerpo:** Markdown sin HTML crudo. Los encabezados empiezan en `##` (sin `# h1`) y no
  lleva `## Relacionado` ni `## Fuentes`, porque las fuentes van en el frontmatter.
  - Enlaces: solo `http(s)://` o anclas `#…`; ni páginas de la wiki ni `mailto:`.
  - Imágenes: `./archivo.ext` dentro de la carpeta (`jpg`, `jpeg`, `png`, `webp`, `avif`,
    `svg`), siempre con texto alternativo. Los diagramas son imágenes; no hay Mermaid.
  - La build falla si algo de esto no se cumple.
- **Enlaces de entrada:** la ficha enlaza `es.md` y `en.md` en su `## Relacionado`, y
  `wiki/index.md` tiene una línea por detalle debajo de su proyecto.
- **Privacidad:** la regla de privacidad se aplica igual. Las imágenes se versionan en un
  repo público y el humano las revisa siempre.
- Se redactan con la skill `detail`.
```

- [ ] **Step 2: Skill `detail`** (`.claude/skills/detail/SKILL.md`)

```markdown
---
name: detail
description: Redacta o actualiza la página de detalle de un proyecto del portfolio (español e inglés) a partir de la wiki. Úsala cuando el usuario pida escribir, ampliar o actualizar el detalle, la página o la explicación en profundidad de un proyecto.
argument-hint: <slug del proyecto>
---

Redacta el detalle del proyecto `$ARGUMENTS` siguiendo *Detalles de proyecto* en
`.claude/rules/wiki.md`.

1. Lee la ficha `wiki/public/projects/$ARGUMENTS.md`, las páginas que enlaza y sus fuentes,
   y el detalle actual si ya existe. Si la ficha no existe, para y dilo.
2. Propón un índice de 3–6 secciones (`##`) adaptado al proyecto. Por ejemplo: problema,
   cómo funciona, arquitectura, decisiones, resultados o lo aprendido. Indica qué imágenes
   o diagramas harían falta y de dónde saldrían. Espera la confirmación.
3. Redacta `es.md` y `en.md` a la vez, con el mismo contenido. Todo dato concreto sale de
   una fuente que se cita en `sources`. No incluyas nada privado (regla de privacidad) ni
   enlaces a la wiki.
4. **Antes de escribir**, presenta el texto de los dos idiomas y las imágenes propuestas.
   Las imágenes se versionan en un repo público: el humano las revisa siempre.
5. Escribe los archivos, enlaza el detalle desde el `## Relacionado` de la ficha, añade la
   línea a `wiki/index.md` y una entrada `detail` en `wiki/private/log.md`.
6. Ejecuta `pnpm vitest run tests/content` y termina sugiriendo `pnpm build` y revisar la
   página en `pnpm dev`.
```

Añade `detail` a las operaciones del log en la regla: «Operaciones: `init`, `ingest`,
`query`, `lint`, `detail`, `schema`.»

- [ ] **Step 3: `lint`** (`.claude/skills/lint/SKILL.md`)

- En el ítem 3, añade: «Un detalle de proyecto (`projects/<slug>/es.md`, `en.md`) cuenta
  como enlazado si su ficha lo enlaza y aparece en `wiki/index.md`.»
- Ítem nuevo después del 4:

```markdown
5. **Detalles de proyecto:** carpeta sin ficha o sin uno de los dos idiomas; cuerpo con HTML
   crudo, enlaces que no son `http(s)`/`#`, imágenes fuera de su carpeta o sin texto
   alternativo, `# h1` o secciones `## Relacionado`/`## Fuentes`. Lo comprueba
   `pnpm vitest run tests/content`, así que ejecútalo. Avisa si un detalle tiene un
   `updated` anterior al de su ficha.
```

- Renumera los siguientes.

- [ ] **Step 4: `CLAUDE.md`**

- Tabla del mapa: «Regla de la wiki (`rules/wiki.md`), skills `ingest`/`query`/`lint`/`detail`, permisos».
- Viñeta del contenido: «El contenido se deriva **solo** de `wiki/public/`: el frontmatter
  y, en los detalles de proyecto (`projects/<slug>/{es,en}.md`), también el cuerpo. Lo único
  escrito a mano es el diccionario de interfaz `src/i18n/ui.ts`.»

- [ ] **Step 5: `docs/system-design.md`**

- Tabla del mapa (línea ~54) y §5.1/§5.2 (línea ~349): añade `detail` a las skills.
- §4.2: añade una fila a la tabla:
  `| wiki/public/projects/<slug>/{es,en}.md | projectDetails | página /projects/<slug>/ |`.
  Añade también un párrafo: el cuerpo de los detalles es la única excepción al «solo
  frontmatter»; lo valida `src/lib/project-details.ts` (paridad, ficha, normas del cuerpo,
  con `satteri`) desde `src/lib/content.ts` durante la build; ver la decisión 0007.
- §3.7: actualiza la tabla de tests:
  - Visual: 12 + 6 capturas.
  - Presupuesto: cada página.
  - Smoke: portadas y detalles de la wiki real.
  - E2E: detalle (navegación, SEO, axe).
- Donde se describen `src/pages` y `src/layouts`, añade las rutas
  `projects/[slug].astro`, `en/projects/[slug].astro` y `ProjectPage.astro`.

- [ ] **Step 6: Decisión 0007** (`docs/decisions/0007-project-detail-pages.md`)

```markdown
# 0007 Páginas de detalle de proyecto con cuerpo publicado

- Estado: aceptada
- Fecha: 2026-10-14

## Contexto
Algunos proyectos no caben en una tarjeta. El portfolio solo publicaba el frontmatter de la
wiki y el cuerpo era prosa interna: solo en español, con enlaces a otras páginas y con
secciones de trazabilidad. Los proyectos son muy distintos entre sí, así que unos campos
estructurados (problema, solución, resultados…) obligarían a forzar el contenido y a escribir
prosa larga en YAML.

## Decisión
Cada proyecto puede tener una carpeta `projects/<slug>/` con `es.md` y `en.md`, cuyo
**cuerpo Markdown sí se publica** en `/projects/<slug>/` y `/en/projects/<slug>/`. Es la
única excepción a «solo frontmatter».

El cuerpo es texto para la web: sin HTML crudo, con enlaces solo web o de ancla, con
imágenes de su carpeta y sin secciones de wiki. La build lo valida con el mismo analizador
que usa Astro (`satteri`). Esto amplía la [0004](0004-content-images-in-wiki.md): las
imágenes de un detalle se referencian desde el cuerpo, no desde el frontmatter. Los
redacta el agente con la skill `detail` y los revisa el humano.

## Consecuencias
- Cada proyecto se cuenta con la estructura que le encaja, y los dos idiomas se mantienen a
  la par por contrato.
- Publicar un cuerpo amplía lo que puede filtrarse: además del escáner de privacidad, hacen
  falta la validación de enlaces y HTML y la revisión humana de las imágenes, que ningún
  test inspecciona.
- La paridad entre idiomas se comprueba por archivo, no por campo: el contenido de las dos
  versiones puede divergir y lo vigila la revisión.
```

- [ ] **Step 7: Guías**

En `docs/guide.es.md`, al final de la sección 3, añade el punto 6:

```markdown
6. Página de detalle de un proyecto (opcional): `/detail <slug>`. El agente propone un
   índice, redacta `wiki/public/projects/<slug>/es.md` y `en.md` y te los enseña antes de
   escribir. La tarjeta del proyecto mostrará «Ver más». La build falla si falta un idioma
   o si el cuerpo lleva HTML, enlaces a la wiki o imágenes de fuera de su carpeta.
```

En `docs/guide.md`, lo mismo en inglés:

```markdown
6. Project detail page (optional): `/detail <slug>`. The agent proposes an outline, drafts
   `wiki/public/projects/<slug>/es.md` and `en.md` and shows them to you before writing. The
   project card will show "Read more". The build fails if a language is missing or the body
   has HTML, links into the wiki or images from outside its folder.
```

- [ ] **Step 8: Verificar y commit**

Run: `pnpm test`
Expected: PASS (privacidad de archivos versionados incluida).

```bash
git add .claude CLAUDE.md docs
git commit -m "docs(details): Document project detail pages and add the detail skill"
```

---

### Task 9: Verificación final de la plantilla y revisión

- [ ] **Step 1: Suite completa**

```bash
pnpm check && pnpm build && pnpm test && pnpm test:e2e && pnpm exec playwright test -c playwright.smoke.config.ts
BASE_PATH=/llm-wiki-portfolio/ SITE_URL=https://arubiose.github.io pnpm build && pnpm vitest run tests/build/base.test.ts
```

Expected: todo en verde. El segundo comando comprueba que con `base` los enlaces del
detalle llevan el prefijo; `tests/build/base.test.ts` recorre todos los `.html`.

- [ ] **Step 2: Grep de datos personales**

Run: `git diff template-main --stat && git diff template-main | grep -niE "arubio|iñigo|inigo" || echo limpio`
Expected: `limpio`. La plantilla no puede llevar datos del autor.

- [ ] **Step 3: Revisión de rama**

Lanza un revisor nuevo con superpowers:requesting-code-review sobre
`template-main..feat/project-detail-pages`. Corrige con TDD lo crítico y lo importante.
Lo menor se abre como issue, con archivo y línea, en el repo de la plantilla.

- [ ] **Step 4: Merge local**

Cuando el humano lo apruebe:

```bash
git checkout template-main && git merge --no-ff feat/project-detail-pages
```

El push a `upstream main` se hace **solo si el humano lo pide** (como ARubiose).

---

### Task 10: Repo personal: traer la función y escribir el detalle real

Requiere que la función esté en `upstream/main` (push de la tarea 9). Si el humano todavía
no quiere hacer push, se puede sincronizar desde la rama local:
`pnpm sync:upstream template-main`.

- [ ] **Step 1: Sincronizar**

```bash
git checkout main
pnpm sync:upstream            # o: pnpm sync:upstream template-main
git status && git diff --cached --stat
```

Expected: llegan el código, los tests y los docs. `wiki/public/` no cambia y **no** aparece
`wiki/public/projects/note-engine/`. Resuelve los conflictos con la versión de la plantilla.

```bash
pnpm test && pnpm test:e2e && pnpm build
git commit -m "Merge the project detail pages from the template"
```

Expected: verde y sin rutas de detalle en `dist/`, porque aún no hay detalle real. Esto
cubre el punto 1 del *Review Focus* con contenido real.

- [ ] **Step 2: Redactar el detalle con la skill**

Ejecuta `/detail portfolio-llm-wiki`. Propón un índice que cubra:
- el patrón LLM Wiki de Karpathy y su adaptación a Claude Code;
- la wiki pública y la privada;
- el contrato frontmatter → Zod;
- las skills `ingest`, `query`, `lint` y `detail`;
- la plantilla con `upstream` y `sync:upstream`;
- las skins y la estrategia de tests.

El diagrama SVG del flujo raw → wiki (pública/privada) → Astro → GitHub Pages va en
`wiki/public/projects/portfolio-llm-wiki/architecture.svg`.

**Espera la validación del humano** del índice, del texto en los dos idiomas y del
diagrama antes de escribir.

- [ ] **Step 3: Verificar y publicar en local**

```bash
pnpm vitest run tests/content tests/privacy && pnpm build && pnpm exec playwright test -c playwright.smoke.config.ts
```

Haz capturas de `/projects/portfolio-llm-wiki/` en escritorio y móvil con las tres skins y
enséñalas. Ejecuta `/lint`.

- [ ] **Step 4: Commit** (push solo si el humano lo pide)

```bash
git add wiki/public/projects wiki/index.md
git commit -m "content: Add the detail page of the LLM Wiki portfolio project"
```
