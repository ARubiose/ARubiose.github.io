import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";

const ROOT = join(import.meta.dirname, "../..");
// Vitest mete en process.env las variables de Vite (BASE_URL…); heredadas, pisarían la base del build.
const VITE_KEYS = new Set(["BASE_URL", "MODE", "DEV", "PROD", "SSR"]);
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !VITE_KEYS.has(k)));

// Repo de plantilla con nombre propio: todo lo que el HTML pide tiene que colgar de /<repo>/.
test("construido con base, ninguna URL interna apunta a la raíz del dominio", () => {
    const out = mkdtempSync(join(tmpdir(), "base-"));
    execFileSync("pnpm", ["exec", "astro", "build"], {
        cwd: ROOT,
        stdio: "pipe",
        env: { ...cleanEnv, WIKI_DIR: "tests/fixtures/site", OUT_DIR: out, SITE_URL: "https://ada.github.io", BASE_PATH: "/demo/" },
    });
    const pages = readdirSync(out, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".html"));
    expect(pages.length).toBeGreaterThan(1);
    const offenders = pages.flatMap((page) =>
        [...readFileSync(join(out, page), "utf8").matchAll(/\b(?:href|src|srcset|content)="(\/(?!demo\/)[^"]*)"/g)].map((m) => `${page}: ${m[1]}`),
    );
    expect(offenders).toEqual([]);
    expect(readFileSync(join(out, "robots.txt"), "utf8")).toContain("https://ada.github.io/demo/sitemap-index.xml");
});
