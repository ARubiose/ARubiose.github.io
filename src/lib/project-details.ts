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
    identifier?: string;
    children?: Node[];
    position?: { start: { line: number } };
};

const CLOSING = new Set(["relacionado", "fuentes", "related", "sources"]);
// Nombres sencillos dentro de la carpeta: sin `..`, `%` (codificaciones que Astro decodifica) ni barras invertidas.
const IMAGE = /^\.\/[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*\.(jpe?g|png|webp|avif|svg)$/i;
const okLink = (url: string) => /^https?:\/\//i.test(url) || url.startsWith("#");
const okImage = (url: string) => IMAGE.test(url) && !url.split("/").includes("..");
const textOf = (n: Node): string => n.value ?? (n.children ?? []).map(textOf).join("");

/** Incumplimientos de las normas del cuerpo publicado (spec §3.3), con su línea en el archivo. */
export function bodyIssues(markdown: string, lineOffset = 0): { line: number; message: string }[] {
    const root = markdownToMdast(markdown) as unknown as Node;
    // Las referencias ([x][r], ![x][r]) se validan con la URL de su definición, según sean enlace o imagen.
    const definitions = new Map<string, string>();
    const collect = (n: Node) => {
        if (n.type === "definition" && n.identifier) definitions.set(n.identifier, n.url ?? "");
        for (const c of n.children ?? []) collect(c);
    };
    collect(root);

    const issues: { line: number; message: string }[] = [];
    const walk = (n: Node) => {
        const line = (n.position?.start.line ?? 1) + lineOffset;
        const add = (message: string) => issues.push({ line, message });
        const checkLink = (url: string) => { if (!okLink(url)) add(`Enlace no permitido: ${url}`); };
        const checkImage = (url: string) => {
            if (!okImage(url)) add(`Imagen no permitida: ${url}`);
            else if (!(n.alt ?? "").trim()) add(`Imagen sin texto alternativo: ${url}`);
        };
        if (n.type === "html") add("HTML crudo no permitido");
        if (n.type === "link") checkLink(n.url ?? "");
        if (n.type === "linkReference") checkLink(definitions.get(n.identifier ?? "") ?? "");
        if (n.type === "image") checkImage(n.url ?? "");
        if (n.type === "imageReference") checkImage(definitions.get(n.identifier ?? "") ?? "");
        if (n.type === "heading" && n.depth === 1) add("Sin # h1: el título sale de `title`");
        if (n.type === "heading" && n.depth === 2 && CLOSING.has(textOf(n).trim().toLowerCase())) {
            add(`Sección de wiki no publicable: ## ${textOf(n).trim()}`);
        }
        for (const c of n.children ?? []) walk(c);
    };
    walk(root);
    return issues;
}

/** Contenido activo o externo en un SVG del detalle: se copia tal cual al sitio y se puede abrir en su origen. */
export function svgIssues(svg: string): string[] {
    const checks: [RegExp, string][] = [
        [/<script\b/i, "<script"],
        [/\son[a-z]+\s*=/i, "atributo on*"],
        [/<foreignObject\b/i, "<foreignObject"],
        [/javascript:/i, "javascript:"],
        [/(?:href|src)\s*=\s*["']\s*(?:https?:)?\/\/|url\(\s*["']?\s*(?:https?:)?\/\//i, "recurso externo"],
    ];
    return checks.filter(([re]) => re.test(svg)).map(([, what]) => `SVG con ${what}`);
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
