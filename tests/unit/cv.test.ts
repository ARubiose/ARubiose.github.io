import { describe, expect, test } from "vitest";
import { buildCvView, cvPdfName, cvRefErrors, cvUrl } from "@lib/cv";
import type { HomeData } from "@lib/home";
import { cvSpecSchema, type CvSpec } from "@lib/schemas";

const meta = { tags: [], sources: ["x"], updated: new Date("2026-10-02") };
const spec = (input: unknown): CvSpec => cvSpecSchema.parse(input);

const data: HomeData = {
    profile: {
        ...meta, type: "profile", title: "Perfil", name: "Ada", headline: "Ingeniera", location: "Londres", summary: "Resumen",
        photo: { src: "/ada.jpg", width: 1, height: 1, format: "jpg" },
        links: { email: "a@example.com", linkedin: "https://www.linkedin.com/in/ada/", github: "https://github.com/ada" },
        en: { headline: "Engineer", summary: "Summary" },
    },
    experience: [
        { id: "old", data: { ...meta, type: "experience", title: "Old", company: "Old Co", role: "Becaria", start: "2020-01", end: "2020-07", summary: "s-old", highlights: ["h0", "h1"], skills: [], en: { role: "Intern", summary: "s-old-en", highlights: ["h0-en", "h1-en"] } } },
        { id: "new", data: { ...meta, type: "experience", title: "New", company: "New Co", role: "Ingeniera", start: "2026-06", end: null, summary: "s-new", highlights: ["n0"], skills: [], en: { role: "Engineer", summary: "s-new-en", highlights: ["n0-en"] } } },
    ],
    projects: [
        { id: "live", data: { ...meta, type: "project", title: "Web", repo: "https://github.com/ada/site", status: "active", start: "2025-01", summary: "p", highlights: [], skills: [], en: { title: "Site", summary: "p", highlights: [] } } },
        { id: "done", data: { ...meta, type: "project", title: "Viejo", repo: "https://github.com/ada/old", status: "done", start: "2021-03", summary: "p", highlights: [], skills: [], en: { title: "Old", summary: "p", highlights: [] } } },
    ],
    skills: [
        { id: "python", data: { ...meta, type: "skill", title: "Python", category: "backend", icon: "si:python", summary: "s", en: { summary: "s" } } },
        { id: "agents", data: { ...meta, type: "skill", title: "Agentes LLM", category: "ai", icon: "ph:robot", summary: "s", en: { summary: "s", title: "LLM agents" } } },
    ],
    education: [
        { id: "uni", data: { ...meta, type: "education", title: "Uni", kind: "degree", institution: "Uni Ejemplo", degree: "Grado", start: "2015-09", end: "2019-06", grade: "8.7", summary: "s", en: { degree: "BSc", summary: "s" } } },
        { id: "cert", data: { ...meta, type: "education", title: "Cert", kind: "certificate", institution: "Nube", degree: "Certificado", start: "2021", end: "2021", summary: "s", en: { degree: "Certificate", summary: "s" } } },
    ],
};

describe("buildCvView sin spec", () => {
    const view = buildCvView(data, undefined, "es");

    test("toma cabecera y resumen del perfil, con foto", () => {
        expect(view).toMatchObject({ name: "Ada", headline: "Ingeniera", summary: "Resumen", location: "Londres", photo: true, pillars: [], languages: [] });
        expect(view.links).toEqual(data.profile.links);
    });

    test("incluye todo, ordenado por fecha descendente", () => {
        expect(view.experience.map((e) => e.id)).toEqual(["new", "old"]);
        expect(view.projects.map((e) => e.id)).toEqual(["live", "done"]);
        expect(view.education.map((e) => e.id)).toEqual(["cert", "uni"]);
    });

    test("cada experiencia lleva resumen y todos sus highlights", () => {
        expect(view.experience[1]).toMatchObject({ title: "Becaria", org: "Old Co", summary: "s-old", highlights: ["h0", "h1"], compact: false, current: false });
        expect(view.experience[0].current).toBe(true);
    });

    test("agrupa las habilidades por categoría con las etiquetas de la portada", () => {
        expect(view.skills).toEqual([
            { label: "Backend", items: ["Python"] },
            { label: "Inteligencia artificial", items: ["Agentes LLM"] },
        ]);
    });
});

describe("buildCvView con spec", () => {
    test("respeta el orden e inclusión de experiencias", () => {
        const view = buildCvView(data, spec({ experience: [{ id: "old" }, { id: "new" }] }), "es");
        expect(view.experience.map((e) => e.id)).toEqual(["old", "new"]);
        expect(buildCvView(data, spec({ experience: [{ id: "new" }] }), "es").experience.map((e) => e.id)).toEqual(["new"]);
    });

    test("filtra highlights, oculta el resumen y compacta", () => {
        const view = buildCvView(data, spec({ experience: [{ id: "old", highlights: [1], summary: false }, { id: "new", compact: true }] }), "es");
        expect(view.experience[0]).toMatchObject({ highlights: ["h1"], summary: undefined, compact: false });
        expect(view.experience[1]).toMatchObject({ highlights: [], summary: undefined, compact: true });
    });

    test("un proyecto activo llega hasta la actualidad; uno terminado muestra solo su inicio", () => {
        const view = buildCvView(data, undefined, "es");
        expect(view.projects[0].period).toMatch(/actualidad$/);
        expect(view.projects[1].period).not.toMatch(/actualidad|–/);
        expect(view.projects[1].current).toBe(false);
    });

    test("la formación muestra la nota si existe", () => {
        const view = buildCvView(data, undefined, "es");
        expect(view.education.find((e) => e.id === "uni")?.summary).toBe("Nota media: 8.7");
        expect(view.education.find((e) => e.id === "cert")?.summary).toBeUndefined();
    });

    test("en inglés usa los textos de en, los títulos en.title y la foto de en", () => {
        const s = spec({
            headline: "Titular", tagline: "lema", pillars: [{ title: "IA", text: "t" }],
            skills: [{ label: "IA", items: ["agents", "python"] }], languages: [{ name: "Inglés", level: "nativo" }],
            en: { headline: "Headline", tagline: "motto", pillars: [{ title: "AI", text: "t-en" }], skills: [{ label: "AI" }], languages: [{ name: "English", level: "native" }], photo: false },
        });
        const es = buildCvView(data, s, "es");
        const en = buildCvView(data, s, "en");
        expect(es).toMatchObject({ headline: "Titular", tagline: "lema", photo: true, skills: [{ label: "IA", items: ["Agentes LLM", "Python"] }] });
        expect(en).toMatchObject({
            headline: "Headline", tagline: "motto", summary: "Summary", photo: false,
            pillars: [{ title: "AI", text: "t-en" }], skills: [{ label: "AI", items: ["LLM agents", "Python"] }], languages: [{ name: "English", level: "native" }],
        });
        expect(en.experience.find((e) => e.id === "old")?.highlights).toEqual(["h0-en", "h1-en"]);
    });

    test("en inglés, sin traducción del spec, cae en el texto del perfil en inglés", () => {
        const en = buildCvView(data, spec({ headline: "Titular" }), "en");
        expect(en.headline).toBe("Engineer");
    });
});

describe("referencias rotas", () => {
    test.each([
        [{ experience: [{ id: "nope" }] }, "cv: experiencia inexistente: nope"],
        [{ experience: [{ id: "old", highlights: [9] }] }, "cv: old: highlight 9 fuera de rango"],
        [{ projects: ["nope"] }, "cv: proyecto inexistente: nope"],
        [{ education: ["nope"] }, "cv: formación inexistente: nope"],
        [{ skills: [{ label: "x", items: ["nope"] }] }, "cv: habilidad inexistente: nope"],
    ])("%j", (input, message) => {
        expect(cvRefErrors(data, spec(input))).toEqual([message]);
        expect(() => buildCvView(data, spec(input), "es")).toThrow(message);
    });

    test("un spec válido no da errores", () => {
        expect(cvRefErrors(data, spec({ experience: [{ id: "old", highlights: [0, 1] }], projects: ["live"], education: ["uni"], skills: [{ label: "x", items: ["python"] }] }))).toEqual([]);
    });
});

test("cvPdfName: slug ASCII del nombre y el idioma", () => {
    expect(cvPdfName("Ada Lovelace-Byron", "es")).toBe("cv-ada-lovelace-byron-es.pdf");
    expect(cvPdfName("José Ñúñez", "en")).toBe("cv-jose-nunez-en.pdf");
});

test("cvUrl: página del CV por idioma, con la base del sitio", () => {
    expect(cvUrl("es", "/")).toBe("/cv/");
    expect(cvUrl("en", "/")).toBe("/en/cv/");
    expect(cvUrl("es", "/demo/")).toBe("/demo/cv/");
    expect(cvUrl("en", "/demo")).toBe("/demo/en/cv/");
});
