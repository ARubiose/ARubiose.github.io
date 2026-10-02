import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { expect, test } from "vitest";

const DIST = join(import.meta.dirname, "../../dist");
const BUDGET_KB = 60;

test.skipIf(!existsSync(join(DIST, "index.html")) && !process.env.CI)(`JS de la portada ≤ ${BUDGET_KB} KB comprimido`, () => {
    const html = readFileSync(join(DIST, "index.html"), "utf8");
    const scripts = [...html.matchAll(/<script[^>]*src="([^"]+\.js)"/g)].map((m) => m[1]);
    const imports = new Set<string>(scripts);
    for (const s of scripts) {
        const code = readFileSync(join(DIST, s), "utf8");
        for (const m of code.matchAll(/from\s*"(\.\/[^"]+\.js)"/g)) imports.add(join(s, "..", m[1]));
    }
    const total = [...imports].reduce((sum, s) => sum + gzipSync(readFileSync(join(DIST, s))).length, 0);
    expect(total / 1024).toBeLessThanOrEqual(BUDGET_KB);
});
