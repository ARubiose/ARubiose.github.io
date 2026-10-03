import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

test("modo single en escritorio: eje a la izquierda y todas las tarjetas a su derecha, en una columna", async ({ page }, info) => {
    test.skip(!info.project.name.startsWith("desktop"));
    await page.goto("/");
    await page.evaluate(() => (document.documentElement.dataset.timeline = "single"));
    // Con movimiento reducido todo cambio de estilo es una transición de 0,01 ms: se espera a que asiente.
    await expect(async () => {
        const rail = (await page.locator("#experience .timeline-rail").boundingBox())!;
        const xs = await page.locator("#experience .t-card").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x)));
        expect(xs.length).toBeGreaterThan(1);
        for (const x of xs) expect(x).toBeGreaterThan(rail.x + rail.width);
        expect(new Set(xs).size).toBe(1);
    }).toPass({ timeout: 2000 });
});

test("modo alternate (Terminal) en escritorio: tarjetas a ambos lados del eje", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.goto("/");
    const rail = (await page.locator("#experience .timeline-rail").boundingBox())!;
    const xs = await page.locator("#experience .t-card").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().x));
    expect(xs.some((x) => x < rail.x)).toBe(true);
    expect(xs.some((x) => x > rail.x)).toBe(true);
});
