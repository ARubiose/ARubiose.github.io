import { expect, test } from "@playwright/test";

test.describe("foto ampliable", () => {
    test("abre, atrapa el foco, cierra con Esc y devuelve el foco", async ({ page }) => {
        await page.goto("/");
        const open = page.locator("#photo-open");
        await open.click();
        const dialog = page.locator("#photo-dialog");
        await expect(dialog).toBeVisible();
        // Modal: el resto de la página es inerte; el foco nunca cae en algo fuera del diálogo
        // (al pasar el último control, Chrome lo lleva a la interfaz del navegador: body).
        for (let i = 0; i < 4; i++) {
            await page.keyboard.press("Tab");
            const where = await page.evaluate(() => {
                const el = document.activeElement;
                return !el || el === document.body ? "browser" : el.closest("#photo-dialog") ? "dialog" : "page";
            });
            expect(where).not.toBe("page");
        }
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await expect(open).toBeFocused();
    });

    test("cierra al pulsar fuera de la imagen", async ({ page }) => {
        await page.goto("/");
        await page.locator("#photo-open").click();
        await page.mouse.click(5, 5);
        await expect(page.locator("#photo-dialog")).toBeHidden();
    });

    test("en móvil la foto ocupa el ancho de la pantalla", async ({ page }, info) => {
        test.skip(info.project.name !== "mobile");
        await page.goto("/");
        const box = await page.locator("#photo-open").boundingBox();
        expect(box!.width).toBeGreaterThan(390 - 2 * 16 - 4);
    });
});
