import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { FIXTURE_NAME, FIXTURE_SITE as SITE } from "./support";

const PAGES = [
    { lang: "es", path: "/projects/note-engine/", other: "/en/projects/note-engine/", otherLang: "en", home: "/", more: "Ver más", title: "Cómo funciona el motor de notas" },
    { lang: "en", path: "/en/projects/note-engine/", other: "/projects/note-engine/", otherLang: "es", home: "/en/", more: "Read more", title: "How the note engine works" },
] as const;

for (const p of PAGES) {
    test.describe(`detalle ${p.lang}`, () => {
        test("todas las skins y dispositivos: sin violaciones graves de axe ni desbordamiento", async ({ page }) => {
            await page.emulateMedia({ reducedMotion: "reduce" });
            await page.goto(p.path);
            const results = await new AxeBuilder({ page }).analyze();
            expect(results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")).map((v) => `${v.id}: ${v.help}`)).toEqual([]);
            const offenders = await page.evaluate(() => {
                const vw = document.documentElement.clientWidth;
                const scrollsX = (el: Element) => ["auto", "scroll"].includes(getComputedStyle(el).overflowX);
                return [...document.querySelectorAll("body *")].filter((el) => {
                    const r = el.getBoundingClientRect();
                    if (r.width === 0 || r.height === 0 || r.right <= vw + 1) return false;
                    for (let a = el.parentElement; a; a = a.parentElement) if (scrollsX(a)) return false;
                    return getComputedStyle(el).visibility !== "hidden";
                }).map((el) => el.tagName.toLowerCase());
            });
            expect(offenders).toEqual([]);
        });

        test.describe("navegación y cabecera", () => {
            test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "no depende del dispositivo ni de la skin"));

            test("la tarjeta de la portada lleva al detalle", async ({ page, baseURL }) => {
                await page.goto(p.home);
                await page.locator("#projects").getByRole("link", { name: p.more }).click();
                await expect(page).toHaveURL(new URL(p.path, baseURL).href);
                await expect(page.locator("h1")).toHaveText(p.title);
                await expect(page).toHaveTitle(`${p.title} · ${FIXTURE_NAME}`);
            });

            test("«volver» lleva a la sección de proyectos de la portada", async ({ page, baseURL }) => {
                await page.goto(p.path);
                await page.locator("[data-back]").click();
                await expect(page).toHaveURL(new URL(`${p.home}#projects`, baseURL).href);
            });

            test("la navegación apunta a las secciones de la portada", async ({ page }) => {
                await page.goto(p.path);
                await expect(page.locator(`.site-nav a[href="${p.home}#projects"]`)).toHaveCount(1);
            });

            test("el selector de idioma lleva al detalle equivalente", async ({ page, baseURL }) => {
                await page.goto(p.path);
                await page.locator(`.header-lang a[hreflang="${p.otherLang}"]`).click();
                await expect(page).toHaveURL(new URL(p.other, baseURL).href);
                await expect(page.locator("html")).toHaveAttribute("lang", p.otherLang);
            });

            test("canonical, hreflang y JSON-LD", async ({ page }) => {
                await page.goto(p.path);
                await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${SITE}${p.path}`);
                const alternates = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((els) => els.map((e) => [e.getAttribute("hreflang"), e.getAttribute("href")]));
                expect(alternates.sort()).toEqual([
                    ["en-US", `${SITE}/en/projects/note-engine/`],
                    ["es-ES", `${SITE}/projects/note-engine/`],
                    ["x-default", `${SITE}/projects/note-engine/`],
                ]);
                const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
                expect(ld).toMatchObject({ "@type": "SoftwareSourceCode", name: p.title, codeRepository: "https://github.com/ada-example/note-engine", url: `${SITE}${p.path}` });
            });

            test("el cuerpo se publica: tabla, código e imagen cargada", async ({ page }) => {
                await page.goto(p.path);
                const body = page.locator("article.prose-detail");
                await expect(body.locator("h2").first()).toBeVisible();
                await expect(body.locator("table")).toHaveCount(1);
                await expect(body.locator("pre code")).toHaveCount(1);
                const img = body.locator("img");
                await expect(img).toHaveAttribute("alt", /.+/);
                await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
            });
        });
    });
}
