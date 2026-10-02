import { expect, test } from "vitest";
import { groupSkills, sortByStartDesc } from "@lib/order";

test("ordena por inicio descendente", () => {
    const items = [{ start: "2020-01" }, { start: "2026-06" }, { start: "2022-08" }];
    expect(sortByStartDesc(items).map((i) => i.start)).toEqual(["2026-06", "2022-08", "2020-01"]);
});

test("a igual inicio, lo vigente (end null) va primero", () => {
    const items = [
        { start: "2022", end: "2023" },
        { start: "2022", end: null },
    ];
    expect(sortByStartDesc(items)[0].end).toBeNull();
});

test("no muta el array original", () => {
    const items = [{ start: "2020" }, { start: "2026" }];
    sortByStartDesc(items);
    expect(items[0].start).toBe("2020");
});

test("agrupa por categoría en orden fijo, omite las vacías y ordena por título", () => {
    const skills = [
        { category: "devops" as const, title: "Docker" },
        { category: "backend" as const, title: "Python" },
        { category: "backend" as const, title: "FastAPI" },
    ];
    expect(groupSkills(skills)).toEqual([
        { category: "backend", items: [skills[2], skills[1]] },
        { category: "devops", items: [skills[0]] },
    ]);
});
