import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { beforeAll, describe, expect, test } from "vitest";
import Experience from "@sections/experience.astro";
import Projects from "@sections/projects.astro";
import Skills from "@sections/skills.astro";
import Education from "@sections/education.astro";
import Contact from "@sections/contact.astro";
import Intro from "@sections/intro.astro";

let container: AstroContainer;
beforeAll(async () => {
    container = await AstroContainer.create();
});

const job = {
    type: "experience" as const,
    title: "Acme",
    company: "Acme",
    role: "Engineer",
    start: "2026-06",
    end: null,
    period: "Jun 2026 - present",
    summary: "Python backend.",
    highlights: ["API design."],
    tags: [],
    sources: ["x"],
    updated: new Date(),
};

describe("Experience", () => {
    test("muestra título traducido, puesto, empresa, periodo y logros", async () => {
        const html = await container.renderToString(Experience, { props: { items: [job], locale: "en" } });
        expect(html).toContain('id="experience"');
        expect(html).toContain("Experience");
        for (const text of ["Engineer", "Acme", "Jun 2026 - present", "API design."]) {
            expect(html).toContain(text);
        }
    });

    test("sin elementos no renderiza nada", async () => {
        const html = await container.renderToString(Experience, { props: { items: [], locale: "es" } });
        expect(html.trim()).toBe("");
    });
});

describe("Projects", () => {
    const project = {
        type: "project" as const,
        title: "This portfolio",
        repo: "https://github.com/ada/portfolio",
        status: "active" as const,
        start: "2026-10",
        summary: "Portfolio from a wiki.",
        highlights: [],
        tags: [],
        sources: ["x"],
        updated: new Date(),
    };

    test("tarjeta con estado traducido y enlace al repo", async () => {
        const html = await container.renderToString(Projects, { props: { items: [project], locale: "es" } });
        expect(html).toContain('id="projects"');
        expect(html).toContain("En desarrollo");
        expect(html).toContain('href="https://github.com/ada/portfolio"');
    });

    test("sin proyectos no renderiza nada", async () => {
        const html = await container.renderToString(Projects, { props: { items: [], locale: "es" } });
        expect(html.trim()).toBe("");
    });
});

test("Skills agrupa con la etiqueta de cada categoría", async () => {
    const groups = [
        {
            category: "backend" as const,
            label: "Backend",
            items: [{ type: "skill" as const, title: "Python", category: "backend" as const, summary: "Main.", tags: [], sources: ["x"], updated: new Date() }],
        },
    ];
    const html = await container.renderToString(Skills, { props: { groups, locale: "es" } });
    expect(html).toContain('id="skills"');
    expect(html).toContain("Backend");
    expect(html).toContain("Python");
});

test("Education muestra la nota con su etiqueta", async () => {
    const item = {
        type: "education" as const,
        title: "Degree",
        institution: "Uni",
        degree: "Double degree",
        start: "2015",
        end: "2020",
        period: "2015 - 2020",
        grade: "8.55",
        summary: "Five years.",
        tags: [],
        sources: ["x"],
        updated: new Date(),
    };
    const html = await container.renderToString(Education, { props: { items: [item], locale: "en" } });
    expect(html).toContain("Average grade: 8.55");
});

test("Contact enlaza email, LinkedIn y GitHub", async () => {
    const links = { email: "a@example.com", linkedin: "https://linkedin.com/in/a", github: "https://github.com/a" };
    const html = await container.renderToString(Contact, { props: { links, locale: "es" } });
    expect(html).toContain('id="contact"');
    expect(html).toContain('href="mailto:a@example.com"');
    expect(html).toContain('href="https://linkedin.com/in/a"');
    expect(html).toContain('href="https://github.com/a"');
});

test("Intro muestra nombre como h1, titular y resumen", async () => {
    const profile = {
        type: "profile" as const,
        title: "Perfil",
        name: "Ada Lovelace",
        headline: "Engineer",
        location: "London",
        summary: "Analytical engine.",
        links: { email: "a@example.com", linkedin: "https://linkedin.com/in/a", github: "https://github.com/a" },
        tags: [],
        sources: ["x"],
        updated: new Date(),
    };
    const html = await container.renderToString(Intro, { props: { profile } });
    expect(html).toMatch(/<h1[^>]*>Ada Lovelace<\/h1>/);
    expect(html).toContain("Engineer");
    expect(html).toContain("Analytical engine.");
});
