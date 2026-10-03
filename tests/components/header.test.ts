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
    const html = clean(await container.renderToString(Header, { props: { locale: "es", urls, sections: [], handle: "ada", callsign: "ADA" } }));
    expect(html).toMatch(/data-for-skin="terminal"[^>]*>ada@portfolio:~\$</);
    expect(html).not.toContain("alvaro@");
});

test("selector de skin en la cabecera y en el menú: oculto sin JS, un botón por skin", async () => {
    const container = await AstroContainer.create();
    const html = clean(await container.renderToString(Header, { props: { locale: "es", urls, sections: [] } }));
    expect(html.match(/data-skin-switcher[^>]*hidden|hidden[^>]*data-skin-switcher/g)).toHaveLength(2);
    expect(html.match(/data-skin-option="terminal"/g)).toHaveLength(2);
    expect(html.match(/data-skin-option="tactical"/g)).toHaveLength(2);
    expect(html).toMatch(/role="group"[^>]*aria-label="Skin"/);
    expect(html.match(/data-skin-status/g)).toHaveLength(1);
});
