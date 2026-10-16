import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, test } from "vitest";
import matter from "gray-matter";
import { bodyIssues, lineOffset, pairDetails, svgIssues } from "@lib/project-details";
import { projectDetailSchema, schemasByType } from "@lib/schemas";
import { findBrokenSkillRefs } from "@lib/skills";
import { readFrontmatter } from "../support/frontmatter";

// La wiki real y el fixture de los e2e (Ada) cumplen el mismo contrato.
const WIKIS = {
    "wiki/public": join(import.meta.dirname, "../../wiki/public"),
    "tests/fixtures/site": join(import.meta.dirname, "../fixtures/site"),
};

const folders = {
    experience: "experience",
    projects: "project",
    skills: "skill",
    education: "education",
} as const;

for (const [label, WIKI] of Object.entries(WIKIS)) {
    describe(label, () => {
        test("existe el perfil y cumple el contrato", () => {
            const path = join(WIKI, "profile.md");
            expect(existsSync(path)).toBe(true);
            const result = schemasByType.profile.safeParse(readFrontmatter(path));
            expect(result.error?.issues ?? []).toEqual([]);
        });

        test("la foto del perfil existe junto a profile.md", () => {
            const path = join(WIKI, "profile.md");
            const { photo } = readFrontmatter(path) as { photo: string };
            expect(existsSync(join(dirname(path), photo)), photo).toBe(true);
        });

        for (const [folder, type] of Object.entries(folders)) {
            describe(folder, () => {
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

        describe("detalles de proyecto", () => {
            const dir = join(WIKI, "projects");
            const detailFolders = existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];
            const detailIds = detailFolders.flatMap((slug) => readdirSync(join(dir, slug)).filter((f) => /^(es|en)\.md$/.test(f)).map((f) => `${slug}/${f.replace(/\.md$/, "")}`));
            const projectIds = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")) : [];

            test("cada carpeta tiene ficha y los dos idiomas", () => {
                expect(pairDetails(projectIds, detailIds).errors).toEqual([]);
            });

            for (const slug of detailFolders) {
                for (const svg of readdirSync(join(dir, slug)).filter((f) => f.toLowerCase().endsWith(".svg"))) {
                    test(`${slug}/${svg} sin contenido activo ni externo`, () => {
                        expect(svgIssues(readFileSync(join(dir, slug, svg), "utf8"))).toEqual([]);
                    });
                }
            }

            for (const id of detailIds) {
                test(`${id}.md cumple el contrato y las normas del cuerpo`, () => {
                    const raw = readFileSync(join(dir, `${id}.md`), "utf8");
                    const { data, content } = matter(raw);
                    expect(data.type).toBe("project-detail");
                    expect(projectDetailSchema.safeParse(data).error?.issues ?? []).toEqual([]);
                    expect(bodyIssues(content, lineOffset(raw, content))).toEqual([]);
                });

                test(`${id}.md: las imágenes existen junto al detalle`, () => {
                    const { content } = matter(readFileSync(join(dir, `${id}.md`), "utf8"));
                    for (const [, src] of content.matchAll(/!\[[^\]]*\]\((\.\/[^)\s]+)\)/g)) {
                        expect(existsSync(join(dir, id.split("/")[0], src)), src).toBe(true);
                    }
                });
            }
        });
    });
}

test("el fixture (Ada) incluye un detalle de ejemplo", () => {
    expect(existsSync(join(WIKIS["tests/fixtures/site"], "projects/note-engine/es.md"))).toBe(true);
    expect(existsSync(join(WIKIS["tests/fixtures/site"], "projects/note-engine/en.md"))).toBe(true);
});
