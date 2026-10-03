import { describe, expect, test } from "vitest";
import { compareYearMonth, formatPeriod, monthIndex, toDatetime, yearMonth } from "@lib/dates";

describe("yearMonth", () => {
    test("acepta AAAA-MM y AAAA como string", () => {
        expect(yearMonth.parse("2026-06")).toBe("2026-06");
        expect(yearMonth.parse("2015")).toBe("2015");
    });

    test("acepta números (YAML lee 2015 como número)", () => {
        expect(yearMonth.parse(2015)).toBe("2015");
    });

    test("rechaza meses imposibles y otros formatos", () => {
        expect(yearMonth.safeParse("2026-13").success).toBe(false);
        expect(yearMonth.safeParse("2026-6").success).toBe(false);
        expect(yearMonth.safeParse("junio 2026").success).toBe(false);
    });
});

test("sin valor da el error por defecto, no el de formato", () => {
    const message = yearMonth.safeParse(undefined).error?.issues[0].message;
    expect(message).toBeDefined();
    expect(message).not.toMatch(/AAAA/);
});

describe("compareYearMonth", () => {
    test("ordena por año y mes", () => {
        expect(compareYearMonth("2022-08", "2026-06")).toBeLessThan(0);
        expect(compareYearMonth("2026-06", "2026-01")).toBeGreaterThan(0);
        expect(compareYearMonth("2026-06", "2026-06")).toBe(0);
    });

    test("si a uno le falta el mes, compara solo el año", () => {
        expect(compareYearMonth("2022", "2022-06")).toBe(0);
        expect(compareYearMonth("2021", "2022-06")).toBeLessThan(0);
    });
});

describe("formatPeriod", () => {
    test("meses abreviados según el idioma", () => {
        expect(formatPeriod("2022-08", "2026-06", "es")).toBe("ago 2022 - jun 2026");
        expect(formatPeriod("2022-08", "2026-06", "en")).toBe("Aug 2022 - Jun 2026");
    });

    test("end null es actualidad", () => {
        expect(formatPeriod("2026-06", null, "es")).toBe("jun 2026 - actualidad");
        expect(formatPeriod("2026-06", null, "en")).toBe("Jun 2026 - present");
    });

    test("solo años", () => {
        expect(formatPeriod("2015", "2020", "es")).toBe("2015 - 2020");
    });

    test("mismo inicio y fin se muestra una vez", () => {
        expect(formatPeriod("2017", "2017", "en")).toBe("2017");
    });

    test("mezcla de año y año-mes", () => {
        expect(formatPeriod("2022-06", "2022", "es")).toBe("jun 2022 - 2022");
    });
});

describe("toDatetime", () => {
    test("devuelve un valor válido para el atributo datetime", () => {
        expect(toDatetime("2026-06")).toBe("2026-06");
        expect(toDatetime("2015")).toBe("2015");
    });
});

describe("monthIndex", () => {
    test("cuenta meses desde el año 0; sin mes es enero", () => {
        expect(monthIndex("2026-06") - monthIndex("2026-01")).toBe(5);
        expect(monthIndex("2015")).toBe(monthIndex("2015-01"));
    });
});
