import { expect, test } from "vitest";
import { buildHomeView, displayUrl, type HomeData } from "@lib/home";

const meta = { tags: [], sources: ["x"], updated: new Date("2026-10-02") };
const NOW = "2026-10";

const data: HomeData = {
    profile: {
        ...meta, type: "profile", title: "Perfil", name: "Ada", headline: "Ingeniera", location: "Londres", summary: "Resumen",
        links: { email: "a@example.com", linkedin: "https://www.linkedin.com/in/ada/", github: "https://github.com/ada" },
        en: { headline: "Engineer", summary: "Summary" },
    },
    experience: [
        { id: "old", data: { ...meta, type: "experience", title: "Old", company: "Old Co", role: "Becaria", start: "2020-01", end: "2020-07", summary: "s", highlights: [], skills: ["python"], en: { role: "Intern", summary: "s", highlights: [] } } },
        { id: "new", data: { ...meta, type: "experience", title: "New", company: "New Co", role: "Ingeniera", start: "2026-06", end: null, summary: "s", highlights: [], skills: ["python", "expo"], en: { role: "Engineer", summary: "s", highlights: [] } } },
    ],
    projects: [
        { id: "site", data: { ...meta, type: "project", title: "Web", repo: "https://github.com/ada/my-site", status: "active", start: "2025-01", summary: "s", highlights: [], skills: ["python"], en: { title: "Site", summary: "s", highlights: [] } } },
    ],
    skills: [
        { id: "python", data: { ...meta, type: "skill", title: "Python", category: "backend", icon: "si:python", summary: "s", en: { summary: "s" } } },
        { id: "expo", data: { ...meta, type: "skill", title: "Expo", category: "frontend", icon: "si:expo", summary: "s", en: { summary: "s" } } },
        { id: "cobol", data: { ...meta, type: "skill", title: "COBOL", category: "backend", icon: "ph:robot", summary: "s", en: { summary: "s" } } },
    ],
    education: [],
};

test("timeline: orden, archivo, periodo y vigente", () => {
    const view = buildHomeView(data, "en", NOW);
    expect(view.experience.map((e) => e.id)).toEqual(["new", "old"]);
    expect(view.experience[0]).toMatchObject({ file: "new.log", title: "Engineer", subtitle: "New Co", period: "Jun 2026 - present", current: true, duration: "" });
    expect(view.experience[1]).toMatchObject({ current: false, duration: "6 months" });
});

test("proyectos: archivo README a partir del repo", () => {
    expect(buildHomeView(data, "es", NOW).projects[0]).toMatchObject({ file: "my-site/README.md", statusLabel: "En desarrollo" });
});

test("habilidades: XP por unión de usos, desde y dónde se usó", () => {
    const view = buildHomeView(data, "es", NOW);
    const python = view.skillGroups.flatMap((g) => g.items).find((s) => s.id === "python")!;
    expect(python.since).toBe(2020);
    expect(python.usedIn.map((u) => u.id)).toEqual(["new", "site", "old"]);
    expect(python.months).toBeGreaterThan(6);
});

test("habilidad sin uso: «sin uso registrado» y sin año", () => {
    const cobol = buildHomeView(data, "es", NOW).skillGroups.flatMap((g) => g.items).find((s) => s.id === "cobol")!;
    expect(cobol).toMatchObject({ months: 0, xp: "sin uso registrado", xpShort: "sin uso registrado", since: null, usedIn: [] });
});

test("XP profesional solo cuenta puestos", () => {
    expect(buildHomeView(data, "es", NOW).professionalXp).toBe("10 meses");
});

test("datos para el cliente: uso y nombres", () => {
    const view = buildHomeView(data, "es", NOW);
    expect(view.usage).toEqual({ python: ["old", "new", "site"], expo: ["new"] });
    expect(view.entryNames).toEqual({ old: "Old Co", new: "New Co", site: "Web" });
});

test("las secciones vacías no aparecen en la navegación", () => {
    expect(buildHomeView(data, "es", NOW).sections.map((s) => s.id)).toEqual(["experience", "projects", "skills", "contact"]);
});

test("displayUrl quita protocolo y barra final", () => {
    expect(displayUrl("https://www.linkedin.com/in/ada/")).toBe("linkedin.com/in/ada");
    expect(displayUrl("https://github.com/ada")).toBe("github.com/ada");
});
