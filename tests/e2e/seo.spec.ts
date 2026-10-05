import { expect, test } from "@playwright/test";

const SITE = "https://arubiose.github.io";
const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

test.describe("indexación", () => {
    test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "no depende del dispositivo ni de la skin"));

    test("robots.txt permite todo y apunta al índice del sitemap", async ({ request }) => {
        const res = await request.get("/robots.txt");
        expect(res.status()).toBe(200);
        expect(res.headers()["content-type"]).toContain("text/plain");
        expect(await res.text()).toBe(`User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap-index.xml\n`);
    });

    test("el sitemap lista las portadas con las mismas URLs y alternativas que el <head>", async ({ page, request }) => {
        const index = await request.get("/sitemap-index.xml");
        expect(index.status()).toBe(200);
        const [child] = locs(await index.text());
        const xml = await (await request.get(new URL(child).pathname)).text();
        expect(locs(xml).sort()).toEqual([`${SITE}/`, `${SITE}/en/`]);

        for (const block of xml.split("<url>").slice(1)) {
            const [loc] = locs(block);
            const inSitemap = [...block.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]);
            await page.goto(new URL(loc).pathname);
            await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", loc);
            const inHead = await page.locator('link[rel="alternate"][hreflang]:not([hreflang="x-default"])').evaluateAll((els) =>
                els.map((e) => [e.getAttribute("hreflang"), e.getAttribute("href")]),
            );
            expect(inSitemap.sort()).toEqual(inHead.sort());
        }
    });
});
