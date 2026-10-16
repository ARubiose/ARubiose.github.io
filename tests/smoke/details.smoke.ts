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
            // El beacon de analítica está bloqueado a propósito (playwright.smoke.config.ts): su fallo no cuenta.
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
