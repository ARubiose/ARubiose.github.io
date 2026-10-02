import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { expect, test } from "vitest";
import Header from "@components/Header.astro";

const urls = { es: "/", en: "/en/" };

test("enlaza solo las secciones recibidas", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Header, {
        props: { locale: "es", urls, sections: [{ id: "experience", label: "Experiencia" }] },
    });
    expect(html).toContain('href="#experience"');
    expect(html).not.toContain('href="#projects"');
});

test("el selector marca el idioma actual y enlaza al otro", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Header, {
        props: { locale: "en", urls, sections: [] },
    });
    expect(html).toMatch(/<a[^>]*href="\/"[^>]*hreflang="es"/);
    expect(html).toMatch(/aria-current="true"[^>]*>English|>English<\/span>/);
});
