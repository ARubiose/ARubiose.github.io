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
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
});
