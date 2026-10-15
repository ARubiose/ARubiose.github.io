import { markdownToMdast } from "satteri";
import { defaultLocale, type Locale } from "@i18n/ui";

const LANGS = ["es", "en"] as const;

/** Empareja los detalles (`<slug>/es`, `<slug>/en`) con las fichas de proyecto. */
export function pairDetails(projectIds: string[], detailIds: string[]): { slugs: string[]; errors: string[] } {
    const bySlug = new Map<string, Set<string>>();
    for (const id of detailIds) {
        const [slug, lang] = id.split("/");
        if (!bySlug.has(slug)) bySlug.set(slug, new Set());
        bySlug.get(slug)!.add(lang);
    }
    const slugs: string[] = [];
    const errors: string[] = [];
    for (const slug of [...bySlug.keys()].sort()) {
        const langs = bySlug.get(slug)!;
        const missing = LANGS.filter((l) => !langs.has(l));
        if (!projectIds.includes(slug)) errors.push(`projects/${slug}/: no existe la ficha projects/${slug}.md`);
        else if (missing.length) errors.push(...missing.map((l) => `projects/${slug}/: falta ${l}.md`));
        else slugs.push(slug);
    }
    return { slugs, errors };
}

type Node = {
    type: string;
    url?: string;
    alt?: string | null;
    depth?: number;
    value?: string;
    children?: Node[];
    position?: { start: { line: number } };
};

const CLOSING = new Set(["relacionado", "fuentes", "related", "sources"]);
const IMAGE = /^\.\/[^?#]*\.(jpe?g|png|webp|avif|svg)$/i;
const okLink = (url: string) => /^https?:\/\//i.test(url) || url.startsWith("#");
const okImage = (url: string) => IMAGE.test(url) && !url.split("/").includes("..");
const textOf = (n: Node): string => n.value ?? (n.children ?? []).map(textOf).join("");

/** Incumplimientos de las normas del cuerpo publicado (spec §3.3), con su línea en el archivo. */
export function bodyIssues(markdown: string, lineOffset = 0): { line: number; message: string }[] {
    const issues: { line: number; message: string }[] = [];
    const walk = (n: Node) => {
        const line = (n.position?.start.line ?? 1) + lineOffset;
        const add = (message: string) => issues.push({ line, message });
        if (n.type === "html") add("HTML crudo no permitido");
        if ((n.type === "link" || n.type === "definition") && !okLink(n.url ?? "")) add(`Enlace no permitido: ${n.url}`);
        if (n.type === "image") {
            if (!okImage(n.url ?? "")) add(`Imagen no permitida: ${n.url}`);
            else if (!(n.alt ?? "").trim()) add(`Imagen sin texto alternativo: ${n.url}`);
        }
        if (n.type === "heading" && n.depth === 1) add("Sin # h1: el título sale de `title`");
        if (n.type === "heading" && n.depth === 2 && CLOSING.has(textOf(n).trim().toLowerCase())) {
            add(`Sección de wiki no publicable: ## ${textOf(n).trim()}`);
        }
        for (const c of n.children ?? []) walk(c);
    };
    walk(markdownToMdast(markdown) as unknown as Node);
    return issues;
}

/** Líneas del archivo antes del cuerpo (el frontmatter), para dar líneas reales. */
export function lineOffset(raw: string, body: string): number {
    if (!body) return 0;
    const at = raw.indexOf(body);
    return at <= 0 ? 0 : raw.slice(0, at).split("\n").length - 1;
}

/** URL del detalle de un proyecto en un idioma, con el `base` del sitio. */
export function detailUrl(slug: string, locale: Locale, base = "/"): string {
    const root = base.endsWith("/") ? base : `${base}/`;
    return `${root}${locale === defaultLocale ? "" : `${locale}/`}projects/${slug}/`;
}
