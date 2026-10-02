import { expect, test } from "@playwright/test";

test.describe("sin animaciones", () => {
    test.use({ reducedMotion: "reduce" });

    test("con movimiento reducido todo el contenido está visible y en su sitio", async ({ page }) => {
        await page.goto("/");
        // Espera a que el módulo de animaciones haya terminado de registrarse.
        await expect(page.locator("html")).toHaveAttribute("data-motion-ready", "");
        await expect(page.locator(".hero-name")).toHaveCSS("opacity", "1");
        const cards = page.locator(".t-card");
        for (const card of await cards.all()) {
            await card.scrollIntoViewIfNeeded();
            await expect(card).toHaveCSS("opacity", "1");
            await expect(card).toHaveCSS("transform", "none");
        }
    });
});

test.describe("sin JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("la página y el creador de personaje se leen completos", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator(".hero-name")).toBeVisible();
        await expect(page.locator(".panel-title")).toHaveCount(5);
        await expect(page.locator(".skill-detail").first()).toBeVisible();
        await expect(page.locator("[data-tabs]")).toBeHidden();
        await expect(page.locator(".t-card").first()).toBeVisible();
    });
});

test("con animaciones, la intro termina con el nombre completo", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".hero-name")).toHaveText("Álvaro Rubio Segovia", { timeout: 6000 });
});
