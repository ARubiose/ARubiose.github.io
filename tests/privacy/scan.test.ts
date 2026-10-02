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
describe("dist sin datos privados", () => {
    // En local, sin build, se omite; en CI, un dist/ ausente es un fallo, no un verde.
    test.skipIf(html.length > 0 || !process.env.CI)("hay un build que escanear", () => {
        expect(html.length, "Ejecuta astro build antes de pnpm test").toBeGreaterThan(0);
    });

    for (const file of html) {
        test(file.replace(ROOT, ""), () => {
            expect(findLeaks(visibleText(readFileSync(file, "utf8")), extra)).toEqual([]);
        });
    }
});
