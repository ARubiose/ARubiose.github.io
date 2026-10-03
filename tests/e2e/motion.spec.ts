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
        // Una animación corta ya terminada también deja opacity 1: lo que la delata es el style en línea.
        const animated = page.locator(".hero .prompt, .hero-name, .hero-role, .hero-loc, .hero-sum, .hero-cta, .photo-window, .t-card, .timeline-node, .t-when, .reveal, [data-builder]");
        expect(await animated.count()).toBeGreaterThan(5);
        const styled = await animated.evaluateAll((els) => els.filter((el) => el.hasAttribute("style")).map((el) => el.className));
        expect(styled).toEqual([]);
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

test("cruzar 768 px durante la intro no la repite ni corta el prompt", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.goto("/");
    const prompt = page.locator('.hero .prompt [data-for-skin="terminal"]');
    // A mitad de la escritura: el prompt ya empezó, pero aún no está completo.
    await expect.poll(() => prompt.textContent(), { intervals: [10] }).toMatch(/^w[a-z]{0,4}$/);
    await page.setViewportSize({ width: 600, height: 800 });
    await expect(page.locator(".hero-name")).toHaveText("Álvaro Rubio Segovia", { timeout: 6000 });
    await expect(prompt).toHaveText("whoami");
});

test("con animaciones, la intro termina con el nombre completo", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".hero-name")).toHaveText("Álvaro Rubio Segovia", { timeout: 6000 });
});
