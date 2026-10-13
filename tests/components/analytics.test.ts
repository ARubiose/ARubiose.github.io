import { describe, expect, test } from "vitest";
import Layout from "@layouts/Layout.astro";
import Footer from "@components/Footer.astro";
import { analyticsBeacon } from "@lib/analytics";
import { render } from "../support/render";

// El Layout exige `site` para las URLs absolutas del SEO.
const withSite = { astroConfig: { site: "https://ada.example.dev" } };
const layoutProps = { locale: "es", title: "Ada", description: "Ingeniera" } as const;
const BEACON = /<script[^>]*src="https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js"[^>]*>/;

describe("Layout", () => {
    test("sin analítica no carga nada de Cloudflare", async () => {
        const html = await render(Layout, { props: layoutProps }, withSite);
        expect(html).not.toContain("cloudflareinsights");
    });

    test("con analítica carga el beacon diferido con su token", async () => {
        const html = await render(Layout, {
            props: { ...layoutProps, analytics: analyticsBeacon("abc123", true) },
        }, withSite);
        const tag = html.match(BEACON)?.[0];
        expect(tag, "no está el script del beacon").toBeDefined();
        expect(tag).toContain("defer");
        expect(tag).toContain(`data-cf-beacon="{&quot;token&quot;:&quot;abc123&quot;}"`);
    });
});

describe("Footer", () => {
    const repo = "https://github.com/ada/portfolio";

    test("sin analítica no menciona la analítica", async () => {
        const html = await render(Footer, { props: { locale: "es", repo } });
        expect(html).not.toMatch(/analítica|Cloudflare/i);
    });

    test.each([
        ["es", "analítica sin cookies con Cloudflare Web Analytics"],
        ["en", "cookie-free analytics by Cloudflare Web Analytics"],
    ] as const)("con analítica avisa de ella en %s", async (locale, text) => {
        const html = await render(Footer, { props: { locale, repo, analytics: true } });
        expect(html).toMatch(new RegExp(`<span data-analytics-note>${text}</span>`));
    });
});
