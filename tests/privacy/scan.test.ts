import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { findLeaks, findSecrets, loadForbiddenStrings, visibleText } from "../support/privacy";

const ROOT = join(import.meta.dirname, "../..");
const extra = loadForbiddenStrings(join(ROOT, "wiki/private/forbidden-strings.txt"));

function filesUnder(dir: string, ext: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { recursive: true, encoding: "utf8" })
        .filter((f) => f.endsWith(ext))
        .map((f) => join(dir, f));
}

describe("wiki pública sin datos privados", () => {
    for (const file of [...filesUnder(join(ROOT, "wiki/public"), ".md"), join(ROOT, "wiki/index.md")]) {
        test(file.replace(ROOT, ""), () => {
            expect(findLeaks(readFileSync(file, "utf8"), extra)).toEqual([]);
        });
    }
});

const html = filesUnder(join(ROOT, "dist"), ".html");
describe("dist sin datos privados", () => {
    // En local, sin build, se omite; en CI, un dist/ ausente es un fallo, no un verde.
    test.skipIf(html.length > 0 || !process.env.CI)("hay un build que escanear", () => {
        expect(html.length, "Ejecuta astro build antes de pnpm test").toBeGreaterThan(0);
    });

    for (const file of html) {
        test(file.replace(ROOT, ""), () => {
            expect(findLeaks(visibleText(readFileSync(file, "utf8")), extra)).toEqual([]);
        });
    }
});

// Más allá de lo publicable: credenciales, rutas locales y cadenas prohibidas en todo el repo.
const git = (...args: string[]) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

describe("archivos versionados sin credenciales ni rutas locales", () => {
    const files = git("ls-files", "-z").split("\0").filter(Boolean);
    test("hay archivos que escanear", () => {
        expect(files.length).toBeGreaterThan(50);
    });

    test("ninguno contiene credenciales, rutas personales ni cadenas prohibidas", () => {
        const leaks = files.flatMap((file) => {
            const path = join(ROOT, file);
            if (!existsSync(path)) return []; // borrado y aún sin commit
            const buffer = readFileSync(path);
            if (buffer.includes(0)) return []; // binario
            return findSecrets(buffer.toString("utf8"), extra).map((leak) => ({ file, ...leak }));
        });
        expect(leaks).toEqual([]);
    });
});

describe("historial de git sin credenciales ni rutas locales", () => {
    // En un clon superficial (CI) solo se ve la punta; en local, todo el historial.
    test("los mensajes de commit", () => {
        const commits = git("log", "--all", "--format=%h%x00%B%x01").split("\x01").filter((c) => c.trim());
        const leaks = commits.flatMap((c) => {
            const [sha, message] = c.trim().split("\0");
            return findSecrets(message, extra).map((leak) => ({ sha, ...leak }));
        });
        expect(leaks).toEqual([]);
    });

    test("las líneas añadidas en cada commit", () => {
        const log = git("log", "--all", "-p", "--no-color", "--no-ext-diff", "--format=%x01%h");
        const leaks = log.split("\x01").filter(Boolean).flatMap((chunk) => {
            const sha = chunk.slice(0, chunk.indexOf("\n"));
            const added = chunk.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).join("\n");
            return findSecrets(added, extra).map((leak) => ({ sha, ...leak }));
        });
        expect(leaks).toEqual([]);
    });
});
