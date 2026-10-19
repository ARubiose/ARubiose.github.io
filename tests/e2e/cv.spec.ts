import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { overflowOffenders } from "../smoke/support";
import { FIXTURE_NAME, FIXTURE_SITE as SITE } from "./support";

const PAGES = [
    { lang: "es", path: "/cv/", other: "/en/cv/", otherLang: "en", home: "/", cta: "Descargar CV", download: "Descargar PDF", pdf: "/cv/cv-ada-lovelace-es.pdf", photo: true },
    { lang: "en", path: "/en/cv/", other: "/cv/", otherLang: "es", home: "/en/", cta: "Download CV", download: "Download PDF", pdf: "/cv/cv-ada-lovelace-en.pdf", photo: false },
] as const;

for (const p of PAGES) {
    test.describe(`cv ${p.lang}`, () => {
        test("todas las skins y dispositivos: sin violaciones graves de axe ni desbordamiento", async ({ page }) => {
            await page.emulateMedia({ reducedMotion: "reduce" });
            await page.goto(p.path);
            const results = await new AxeBuilder({ page }).analyze();
            expect(results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")).map((v) => `${v.id}: ${v.help}`)).toEqual([]);
            expect(await overflowOffenders(page)).toEqual([]);
        });

        test.describe("navegación y contenido", () => {
            test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "no depende del dispositivo ni de la skin"));

            test("la portada enlaza el CV desde la intro, el contacto y la navegación", async ({ page }) => {
                await page.goto(p.home);
                await expect(page.locator("#about").getByRole("link", { name: p.cta })).toHaveAttribute("href", p.path);
                await expect(page.locator("#contact").getByRole("link", { name: new RegExp(p.cta) })).toHaveAttribute("href", p.path);
                await expect(page.locator(`.site-nav a[href="${p.path}"]`)).toHaveText("cv");
            });

            test("la hoja: un h1 con el nombre, foto según el idioma y botón de descarga", async ({ page }) => {
                await page.goto(p.path);
                await expect(page.locator("h1")).toHaveCount(1);
                await expect(page.locator("h1")).toHaveText(FIXTURE_NAME);
                await expect(page).toHaveTitle(`CV · ${FIXTURE_NAME}`);
                await expect(page.locator(".cv-sheet img")).toHaveCount(p.photo ? 1 : 0);
                const download = page.getByRole("link", { name: p.download });
                await expect(download).toHaveAttribute("href", p.pdf);
                await expect(download).toHaveAttribute("download", "");
            });

            test("el PDF se descarga", async ({ request }) => {
                const res = await request.get(p.pdf);
                expect(res.status()).toBe(200);
                expect(res.headers()["content-type"]).toContain("application/pdf");
            });

            test("el selector de idioma lleva al CV equivalente", async ({ page, baseURL }) => {
                await page.goto(p.path);
                await page.locator(`.header-lang a[hreflang="${p.otherLang}"]`).click();
                await expect(page).toHaveURL(new URL(p.other, baseURL).href);
                await expect(page.locator("html")).toHaveAttribute("lang", p.otherLang);
            });

            test("canonical y hreflang", async ({ page }) => {
                await page.goto(p.path);
                await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${SITE}${p.path}`);
                const alternates = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((els) => els.map((e) => [e.getAttribute("hreflang"), e.getAttribute("href")]));
                expect(alternates.sort()).toEqual([
                    ["en-US", `${SITE}/en/cv/`],
                    ["es-ES", `${SITE}/cv/`],
                    ["x-default", `${SITE}/cv/`],
                ]);
            });
        });
    });
}
