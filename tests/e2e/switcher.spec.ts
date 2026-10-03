import { expect, test, type Page } from "@playwright/test";
import { skinOf } from "./support";

test.use({ reducedMotion: "reduce" });
test.beforeEach(({}, info) => test.skip(skinOf(info.project.name) !== "terminal", "parte de Terminal"));

async function openSwitcher(page: Page, mobile: boolean) {
    if (mobile) await page.locator('[popovertarget="site-menu"]').click();
    return page.locator(mobile ? "#site-menu [data-skin-switcher]" : ".header-lang [data-skin-switcher]");
}

test("cambia al instante, sincroniza los dos selectores y se recuerda al recargar", async ({ page }, info) => {
    const mobile = info.project.name.startsWith("mobile");
    await page.goto("/");
    const switcher = await openSwitcher(page, mobile);
    await switcher.locator('[data-skin-option="tactical"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-skin", "tactical");
    await expect(page.locator("html")).toHaveAttribute("data-timeline", "single");
    await expect(page.locator('[data-skin-option="tactical"][aria-pressed="true"]')).toHaveCount(2);
    await expect(page.locator('[data-skin-option="terminal"][aria-pressed="false"]')).toHaveCount(2);
    await expect(page.locator("[data-skin-status]")).toHaveText(/Táctico/);
    await expect(switcher.locator('[data-skin-option="tactical"]')).toBeFocused();

    await page.addInitScript(() => {
        const obs = new MutationObserver(() => {
            if (document.body) {
                (window as unknown as { firstSkin: string }).firstSkin = document.documentElement.dataset.skin ?? "";
                obs.disconnect();
            }
        });
        obs.observe(document, { childList: true, subtree: true });
    });
    await page.reload();
    expect(await page.evaluate(() => (window as unknown as { firstSkin: string }).firstSkin)).toBe("tactical");
});

test("en Terminal solo se ven los adornos de Terminal", async ({ page }) => {
    await page.goto("/");
    const visible = await page.locator("[data-for-skin]").evaluateAll((els) =>
        els.filter((e) => getComputedStyle(e).display !== "none").map((e) => e.getAttribute("data-for-skin")),
    );
    expect(visible.length).toBeGreaterThan(5);
    expect(new Set(visible)).toEqual(new Set(["terminal"]));
});

test("una skin guardada desconocida carga la predeterminada", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("skin", "retirada"));
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-skin", "terminal");
    await expect(page.locator("html")).toHaveAttribute("data-timeline", "alternate");
});

test("con localStorage bloqueado el selector sigue funcionando", async ({ page }, info) => {
    await page.addInitScript(() => {
        Storage.prototype.setItem = () => { throw new DOMException("bloqueado", "SecurityError"); };
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    const switcher = await openSwitcher(page, info.project.name.startsWith("mobile"));
    await switcher.locator('[data-skin-option="tactical"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-skin", "tactical");
    expect(errors).toEqual([]);
});

test("en Terminal el prompt de la cabecera va en el color de acento", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".site-handle")).toHaveCSS("color", "rgb(159, 214, 90)");
});
