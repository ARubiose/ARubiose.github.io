import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

for (const path of ["/", "/en/"]) {
    test(`portada ${path}`, async ({ page }) => {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        // El aviso de analítica depende del token del entorno: fuera, las capturas valen con y sin él.
        await page.addStyleTag({ content: "[data-analytics-note] { display: none !important; }" });
        await expect(page).toHaveScreenshot({ fullPage: true, animations: "disabled", maxDiffPixelRatio: 0.01 });
    });
}
