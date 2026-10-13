import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "vitest";

const SCRIPT = join(import.meta.dirname, "../../scripts/sync-upstream.mjs");
// Repos de usar y tirar: identidad propia y sin firmar, sea cual sea la configuración global.
const ENV = {
    ...process.env,
    GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.com",
    GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "commit.gpgsign", GIT_CONFIG_VALUE_0: "false",
};

const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, env: ENV, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const put = (repo: string, files: Record<string, string>) => {
    for (const [path, text] of Object.entries(files)) {
        mkdirSync(dirname(join(repo, path)), { recursive: true });
        writeFileSync(join(repo, path), text);
    }
};
const commit = (repo: string, files: Record<string, string>, message: string) => {
    put(repo, files);
    git(repo, "add", "-A");
    git(repo, "commit", "-qm", message);
};
const read = (repo: string, path: string) => readFileSync(join(repo, path), "utf8");
const sync = (cwd: string) => spawnSync("node", [SCRIPT], { cwd, env: ENV, encoding: "utf8" });
const unmerged = (repo: string) => git(repo, "diff", "--name-only", "--diff-filter=U").split("\n").filter(Boolean);

function template() {
    const tpl = mkdtempSync(join(tmpdir(), "tpl-"));
    git(tpl, "init", "-qb", "main");
    commit(tpl, { "src/a.ts": "v1\n", "wiki/public/profile.md": "ada\n", "wiki/index.md": "ada\n" }, "v1");
    return tpl;
}
// La plantilla mejora el código, cambia a Ada y le AÑADE páginas e imagen: nada de eso puede llegar al sitio.
const improve = (tpl: string) =>
    commit(tpl, { "src/a.ts": "v2\n", "wiki/public/profile.md": "ada 2\n", "wiki/public/exp/new.md": "ada job\n", "public/og-image.png": "ada og\n" }, "v2");

describe("sync-upstream", () => {
    test("historial compartido: trae el código y deja el contenido exactamente como estaba", () => {
        const tpl = template();
        const site = mkdtempSync(join(tmpdir(), "site-"));
        git(site, "clone", "-q", tpl, ".");
        git(site, "remote", "add", "upstream", tpl);
        commit(site, { "wiki/public/profile.md": "me\n", "wiki/public/exp/mine.md": "my job\n", "wiki/index.md": "me\n" }, "mine");
        improve(tpl);

        const run = sync(site);
        expect(run.status, run.stderr).toBe(0);
        expect(read(site, "src/a.ts")).toBe("v2\n");
        expect(read(site, "wiki/public/profile.md")).toBe("me\n");
        expect(read(site, "wiki/index.md")).toBe("me\n");
        expect(existsSync(join(site, "wiki/public/exp/mine.md"))).toBe(true);
        expect(existsSync(join(site, "wiki/public/exp/new.md"))).toBe(false);
        expect(existsSync(join(site, "public/og-image.png"))).toBe(false);
        expect(unmerged(site)).toEqual([]);
        // Sin commit: el merge queda preparado para revisarlo y pasar los tests.
        expect(git(site, "rev-parse", "-q", "--verify", "MERGE_HEAD")).not.toBe("");
        git(site, "commit", "-qm", "merge");
        expect(git(site, "ls-files", "wiki/public")).toBe("wiki/public/exp/mine.md\nwiki/public/profile.md");
    });

    test("repo creado con «Use this template» (sin historial común): mismo resultado, solo quedan conflictos de código", () => {
        const tpl = template();
        improve(tpl);
        const site = mkdtempSync(join(tmpdir(), "site-"));
        git(site, "init", "-qb", "main");
        commit(site, { "src/a.ts": "v1\n", "wiki/public/profile.md": "me\n", "wiki/index.md": "me\n", "public/og-image.png": "my og\n" }, "init");
        git(site, "remote", "add", "upstream", tpl);

        const run = sync(site);
        expect(run.status, run.stderr).toBe(0);
        expect(read(site, "wiki/public/profile.md")).toBe("me\n");
        expect(read(site, "public/og-image.png")).toBe("my og\n");
        expect(existsSync(join(site, "wiki/public/exp/new.md"))).toBe(false);
        expect(unmerged(site)).toEqual(["src/a.ts"]);
        expect(run.stdout).toContain("src/a.ts");
    });

    test("con cambios sin commit no empieza", () => {
        const tpl = template();
        const site = mkdtempSync(join(tmpdir(), "site-"));
        git(site, "clone", "-q", tpl, ".");
        git(site, "remote", "add", "upstream", tpl);
        put(site, { "src/a.ts": "dirty\n" });

        const run = sync(site);
        expect(run.status).not.toBe(0);
        expect(run.stderr).toMatch(/sin commit/);
        expect(read(site, "src/a.ts")).toBe("dirty\n");
    });
});
