import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { beforeAll, describe, expect, test } from "vitest";
import { clean } from "../support/render";
import type { CvEntry, CvView } from "@lib/cv";
import Cv from "@components/Cv.astro";
import photo from "../fixtures/components/photo.jpg";

let container: AstroContainer;
beforeAll(async () => {
    container = await AstroContainer.create();
});

const entry = (over: Partial<CvEntry> = {}): CvEntry => ({
    id: "acme", title: "Ingeniera", org: "Acme", period: "jun 2026 – actualidad", current: true,
    summary: "Backend en Python.", highlights: ["Diseño de APIs."], compact: false, ...over,
});

const view = (over: Partial<CvView> = {}): CvView => ({
    name: "Ada Lovelace", headline: "Ingeniera de IA", tagline: "visión y agentes", summary: "Resumen del perfil.", location: "Londres",
    links: { email: "ada@example.com", linkedin: "https://www.linkedin.com/in/ada-example/", github: "https://github.com/ada-example" },
    photo: true, pillars: [{ title: "IA aplicada", text: "Visión en producción." }, { title: "Backend", text: "Python." }],
    experience: [entry(), entry({ id: "old", current: false, compact: true, summary: undefined, highlights: [] })],
    projects: [entry({ id: "site", title: "Web", org: "" })],
    education: [entry({ id: "uni", title: "Grado", org: "Uni", summary: "Nota media: 8.7", highlights: [] })],
    skills: [{ label: "IA", items: ["Agentes LLM", "Python"] }],
    languages: [{ name: "Inglés", level: "nativo" }],
    ...over,
});

const render = async (v: CvView, withPhoto = true) =>
    clean(await container.renderToString(Cv, { props: { view: v, locale: "es", pdfName: "cv-ada-lovelace-es.pdf", ...(withPhoto ? { photo } : {}) } }));
const headings = (html: string) => [...html.matchAll(/<h2[^>]*>([^<]*)<\/h2>/g)].map((m) => m[1].trim());

describe("Cv", () => {
    test("secciones en orden de lectura lineal", async () => {
        expect(headings(await render(view()))).toEqual(["Perfil", "Experiencia", "Proyectos", "Habilidades", "Formación", "Idiomas"]);
    });

    test("las secciones vacías no se pintan", async () => {
        expect(headings(await render(view({ projects: [], languages: [] })))).toEqual(["Perfil", "Experiencia", "Habilidades", "Formación"]);
    });

    test("un h1 con el nombre y la raíz con idioma y nombre del PDF", async () => {
        const html = await render(view());
        expect(html.match(/<h1[^>]*>Ada Lovelace<\/h1>/)).not.toBeNull();
        expect(html).toMatch(/<article[^>]*class="cv-sheet"[^>]*lang="es"/);
        expect(html).toContain('data-cv-pdf="cv-ada-lovelace-es.pdf"');
    });

    test("foto solo si view.photo y hay imagen", async () => {
        expect(await render(view())).toContain("<img");
        expect(await render(view({ photo: false }))).not.toContain("<img");
        expect(await render(view(), false)).not.toContain("<img");
    });

    test("contacto como enlaces de texto visible", async () => {
        const html = await render(view());
        expect(html).toMatch(/<a href="mailto:ada@example.com">ada@example.com<\/a>/);
        expect(html).toMatch(/<a href="https:\/\/www.linkedin.com\/in\/ada-example\/">linkedin.com\/in\/ada-example<\/a>/);
        expect(html).toMatch(/<a href="https:\/\/github.com\/ada-example">github.com\/ada-example<\/a>/);
    });

    test("pilares dentro de Perfil, uno por pilar", async () => {
        const html = await render(view());
        const profile = html.slice(html.indexOf(">Perfil<"), html.indexOf(">Experiencia<"));
        expect(profile.match(/class="cv-pillar"/g)).toHaveLength(2);
        expect(profile).toContain("IA aplicada");
    });

    test("una entrada compacta no lleva lista ni resumen", async () => {
        const html = await render(view({ experience: [entry({ compact: true, summary: undefined, highlights: [] })] }));
        const exp = html.slice(html.indexOf(">Experiencia<"), html.indexOf(">Proyectos<"));
        expect(exp).toContain("<h3");
        expect(exp).not.toContain("<ul");
        expect(exp).not.toContain("cv-summary");
    });

    test("solo el puesto vigente lleva el nodo destacado", async () => {
        const html = await render(view());
        const exp = html.slice(html.indexOf(">Experiencia<"), html.indexOf(">Proyectos<"));
        expect(exp.match(/is-current/g)).toHaveLength(1);
    });
});
