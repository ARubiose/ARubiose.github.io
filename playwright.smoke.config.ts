import { defineConfig, devices } from "@playwright/test";
import { pagesTarget } from "./src/lib/site";

// Smoke sobre el contenido REAL (wiki/public) y el dist/ que se publica, con la base de verdad.
const PORT = 4323;
const { base } = pagesTarget(process.env);
try { process.loadEnvFile(); } catch { /* sin .env: solo el entorno */ }

export default defineConfig({
    testDir: "tests/smoke",
    testMatch: "**/*.smoke.ts",
    use: { baseURL: `http://127.0.0.1:${PORT}${base}`, launchOptions: { args: ["--host-resolver-rules=MAP static.cloudflareinsights.com ~NOTFOUND"] } },
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
        { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    ],
    // --ignore-lock: Astro 7 lanza el preview en segundo plano si detecta un agente de IA.
    webServer: {
        command: `pnpm build && pnpm preview --host 127.0.0.1 --port ${PORT} --ignore-lock`,
        url: `http://127.0.0.1:${PORT}${base}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
