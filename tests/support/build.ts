import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const ROOT = join(import.meta.dirname, "../..");
// Vitest mete en process.env las variables de Vite (BASE_URL…); heredadas, pisarían la base del build.
const VITE_KEYS = new Set(["BASE_URL", "MODE", "DEV", "PROD", "SSR"]);
export const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !VITE_KEYS.has(k)));
export const FIXTURE_ENV = { WIKI_DIR: "tests/fixtures/site", SITE_URL: "https://ada.example", BASE_PATH: "/", BUILD_DATE: "2026-10" };

export type Run = { ok: boolean; code: number; out: string; stdout: string; stderr: string };

/** Ejecuta un comando en la raíz del repo con el entorno del fixture; nunca lanza. */
export function run(cmd: string, args: string[], env: Record<string, string> = {}): Run {
    try {
        const stdout = execFileSync(cmd, args, { cwd: ROOT, stdio: "pipe", env: { ...cleanEnv, ...FIXTURE_ENV, ...env } }).toString();
        return { ok: true, code: 0, out: env.OUT_DIR ?? "", stdout, stderr: "" };
    } catch (e) {
        const err = e as { status?: number; stdout?: Buffer; stderr?: Buffer };
        return { ok: false, code: err.status ?? 1, out: env.OUT_DIR ?? "", stdout: err.stdout?.toString() ?? "", stderr: err.stderr?.toString() ?? "" };
    }
}

/** Construye el fixture en un directorio temporal. */
export function build(env: Record<string, string> = {}): Run {
    return run("pnpm", ["exec", "astro", "build"], { OUT_DIR: mkdtempSync(join(tmpdir(), "cv-")), ...env });
}
