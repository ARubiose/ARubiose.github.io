import { expect, test } from "@playwright/test";

test("escritorio: el menú lleva a cada sección y la marca como activa", async ({ page }, info) => {
    test.skip(!info.project.name.startsWith("desktop"));
    await page.goto("/");
    for (const id of ["experience", "projects", "skills", "education", "contact"]) {
        await page.locator(`.site-nav a[href="#${id}"]`).click();
        await expect(page.locator(`#${id}`)).toBeInViewport();
        await expect(page.locator(`.site-nav a[href="#${id}"]`)).toHaveAttribute("aria-current", "true");
    }
});

test("móvil: el popover abre, navega, se cierra al elegir y con Esc", async ({ page }, info) => {
    test.skip(!info.project.name.startsWith("mobile"));
    await page.goto("/");
    const menu = page.locator("#site-menu");
    await page.locator('[popovertarget="site-menu"]').click();
    await expect(menu).toBeVisible();
    await menu.locator('a[href="#skills"]').click();
    await expect(menu).toBeHidden();
    await expect(page.locator("#skills")).toBeInViewport();
    await page.locator('[popovertarget="site-menu"]').click();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
});

test("móvil: el texto de cada enlace del menú empieza en su margen, sin que el marcador lo desplace", async ({ page }, info) => {
    test.skip(!info.project.name.startsWith("mobile"));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.locator('[popovertarget="site-menu"]').click();
    const offsets = await page.locator("#site-menu .nav-link").evaluateAll((links) =>
        links.map((a) => {
            const range = document.createRange();
            range.selectNodeContents(a.firstChild!); // el texto, sin el ::before
            const contentLeft = a.getBoundingClientRect().left + parseFloat(getComputedStyle(a).paddingLeft);
            return Math.round(range.getBoundingClientRect().left - contentLeft);
        }),
    );
    expect(offsets.length).toBeGreaterThan(0);
    // En Terminal el marcador «>» no ocupa sitio; en Táctico el rombo va delante del texto a propósito,
    // pero el texto nunca debe salirse a la izquierda del margen.
    const tactical = info.project.name.endsWith("-tactical");
    for (const offset of offsets) {
        if (tactical) expect(offset).toBeGreaterThanOrEqual(-1);
        else expect(Math.abs(offset)).toBeLessThanOrEqual(1);
    }
});

test("sin desbordamiento horizontal", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    // body usa overflow-x: clip, así que scrollWidth no ve el desbordamiento: se miden los elementos.
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
});

test("sin Popover API el móvil sigue teniendo navegación e idioma", async ({ page }, info) => {
    test.skip(!info.project.name.startsWith("mobile"));
    await page.goto("/");
    // Chromium soporta popover: se aplica el bloque @supports de respaldo como si no lo hiciera.
    const applied = await page.evaluate(() => {
        const rules = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]);
        const fallback = rules.find((r) => r instanceof CSSSupportsRule && r.conditionText.includes(":popover-open")) as CSSSupportsRule | undefined;
        if (!fallback) return false;
        const style = document.createElement("style");
        style.textContent = [...fallback.cssRules].map((r) => r.cssText).join("\n");
        document.head.append(style);
        return true;
    });
    expect(applied).toBe(true);
    await expect(page.locator(".menu-toggle")).toBeHidden();
    await expect(page.locator("#site-menu")).toBeHidden();
    await expect(page.locator('.site-nav a[href="#skills"]')).toBeAttached();
    await expect(page.locator(".site-nav")).toBeVisible();
    await expect(page.locator('.header-lang a[hreflang="en"]')).toBeVisible();
    for (const selector of [".site-nav", ".header-lang"]) {
        const box = await page.locator(selector).boundingBox();
        expect(box!.x + box!.width, selector).toBeLessThanOrEqual(390);
    }
});
