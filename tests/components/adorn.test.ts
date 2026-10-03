import { expect, test } from "vitest";
import Adorn from "@components/Adorn.astro";
import { render } from "../support/render";

test("pinta un span oculto a lectores por cada skin que define el adorno", async () => {
    const html = await render(Adorn, { props: { name: "heroKicker", locale: "es", class: "k" } });
    expect(html).toMatch(/<span aria-hidden="true" data-for-skin="terminal" class="k">whoami<\/span>/);
});

test("sustituye variables", async () => {
    const html = await render(Adorn, { props: { name: "handle", locale: "en", vars: { handle: "ada", callsign: "ADA" } } });
    expect(html).toContain(">ada@portfolio:~$<");
});

test("solo pinta las skins que definen el adorno", async () => {
    const html = await render(Adorn, { props: { name: "menuMark", locale: "es" } });
    expect(html.match(/data-for-skin="[^"]+"/g)).toEqual(['data-for-skin="terminal"']);
});
