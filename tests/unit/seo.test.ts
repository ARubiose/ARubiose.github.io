import { describe, expect, test } from "vitest";
import { alternateLinks, jsonLdScript, requireSite, robotsTxt } from "@lib/seo";

const SITE = new URL("https://ada.example.dev");
const urls = { es: "https://ada.example.dev/", en: "https://ada.example.dev/en/" };

describe("alternateLinks", () => {
    test("un enlace por idioma con su código BCP 47 y x-default al idioma por defecto", () => {
        expect(alternateLinks(urls)).toEqual([
            { hreflang: "es-ES", href: "https://ada.example.dev/" },
            { hreflang: "en-US", href: "https://ada.example.dev/en/" },
            { hreflang: "x-default", href: "https://ada.example.dev/" },
        ]);
    });
});

describe("requireSite", () => {
    test("devuelve site si está definido", () => {
        expect(requireSite(SITE)).toBe(SITE);
    });
    test("sin site falla con un mensaje que dice dónde arreglarlo", () => {
        expect(() => requireSite(undefined)).toThrow(/site.*astro\.config\.mjs/);
    });
});

describe("robotsTxt", () => {
    test("permite todo y apunta al índice del sitemap con el dominio de site", () => {
        expect(robotsTxt(SITE)).toBe("User-agent: *\nAllow: /\n\nSitemap: https://ada.example.dev/sitemap-index.xml\n");
    });
});

describe("jsonLdScript", () => {
    test("serializa a JSON válido", () => {
        expect(JSON.parse(jsonLdScript({ name: "Ada" }))).toEqual({ name: "Ada" });
    });
    test("un texto con </script> o <!-- no puede cerrar la etiqueta", () => {
        const out = jsonLdScript({ summary: "fin </script><script>alert(1)</script> <!-- x" });
        expect(out).not.toMatch(/<\/script|<!--/i);
        expect(JSON.parse(out)).toEqual({ summary: "fin </script><script>alert(1)</script> <!-- x" });
    });
});
