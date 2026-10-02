import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
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

describe("fixtures inválidos", () => {
    for (const file of readdirSync(join(FIXTURES, "invalid"))) {
        test(file, () => {
            expect(validate(join(FIXTURES, "invalid", file)).success).toBe(false);
        });
    }
});

test("los años sin mes se normalizan a string", () => {
    const result = validate(join(FIXTURES, "valid/education-year-only.md"));
    expect(result.success && result.data).toMatchObject({ start: "2015", end: "2020", grade: "8.55" });
});
