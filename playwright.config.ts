import { defineConfig, devices } from "@playwright/test";

const PORT = 4322;

export default defineConfig({
    testDir: "tests/e2e",
    use: { baseURL: `http://127.0.0.1:${PORT}` },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    // --ignore-lock: Astro 7 lanza el preview en segundo plano si detecta un agente de IA.
    webServer: {
        command: `pnpm build && pnpm preview --host 127.0.0.1 --port ${PORT} --ignore-lock`,
        url: `http://127.0.0.1:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
