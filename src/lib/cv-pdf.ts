// Impresión del CV a PDF con Chromium (Playwright). Lo usa la integración cv-pdf desde astro.config:
// sin alias de importación (@lib…), que allí no se resuelven.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize, sep } from "node:path";

/** Páginas de un PDF: hojas /Type /Page (no el árbol /Pages). */
export function countPdfPages(pdf: Uint8Array): number {
    return new TextDecoder("latin1").decode(pdf).match(/\/Type\s*\/Page(?![a-zA-Z])/g)?.length ?? 0;
}

const TYPES: Record<string, string> = {
    ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
    ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".webp": "image/webp", ".avif": "image/avif", ".woff2": "font/woff2", ".woff": "font/woff", ".ico": "image/x-icon",
    ".pdf": "application/pdf", ".xml": "application/xml", ".txt": "text/plain",
};

/** Servidor estático de la build, colgado de su base (como GitHub Pages). */
function serve(root: string, base: string): Promise<Server> {
    const prefix = base.endsWith("/") ? base : `${base}/`;
    const server = createServer((req, res) => {
        const path = decodeURIComponent((req.url ?? "/").split("?")[0]);
        if (!path.startsWith(prefix)) return void res.writeHead(404).end();
        let file = normalize(join(root, path.slice(prefix.length)));
        if (file !== root && !file.startsWith(root.endsWith(sep) ? root : root + sep)) return void res.writeHead(403).end();
        if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
        if (!existsSync(file)) return void res.writeHead(404).end();
        res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
        createReadStream(file).pipe(res);
    });
    return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

/**
 * Imprime `<base><path>` de la build en `root` a un PDF A4 en `out`. Espera a las fuentes y a las
 * imágenes: con fuentes de reserva el CV cambiaría de tamaño. Devuelve el número de páginas.
 */
export async function renderCvPdf(opts: { root: string; base: string; path: string; out: string }): Promise<{ pages: number }> {
    let chromium: typeof import("@playwright/test").chromium;
    try {
        ({ chromium } = await import("@playwright/test"));
    } catch {
        throw new Error("Falta Playwright para generar el CV: pnpm install");
    }
    const server = await serve(normalize(opts.root), opts.base);
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    try {
        try {
            browser = await chromium.launch();
        } catch (e) {
            throw new Error(`Falta Chromium para generar el CV: pnpm exec playwright install chromium\n${(e as Error).message}`);
        }
        const page = await browser.newPage();
        const { port } = server.address() as AddressInfo;
        const prefix = opts.base.endsWith("/") ? opts.base : `${opts.base}/`;
        const res = await page.goto(`http://127.0.0.1:${port}${prefix}${opts.path}`, { waitUntil: "networkidle" });
        if (!res?.ok()) throw new Error(`No se pudo abrir ${prefix}${opts.path} para el CV (${res?.status()})`);
        await page.evaluate(() => document.fonts.ready);
        const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, path: opts.out });
        return { pages: countPdfPages(pdf) };
    } finally {
        await browser?.close();
        await new Promise((resolve) => server.close(resolve));
    }
}
