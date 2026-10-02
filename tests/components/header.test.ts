import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { expect, test } from "vitest";
import Header from "@components/Header.astro";
import { clean } from "../support/render";

const urls = { es: "/", en: "/en/" };

test("enlaza solo las secciones recibidas, en la barra y en el menú móvil", async () => {
    const container = await AstroContainer.create();
    const html = clean(await container.renderToString(Header, {
        props: { locale: "es", urls, sections: [{ id: "experience", label: "Experiencia" }] },
    }));
    expect(html.match(/href="#experience"/g)).toHaveLength(2);
    expect(html).not.toContain('href="#projects"');
    expect(html).toContain('id="site-menu" popover');
    expect(html).toContain('popovertarget="site-menu"');
});

test("el selector marca el idioma actual y enlaza al otro", async () => {
    const container = await AstroContainer.create();
    const html = clean(await container.renderToString(Header, {
        props: { locale: "en", urls, sections: [] },
    }));
    expect(html).toMatch(/<a[^>]*href="\/"[^>]*hreflang="es"/);
    expect(html).toMatch(/<span aria-current="true"[^>]*>EN<\/span>/);
});

test("el prompt usa el handle recibido, no un nombre fijo", async () => {
    const container = await AstroContainer.create();
    const html = clean(await container.renderToString(Header, { props: { locale: "es", urls, sections: [], handle: "ada" } }));
    expect(html).toContain("ada@portfolio:~$");
    expect(html).not.toContain("alvaro@");
});
