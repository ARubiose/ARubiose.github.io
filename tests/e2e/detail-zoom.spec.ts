import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PATH = "/projects/note-engine/";

test.describe("imágenes ampliables del detalle", () => {
    test("abre la imagen a su tamaño natural, cierra con Esc y devuelve el foco", async ({ page }) => {
        await page.goto(PATH);
        const open = page.locator("article.prose-detail button.figure-open");
        await expect(open).toHaveCount(1);
        await expect(open).toHaveAccessibleName(/Diagrama/);
        await open.click();
        const dialog = page.locator("#figure-dialog");
        await expect(dialog).toBeVisible();
        const big = dialog.locator("img");
        await expect(big).toHaveAttribute("alt", /Diagrama/);
        await expect.poll(() => big.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
        const widths = await big.evaluate((el: HTMLImageElement) => [el.offsetWidth, el.naturalWidth]);
        expect(widths[0]).toBeCloseTo(widths[1], 0);
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await expect(open).toBeFocused();
    });

    test("en móvil la imagen ancha se desplaza dentro del visor sin desbordar la pantalla", async ({ page }, info) => {
        test.skip(!info.project.name.startsWith("mobile"));
        await page.goto(PATH);
        await page.locator("button.figure-open").click();
        const scroller = page.locator("#figure-dialog .figure-scroll");
        await expect(scroller).toBeVisible();
        const box = (await page.locator("#figure-dialog").boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(390);
        expect(await scroller.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    });

    test("cierra con el botón y al pulsar fuera", async ({ page }) => {
        await page.goto(PATH);
        const open = page.locator("button.figure-open");
        const dialog = page.locator("#figure-dialog");
        await open.click();
        await dialog.locator("[data-figure-close]").click();
        await expect(dialog).toBeHidden();
        await open.click();
        await page.mouse.click(2, 2);
        await expect(dialog).toBeHidden();
    });

    test("sin violaciones graves de axe con el visor abierto", async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(PATH);
        await page.locator("button.figure-open").click();
        await expect(page.locator("#figure-dialog")).toBeVisible();
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")).map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
});
