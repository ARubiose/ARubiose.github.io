import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { expect, test } from "vitest";
import { pagesTarget } from "../../src/lib/site";

const DIST = join(import.meta.dirname, "../../dist");
const BUDGET_KB = 60;

// Con base (repo de plantilla con nombre propio), los src llevan /<repo>/ delante; dist/ no.
const BASE = pagesTarget(process.env).base;

/** Scripts propios de la página, relativos a dist/; los de terceros (analítica) no salen de dist/ ni cuentan. */
function localScripts(html: string, base = BASE): string[] {
    return [...html.matchAll(/<script[^>]*src="(\/[^/"][^"]*\.js)"/g)]
        .map((m) => m[1])
        .filter((src) => src.startsWith(base))
        .map((src) => `/${src.slice(base.length)}`);
}

/** Módulos en línea de la página (Astro incrusta los scripts pequeños) y los scripts de dist/ que importan. */
function inlineModules(html: string, base = BASE): { code: string[]; imports: string[] } {
    const code = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    const imports = code
        .flatMap((c) => [...c.matchAll(/(?:\bfrom|\bimport)\s*"(\/[^"]+\.js)"/g)].map((m) => m[1]))
        .filter((src) => src.startsWith(base))
        .map((src) => `/${src.slice(base.length)}`);
    return { code, imports };
}

/** Scripts de la página y todo lo que importan de forma estática, a cualquier profundidad. */
function staticGraph(entries: string[], root = DIST): Set<string> {
    const seen = new Set<string>();
    const pending = [...entries];
    while (pending.length) {
        const file = pending.pop()!;
        if (seen.has(file)) continue;
        seen.add(file);
        const code = readFileSync(join(root, file), "utf8");
        // `from "./x.js"` y los imports de efecto `import "./x.js"` (no los dinámicos `import(...)`).
        for (const m of code.matchAll(/(?:\bfrom|\bimport)\s*"(\.\.?\/[^"]+\.js)"/g)) pending.push(join(file, "..", m[1]));
    }
    return seen;
}

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
        const inline = inlineModules(html);
        const scripts = [...localScripts(html), ...inline.imports];
        expect(scripts.length + inline.code.length, "no se encontró ningún script propio: el presupuesto no mediría nada").toBeGreaterThan(0);
        const files = [...staticGraph(scripts)].reduce((sum, s) => sum + gzipSync(readFileSync(join(DIST, s))).length, 0);
        const total = files + inline.code.reduce((sum, c) => sum + gzipSync(c).length, 0);
        expect(total / 1024).toBeLessThanOrEqual(BUDGET_KB);
    });
}

test("el grafo sigue imports estáticos a cualquier profundidad e ignora los dinámicos", () => {
    const root = mkdtempSync(join(tmpdir(), "budget-"));
    mkdirSync(join(root, "_astro"));
    const files = {
        "_astro/page.js": 'import{a}from"./a.js";import"./side.js";',
        "_astro/a.js": 'export*from"./b.js";',
        "_astro/b.js": 'const lazy=()=>import("./lazy.js");',
        "_astro/side.js": "",
        "_astro/lazy.js": "",
    };
    for (const [file, code] of Object.entries(files)) writeFileSync(join(root, file), code);
    expect([...staticGraph(["/_astro/page.js"], root)].sort()).toEqual(["/_astro/a.js", "/_astro/b.js", "/_astro/page.js", "/_astro/side.js"]);
});

test("solo cuenta los scripts servidos desde dist/, no los de terceros como el beacon de Cloudflare", () => {
    const html = '<script type="module" src="/_astro/page.js"></script><script defer src="https://static.cloudflareinsights.com/beacon.min.js"></script>';
    expect(localScripts(html, "/")).toEqual(["/_astro/page.js"]);
});

test("los scripts con base se resuelven dentro de dist/", () => {
    const html = '<script type="module" src="/demo/_astro/a.js"></script><script src="https://static.cloudflareinsights.com/beacon.min.js"></script>';
    expect(localScripts(html, "/demo/")).toEqual(["/_astro/a.js"]);
});

test("cuenta los módulos en línea (Astro incrusta los scripts pequeños) y lo que importan de dist/", () => {
    const html = '<script type="application/ld+json">{"a":1}</script><script type="module">import"/demo/_astro/x.js";init()</script><script type="module" src="/demo/_astro/a.js"></script>';
    expect(inlineModules(html, "/demo/")).toEqual({ code: ['import"/demo/_astro/x.js";init()'], imports: ["/_astro/x.js"] });
});
