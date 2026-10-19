import { readFileSync } from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

/** Páginas y texto visible (en orden de lectura) de un PDF. */
export async function readPdf(path: string): Promise<{ pages: number; text: string[] }> {
    const doc = await getDocument({ data: new Uint8Array(readFileSync(path)), useSystemFonts: false }).promise;
    const text: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
        const content = await (await doc.getPage(i)).getTextContent();
        text.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" ").replace(/\s+/g, " "));
    }
    return { pages: doc.numPages, text };
}
