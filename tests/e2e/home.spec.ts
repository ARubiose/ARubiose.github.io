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

        test("todas las secciones del menú existen y tienen contenido", async ({ page }, info) => {
            await page.goto(p.path);
            const navSel = info.project.name.startsWith("mobile") ? '#site-menu a[href^="#"]' : '.site-nav a[href^="#"]';
            const anchors = await page.locator(navSel).evaluateAll((els) =>
                els.map((e) => e.getAttribute("href")!),
            );
            expect(anchors.length).toBeGreaterThan(0);
            for (const href of anchors) {
                const section = page.locator(href);
                await expect(section, href).toHaveCount(1);
                await expect(section.locator("h2"), href).not.toBeEmpty();
            }
        });

        test("la vista previa al compartir apunta a una imagen absoluta que existe", async ({ page, request }) => {
            await page.goto(p.path);
            const meta = (sel: string) => page.locator(`meta[${sel}]`).getAttribute("content");
            const image = await meta('property="og:image"');
            expect(image).toBe("https://arubiose.github.io/og-image.png");
            expect(await meta('property="og:image:width"')).toBe("1200");
            expect(await meta('property="og:image:height"')).toBe("627");
            expect(await meta('property="og:image:alt"')).toMatch(/\S/);
            expect(await meta('property="og:url"')).toBe(`https://arubiose.github.io${p.path}`);
            expect(await meta('name="twitter:card"')).toBe("summary_large_image");
            const res = await request.get(new URL(image!).pathname);
            expect(res.status()).toBe(200);
            expect(res.headers()["content-type"]).toBe("image/png");
        });

        test("canonical, alternativas hreflang y JSON-LD Person", async ({ page, request }) => {
            const site = "https://arubiose.github.io";
            await page.goto(p.path);
            await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${site}${p.path}`);
            const alternates = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((els) =>
                els.map((e) => [e.getAttribute("hreflang"), e.getAttribute("href")]),
            );
            expect(alternates).toEqual([["es-ES", `${site}/`], ["en-US", `${site}/en/`], ["x-default", `${site}/`]]);

            const scripts = page.locator('script[type="application/ld+json"]');
            await expect(scripts).toHaveCount(1);
            const person = JSON.parse((await scripts.textContent())!);
            expect(person).toMatchObject({ "@context": "https://schema.org", "@type": "Person", url: `${site}${p.path}` });
            // El cargo es el del hero: mismo dato de la wiki, en el idioma de la página.
            expect(person.jobTitle).toBe((await page.locator(".hero-role").textContent())?.trim());
            expect(person).not.toHaveProperty("email");
            // La wiki tiene títulos (kind: degree por defecto): si falta, la build usó una caché de contenido anterior al esquema.
            expect(person.alumniOf?.length).toBeGreaterThan(0);
            const image = await request.get(new URL(person.image).pathname);
            expect(image.status()).toBe(200);
            expect(image.headers()["content-type"]).toBe("image/webp");
        });

        test("no se cuelan valores sin resolver", async ({ page }) => {
            await page.goto(p.path);
            const text = await page.locator("body").innerText();
            expect(text).not.toMatch(/\bundefined\b|\[object Object\]|\bNaN\b/);
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
            if (info.project.name.startsWith("mobile")) await page.locator('[popovertarget="site-menu"]').click();
            await page.getByRole("link", { name: p.otherLabel }).click();
            await expect(page).toHaveURL(new URL(p.other, baseURL).href);
            await expect(page.locator("html")).toHaveAttribute("lang", p.lang === "es" ? "en" : "es");
        });

        test("axe sin violaciones graves con el visor y el menú abiertos", async ({ page }, info) => {
            await page.emulateMedia({ reducedMotion: "reduce" });
            await page.goto(p.path);
            await page.locator("#photo-open").click();
            let results = await new AxeBuilder({ page }).analyze();
            expect(results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")).map((v) => v.id)).toEqual([]);
            await page.keyboard.press("Escape");
            if (info.project.name.startsWith("mobile")) {
                await page.locator('[popovertarget="site-menu"]').click();
                results = await new AxeBuilder({ page }).analyze();
                expect(results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")).map((v) => v.id)).toEqual([]);
            }
        });

        test("sin saltos de maquetación al cargar", async ({ page }) => {
            await page.emulateMedia({ reducedMotion: "reduce" });
            await page.goto(p.path);
            const cls = await page.evaluate(() => new Promise<number>((resolve) => {
                let total = 0;
                new PerformanceObserver((list) => {
                    for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) total += e.value;
                }).observe({ type: "layout-shift", buffered: true });
                setTimeout(() => resolve(total), 1500);
            }));
            expect(cls).toBeLessThan(0.1);
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
