import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { z } from "astro/zod";
import { cvSpecSchema, projectDetailSchema, schemasByType, skillSchema } from "@lib/schemas";
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
    "bad-education-kind.md": ["kind"],
    "bad-email.md": ["links", "email"],
    "bad-icon-format.md": ["icon"],
    "bad-month.md": ["start"],
    "bad-photo-path.md": ["photo"],
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

test("kind de formación: degree por defecto, certificate si se indica", () => {
    const degree = validate(join(FIXTURES, "valid/education-year-only.md"));
    expect(degree.success && degree.data).toMatchObject({ kind: "degree" });
    const certificate = validate(join(FIXTURES, "valid/education-certificate.md"));
    expect(certificate.success && certificate.data).toMatchObject({ kind: "certificate" });
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

describe("project-detail", () => {
    const ok = { title: "Cómo funciona", type: "project-detail", summary: "Una frase.", sources: ["humano (2026-10-14)"], updated: "2026-10-14" };

    test("acepta el mínimo y pone tags vacías", () => {
        expect(projectDetailSchema.parse(ok).tags).toEqual([]);
    });

    test.each(["title", "summary", "sources", "updated"])("exige %s", (field) => {
        const rest: Record<string, unknown> = { ...ok };
        delete rest[field];
        expect(projectDetailSchema.safeParse(rest).success).toBe(false);
    });

    test("no acepta otro type", () => {
        expect(projectDetailSchema.safeParse({ ...ok, type: "project" }).success).toBe(false);
    });
});

describe("cv", () => {
    const pillar = { title: "IA", text: "Texto" };
    const issuesAt = (input: unknown) => (cvSpecSchema.safeParse(input).error?.issues ?? []).map((i) => i.path.join("."));

    test("acepta un spec vacío con sus valores por defecto", () => {
        const spec = cvSpecSchema.parse({});
        expect(spec.photo).toBe(true);
        expect(spec.pillars).toEqual([]);
        expect(spec.languages).toEqual([]);
    });

    test("rechaza más de 3 pilares", () => {
        expect(issuesAt({ pillars: [pillar, pillar, pillar, pillar] })).toContain("pillars");
    });

    test("en.pillars debe tener la misma longitud que pillars", () => {
        expect(issuesAt({ pillars: [pillar, pillar], en: { pillars: [pillar] } })).toContain("en.pillars");
    });

    test("en.skills debe tener la misma longitud que skills", () => {
        expect(issuesAt({ skills: [{ label: "IA", items: ["python"] }], en: { skills: [] } })).toContain("en.skills");
    });

    test("en.languages debe tener la misma longitud que languages", () => {
        expect(issuesAt({ languages: [{ name: "Español", level: "nativo" }], en: { languages: [] } })).toContain("en.languages");
    });

    test("sin bloque en no exige traducciones", () => {
        expect(issuesAt({ pillars: [pillar], languages: [{ name: "Español", level: "nativo" }] })).toEqual([]);
    });

    test.each([[-1], [1.5]])("rechaza el índice de highlight %s", (index) => {
        expect(issuesAt({ experience: [{ id: "x", highlights: [index] }] })).toContain("experience.0.highlights.0");
    });

    test("el perfil acepta el bloque cv", () => {
        const profile = readFrontmatter(join(FIXTURES, "valid", "profile.md"));
        const result = schemasByType.profile.safeParse({ ...profile, cv: { pillars: [pillar] } });
        expect(result.error?.issues ?? []).toEqual([]);
    });

    test("las habilidades aceptan en.title opcional", () => {
        const base = { title: "Agentes LLM", type: "skill", category: "ai", icon: "ph:robot", summary: "s", sources: ["x"], updated: "2026-10-19" };
        expect(skillSchema.safeParse({ ...base, en: { summary: "s" } }).success).toBe(true);
        expect(skillSchema.parse({ ...base, en: { summary: "s", title: "LLM agents" } }).en.title).toBe("LLM agents");
    });
});
