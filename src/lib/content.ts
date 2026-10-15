// Carga de colecciones compartida por la portada y el detalle. Importa astro:content: no lo usan los tests de Vitest.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getCollection, getEntry } from "astro:content";
import type { HomeData } from "./home";
import { bodyIssues, lineOffset, pairDetails, svgIssues } from "./project-details";
import { findBrokenSkillRefs } from "./skills";

/** Slugs con detalle válido; la build falla con archivo, línea y motivo si alguno incumple el contrato. */
export async function loadProjectDetails(): Promise<string[]> {
    const projects = await getCollection("projects");
    const details = await getCollection("projectDetails");
    const { slugs, errors } = pairDetails(projects.map((p) => p.id), details.map((d) => d.id));
    const issues = details.flatMap((d) => {
        const body = d.body ?? "";
        const raw = d.filePath ? readFileSync(d.filePath, "utf8") : body;
        return bodyIssues(body, lineOffset(raw, body)).map((i) => `${d.filePath}:${i.line} ${i.message}`);
    });
    // Los SVG se copian tal cual al sitio: sin scripts ni recursos externos.
    const folders = [...new Set(details.flatMap((d) => (d.filePath ? [dirname(d.filePath)] : [])))];
    const svgs = folders.flatMap((dir) =>
        readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".svg")).flatMap((f) => svgIssues(readFileSync(join(dir, f), "utf8")).map((m) => `${join(dir, f)}: ${m}`)),
    );
    const all = [...errors, ...issues, ...svgs];
    if (all.length) throw new Error(`Detalles de proyecto inválidos:\n${all.join("\n")}`);
    return slugs;
}

export async function loadHomeData(): Promise<HomeData> {
    const profile = await getEntry("profile", "profile");
    if (!profile) throw new Error("Falta wiki/public/profile.md");

    const experienceEntries = await getCollection("experience");
    const projectEntries = await getCollection("projects");
    const skillEntries = await getCollection("skills");
    const educationEntries = await getCollection("education");

    const broken = findBrokenSkillRefs(
        [...experienceEntries, ...projectEntries].map((e) => ({ id: e.id, skills: e.data.skills })),
        skillEntries.map((e) => e.id),
    );
    if (broken.length) throw new Error(`Habilidades inexistentes en la wiki: ${broken.map((b) => `${b.entry} → ${b.skill}`).join(", ")}`);

    return {
        profile: profile.data,
        experience: experienceEntries.map(({ id, data }) => ({ id, data })),
        projects: projectEntries.map(({ id, data }) => ({ id, data })),
        skills: skillEntries.map(({ id, data }) => ({ id, data })),
        education: educationEntries.map(({ id, data }) => ({ id, data })),
        detailSlugs: await loadProjectDetails(),
        base: import.meta.env.BASE_URL,
    };
}
