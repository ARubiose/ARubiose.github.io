import { expect, test } from "@playwright/test";

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
        // body usa overflow-x: clip, así que scrollWidth no ve el desbordamiento: se miden los elementos (como nav.spec.ts).
        const offenders = await page.evaluate(() => {
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
        expect(offenders).toEqual([]);
        await page.waitForLoadState("networkidle");
        expect(errors).toEqual([]);
    });
}
