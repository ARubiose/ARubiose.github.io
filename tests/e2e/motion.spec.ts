import { expect, test } from "@playwright/test";
import { skinOf } from "./support";

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
        await expect(page.locator("[data-skin-switcher]").first()).toBeHidden();
        await expect(page.locator(".t-card").first()).toBeVisible();
    });
});

test("cruzar 768 px durante la intro no la repite ni corta el prompt", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "escritura del prompt: propia de Terminal");
    await page.goto("/");
    const prompt = page.locator('.hero .prompt [data-for-skin="terminal"]');
    // A mitad de la escritura: el prompt ya empezó, pero aún no está completo.
    await expect.poll(() => prompt.textContent(), { intervals: [10] }).toMatch(/^w[a-z]{0,4}$/);
    await page.setViewportSize({ width: 600, height: 800 });
    await expect(page.locator(".hero-name")).toHaveText("Álvaro Rubio Segovia", { timeout: 6000 });
    await expect(prompt).toHaveText("whoami");
});

test("con animaciones, la intro termina con el nombre completo y la foto visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".hero-name")).toHaveText("Álvaro Rubio Segovia", { timeout: 6000 });
    // Opacidad efectiva de la foto (la suya y la de sus contenedores): una transición CSS en la imagen
    // hacía que la intro de Juego la dejara a 0.
    await expect.poll(() => page.locator(".photo-window img").evaluate((img) => {
        let op = 1;
        for (let e: Element | null = img; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
        return op;
    }), { timeout: 4000 }).toBe(1);
});

test("la intro no cambia la altura de la página: un salto del menú a mitad de intro llega a su destino", async ({ page }) => {
    // El nombre descifrado es una sola palabra sin espacios: si ensanchara su columna, la página
    // encogería durante la intro y el scroll suave hacia «contacto» se quedaría corto.
    await page.addInitScript(() => {
        const samples: [string, number][] = [];
        (window as unknown as { __samples: typeof samples }).__samples = samples;
        const tick = () => {
            samples.push([document.fonts.status, document.documentElement.scrollHeight]);
            if (performance.now() < 4000) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });
    await page.goto("/");
    await page.waitForFunction(() => performance.now() >= 4000);
    await expect(page.locator(".hero-name")).toHaveText(/\s/);
    // Las fuentes pueden cambiar la altura al llegar; desde entonces debe quedarse fija.
    const samples = await page.evaluate(() => (window as unknown as { __samples: [string, number][] }).__samples);
    const loaded = samples.findLastIndex(([status]) => status === "loading") + 1;
    const heights = [...new Set(samples.slice(loaded).map(([, h]) => h))];
    expect(heights).toHaveLength(1);
});

test("Táctico: la intro termina con el nombre completo, las esquinas dibujadas y sin prompt escrito", async ({ page }, info) => {
    test.skip(skinOf(info.project.name) !== "tactical");
    await page.goto("/");
    await expect(page.locator(".hero-name")).toHaveText("Álvaro Rubio Segovia", { timeout: 6000 });
    await expect.poll(() => page.locator(".photo-window").evaluate((el) => getComputedStyle(el, "::before").width), { timeout: 6000 }).toBe("38px");
    await expect(page.locator('.hero .prompt [data-for-skin="terminal"]')).toHaveText("whoami");
});

test("Táctico: las esquinas de la foto se dibujan desde cero", async ({ page }, info) => {
    test.skip(skinOf(info.project.name) !== "tactical");
    await page.goto("/");
    const sizes = new Set<string>();
    await expect.poll(async () => {
        sizes.add(await page.locator(".photo-window").evaluate((el) => getComputedStyle(el, "::before").width));
        return getComputedStyleDone(sizes);
    }, { intervals: [16], timeout: 4000 }).toBe(true);
});

function getComputedStyleDone(sizes: Set<string>) {
    // Se ha visto al menos un tamaño intermedio (animación) y el final.
    return sizes.has("38px") && [...sizes].some((s) => s !== "38px");
}

test("una skin sin preset de intro usa la de Terminal sin escribir el prompt", async ({ page }, info) => {
    test.skip(skinOf(info.project.name) !== "terminal");
    // Tras el script de arranque y antes de los módulos: simula una skin futura sin preset.
    await page.addInitScript(() => {
        const obs = new MutationObserver(() => {
            if (document.body) {
                document.documentElement.dataset.skin = "sin-preset";
                obs.disconnect();
            }
        });
        obs.observe(document, { childList: true, subtree: true });
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(page.locator(".hero-name")).toHaveText("Álvaro Rubio Segovia", { timeout: 6000 });
    await expect(page.locator('.hero .prompt [data-for-skin="terminal"]')).toHaveText("whoami");
    expect(errors).toEqual([]);
});

for (const target of ["tactical", "game"]) {
    test(`cambiar de Terminal a ${target} a mitad de página no deja contenido invisible ni repite la intro`, async ({ page }, info) => {
        test.skip(skinOf(info.project.name) !== "terminal");
        const mobile = info.project.name.startsWith("mobile");
        // Centrada: con scrollIntoViewIfNeeded una tarjeta puede quedar visible pero bajo la línea de disparo.
        const center = (el: Element) => el.scrollIntoView({ block: "center", behavior: "instant" });
        await page.goto("/");
        await expect(page.locator(".hero-name")).toHaveText("Álvaro Rubio Segovia", { timeout: 6000 });
        for (const card of await page.locator(".t-card").all()) {
            await card.evaluate(center);
            await expect(card).toHaveCSS("opacity", "1");
        }
        if (mobile) await page.locator('[popovertarget="site-menu"]').click();
        await page.locator(`${mobile ? "#site-menu" : ".header-lang"} [data-skin-option="${target}"]`).click();
        if (mobile) await page.keyboard.press("Escape");
        await expect(page.locator("html")).toHaveAttribute("data-skin", target);
        for (const card of await page.locator(".t-card").all()) {
            await card.evaluate(center);
            await expect(card).toHaveCSS("opacity", "1");
        }
        // La intro no se repite: el nombre y la foto del hero siguen enteros.
        await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
        await expect(page.locator(".hero-name")).toHaveCSS("opacity", "1");
        await expect(page.locator(".photo-window img")).toHaveCSS("opacity", "1");
    });
}

test("al cambiar de skin se recalculan las posiciones: la línea de tiempo se completa al final de su sección", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.goto("/");
    await page.locator('.header-lang [data-skin-option="tactical"]').click();
    // Final de la línea de tiempo por debajo de su punto de fin ("bottom 60%"): la línea debe estar completa.
    await page.evaluate(() => {
        const t = document.querySelector<HTMLElement>("#experience .timeline")!;
        scrollTo({ top: scrollY + t.getBoundingClientRect().bottom - innerHeight * 0.5, behavior: "instant" });
    });
    await expect.poll(() => page.locator("#experience .timeline-fill").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).d), { timeout: 3000 }).toBeCloseTo(1, 2);
    // Inicio por debajo de su punto de comienzo ("top 70%"): la línea aún no ha empezado.
    await page.evaluate(() => {
        const t = document.querySelector<HTMLElement>("#experience .timeline")!;
        scrollTo({ top: scrollY + t.getBoundingClientRect().top - innerHeight * 0.95, behavior: "instant" });
    });
    await expect.poll(() => page.locator("#experience .timeline-fill").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).d), { timeout: 3000 }).toBeCloseTo(0, 2);
});

test("Juego: el panel del hero barre, el nombre queda completo y el prompt sin escribir", async ({ page }, info) => {
    test.skip(skinOf(info.project.name) !== "game");
    await page.goto("/");
    const reveals = new Set<string>();
    await expect.poll(async () => {
        reveals.add(await page.locator(".photo-window").evaluate((el) => getComputedStyle(el).getPropertyValue("--panel-reveal").trim()));
        return reveals.has("1") && [...reveals].some((v) => v !== "1");
    }, { intervals: [16], timeout: 4000 }).toBe(true);
    await expect(page.locator(".hero-name")).toHaveText("Álvaro Rubio Segovia", { timeout: 6000 });
    await expect(page.locator(".hero-name")).toHaveCSS("opacity", "1");
    await expect(page.locator('.hero .prompt [data-for-skin="terminal"]')).toHaveText("whoami");
});

test("tras cambiar a una skin de una columna, las tarjetas aún ocultas entran desde la derecha", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "en Terminal de escritorio hay tarjetas a la izquierda del eje");
    await page.goto("/");
    await page.locator('.header-lang [data-skin-option="game"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-timeline", "single");
    // Una tarjeta que en Terminal está a la izquierda (entraría desde -60 px) y aún no ha entrado.
    const card = page.locator('#experience .t-item[data-side="left"] .t-card').last();
    await card.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    const xs: number[] = [];
    await expect.poll(async () => {
        xs.push(await card.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).e));
        return xs.some((x) => x !== 0);
    }, { intervals: [16], timeout: 3000 }).toBe(true);
    expect(xs.find((x) => x !== 0)).toBeGreaterThan(0);
});

// Las fuentes de la skin nueva no se precargan: llegan después del refresco del cambio de skin y
// cambian la altura de la página. Si no se vuelve a refrescar, los disparadores quedan desplazados.
test("tras cambiar de skin y cargar sus fuentes, una tarjeta bien dentro de la pantalla ya ha entrado", async ({ page }, info) => {
    test.skip(skinOf(info.project.name) !== "terminal");
    const mobile = info.project.name.startsWith("mobile");
    await page.goto("/");
    if (mobile) await page.locator('[popovertarget="site-menu"]').click();
    await page.locator(`${mobile ? "#site-menu" : ".header-lang"} [data-skin-option="game"]`).click();
    if (mobile) await page.keyboard.press("Escape");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    for (const card of await page.locator("#education .t-card").all()) {
        await card.evaluate((el) => {
            const item = el.closest(".t-item")!;
            scrollTo({ top: scrollY + item.getBoundingClientRect().top - innerHeight * 0.6, behavior: "instant" });
        });
        await expect(card).toHaveCSS("opacity", "1");
    }
});

