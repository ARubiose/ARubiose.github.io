import { expect, test } from "@playwright/test";
import { skinOf } from "./support";

test.use({ reducedMotion: "reduce" });
test.beforeEach(({}, info) => test.skip(skinOf(info.project.name) !== "game"));

test("se carga Juego con su modo de línea de tiempo", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-skin", "game");
    await expect(page.locator("html")).toHaveAttribute("data-timeline", "single");
});

for (const path of ["/", "/en/"]) {
    test(`solo se ven los adornos de Juego en ${path}`, async ({ page }) => {
        await page.goto(path);
        const visible = await page.locator("[data-for-skin]").evaluateAll((els) =>
            els.filter((e) => getComputedStyle(e).display !== "none").map((e) => e.getAttribute("data-for-skin")),
        );
        expect(visible.length).toBeGreaterThan(0);
        expect(new Set(visible)).toEqual(new Set(["game"]));
    });
}

test("la cabecera muestra el nombre corto en mayúsculas", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('.site-handle [data-for-skin="game"]')).toHaveText(/^\S+ \S+$/);
    await expect(page.locator(".site-handle")).toHaveCSS("text-transform", "uppercase");
});

test("escritorio: foto a la derecha, nombre grande y línea de tiempo en una columna", async ({ page }, info) => {
    test.skip(!info.project.name.startsWith("desktop"));
    await page.goto("/");
    const photo = (await page.locator(".photo-window").boundingBox())!;
    const name = (await page.locator(".hero-name").boundingBox())!;
    expect(photo.x).toBeGreaterThan(name.x + name.width);
    await expect(page.locator("h1")).toHaveCSS("font-size", "84px");
    const cards = await page.locator("#experience .t-card").all();
    const xs = await Promise.all(cards.map(async (c) => (await c.boundingBox())!.x));
    expect(new Set(xs.map(Math.round)).size).toBe(1);
});

test("el rol es un bloque de color de texto con texto de fondo", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".hero-role")).toHaveCSS("background-color", "rgb(236, 236, 241)");
    await expect(page.locator(".hero-role")).toHaveCSS("color", "rgb(15, 15, 19)");
});

test("el puesto vigente lleva el borde rojo", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#experience .t-item[data-current] .t-card").first()).toHaveCSS("border-left-color", "rgb(236, 76, 86)");
});

test("el foco de teclado se ve dentro de los botones recortados", async ({ page }) => {
    await page.goto("/");
    const cta = page.locator(".hero-cta .btn-primary");
    await cta.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(cta).toBeFocused();
    await expect(cta).toHaveCSS("outline-offset", "-4px");
    await expect(cta).toHaveCSS("outline-color", "rgb(236, 236, 241)");
});

// El panel diagonal del hero es un pseudoelemento: la prueba común de desbordamiento no lo ve.
// En la pestaña seleccionada y en la skin activa el fondo es el color de texto: el contorno de foco
// no puede ser de ese mismo color.
test("el foco se distingue del fondo en la pestaña seleccionada y en la skin activa", async ({ page }, info) => {
    test.skip(!info.project.name.startsWith("desktop"), "el selector de la cabecera es de escritorio");
    await page.goto("/");
    const contrast = (sel: string) => page.locator(sel).first().evaluate((el) => {
        const cs = getComputedStyle(el);
        return { outline: cs.outlineColor, background: cs.backgroundColor, style: cs.outlineStyle };
    });
    const tab = page.locator('#skills .tab[aria-selected="true"]');
    await tab.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator('#skills .tab[aria-selected="true"]')).toBeFocused();
    const t = await contrast('#skills .tab[aria-selected="true"]');
    expect(t.style).toBe("solid");
    expect(t.outline).not.toBe(t.background);
    const option = page.locator('.header-lang [data-skin-option="game"]');
    await page.locator('.header-lang [data-skin-option="tactical"]').focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(option).toBeFocused();
    const o = await contrast('.header-lang [data-skin-option="game"]');
    expect(o.style).toBe("solid");
    expect(o.outline).not.toBe(o.background);
});

// Plantilla: el nombre puede traer palabras muy largas, que a 50-84 px en mayúsculas no caben.
test("un nombre con una palabra muy larga no desborda ni aplasta la foto", async ({ page }, info) => {
    await page.goto("/");
    await page.locator(".hero-name").evaluate((el) => { el.textContent = "Supercalifragilisticoexpialidoso Rubio"; });
    const [name, hero, photo] = await Promise.all([".hero-name", "#about", ".photo-window"].map((s) => page.locator(s).boundingBox()));
    expect(name!.x + name!.width).toBeLessThanOrEqual(hero!.x + hero!.width + 1);
    if (info.project.name.startsWith("desktop")) expect(photo!.width).toBeGreaterThan(250);
});

// Un borde visible y un clip-path inclinado no casan: el recorte se come los laterales del borde.
test("el botón de equipar con borde visible no va recortado", async ({ page }, info) => {
    test.skip(!info.project.name.startsWith("desktop"), "en móvil el botón está en el panel inferior");
    await page.goto("/");
    const button = page.locator("#skills .inspector-equip");
    const look = () => button.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { border: cs.borderLeftColor, background: cs.backgroundColor, clip: cs.clipPath };
    });
    await page.locator("#skills .tile-main").first().click();
    await button.click(); // equipa: el botón pasa a «quitar», solo con borde
    await expect(button).toHaveAttribute("data-equipped", "");
    const on = await look();
    expect(on.border).not.toBe(on.background);
    expect(on.clip).toBe("none");
});

test("el panel diagonal del hero no ensancha la página", async ({ page }) => {
    await page.goto("/");
    const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(scroll).toBeLessThanOrEqual(client);
});

test("ninguna barra de ventana visible queda vacía", async ({ page }) => {
    await page.goto("/");
    const empty = await page.locator(".window-bar").evaluateAll((bars) =>
        bars.filter((b) => (b as HTMLElement).offsetHeight > 0 && !(b as HTMLElement).innerText.trim()).map((b) => b.closest("[id]")?.id ?? "?"),
    );
    expect(empty).toEqual([]);
});

test.describe("con animaciones", () => {
    test.use({ reducedMotion: "no-preference" });

    test("cambiar de Juego a Táctico tras hacer scroll no deja contenido invisible", async ({ page }, info) => {
        const mobile = info.project.name.startsWith("mobile");
        await page.goto("/");
        for (const card of await page.locator(".t-card").all()) {
            // Centrada: con scrollIntoViewIfNeeded puede quedar visible pero por debajo de la línea de disparo.
            await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
            await expect(card).toHaveCSS("opacity", "1");
        }
        if (mobile) await page.locator('[popovertarget="site-menu"]').click();
        await page.locator(`${mobile ? "#site-menu" : ".header-lang"} [data-skin-option="tactical"]`).click();
        if (mobile) await page.keyboard.press("Escape");
        await expect(page.locator("html")).toHaveAttribute("data-skin", "tactical");
        for (const card of await page.locator(".t-card").all()) {
            // Centrada: con scrollIntoViewIfNeeded puede quedar visible pero por debajo de la línea de disparo.
            await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
            await expect(card).toHaveCSS("opacity", "1");
        }
    });
});
