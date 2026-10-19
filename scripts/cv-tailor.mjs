#!/usr/bin/env node
// CV adaptado (skill cv): construye el sitio con un CvSpec propio en un directorio temporal y deja el PDF
// junto al YAML. Uso: pnpm cv:tailor <ruta/cv.yml> [--lang es|en]
// Salida: 0 si cabe en una página, 2 si ocupa más (aviso), 1 si falla (YAML inválido, build rota…).
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const args = process.argv.slice(2);
const langAt = args.indexOf("--lang");
const lang = langAt >= 0 ? args[langAt + 1] : "es";
const yml = args.find((a, i) => !a.startsWith("--") && (langAt < 0 || i !== langAt + 1));
if (!yml || !["es", "en"].includes(lang)) {
    console.error("Uso: pnpm cv:tailor <ruta/cv.yml> [--lang es|en]");
    process.exit(1);
}
const spec = resolve(yml);
if (!existsSync(spec)) {
    console.error(`No existe ${spec}`);
    process.exit(1);
}

const out = join(dirname(spec), `cv-${lang}.pdf`);
const outDir = mkdtempSync(join(tmpdir(), "cv-tailor-"));
try {
    // La integración cv-pdf, en modo adaptado, imprime solo este idioma en CV_PDF_OUT y anota sus páginas.
    const build = spawnSync("pnpm", ["exec", "astro", "build"], {
        stdio: ["ignore", "ignore", "pipe"],
        env: { ...process.env, CV_SPEC: spec, CV_LANG: lang, CV_PDF_OUT: out, OUT_DIR: outDir },
    });
    if (build.status !== 0) {
        process.stderr.write(build.stderr);
        process.exit(1);
    }
    const { pages } = JSON.parse(readFileSync(`${out}.json`, "utf8"));
    rmSync(`${out}.json`);
    console.log(out);
    if (pages > 1) {
        console.log(`Aviso: el CV ocupa ${pages} páginas`);
        process.exit(2);
    }
} finally {
    rmSync(outDir, { recursive: true, force: true });
}
