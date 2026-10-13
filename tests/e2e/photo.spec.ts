import { expect, test } from "@playwright/test";
import { skinOf } from "./support";

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

    test("la barra del visor no dibuja una línea doble sobre la imagen", async ({ page }) => {
        await page.goto("/");
        await page.locator("#photo-open").click();
        const bar = page.locator("#photo-dialog .window-bar");
        await expect(bar).toHaveCSS("border-bottom-width", "0px");
    });

    test("cierra al pulsar fuera de la imagen", async ({ page }) => {
        await page.goto("/");
        await page.locator("#photo-open").click();
        await page.mouse.click(5, 5);
        await expect(page.locator("#photo-dialog")).toBeHidden();
    });

    test("en móvil la foto ocupa el ancho de la pantalla (en Juego, tres cuartos)", async ({ page }, info) => {
        test.skip(!info.project.name.startsWith("mobile"));
        await page.goto("/");
        const box = await page.locator(".photo-window").boundingBox();
        if (skinOf(info.project.name) === "game") {
            // Juego la convierte en carta de personaje: tres cuartos del ancho, pegada al margen derecho.
            expect(box!.width).toBeGreaterThan((390 - 2 * 16) * 0.7);
            expect(box!.x + box!.width).toBeCloseTo(390 - 16, 0);
        } else {
            expect(box!.width).toBeGreaterThan(390 - 2 * 16 - 4);
        }
    });
});
