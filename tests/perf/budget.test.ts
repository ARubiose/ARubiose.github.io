import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { expect, test } from "vitest";

const DIST = join(import.meta.dirname, "../../dist");
const BUDGET_KB = 60;

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

test.skipIf(!existsSync(join(DIST, "index.html")) && !process.env.CI)(`JS de la portada ≤ ${BUDGET_KB} KB comprimido`, () => {
    const html = readFileSync(join(DIST, "index.html"), "utf8");
    const scripts = [...html.matchAll(/<script[^>]*src="([^"]+\.js)"/g)].map((m) => m[1]);
    const total = [...staticGraph(scripts)].reduce((sum, s) => sum + gzipSync(readFileSync(join(DIST, s))).length, 0);
    expect(total / 1024).toBeLessThanOrEqual(BUDGET_KB);
});

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
