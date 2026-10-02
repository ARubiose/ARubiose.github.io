import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

for (const path of ["/", "/en/"]) {
    test(`portada ${path}`, async ({ page }) => {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot({ fullPage: true, animations: "disabled", maxDiffPixelRatio: 0.01 });
    });
}
