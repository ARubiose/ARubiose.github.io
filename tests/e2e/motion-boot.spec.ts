import { expect, test } from "@playwright/test";

// Sin parpadeo: lo que se va a animar no se pinta antes de que arranque la animación. Lo marca un
// script en línea del <head> (data-motion-pending) y lo quita la animación al empezar.
const PAGES = [
    { path: "/", hidden: ".hero-text" },
    { path: "/cv/", hidden: ".cv-sheet" },
] as const;

for (const p of PAGES) {
    test.describe(`arranque de la animación en ${p.path}`, () => {
        test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "no depende de la skin ni del dispositivo"));

        test("antes de que cargue el script, lo animado no se ve; si no llega, aparece igualmente", async ({ page }) => {
            // Sin los módulos de JS: solo corre el script en línea del <head>.
            await page.route("**/*.js", (route) => route.abort());
            await page.goto(p.path);
            await expect(page.locator("html")).toHaveAttribute("data-motion-pending", "");
            await expect(page.locator(p.hidden)).toHaveCSS("visibility", "hidden");
            await expect(page.locator(p.hidden)).toHaveCSS("visibility", "visible", { timeout: 5000 });
        });

        test("con la animación cargada, la marca desaparece y el contenido termina visible", async ({ page }) => {
            await page.goto(p.path);
            await expect(page.locator("html")).not.toHaveAttribute("data-motion-pending");
            await expect(page.locator(p.hidden)).toHaveCSS("visibility", "visible");
        });
    });
}

test.describe("arranque con movimiento reducido", () => {
    test.use({ reducedMotion: "reduce" });

    test("no se marca nada: el contenido se ve desde el primer pintado", async ({ page }, info) => {
        test.skip(info.project.name !== "desktop");
        await page.route("**/*.js", (route) => route.abort());
        await page.goto("/cv/");
        await expect(page.locator("html")).not.toHaveAttribute("data-motion-pending");
        await expect(page.locator(".cv-sheet")).toHaveCSS("visibility", "visible");
    });
});
