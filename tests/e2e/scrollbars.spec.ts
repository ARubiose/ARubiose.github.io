import { expect, test } from "@playwright/test";
import { skinOf } from "./support";

// Chromium sin interfaz oculta las barras de desplazamiento: aquí se muestran, como en Windows o Linux,
// donde 100vw incluye la barra y un elemento que lo use ensancha la página.
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] }, reducedMotion: "reduce" });

test("con barras de desplazamiento clásicas, la página no se ensancha", async ({ page }, info) => {
    test.skip(!info.project.name.startsWith("desktop"));
    await page.goto("/");
    const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(client, `skin ${skinOf(info.project.name)}: hay barra visible`).toBeLessThan(1280);
    expect(scroll).toBeLessThanOrEqual(client);
});
