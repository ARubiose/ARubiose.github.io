import { expect, test } from "@playwright/test";
import { skinOf } from "./support";

test.use({ reducedMotion: "reduce" });
test.beforeEach(({}, info) => test.skip(skinOf(info.project.name) !== "tactical"));

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

// El clip-path de las esquinas cortadas recorta un contorno exterior: el foco va por dentro y de un
// color distinto del fondo del elemento.
test("el foco de teclado se ve en botones y pestañas recortados", async ({ page }, info) => {
    test.skip(!info.project.name.startsWith("desktop"));
    await page.goto("/");
    const ring = (sel: string) => page.locator(sel).first().evaluate((el) => {
        const cs = getComputedStyle(el);
        return { offset: parseFloat(cs.outlineOffset), color: cs.outlineColor, background: cs.backgroundColor, style: cs.outlineStyle };
    });
    const cta = page.locator(".hero-cta .btn-primary");
    await cta.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(cta).toBeFocused();
    await expect.poll(async () => (await ring(".hero-cta .btn-primary")).offset).toBeLessThan(0);
    const c = await ring(".hero-cta .btn-primary");
    expect(c.style).toBe("solid");
    expect(c.color).not.toBe(c.background);
    await page.locator('#skills .tab[aria-selected="true"]').focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator('#skills .tab[aria-selected="true"]')).toBeFocused();
    // Movimiento reducido deja transiciones de 0,01 ms (base.css): se espera al valor final.
    await expect.poll(async () => (await ring('#skills .tab[aria-selected="true"]')).offset).toBeLessThan(0);
    const t = await ring('#skills .tab[aria-selected="true"]');
    expect(t.color).not.toBe(t.background);
});

test("el «//» del indicativo va en el acento", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('.site-handle [data-for-skin="tactical"] .adorn-mark')).toHaveCSS("color", "rgb(240, 168, 58)");
});

test("móvil: la foto va entre la ubicación y el resumen", async ({ page }, info) => {
    test.skip(!info.project.name.startsWith("mobile"));
    await page.goto("/");
    const [loc, photo, sum] = await Promise.all([".hero-loc", ".photo-window", ".hero-sum"].map((s) => page.locator(s).boundingBox()));
    expect(photo!.y).toBeGreaterThan(loc!.y + loc!.height);
    expect(sum!.y).toBeGreaterThan(photo!.y + photo!.height);
});
