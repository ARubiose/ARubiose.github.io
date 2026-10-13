type Env = Record<string, string | undefined>;

const DEFAULT_WIKI = "wiki/public";
const trimSlashes = (p: string) => p.replace(/^\.\//, "").replace(/\/+$/, "");
const rel = (p: string) => (p.startsWith("/") ? p.replace(/\/+$/, "") : `./${trimSlashes(p)}`);
const slash = (p: string) => `/${p.replace(/^\/+|\/+$/g, "")}/`.replace(/\/{2,}/g, "/");

/**
 * Dónde se publica el sitio. Prioridad: SITE_URL (+ BASE_PATH), después GITHUB_REPOSITORY
 * (lo pone Actions: <owner>.github.io va a la raíz, cualquier otro repo a /<repo>/) y, sin
 * ninguno, localhost para desarrollo.
 */
export function pagesTarget(env: Env): { site: string; base: string } {
    if (env.SITE_URL?.trim()) return { site: env.SITE_URL.trim().replace(/\/+$/, ""), base: slash(env.BASE_PATH ?? "") };
    const [owner, repo] = (env.GITHUB_REPOSITORY ?? "").toLowerCase().split("/");
    if (!owner || !repo) return { site: "http://localhost:4321", base: "/" };
    return { site: `https://${owner}.github.io`, base: repo === `${owner}.github.io` ? "/" : slash(repo) };
}

/** Directorios del build: la wiki que se lee, dónde se escribe y una caché de colecciones por wiki. */
export function buildDirs(env: Env): { wikiDir: string; outDir: string; cacheDir: string } {
    const wiki = trimSlashes(env.WIKI_DIR?.trim() || DEFAULT_WIKI);
    const cacheDir = wiki === DEFAULT_WIKI ? "./node_modules/.astro" : `./node_modules/.astro-${wiki.replace(/[^a-z0-9]+/gi, "-")}`;
    return { wikiDir: rel(wiki), outDir: rel(env.OUT_DIR?.trim() || "dist"), cacheDir };
}
