import { expect, test } from "vitest";
import { countPdfPages } from "../../src/lib/cv-pdf";

// PDF mínimo escrito a mano: un árbol /Pages con n hojas /Page.
const pdf = (pages: number) =>
    new TextEncoder().encode(
        `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Count ${pages} /Kids [] >> endobj\n` +
            Array.from({ length: pages }, (_, i) => `${i + 3} 0 obj << /Type /Page /Parent 2 0 R >> endobj\n`).join("") +
            "%%EOF\n",
    );

test("countPdfPages cuenta las hojas /Page y no el árbol /Pages", () => {
    expect(countPdfPages(pdf(1))).toBe(1);
    expect(countPdfPages(pdf(2))).toBe(2);
});

test("countPdfPages tolera la forma compacta /Type/Page", () => {
    expect(countPdfPages(new TextEncoder().encode("<</Type/Pages>> <</Type/Page>> <</Type/Page/Parent 2 0 R>>"))).toBe(2);
});
