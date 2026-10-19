import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { renderCvPdf } from "../../src/lib/cv-pdf";
import { build, ROOT } from "../support/build";
import { readPdf } from "../support/pdf";

describe("PDF del CV en la build del fixture", () => {
    let out = "";
    beforeAll(() => {
        const result = build();
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

/** Copia el fixture con 40 highlights en un puesto; sin bloque cv: si se pide. */
function longWiki({ withCv }: { withCv: boolean }): string {
    const wiki = mkdtempSync(join(tmpdir(), "cv-wiki-"));
    cpSync(join(ROOT, "tests/fixtures/site"), wiki, { recursive: true });
    const file = join(wiki, "experience", "difference-labs.md");
    const long = Array.from({ length: 40 }, (_, i) => `Logro de relleno número ${i} para desbordar la hoja.`);
    writeFileSync(file, readFileSync(file, "utf8")
        .replace(/^highlights:\n(  - .*\n)+/m, `highlights:\n${long.map((h) => `  - ${h}\n`).join("")}`)
        .replace(/^  highlights:\n(    - .*\n)+/m, `  highlights:\n${long.map((h) => `    - ${h}\n`).join("")}`));
    if (!withCv) {
        const profile = join(wiki, "profile.md");
        writeFileSync(profile, readFileSync(profile, "utf8").replace(/^cv:\n(?:[ ].*\n)+/m, ""));
    }
    return wiki;
}

test("sin bloque cv: un CV largo solo avisa (un sitio derivado sigue construyendo tras sincronizar)", () => {
    const wiki = longWiki({ withCv: false });
    expect(readFileSync(join(wiki, "profile.md"), "utf8")).not.toMatch(/^cv:/m);
    const result = build({ WIKI_DIR: wiki });
    expect(result.stderr).not.toContain("tiene que caber en una");
    expect(result.ok).toBe(true);
    expect(result.stdout).toMatch(/El CV \(es\) ocupa \d+ páginas/);
});

test("con bloque cv:, un CV público de más de una página rompe la build", () => {
    const result = build({ WIKI_DIR: longWiki({ withCv: true }) });
    expect(result.ok).toBe(false);
    expect(`${result.stderr}${result.stdout}`).toContain("tiene que caber en una");
});

test("al imprimir no sale ninguna petición fuera de la build (analítica, CDN…)", async () => {
    let hits = 0;
    const outside = createServer((_, res) => { hits++; res.end("ok"); });
    await new Promise<void>((resolve) => outside.listen(0, "127.0.0.1", resolve));
    const { port } = outside.address() as AddressInfo;
    const root = mkdtempSync(join(tmpdir(), "cv-root-"));
    cpSync(join(ROOT, "tests/fixtures/components/photo.jpg"), join(root, "photo.jpg"));
    // Otro origen (localhost frente a 127.0.0.1), como el beacon de Cloudflare.
    writeFileSync(join(root, "index.html"), `<!doctype html><title>x</title><p>CV</p><script src="http://localhost:${port}/beacon.js"></script><img src="photo.jpg" alt="">`);
    try {
        const { pages } = await renderCvPdf({ root, base: "/", path: "", out: join(root, "out.pdf") });
        expect(pages).toBe(1);
        expect(hits).toBe(0);
    } finally {
        outside.close();
    }
});

test("se imprime con movimiento reducido: el PDF nunca captura la animación de entrada", async () => {
    const root = mkdtempSync(join(tmpdir(), "cv-root-"));
    // Solo visible con movimiento reducido, como el contenido de una hoja que se anima al entrar.
    writeFileSync(join(root, "index.html"), `<!doctype html><title>x</title><style>@media (prefers-reduced-motion: no-preference) { p { display: none } }</style><p>Visible al imprimir</p>`);
    await renderCvPdf({ root, base: "/", path: "", out: join(root, "out.pdf") });
    expect((await readPdf(join(root, "out.pdf"))).text[0]).toContain("Visible al imprimir");
});
