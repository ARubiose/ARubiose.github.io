import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { expect, test } from "vitest";
import Hello from "../fixtures/components/Hello.astro";

test("la Container API renderiza un componente con props", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Hello, { props: { name: "Ada" } });
    expect(html).toContain("Hola, Ada");
});
