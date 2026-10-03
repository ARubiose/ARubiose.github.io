import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { z } from "astro/zod";
import { schemasByType } from "@lib/schemas";
import { readFrontmatter } from "../support/frontmatter";

const FIXTURES = join(import.meta.dirname, "../fixtures/wiki");

function validate(path: string) {
    const data = readFrontmatter(path);
    const schema = schemasByType[data.type as keyof typeof schemasByType];
    if (!schema) throw new Error(`type desconocido en ${path}: ${String(data.type)}`);
    return schema.safeParse(data);
}

describe("fixtures válidos", () => {
    for (const file of readdirSync(join(FIXTURES, "valid"))) {
        test(file, () => {
            const result = validate(join(FIXTURES, "valid", file));
            expect(result.error?.issues ?? []).toEqual([]);
        });
    }
});

// Ruta del error que debe dar cada fixture: falla por lo que dice su nombre y no por otra cosa.
const invalidPaths: Record<string, (string | number)[]> = {
    "bad-email.md": ["links", "email"],
    "bad-icon-format.md": ["icon"],
    "bad-month.md": ["start"],
    "bad-repo-url.md": ["repo"],
    "end-before-start.md": ["end"],
    "full-date.md": ["start"],
    "highlights-mismatch.md": ["en", "highlights"],
    "javascript-link.md": ["links", "linkedin"],
    "javascript-url.md": ["url"],
    "missing-en-block.md": ["en"],
    "missing-en-summary.md": ["en", "summary"],
    "no-sources.md": ["sources"],
    "skills-not-array.md": ["skills"],
    "unknown-category.md": ["category"],
    "unknown-icon.md": ["icon"],
};

describe("fixtures inválidos", () => {
    for (const file of readdirSync(join(FIXTURES, "invalid"))) {
        test(file, () => {
            const result = validate(join(FIXTURES, "invalid", file));
            expect(result.success).toBe(false);
            expect(invalidPaths, "falta la ruta esperada del fixture").toHaveProperty([file]);
            expect(result.error?.issues.map((i) => i.path)).toEqual([invalidPaths[file]]);
        });
    }
});

test("una fecha YAML completa da el mensaje de formato", () => {
    const result = validate(join(FIXTURES, "invalid/full-date.md"));
    expect(result.error?.issues[0].message).toMatch(/AAAA-MM/);
});

test("links.source: null equivale a omitirlo", () => {
    const profile = { ...readFrontmatter(join(FIXTURES, "valid/profile.md")) } as { links: Record<string, unknown> };
    const result = schemasByType.profile.safeParse({ ...profile, links: { ...profile.links, source: null } });
    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.data?.links.source).toBeUndefined();
});

test("url: null equivale a omitirla", () => {
    const result = schemasByType.project.safeParse(readFrontmatter(join(FIXTURES, "valid/project-null-url.md")));
    expect(result.success).toBe(true);
    expect(result.data?.url).toBeUndefined();
});

test("los años sin mes se normalizan a string", () => {
    const result = validate(join(FIXTURES, "valid/education-year-only.md"));
    expect(result.success && result.data).toMatchObject({ start: "2015", end: "2020", grade: "8.55" });
});

describe("JSON Schema del editor (como lo genera Astro)", () => {
    // Mismas opciones que astro/dist/content/types-generator.js: el editor valida la entrada.
    const jsonSchema = (schema: (typeof schemasByType)[keyof typeof schemasByType]) =>
        JSON.stringify(z.toJSONSchema(schema, {
            unrepresentable: "any",
            io: "input",
            override: (ctx) => {
                if (ctx.zodSchema._zod.def.type === "date") Object.assign(ctx.jsonSchema, { type: "string", format: "date-time" });
            },
        }));
    const property = (schema: (typeof schemasByType)[keyof typeof schemasByType], key: string) =>
        (JSON.parse(jsonSchema(schema)) as { properties: Record<string, unknown> }).properties[key];

    test("las fechas no anuncian date-time, que la build rechaza", () => {
        expect(JSON.stringify(property(schemasByType.experience, "start"))).not.toContain("date-time");
        expect(JSON.stringify(property(schemasByType.experience, "end"))).not.toContain("date-time");
    });

    test("url y links.source admiten null, igual que la build", () => {
        expect(JSON.stringify(property(schemasByType.project, "url"))).toContain('"null"');
        const links = property(schemasByType.profile, "links") as { properties: Record<string, unknown> };
        expect(JSON.stringify(links.properties.source)).toContain('"null"');
    });
});
