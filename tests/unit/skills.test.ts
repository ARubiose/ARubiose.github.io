import { describe, expect, test } from "vitest";
import {
    BUILD_CAP,
    findBrokenSkillRefs,
    formatXp,
    formatXpShort,
    isBrokenBuild,
    monthsCovered,
    rankCombination,
    skillUsage,
} from "@lib/skills";

const NOW = "2026-10";

describe("monthsCovered", () => {
    test("cuenta los meses de un periodo cerrado (fin exclusivo)", () => {
        expect(monthsCovered([{ start: "2020-01", end: "2020-07" }], NOW)).toBe(6);
    });

    test("un periodo vigente cuenta hasta la fecha del build", () => {
        expect(monthsCovered([{ start: "2026-06", end: null }], NOW)).toBe(4);
    });

    test("no suma meses solapados", () => {
        const spans = [
            { start: "2022-08", end: "2026-06" },
            { start: "2025-01", end: null },
        ];
        expect(monthsCovered(spans, NOW)).toBe(monthsCovered([{ start: "2022-08", end: null }], NOW));
    });

    test("un fin solo con año cuenta como diciembre", () => {
        expect(monthsCovered([{ start: "2020-06", end: "2020" }], NOW)).toBe(
            monthsCovered([{ start: "2020-06", end: "2020-12" }], NOW),
        );
        expect(monthsCovered([{ start: "2020-06", end: "2020" }], NOW)).toBeGreaterThan(0);
    });

    test("sin periodos son 0 meses", () => {
        expect(monthsCovered([], NOW)).toBe(0);
    });
});

describe("skillUsage", () => {
    test("invierte entradas → habilidades en habilidad → entradas", () => {
        expect(
            skillUsage([
                { id: "zalcu", skills: ["python", "docker"] },
                { id: "gofore", skills: ["python"] },
                { id: "oesia" },
            ]),
        ).toEqual({ python: ["zalcu", "gofore"], docker: ["zalcu"] });
    });
});

describe("formatXp", () => {
    test("largo en español e inglés", () => {
        expect(formatXp(46, "es")).toBe("3 años y 10 meses");
        expect(formatXp(46, "en")).toBe("3 years 10 months");
        expect(formatXp(12, "es")).toBe("1 año");
        expect(formatXp(1, "en")).toBe("1 month");
    });

    test("0 meses es «sin uso registrado»", () => {
        expect(formatXp(0, "es")).toBe("sin uso registrado");
        expect(formatXp(0, "en")).toBe("no recorded use");
    });

    test("corto con decimales según el idioma", () => {
        expect(formatXpShort(46, "es")).toBe("3,8 años");
        expect(formatXpShort(46, "en")).toBe("3.8 years");
        expect(formatXpShort(6, "es")).toBe("6 meses");
        expect(formatXpShort(0, "es")).toBe("sin uso registrado");
    });
});

describe("rankCombination", () => {
    const usage = { fastapi: ["skin-ai", "zalcu"], celery: ["zalcu"], docker: ["zalcu"], expo: ["skin-ai"] };

    test("ordena por aciertos y omite entradas sin ninguno", () => {
        expect(rankCombination(["fastapi", "celery", "docker"], usage)).toEqual([
            { id: "zalcu", hits: 3 },
            { id: "skin-ai", hits: 1 },
        ]);
    });

    test("empate: conserva el orden de aparición", () => {
        expect(rankCombination(["expo", "celery"], usage)).toEqual([
            { id: "skin-ai", hits: 1 },
            { id: "zalcu", hits: 1 },
        ]);
    });

    test("build vacía o habilidades sin uso → lista vacía", () => {
        expect(rankCombination([], usage)).toEqual([]);
        expect(rankCombination(["llm-agents"], usage)).toEqual([]);
    });
});

describe("isBrokenBuild", () => {
    test(`hasta ${BUILD_CAP} no está roto; a partir de ${BUILD_CAP + 1} sí`, () => {
        expect(BUILD_CAP).toBe(6);
        expect(isBrokenBuild(6)).toBe(false);
        expect(isBrokenBuild(7)).toBe(true);
    });
});

describe("findBrokenSkillRefs", () => {
    test("lista cada referencia a una habilidad inexistente", () => {
        expect(
            findBrokenSkillRefs(
                [
                    { id: "zalcu", skills: ["python", "cobol"] },
                    { id: "oesia", skills: ["osint"] },
                    { id: "gofore" },
                ],
                ["python", "osint"],
            ),
        ).toEqual([{ entry: "zalcu", skill: "cobol" }]);
    });
});
