import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";
import { readPdf } from "../support/pdf";

const ROOT = join(import.meta.dirname, "../..");
const VITE_KEYS = new Set(["BASE_URL", "MODE", "DEV", "PROD", "SSR"]);
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !VITE_KEYS.has(k)));
const FIXTURE = { WIKI_DIR: "tests/fixtures/site", SITE_URL: "https://ada.example", BASE_PATH: "/", BUILD_DATE: "2026-10" };

/** Construye en un directorio temporal; devuelve el directorio, o el stderr si la build falla. */
export function build(env: Record<string, string>): { out: string; ok: boolean; stderr: string } {
    const out = mkdtempSync(join(tmpdir(), "cv-"));
    try {
        execFileSync("pnpm", ["exec", "astro", "build"], { cwd: ROOT, stdio: "pipe", env: { ...cleanEnv, ...FIXTURE, OUT_DIR: out, ...env } });
        return { out, ok: true, stderr: "" };
    } catch (e) {
        const err = e as { stderr?: Buffer; stdout?: Buffer };
        return { out, ok: false, stderr: `${err.stderr?.toString() ?? ""}${err.stdout?.toString() ?? ""}` };
    }
}

describe("PDF del CV en la build del fixture", () => {
    let out = "";
    beforeAll(() => {
        const result = build({});
        expect(result.stderr).toBe("");
        out = result.out;
    });

    test.each(["es", "en"])("existe el PDF %s y ocupa una página", async (locale) => {
        const file = join(out, "cv", `cv-ada-lovelace-${locale}.pdf`);
        expect(existsSync(file)).toBe(true);
        expect((await readPdf(file)).pages).toBe(1);
    });

    test("el texto sale en el orden de lectura de la hoja", async () => {
        const [text] = (await readPdf(join(out, "cv", "cv-ada-lovelace-es.pdf"))).text;
        // Cada título seguido de su contenido: así lo leen los ATS (Chromium escribe aparte lo posicionado).
        const order = [
            "Ada Lovelace", "Perfil", "IA aplicada", "Experiencia", "Desarrolladora backend", "Procesamiento asíncrono", "Becaria de ciberseguridad",
            "Proyectos", "Motor de notas", "Habilidades", "Agentes LLM, Deep learning", "Formación", "Grado en Ingeniería Informática", "Idiomas", "Francés",
        ].map((s) => text.indexOf(s));
        expect(order.every((i) => i >= 0)).toBe(true);
        expect([...order].sort((a, b) => a - b)).toEqual(order);
    });

    test("incrusta las fuentes del CV, no las de reserva", () => {
        const raw = readFileSync(join(out, "cv", "cv-ada-lovelace-es.pdf")).toString("latin1");
        expect(raw).toMatch(/\/BaseFont\s*\/[A-Z]{6}\+IBMPlexSans/);
        expect(raw).toMatch(/\/BaseFont\s*\/[A-Z]{6}\+SpaceGrotesk/);
    });
});

test("con CV_PDF=0 no se genera el PDF", () => {
    const result = build({ CV_PDF: "0" });
    expect(result.ok).toBe(true);
    expect(existsSync(join(result.out, "cv", "index.html"))).toBe(true);
    expect(existsSync(join(result.out, "cv", "cv-ada-lovelace-es.pdf"))).toBe(false);
});

test("un CV público de más de una página rompe la build", () => {
    const wiki = mkdtempSync(join(tmpdir(), "cv-wiki-"));
    cpSync(join(ROOT, "tests/fixtures/site"), wiki, { recursive: true });
    const file = join(wiki, "experience", "difference-labs.md");
    const long = Array.from({ length: 40 }, (_, i) => `Logro de relleno número ${i} para desbordar la hoja.`);
    const source = readFileSync(file, "utf8")
        .replace(/^highlights:\n(  - .*\n)+/m, `highlights:\n${long.map((h) => `  - ${h}\n`).join("")}`)
        .replace(/^  highlights:\n(    - .*\n)+/m, `  highlights:\n${long.map((h) => `    - ${h}\n`).join("")}`);
    writeFileSync(file, source);
    const result = build({ WIKI_DIR: wiki });
    expect(result.ok).toBe(false);
    expect(result.stderr).toContain("tiene que caber en una");
});
