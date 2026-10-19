import { copyFileSync, existsSync, mkdtempSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { build, ROOT, run } from "../support/build";
import { readPdf } from "../support/pdf";

/** Copia un YAML del fixture a una carpeta temporal (como wiki/private/applications/<…>/cv.yml). */
function application(name: string): string {
    const dir = mkdtempSync(join(tmpdir(), "cv-app-"));
    copyFileSync(join(ROOT, "tests/fixtures/cv", name), join(dir, "cv.yml"));
    return join(dir, "cv.yml");
}
const distSnapshot = () => {
    const dist = join(ROOT, "dist");
    return existsSync(dist) ? readdirSync(dist, { recursive: true, encoding: "utf8" }).map((f) => `${f}:${statSync(join(dist, f)).mtimeMs}`).sort() : [];
};

test("genera el PDF adaptado junto al YAML, sin tocar dist/", async () => {
    const yml = application("tailored.yml");
    const before = distSnapshot();
    const result = run("pnpm", ["cv:tailor", yml, "--lang", "es"]);
    expect(result.stderr).toBe("");
    expect(result.code).toBe(0);
    const pdf = join(yml, "..", "cv-es.pdf");
    expect(result.stdout).toContain(pdf);
    const { pages, text } = await readPdf(pdf);
    expect(pages).toBe(1);
    expect(text[0]).toContain("Ingeniera de visión por computador");
    expect(text[0].indexOf("Difference Labs")).toBeLessThan(text[0].indexOf("Analytical Engines"));
    expect(existsSync(`${pdf}.json`)).toBe(false);
    expect(distSnapshot()).toEqual(before);
});

test("un CV de más de una página avisa y sale con código 2", () => {
    const result = run("pnpm", ["cv:tailor", application("long.yml")]);
    expect(result.code).toBe(2);
    expect(`${result.stdout}${result.stderr}`).toMatch(/Aviso: el CV ocupa \d+ páginas/);
});

test("un YAML inválido sale con código 1 y el motivo", () => {
    const result = run("pnpm", ["cv:tailor", application("invalid.yml")]);
    expect(result.code).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain("pillars");
});

test("CV_SPEC con la salida en dist/ rompe la build", () => {
    const result = build({ CV_SPEC: application("tailored.yml"), OUT_DIR: "dist" });
    expect(result.ok).toBe(false);
    expect(`${result.stdout}${result.stderr}`).toContain("CV_SPEC solo se usa con un OUT_DIR temporal; nunca con dist/");
});
