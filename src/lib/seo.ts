import { defaultLocale, localeTags, locales, type Locale } from "@i18n/ui";

export type AlternateLink = { hreflang: string; href: string };

/** Las URLs del SEO deben ser absolutas: sin `site` no hay forma de construirlas. */
export function requireSite(site: URL | undefined): URL {
    if (!site) throw new Error("Falta `site` en astro.config.mjs: canonical, hreflang, sitemap y JSON-LD necesitan URLs absolutas");
    return site;
}

/** Alternativas por idioma, más x-default apuntando al idioma por defecto. */
export function alternateLinks(urls: Record<Locale, string>): AlternateLink[] {
    return [
        ...locales.map((l) => ({ hreflang: localeTags[l], href: urls[l] })),
        { hreflang: "x-default", href: urls[defaultLocale] },
    ];
}

export function robotsTxt(site: URL): string {
    return `User-agent: *\nAllow: /\n\nSitemap: ${new URL("sitemap-index.xml", site).href}\n`;
}

/** JSON para un <script>: escapa `<` para que ningún texto pueda cerrar la etiqueta ni abrir un comentario. */
export function jsonLdScript(data: object): string {
    return JSON.stringify(data).replace(/</g, "\\u003c");
}
