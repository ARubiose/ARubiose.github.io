import { describe, expect, test } from "vitest";
import { buildDirs, buildMonth, pagesTarget } from "@lib/site";

describe("pagesTarget", () => {
    test("repo de usuario <owner>.github.io: raíz", () => {
        expect(pagesTarget({ GITHUB_REPOSITORY: "ada/ada.github.io" })).toEqual({ site: "https://ada.github.io", base: "/" });
    });

    test("sin distinguir mayúsculas y con el owner en minúsculas", () => {
        expect(pagesTarget({ GITHUB_REPOSITORY: "AdaExample/AdaExample.GitHub.io" })).toEqual({ site: "https://adaexample.github.io", base: "/" });
    });

    test("cualquier otro repo: subruta /<repo>/", () => {
        expect(pagesTarget({ GITHUB_REPOSITORY: "AdaExample/llm-wiki-portfolio" })).toEqual({ site: "https://adaexample.github.io", base: "/llm-wiki-portfolio/" });
    });

    test("la base conserva las mayúsculas del repo (la ruta de Pages las respeta)", () => {
        expect(pagesTarget({ GITHUB_REPOSITORY: "AdaExample/My-Portfolio" })).toEqual({ site: "https://adaexample.github.io", base: "/My-Portfolio/" });
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

describe("buildMonth", () => {
    test("sin BUILD_DATE, el mes de la fecha dada (AAAA-MM)", () => {
        expect(buildMonth({}, new Date("2027-03-15T12:00:00Z"))).toBe("2027-03");
    });

    test("BUILD_DATE la fija: el fixture de los e2e no envejece", () => {
        expect(buildMonth({ BUILD_DATE: "2026-10" }, new Date("2030-01-01T00:00:00Z"))).toBe("2026-10");
    });

    test("un BUILD_DATE mal escrito falla en vez de calcular con basura", () => {
        expect(() => buildMonth({ BUILD_DATE: "oct 2026" })).toThrow(/BUILD_DATE/);
    });
});
