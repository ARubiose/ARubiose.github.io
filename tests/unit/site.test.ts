import { describe, expect, test } from "vitest";
import { buildDirs, pagesTarget } from "@lib/site";

describe("pagesTarget", () => {
    test("repo de usuario <owner>.github.io: raíz", () => {
        expect(pagesTarget({ GITHUB_REPOSITORY: "ada/ada.github.io" })).toEqual({ site: "https://ada.github.io", base: "/" });
    });

    test("sin distinguir mayúsculas y con el owner en minúsculas", () => {
        expect(pagesTarget({ GITHUB_REPOSITORY: "ARubiose/ARubiose.github.io" })).toEqual({ site: "https://arubiose.github.io", base: "/" });
    });

    test("cualquier otro repo: subruta /<repo>/", () => {
        expect(pagesTarget({ GITHUB_REPOSITORY: "ARubiose/llm-wiki-portfolio" })).toEqual({ site: "https://arubiose.github.io", base: "/llm-wiki-portfolio/" });
    });

    test("SITE_URL y BASE_PATH tienen prioridad y se normalizan", () => {
        expect(pagesTarget({ SITE_URL: "https://ada.dev/", BASE_PATH: "demo", GITHUB_REPOSITORY: "a/b" })).toEqual({ site: "https://ada.dev", base: "/demo/" });
    });

    test("SITE_URL sin BASE_PATH: raíz", () => {
        expect(pagesTarget({ SITE_URL: "https://ada.dev", GITHUB_REPOSITORY: "a/b" })).toEqual({ site: "https://ada.dev", base: "/" });
    });

    test("sin entorno (desarrollo local): localhost", () => {
        expect(pagesTarget({})).toEqual({ site: "http://localhost:4321", base: "/" });
    });
});

describe("buildDirs", () => {
    test("por defecto: wiki/public, dist y la caché de Astro de siempre", () => {
        expect(buildDirs({})).toEqual({ wikiDir: "./wiki/public", outDir: "./dist", cacheDir: "./node_modules/.astro" });
    });

    test("otro WIKI_DIR usa su propia caché para no mezclar colecciones", () => {
        expect(buildDirs({ WIKI_DIR: "tests/fixtures/site", OUT_DIR: ".fixture-dist" })).toEqual({
            wikiDir: "./tests/fixtures/site",
            outDir: "./.fixture-dist",
            cacheDir: "./node_modules/.astro-tests-fixtures-site",
        });
    });

    test("las rutas absolutas se respetan", () => {
        expect(buildDirs({ OUT_DIR: "/tmp/base-x/" }).outDir).toBe("/tmp/base-x");
    });
});
