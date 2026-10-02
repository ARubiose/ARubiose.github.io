import { expect, test } from "@playwright/test";

test("escritorio: el menú lleva a cada sección y la marca como activa", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.goto("/");
    for (const id of ["experience", "projects", "skills", "education", "contact"]) {
        await page.locator(`.site-nav a[href="#${id}"]`).click();
        await expect(page.locator(`#${id}`)).toBeInViewport();
        await expect(page.locator(`.site-nav a[href="#${id}"]`)).toHaveAttribute("aria-current", "true");
    }
});

test("móvil: el popover abre, navega, se cierra al elegir y con Esc", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile");
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
