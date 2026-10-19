import { expect, test } from "@playwright/test";
import { overflowOffenders } from "./support";

// Contenido real (la wiki que se publica): el CV carga limpio, cabe en pantalla y su PDF se descarga.
for (const path of ["./cv/", "./en/cv/"]) {
    test(`cv ${path} carga limpio con el contenido real`, async ({ page, request }) => {
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
        const href = await page.locator("a[download]").getAttribute("href");
        const pdf = await request.get(new URL(href!, page.url()).href);
        expect(pdf.status()).toBe(200);
        expect(pdf.headers()["content-type"]).toContain("application/pdf");
        await page.waitForLoadState("networkidle");
        expect(errors).toEqual([]);
    });
}
