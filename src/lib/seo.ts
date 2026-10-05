import { defaultLocale, localeTags, locales, type Locale } from "@i18n/ui";
import { localize } from "@i18n/utils";
import type { HomeData } from "./home";

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

const org = (name: string) => ({ "@type": "Organization", name });
// Un solo valor sin lista; ninguno, campo omitido: schema.org no quiere listas vacías.
const oneOrMany = <T>(items: T[]) => (items.length === 1 ? items[0] : items);

/** JSON-LD Person de la portada, solo con datos públicos de la wiki (sin email). */
export function personJsonLd(data: HomeData, locale: Locale, urls: { url: string; image: string }): Record<string, unknown> {
    const profile = localize(data.profile, locale);
    const current = data.experience.filter((e) => e.data.end === null).map((e) => org(e.data.company));
    const schools = [...new Set(data.education.filter((e) => e.data.kind === "degree").map((e) => e.data.institution))];
    const credentials = data.education
        .filter((e) => e.data.kind === "certificate")
        .map((e) => ({ "@type": "EducationalOccupationalCredential", name: localize(e.data, locale).degree, recognizedBy: org(e.data.institution) }));
    return {
        "@context": "https://schema.org",
        "@type": "Person",
        name: profile.name,
        jobTitle: profile.headline,
        description: profile.summary,
        url: urls.url,
        image: urls.image,
        address: { "@type": "PostalAddress", addressLocality: profile.location },
        sameAs: [profile.links.linkedin, profile.links.github],
        ...(current.length ? { worksFor: oneOrMany(current) } : {}),
        ...(schools.length ? { alumniOf: schools.map((name) => ({ "@type": "CollegeOrUniversity", name })) } : {}),
        ...(credentials.length ? { hasCredential: credentials } : {}),
        ...(data.skills.length ? { knowsAbout: data.skills.map((s) => s.data.title) } : {}),
    };
}
