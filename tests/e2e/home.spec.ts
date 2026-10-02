import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
    { path: "/", lang: "es", other: "/en/", otherLabel: "English" },
    { path: "/en/", lang: "en", other: "/", otherLabel: "Español" },
];

for (const p of pages) {
    test.describe(`portada ${p.lang}`, () => {
        test("idioma, título y nombre", async ({ page }) => {
            await page.goto(p.path);
            await expect(page.locator("html")).toHaveAttribute("lang", p.lang);
            await expect(page).toHaveTitle(/\S/);
            await expect(page.locator("h1")).toHaveCount(1);
            await expect(page.locator("h1")).not.toBeEmpty();
        });

        test("todas las secciones del menú existen y tienen contenido", async ({ page }) => {
            await page.goto(p.path);
            const anchors = await page.locator('header a[href^="#"]').evaluateAll((els) =>
                els.map((e) => e.getAttribute("href")!),
            );
            expect(anchors.length).toBeGreaterThan(0);
            for (const href of anchors) {
                const section = page.locator(href);
                await expect(section, href).toHaveCount(1);
                await expect(section.locator("h2"), href).not.toBeEmpty();
            }
        });

        test("no se cuelan valores sin resolver", async ({ page }) => {
            await page.goto(p.path);
            const text = await page.locator("body").innerText();
            expect(text).not.toMatch(/undefined|\[object Object\]|NaN/);
        });

        test("la foto de perfil tiene nombre accesible y la ampliada, texto alternativo", async ({ page }) => {
            await page.goto(p.path);
            await expect(page.locator("#photo-open")).toHaveAttribute("aria-label", /\S/);
            await expect(page.locator("#photo-dialog img")).toHaveAttribute("alt", /\S/);
        });

        test("enlaces externos bien formados", async ({ page }) => {
            await page.goto(p.path);
            const hrefs = await page.locator("#contact a").evaluateAll((els) =>
                els.map((e) => e.getAttribute("href")!),
            );
            expect(hrefs.some((h) => /^mailto:[^@\s]+@[^@\s]+\.[a-z]+$/i.test(h))).toBe(true);
            expect(hrefs.some((h) => h.startsWith("https://www.linkedin.com/in/"))).toBe(true);
            expect(hrefs.some((h) => h.startsWith("https://github.com/"))).toBe(true);
        });

        test("el selector lleva al otro idioma", async ({ page, baseURL }, info) => {
            await page.goto(p.path);
            if (info.project.name === "mobile") await page.locator('[popovertarget="site-menu"]').click();
            await page.getByRole("link", { name: p.otherLabel }).click();
            await expect(page).toHaveURL(new URL(p.other, baseURL).href);
            await expect(page.locator("html")).toHaveAttribute("lang", p.lang === "es" ? "en" : "es");
        });

        test("sin violaciones de accesibilidad graves", async ({ page }) => {
            // Se analiza el estado final: a mitad de una animación los fundidos dan falsos fallos de contraste.
            await page.emulateMedia({ reducedMotion: "reduce" });
            await page.goto(p.path);
            const results = await new AxeBuilder({ page }).analyze();
            const serious = results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
            expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
        });
    });
}
