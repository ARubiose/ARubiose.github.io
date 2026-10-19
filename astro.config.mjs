// @ts-check
import { defineConfig, envField, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import cvPdf from "./src/integrations/cv-pdf.ts";
import { defaultLocale, localeTags } from "./src/i18n/ui.ts";
import { assertCvSpecTarget, buildDirs, pagesTarget } from "./src/lib/site.ts";

// site y base salen del entorno (GITHUB_REPOSITORY en Actions): la plantilla funciona con cualquier nombre de repo.
// Un CV adaptado (pnpm cv:tailor) nunca puede acabar en el dist/ que se publica.
assertCvSpecTarget(process.env);
const { site, base } = pagesTarget(process.env);
const { outDir, cacheDir } = buildDirs(process.env);

// https://astro.build/config
export default defineConfig({
    site,
    base,
    outDir,
    cacheDir,
    i18n: {
        locales: ["en", "es"],
        defaultLocale: "es",
    },
    // Mismos códigos que el <head> (localeTags): sitemap y hreflang no pueden contradecirse.
    // cv-pdf imprime /cv/ y /en/cv/ a PDF al terminar (CV_PDF=0 lo salta).
    integrations: [sitemap({ i18n: { defaultLocale, locales: localeTags } }), cvPdf()],
    env: {
        schema: {
            // Token de Cloudflare Web Analytics. Es público (va en el HTML); sin él no hay analítica.
            PUBLIC_CF_ANALYTICS_TOKEN: envField.string({ context: "client", access: "public", optional: true }),
        },
    },
    fonts: [
        {
            provider: fontProviders.fontsource(),
            name: "Space Grotesk",
            cssVariable: "--font-space-grotesk",
            weights: [500, 700],
            styles: ["normal"],
            subsets: ["latin", "latin-ext"],
            fallbacks: ["sans-serif"],
        },
        {
            provider: fontProviders.fontsource(),
            name: "IBM Plex Mono",
            cssVariable: "--font-ibm-plex-mono",
            weights: [400, 500],
            styles: ["normal"],
            subsets: ["latin", "latin-ext"],
            fallbacks: ["monospace"],
        },
        {
            // Texto del CV (src/styles/cv.css).
            provider: fontProviders.fontsource(),
            name: "IBM Plex Sans",
            cssVariable: "--font-ibm-plex-sans",
            weights: [400, 500, 600],
            styles: ["normal"],
            subsets: ["latin", "latin-ext"],
            fallbacks: ["sans-serif"],
        },
        {
            provider: fontProviders.fontsource(),
            name: "Chakra Petch",
            cssVariable: "--font-chakra-petch",
            weights: [500, 600, 700],
            styles: ["normal"],
            subsets: ["latin", "latin-ext"],
            fallbacks: ["sans-serif"],
        },
        {
            provider: fontProviders.fontsource(),
            name: "Barlow",
            cssVariable: "--font-barlow",
            weights: [400, 500],
            styles: ["normal"],
            subsets: ["latin", "latin-ext"],
            fallbacks: ["sans-serif"],
        },
        {
            provider: fontProviders.fontsource(),
            name: "JetBrains Mono",
            cssVariable: "--font-jetbrains-mono",
            weights: [400, 500],
            styles: ["normal"],
            subsets: ["latin", "latin-ext"],
            fallbacks: ["monospace"],
        },
        {
            provider: fontProviders.fontsource(),
            name: "Saira Condensed",
            cssVariable: "--font-saira-condensed",
            weights: [600, 700, 800],
            styles: ["normal"],
            subsets: ["latin", "latin-ext"],
            fallbacks: ["sans-serif"],
        },
        {
            provider: fontProviders.fontsource(),
            name: "Geist",
            cssVariable: "--font-geist",
            weights: [400, 500],
            styles: ["normal"],
            subsets: ["latin", "latin-ext"],
            fallbacks: ["sans-serif"],
        },
        {
            provider: fontProviders.fontsource(),
            name: "Geist Mono",
            cssVariable: "--font-geist-mono",
            weights: [400, 500],
            styles: ["normal"],
            subsets: ["latin", "latin-ext"],
            fallbacks: ["monospace"],
        },
    ],
    vite: {
        plugins: [tailwindcss()],
    },
});
