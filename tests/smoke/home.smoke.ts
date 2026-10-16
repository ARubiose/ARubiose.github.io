import { expect, test } from "@playwright/test";
import { overflowOffenders } from "./support";

// Genérico: vale para cualquier contenido. No compara textos ni capturas.
for (const path of ["./", "./en/"]) {
    test(`portada ${path} carga limpia con el contenido real`, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        // El beacon de analítica está bloqueado a propósito (playwright.smoke.config.ts): su fallo no cuenta.
        page.on("console", (m) => { if (m.type() === "error" && !m.location().url.includes("cloudflareinsights")) errors.push(m.text()); });
        // Sin animaciones: la intro desliza tarjetas desde fuera de la pantalla y daría falsos desbordamientos.
        await page.emulateMedia({ reducedMotion: "reduce" });
        const res = await page.goto(path);
        expect(res?.status()).toBe(200);
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.locator("h1")).not.toBeEmpty();
        // Cada enlace de la navegación lleva a una sección que existe y tiene contenido.
        const anchors = await page.locator('a[href^="#"]').evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("href")!))].filter((h) => h.length > 1));
        for (const href of anchors) await expect(page.locator(href)).not.toBeEmpty();
        const offenders = await overflowOffenders(page);
        expect(offenders).toEqual([]);
        await page.waitForLoadState("networkidle");
        expect(errors).toEqual([]);
    });
}
