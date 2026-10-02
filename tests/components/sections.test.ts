import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { beforeAll, describe, expect, test } from "vitest";
import { clean } from "../support/render";
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

const item = (over: Partial<import("@lib/home").TimelineView> = {}) => ({
    id: "acme", file: "acme.log", title: "Engineer", subtitle: "Acme", start: "2026-06", end: null,
    period: "Jun 2026 - present", current: true, duration: "", summary: "Python backend.", highlights: ["API design."], ...over,
});

describe("Experience", () => {
    test("timeline alterno con fechas en <time> y etiqueta del puesto vigente", async () => {
        const items = [item(), item({ id: "old", file: "old.log", start: "2020-01", end: "2020-07", period: "Jan 2020 - Jul 2020", current: false, duration: "6 months" })];
        const html = clean(await container.renderToString(Experience, { props: { items, locale: "en" } }));
        expect(html).toContain('id="experience"');
        expect(html.match(/data-side="left"/g)).toHaveLength(1);
        expect(html.match(/data-side="right"/g)).toHaveLength(1);
        expect(html).toContain('<time datetime="2026-06">');
        expect(html).toContain("CURRENT");
        expect(html).toContain("6 months");
        expect(html).toContain("API design.");
    });

    test("sin elementos no renderiza nada", async () => {
        const html = clean(await container.renderToString(Experience, { props: { items: [], locale: "es" } }));
        expect(html.trim()).toBe("");
    });
});

test("Education muestra la nota", async () => {
    const html = clean(await container.renderToString(Education, {
        props: { items: [item({ id: "upm", file: "upm.md", end: "2022", current: false, period: "2020 - 2022", note: "Average grade: 8.55", highlights: [] })], locale: "en" },
    }));
    expect(html).toContain('id="education"');
    expect(html).toContain("Average grade: 8.55");
});

describe("Projects", () => {
    const project = {
        id: "site", file: "my-site/README.md", statusLabel: "En desarrollo",
        type: "project" as const, title: "Este portfolio", repo: "https://github.com/ada/my-site", status: "active" as const,
        start: "2026-10", summary: "Portfolio desde una wiki.", highlights: ["Uno."], tags: [], sources: ["x"], updated: new Date(),
    };

    test("README con archivo, estado y enlace al repo", async () => {
        const html = clean(await container.renderToString(Projects, { props: { items: [project], locale: "es" } }));
        expect(html).toContain('id="projects"');
        expect(html).toMatch(/aria-hidden="true">my-site\/README\.md</);
        expect(html).toContain("En desarrollo");
        expect(html).toContain('href="https://github.com/ada/my-site"');
    });

    test("sin proyectos no renderiza nada", async () => {
        const html = clean(await container.renderToString(Projects, { props: { items: [], locale: "es" } }));
        expect(html.trim()).toBe("");
    });
});

test("Skills sin JS: todas las categorías, XP, desde y dónde se usó cada habilidad", async () => {
    const skill = (id: string, title: string, category: "backend" | "ai", over = {}) => ({
        id, title, category, summary: `${title} summary.`, icon: "si:python", months: 46, xp: "3 years 10 months",
        xpShort: "3.8 years", since: 2022, usedIn: [{ id: "zalcu", name: "Zalcu Technologies", role: "Developer" }], ...over,
    });
    const props = {
        locale: "en",
        groups: [
            { category: "backend", label: "Backend", items: [skill("python", "Python", "backend")] },
            { category: "ai", label: "Artificial intelligence", items: [skill("llm", "LLM agents", "ai", { months: 0, xp: "no recorded use", xpShort: "no recorded use", since: null, usedIn: [] })] },
        ],
        profile: { name: "Ada", headline: "Engineer" },
        professionalXp: "5.3 years",
        usage: { python: ["zalcu"] },
        entryNames: { zalcu: "Zalcu Technologies" },
    };
    const html = clean(await container.renderToString(Skills, { props }));
    expect(html).toContain('id="skills"');
    expect(html).toMatch(/<h3 class="panel-title[^"]*">Backend<\/h3>/);
    expect(html).toMatch(/<h3 class="panel-title[^"]*">Artificial intelligence<\/h3>/);
    expect(html).toContain("3 years 10 months");
    expect(html).toContain("Zalcu Technologies");
    expect(html).toContain("no recorded use");
    expect(html).toMatch(/data-tabs[^>]*hidden|hidden[^>]*data-tabs/);
    expect(html).toContain('data-cap="6"');
    expect(html).toContain("data-builder-data");
});

test("Contact: comandos con enlaces reales y URL visible sin protocolo", async () => {
    const links = { email: "a@example.com", linkedin: "https://www.linkedin.com/in/a/", github: "https://github.com/a" };
    const html = clean(await container.renderToString(Contact, { props: { links, locale: "es" } }));
    expect(html).toContain('href="mailto:a@example.com"');
    expect(html).toContain('href="https://www.linkedin.com/in/a/"');
    expect(html).toContain("linkedin.com/in/a<");
    expect(html).toContain("$ mail");
});

test("Intro: nombre como h1, adorno whoami oculto a lectores y botón de foto etiquetado", async () => {
    const profile = {
        type: "profile" as const, title: "Perfil", name: "Ada Lovelace", headline: "Engineer", location: "London",
        summary: "Analytical engine.",
        links: { email: "a@example.com", linkedin: "https://linkedin.com/in/a", github: "https://github.com/a" },
        tags: [], sources: ["x"], updated: new Date(),
    };
    const html = clean(await container.renderToString(Intro, { props: { profile, locale: "en" } }));
    expect(html).toMatch(/<h1[^>]*>[\s\S]*Ada Lovelace[\s\S]*<\/h1>/);
    expect(html).toMatch(/<p class="prompt[^"]*" aria-hidden="true">whoami<\/p>/);
    expect(html).toMatch(/<button[^>]*id="photo-open"[^>]*aria-label="Enlarge the photo of Ada Lovelace"/);
    expect(html).toContain('<dialog id="photo-dialog"');
});
