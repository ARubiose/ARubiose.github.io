import { defineConfig, devices } from "@playwright/test";

const PORT = 4322;
// Proyectos por skin: la skin ya está guardada en localStorage antes de cargar la página.
const stored = (skin: string) => ({ cookies: [], origins: [{ origin: `http://127.0.0.1:${PORT}`, localStorage: [{ name: "skin", value: skin }] }] });
const desktop = { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } };
const mobile = { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

export default defineConfig({
    testDir: "tests/e2e",
    use: { baseURL: `http://127.0.0.1:${PORT}` },
    projects: [
        { name: "desktop", use: desktop },
        { name: "mobile", use: mobile },
        { name: "desktop-tactical", use: { ...desktop, storageState: stored("tactical") } },
        { name: "mobile-tactical", use: { ...mobile, storageState: stored("tactical") } },
        { name: "desktop-game", use: { ...desktop, storageState: stored("game") } },
        { name: "mobile-game", use: { ...mobile, storageState: stored("game") } },
    ],
    // --ignore-lock: Astro 7 lanza el preview en segundo plano si detecta un agente de IA.
    webServer: {
        command: `pnpm build && pnpm preview --host 127.0.0.1 --port ${PORT} --ignore-lock`,
        url: `http://127.0.0.1:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
