import { expect, test, type Page } from "@playwright/test";

const equip = (page: Page, id: string) => page.locator(`[data-equip="${id}"]`).click();
const tab = (page: Page, cat: string) => page.locator(`[data-tab="${cat}"]`).click();
const inspectTitle = async (page: Page, project: string) =>
    page.locator(project === "mobile" ? "[data-sheet-body] .detail-head p" : "[data-inspector-body] .detail-head p").first();

test.describe("creador de personaje", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.locator("#skills").scrollIntoViewIfNeeded();
    });

    test("cambiar de pestaña muestra su panel e inspecciona su primera habilidad", async ({ page }, info) => {
        test.skip(info.project.name.startsWith("mobile"), "en móvil el inspector solo se abre al tocar");
        await tab(page, "devops");
        await expect(page.locator('[data-panel="devops"]')).toBeVisible();
        await expect(page.locator('[data-panel="backend"]')).toBeHidden();
        const title = await inspectTitle(page, info.project.name.startsWith("mobile") ? "mobile" : "desktop");
        await expect(title).toHaveText("Docker");
        await expect(title).toBeVisible();
        await expect(page.locator("[data-inspector-body] .skill-detail")).toBeVisible();
    });

    test("+ equipa, la build sobrevive al cambio de pestaña y se quita desde la ficha", async ({ page }) => {
        await equip(page, "fastapi");
        await tab(page, "devops");
        await equip(page, "docker");
        await expect(page.locator("[data-count]")).toHaveText("2 / 6");
        await page.locator('[data-slots] [data-unequip="fastapi"]').click();
        await expect(page.locator("[data-count]")).toHaveText("1 / 6");
        await tab(page, "backend");
        await expect(page.locator('[data-equip="fastapi"]')).toHaveAttribute("aria-pressed", "false");
    });

    test("FastAPI + Celery + Docker se combinaron en Zalcu (3/3)", async ({ page }) => {
        await equip(page, "fastapi");
        await equip(page, "celery");
        await tab(page, "devops");
        await equip(page, "docker");
        await expect(page.locator("[data-combo] .combo-row").first()).toContainText("Zalcu Technologies");
        await expect(page.locator("[data-combo] .combo-row").first()).toContainText("3/3");
    });

    test("el botón de equipar mantiene su etiqueta y solo cambia aria-pressed", async ({ page }) => {
        const button = page.locator('[data-equip="fastapi"]');
        const label = await button.getAttribute("aria-label");
        await equip(page, "fastapi");
        await expect(button).toHaveAttribute("aria-pressed", "true");
        await expect(button).toHaveAttribute("aria-label", label!);
    });

    test("una build sin entradas en común lo dice en vez de quedar vacía", async ({ page }) => {
        // Sirve la portada con Python sin usos registrados.
        await page.route("/", async (route) => {
            const response = await route.fetch();
            const body = (await response.text()).replace('"python":[', '"python-unused":[');
            await route.fulfill({ response, body });
        });
        await page.goto("/");
        await page.locator("#skills").scrollIntoViewIfNeeded();
        await equip(page, "python");
        await expect(page.locator("[data-combo] .combo-row")).toHaveCount(0);
        await expect(page.locator("[data-combo]")).toContainText("Ninguna entrada");
    });

    test("con 7 habilidades el personaje está roto; con 6 no", async ({ page }) => {
        for (const id of ["python", "fastapi", "django", "celery", "redis", "software-architecture"]) await equip(page, id);
        await expect(page.locator("[data-broken] .broken")).toHaveCount(0);
        await tab(page, "devops");
        await equip(page, "docker");
        await expect(page.locator("[data-broken] .broken")).toContainText("Personaje roto");
        await expect(page.locator("[data-count]")).toHaveText("7 / 6");
        await equip(page, "docker");
        await expect(page.locator("[data-broken] .broken")).toHaveCount(0);
    });

    test("pestañas con teclado (flechas)", async ({ page }) => {
        await page.locator('[data-tab="backend"]').focus();
        await page.keyboard.press("ArrowRight");
        await expect(page.locator('[data-tab="ai"]')).toBeFocused();
        await expect(page.locator('[data-tab="ai"]')).toHaveAttribute("aria-selected", "true");
    });

    test("móvil: tocar una habilidad abre el panel inferior y equipa desde él", async ({ page }, info) => {
        test.skip(!info.project.name.startsWith("mobile"));
        await page.locator('[data-inspect="python"]').click();
        const sheet = page.locator("[data-sheet]");
        await expect(sheet).toBeVisible();
        await expect(sheet.locator(".detail-head p").first()).toHaveText("Python");
        await expect(sheet.locator(".skill-detail")).toBeVisible();
        await sheet.locator("[data-sheet-equip]").click();
        await expect(page.locator('[data-equip="python"]')).toHaveAttribute("aria-pressed", "true");
        await sheet.locator("[data-sheet-close]").click();
        await expect(sheet).toBeHidden();
    });

    test("móvil: flechas de scroll según la posición de las pestañas", async ({ page }, info) => {
        test.skip(!info.project.name.startsWith("mobile"));
        const bar = page.locator("[data-tabbar]");
        await expect(bar).toHaveAttribute("data-more-r", "");
        await expect(bar).not.toHaveAttribute("data-more-l", "");
        await page.locator(".edge-r .edge-btn").click();
        await expect(bar).toHaveAttribute("data-more-l", "");
    });
});
