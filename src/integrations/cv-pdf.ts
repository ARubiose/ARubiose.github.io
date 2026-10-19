// Imprime el CV a PDF al terminar la build (decisión 0008). Sin alias de importación: la carga astro.config.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { defaultLocale, locales, type Locale } from "../i18n/ui.ts";
import { renderCvPdf } from "../lib/cv-pdf.ts";

const cvPath = (locale: Locale) => `${locale === defaultLocale ? "" : `${locale}/`}cv/`;

/** Nombre del PDF que la página del CV anuncia en su hoja (data-cv-pdf). */
function pdfNameIn(root: string, locale: Locale): string {
    const html = readFileSync(join(root, cvPath(locale), "index.html"), "utf8");
    const name = html.match(/data-cv-pdf="([^"]+)"/)?.[1];
    if (!name) throw new Error(`La página ${cvPath(locale)} no anuncia data-cv-pdf`);
    return name;
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
                    const name = pdfNameIn(root, locale);
                    const { pages } = await renderCvPdf({ root, base, path: cvPath(locale), out: join(root, "cv", name) });
                    if (pages > 1) throw new Error(`El CV (${locale}) ocupa ${pages} páginas; tiene que caber en una`);
                    logger.info(`cv/${name}`);
                }
            },
        },
    };
}
