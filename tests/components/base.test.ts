import { expect, test } from "vitest";
import Icon from "@components/Icon.astro";
import Window from "@components/Window.astro";
import { render } from "../support/render";

test("Icon pinta el SVG en línea y oculto a lectores", async () => {
    const html = await render(Icon, { props: { name: "si:python" } });
    expect(html).toMatch(/<span class="icon[^"]*"><svg[^>]*aria-hidden="true"/);
});

test("Window pinta barra con archivo (oculto a lectores), etiqueta y contenido", async () => {
    const html = await render(Window, {
        props: { file: "zalcu.log", tag: "EN CURSO" },
        slots: { default: "<p>Contenido</p>" },
    });
    expect(html).toContain('class="window');
    expect(html).toMatch(/<span aria-hidden="true" class="window-file">zalcu\.log<\/span>/);
    expect(html).toContain("EN CURSO");
    expect(html).toContain("<p>Contenido</p>");
});
