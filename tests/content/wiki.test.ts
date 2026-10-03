import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { schemasByType } from "@lib/schemas";
import { findBrokenSkillRefs } from "@lib/skills";
import { readFrontmatter } from "../support/frontmatter";

const WIKI = join(import.meta.dirname, "../../wiki/public");

const folders = {
    experience: "experience",
    projects: "project",
    skills: "skill",
    education: "education",
} as const;

test("existe el perfil y cumple el contrato", () => {
    const path = join(WIKI, "profile.md");
    expect(existsSync(path)).toBe(true);
    const result = schemasByType.profile.safeParse(readFrontmatter(path));
    expect(result.error?.issues ?? []).toEqual([]);
});

for (const [folder, type] of Object.entries(folders)) {
    describe(`wiki/public/${folder}`, () => {
        const dir = join(WIKI, folder);
        const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md")) : [];

        for (const file of files) {
            test(file, () => {
                const data = readFrontmatter(join(dir, file));
                expect(data.type).toBe(type);
                const result = schemasByType[type].safeParse(data);
                expect(result.error?.issues ?? []).toEqual([]);
            });
        }
    });
}

test("cada habilidad citada por un puesto o proyecto existe", () => {
    // Las colecciones pueden estar vacías o no existir: el sitio oculta esas secciones.
    const ids = (folder: string) =>
        (existsSync(join(WIKI, folder)) ? readdirSync(join(WIKI, folder)) : [])
            .filter((f) => f.endsWith(".md"))
            .map((f) => f.replace(/\.md$/, ""));
    const entries = ["experience", "projects"].flatMap((folder) =>
        ids(folder).map((id) => ({ id, skills: readFrontmatter(join(WIKI, folder, `${id}.md`)).skills as string[] | undefined })),
    );
    expect(findBrokenSkillRefs(entries, ids("skills"))).toEqual([]);
});
