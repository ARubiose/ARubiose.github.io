import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });
test.beforeEach(({}, info) => test.skip(!info.project.name.endsWith("-tactical")));

test("se carga Táctico con su modo de línea de tiempo", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-skin", "tactical");
    await expect(page.locator("html")).toHaveAttribute("data-timeline", "single");
});

test("solo se ven los adornos de Táctico", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-for-skin="terminal"]').first()).toBeHidden();
    const visible = await page.locator("[data-for-skin]").evaluateAll((els) =>
        els.filter((e) => getComputedStyle(e).display !== "none").map((e) => e.getAttribute("data-for-skin")),
    );
    expect(new Set(visible)).toEqual(new Set(["tactical"]));
});

test("escritorio: foto a la derecha del texto y línea de tiempo en una columna", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-tactical");
    await page.goto("/");
    const photo = (await page.locator(".photo-window").boundingBox())!;
    const name = (await page.locator(".hero-name").boundingBox())!;
    expect(photo.x).toBeGreaterThan(name.x + name.width);
    const rail = (await page.locator("#experience .timeline-rail").boundingBox())!;
    for (const card of await page.locator("#experience .t-card").all()) {
        expect((await card.boundingBox())!.x).toBeGreaterThan(rail.x + rail.width);
    }
});

test("la cabecera muestra el indicativo derivado del nombre", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('.site-handle [data-for-skin="tactical"]')).toHaveText(/^\S+ \/\/ \S+$/);
});

test("el indicativo usa el color de texto de Táctico, no el acento de Terminal", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".site-handle")).toHaveCSS("color", "rgb(231, 234, 239)");
});

test("ninguna barra de ventana visible queda vacía", async ({ page }) => {
    await page.goto("/");
    const empty = await page.locator(".window-bar").evaluateAll((bars) =>
        bars.filter((b) => (b as HTMLElement).offsetHeight > 0 && !(b as HTMLElement).innerText.trim()).map((b) => b.closest("[id]")?.id ?? "?"),
    );
    expect(empty).toEqual([]);
});
