import { describe, expect, test } from "vitest";
import type { HomeData } from "@lib/home";
import { alternateLinks, jsonLdScript, personJsonLd, requireSite, robotsTxt } from "@lib/seo";

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

const meta = { tags: [], sources: ["x"], updated: new Date("2026-10-05") };
const edu = (id: string, institution: string, kind: "degree" | "certificate", degree: string, en: string) => ({
    id,
    data: { ...meta, type: "education" as const, title: id, kind, institution, degree, start: "2015", end: "2019", summary: "s", en: { degree: en, summary: "s" } },
});
const job = (id: string, company: string, end: string | null) => ({
    id,
    data: { ...meta, type: "experience" as const, title: id, company, role: "Ingeniera", start: "2020-01", end, summary: "s", highlights: [], en: { role: "Engineer", summary: "s", highlights: [] } },
});
const data: HomeData = {
    profile: {
        ...meta, type: "profile", title: "Perfil", name: "Ada Lovelace", headline: "Ingeniera de IA", location: "Londres", summary: "Resumen en español",
        photo: { src: "/ada.jpg", width: 1, height: 1, format: "jpg" },
        links: { email: "ada@example.com", linkedin: "https://www.linkedin.com/in/ada/", github: "https://github.com/ada", source: "https://github.com/ada/site" },
        en: { headline: "AI engineer", summary: "Summary in English" },
    },
    experience: [job("old", "Old Co", "2021-01"), job("now", "New Co", null)],
    projects: [],
    skills: [
        { id: "python", data: { ...meta, type: "skill", title: "Python", category: "backend", icon: "si:python", summary: "s", en: { summary: "s" } } },
    ],
    education: [
        edu("grado", "Universidad A", "degree", "Grado", "Degree"),
        edu("master", "Universidad A", "degree", "Máster", "Master"),
        edu("erasmus", "Universidad B", "degree", "Erasmus", "Erasmus"),
        edu("ingles", "Academia C", "certificate", "Certificado de inglés", "English certificate"),
    ],
};
const pageUrls = { url: "https://ada.example.dev/en/", image: "https://ada.example.dev/_astro/ada.webp" };

describe("personJsonLd", () => {
    test("persona con datos localizados, URLs absolutas y perfiles enlazados", () => {
        expect(personJsonLd(data, "en", pageUrls)).toEqual({
            "@context": "https://schema.org",
            "@type": "Person",
            name: "Ada Lovelace",
            jobTitle: "AI engineer",
            description: "Summary in English",
            url: "https://ada.example.dev/en/",
            image: "https://ada.example.dev/_astro/ada.webp",
            address: { "@type": "PostalAddress", addressLocality: "Londres" },
            sameAs: ["https://www.linkedin.com/in/ada/", "https://github.com/ada"],
            worksFor: { "@type": "Organization", name: "New Co" },
            alumniOf: [
                { "@type": "CollegeOrUniversity", name: "Universidad A" },
                { "@type": "CollegeOrUniversity", name: "Universidad B" },
            ],
            hasCredential: [
                { "@type": "EducationalOccupationalCredential", name: "English certificate", recognizedBy: { "@type": "Organization", name: "Academia C" } },
            ],
            knowsAbout: ["Python"],
        });
    });

    test("en español usa los textos base", () => {
        const person = personJsonLd(data, "es", { ...pageUrls, url: "https://ada.example.dev/" });
        expect(person).toMatchObject({ jobTitle: "Ingeniera de IA", description: "Resumen en español" });
        expect(person.hasCredential).toEqual([expect.objectContaining({ name: "Certificado de inglés" })]);
    });

    test("nunca publica el email ni el repo del sitio", () => {
        const json = JSON.stringify(personJsonLd(data, "es", pageUrls));
        expect(json).not.toContain("ada@example.com");
        expect(json).not.toContain("https://github.com/ada/site");
        expect(json).not.toContain('"email"');
    });

    test("sin puesto actual, sin certificaciones ni habilidades: omite los campos en vez de dejarlos vacíos", () => {
        const person = personJsonLd({ ...data, experience: [job("old", "Old Co", "2021-01")], skills: [], education: [] }, "es", pageUrls);
        expect(person).not.toHaveProperty("worksFor");
        expect(person).not.toHaveProperty("alumniOf");
        expect(person).not.toHaveProperty("hasCredential");
        expect(person).not.toHaveProperty("knowsAbout");
    });

    test("con dos puestos actuales, worksFor es una lista", () => {
        const person = personJsonLd({ ...data, experience: [job("a", "A Co", null), job("b", "B Co", null)] }, "es", pageUrls);
        expect(person.worksFor).toEqual([
            { "@type": "Organization", name: "A Co" },
            { "@type": "Organization", name: "B Co" },
        ]);
    });
});
