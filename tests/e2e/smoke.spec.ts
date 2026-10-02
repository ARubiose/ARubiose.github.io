import { expect, test } from "@playwright/test";

test("la portada responde", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
});
