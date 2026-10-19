// Imprime el CV a PDF al terminar la build (decisión 0008). Sin alias de importación: la carga astro.config.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { defaultLocale, locales, type Locale } from "../i18n/ui.ts";
import { renderCvPdf } from "../lib/cv-pdf.ts";

const cvPath = (locale: Locale) => `${locale === defaultLocale ? "" : `${locale}/`}cv/`;

/** Lo que la hoja del CV anuncia: el nombre del PDF (data-cv-pdf) y si hay bloque cv: (data-cv-strict). */
function sheetIn(root: string, locale: Locale): { name: string; strict: boolean } {
    const html = readFileSync(join(root, cvPath(locale), "index.html"), "utf8");
    const sheet = html.match(/<article class="cv-sheet"[^>]*>/)?.[0] ?? "";
    const name = sheet.match(/data-cv-pdf="([^"]+)"/)?.[1];
    if (!name) throw new Error(`La página ${cvPath(locale)} no anuncia data-cv-pdf`);
    return { name, strict: /\sdata-cv-strict\b/.test(sheet) };
}

export default function cvPdf(): AstroIntegration {
    let base = "/";
    return {
        name: "cv-pdf",
        hooks: {
            "astro:config:done": ({ config }) => {
                base = config.base;
            },
            "astro:build:done": async ({ dir, logger }) => {
                const env = process.env;
                if (env.CV_PDF === "0") return logger.info("CV_PDF=0: sin PDF del CV");
                const root = fileURLToPath(dir);

                // Modo adaptado (pnpm cv:tailor): un idioma, a la ruta pedida; las páginas las juzga el script.
                if (env.CV_PDF_OUT) {
                    const locale = (env.CV_LANG ?? defaultLocale) as Locale;
                    if (!locales.includes(locale)) throw new Error(`CV_LANG desconocido: ${locale}`);
                    const { pages } = await renderCvPdf({ root, base, path: cvPath(locale), out: env.CV_PDF_OUT });
                    writeFileSync(`${env.CV_PDF_OUT}.json`, JSON.stringify({ pages }));
                    return;
                }

                for (const locale of locales) {
                    const { name, strict } = sheetIn(root, locale);
                    const { pages } = await renderCvPdf({ root, base, path: cvPath(locale), out: join(root, "cv", name) });
                    // Sin bloque cv: (p. ej. un sitio derivado recién sincronizado) solo se avisa: la build no se rompe.
                    if (pages > 1 && strict) throw new Error(`El CV (${locale}) ocupa ${pages} páginas; tiene que caber en una`);
                    if (pages > 1) logger.warn(`El CV (${locale}) ocupa ${pages} páginas: añade un bloque cv: al perfil para recortarlo`);
                    logger.info(`cv/${name}`);
                }
            },
        },
    };
}
