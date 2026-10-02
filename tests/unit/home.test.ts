import { expect, test } from "vitest";
import { buildHomeView, type HomeData } from "@lib/home";

const meta = { tags: [], sources: ["x"], updated: new Date("2026-10-02") };

const data: HomeData = {
    profile: {
        ...meta,
        type: "profile",
        title: "Perfil",
        name: "Ada",
        headline: "Ingeniera",
        location: "Londres",
        summary: "Resumen",
        links: { email: "a@example.com", linkedin: "https://linkedin.com/in/a", github: "https://github.com/a" },
        en: { headline: "Engineer", summary: "Summary" },
    },
    experience: [
        {
            ...meta,
            type: "experience",
            title: "Old",
            company: "Old",
            role: "Becaria",
            start: "2020-01",
            end: "2020-07",
            summary: "s",
            highlights: [],
            en: { role: "Intern", summary: "s", highlights: [] },
        },
        {
            ...meta,
            type: "experience",
            title: "New",
            company: "New",
            role: "Ingeniera",
            start: "2026-06",
            end: null,
            summary: "s",
            highlights: [],
            en: { role: "Engineer", summary: "s", highlights: [] },
        },
    ],
    projects: [],
    skills: [
        { ...meta, type: "skill", title: "Python", category: "backend", summary: "s", en: { summary: "s" } },
    ],
    education: [],
};

test("localiza, ordena y formatea periodos", () => {
    const view = buildHomeView(data, "en");
    expect(view.profile.headline).toBe("Engineer");
    expect(view.experience.map((e) => e.role)).toEqual(["Engineer", "Intern"]);
    expect(view.experience[0].period).toBe("Jun 2026 - present");
});

test("las categorías de skills llevan su etiqueta traducida", () => {
    expect(buildHomeView(data, "es").skillGroups[0].label).toBe("Backend");
});

test("las secciones vacías no aparecen en la navegación", () => {
    expect(buildHomeView(data, "es").sections.map((s) => s.id)).toEqual([
        "experience",
        "skills",
        "contact",
    ]);
});
