// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
    site: "https://arubiose.github.io",
    i18n: {
        locales: ["en", "es"],
        defaultLocale: "es",
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
