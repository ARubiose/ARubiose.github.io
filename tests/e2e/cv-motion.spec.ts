import { expect, test } from "@playwright/test";

const sheetParts = ".cv-sheet, .cv-head, .cv-sec";

test.describe("cv con movimiento reducido", () => {
    test.use({ reducedMotion: "reduce" });

    test("la hoja se ve completa al instante, sin estilos de animación", async ({ page }) => {
        await page.goto("/cv/");
        await expect(page.locator("html")).toHaveAttribute("data-cv-motion-ready", "");
        const styled = await page.locator(sheetParts).evaluateAll((els) => els.filter((el) => el.hasAttribute("style")).map((el) => el.className));
        expect(styled).toEqual([]);
        await expect(page.locator(".cv-sheet")).toHaveCSS("clip-path", "none");
    });
});

test.describe("cv sin JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("la hoja se lee completa", async ({ page }) => {
        await page.goto("/cv/");
        await expect(page.locator(".cv-sheet")).toBeVisible();
        await expect(page.locator(".cv-sec").last()).toBeVisible();
    });
});

test("cv con animaciones: la hoja sale como de una impresora y termina completa", async ({ page }) => {
    await page.goto("/cv/");
    // Al empezar, la hoja está recortada por abajo (impresión en curso).
    await expect.poll(() => page.locator(".cv-sheet").evaluate((el) => getComputedStyle(el).clipPath), { intervals: [20] }).toMatch(/inset/);
    // Al terminar no queda nada recortado ni transparente.
    await expect.poll(() => page.locator(sheetParts).evaluateAll((els) => els.filter((el) => el.getAttribute("style")?.trim()).length), { timeout: 6000 }).toBe(0);
    await expect(page.locator(".cv-sec").last()).toHaveCSS("opacity", "1");
});
