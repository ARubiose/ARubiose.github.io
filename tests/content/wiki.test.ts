import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { schemasByType } from "@lib/schemas";
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

test("hay al menos un puesto, un proyecto, una habilidad y un estudio", () => {
    for (const folder of Object.keys(folders)) {
        const files = readdirSync(join(WIKI, folder)).filter((f) => f.endsWith(".md"));
        expect(files.length, folder).toBeGreaterThan(0);
    }
});
