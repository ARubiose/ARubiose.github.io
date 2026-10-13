// Trae las mejoras de la plantilla sin tocar el contenido del sitio.
// Uso: pnpm sync:upstream [ref]   (por defecto upstream/main)
//
// Hace el merge sin commit y deja el contenido exactamente como estaba en HEAD: los cambios
// de upstream en él se descartan y las páginas que solo trae upstream (Ada) se quitan. Un
// driver merge=ours no basta: solo actúa cuando los dos lados tocaron el mismo archivo.
import { execFileSync, spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

/** Archivos de contenido: lo único que difiere entre la plantilla y cada sitio. */
const CONTENT = ["wiki/public", "wiki/index.md", "public/og-image.png"];

const ref = process.argv[2] ?? "upstream/main";
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const ok = (...args) => spawnSync("git", args, { stdio: "ignore" }).status === 0;
const fail = (message) => {
    console.error(message);
    process.exit(1);
};

if (git("status", "--porcelain")) fail("Hay cambios sin commit: haz commit o stash antes de traer upstream.");

// Solo se hace fetch si la ref empieza por un remoto que existe (feat/x es una rama local).
const remote = git("remote").split("\n").find((r) => r && ref.startsWith(`${r}/`));
if (remote && spawnSync("git", ["fetch", "-q", remote], { stdio: "inherit" }).status !== 0) fail(`No se pudo hacer fetch de «${remote}».`);

// Un repo creado con «Use this template» no comparte historial con la plantilla.
const related = ok("merge-base", "HEAD", ref);
const merge = spawnSync("git", ["merge", "--no-commit", "--no-ff", ...(related ? [] : ["--allow-unrelated-histories"]), ref], { stdio: "inherit" });
if (!ok("rev-parse", "-q", "--verify", "MERGE_HEAD")) process.exit(merge.status ?? 1); // ya al día, o el merge no empezó

for (const path of CONTENT) {
    if (ok("cat-file", "-e", `HEAD:${path}`)) {
        git("restore", "--source=HEAD", "--staged", "--worktree", "--", path);
    } else {
        git("rm", "-rq", "--cached", "--ignore-unmatch", "--", path);
        rmSync(path, { recursive: true, force: true });
    }
}

const conflicts = git("diff", "--name-only", "--diff-filter=U").split("\n").filter(Boolean);
console.log(`\nMerge de ${ref} preparado sin commit. Tu contenido (${CONTENT.join(", ")}) queda como estaba.`);
if (conflicts.length) console.log(`Resuelve estos conflictos (normalmente con la versión de la plantilla, git checkout --theirs):\n${conflicts.map((c) => `  ${c}`).join("\n")}`);
console.log("Revisa con git diff --cached, pasa pnpm test && pnpm test:e2e y termina con git commit.");
