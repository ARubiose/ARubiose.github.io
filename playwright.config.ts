import { defineConfig, devices } from "@playwright/test";

const PORT = 4322;
// Las mismas variables que ve la build (.env), para que los tests sepan si la analítica debe estar.
try { process.loadEnvFile(); } catch { /* sin .env: solo el entorno */ }
// Proyectos por skin: la skin ya está guardada en localStorage antes de cargar la página.
const stored = (skin: string) => ({ cookies: [], origins: [{ origin: `http://127.0.0.1:${PORT}`, localStorage: [{ name: "skin", value: skin }] }] });
const desktop = { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } };
// Los e2e corren sobre Ada (tests/fixtures/site), en su propio outDir (el dist/ real no se toca)
// y con fecha fija, para que la XP y las capturas no cambien con el paso del tiempo.
const FIXTURE_ENV = "WIKI_DIR=tests/fixtures/site OUT_DIR=.fixture-dist SITE_URL=https://ada.example BASE_PATH=/ BUILD_DATE=2026-10";
const mobile = { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

export default defineConfig({
    testDir: "tests/e2e",
    // Si la build lleva el token de analítica, las pruebas no deben contar como visitas.
    use: { baseURL: `http://127.0.0.1:${PORT}`, launchOptions: { args: ["--host-resolver-rules=MAP static.cloudflareinsights.com ~NOTFOUND"] } },
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
        command: `${FIXTURE_ENV} pnpm build && ${FIXTURE_ENV} pnpm preview --host 127.0.0.1 --port ${PORT} --ignore-lock`,
        url: `http://127.0.0.1:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
