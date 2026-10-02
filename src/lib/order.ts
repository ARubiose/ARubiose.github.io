import { compareYearMonth } from "./dates";
import { skillCategories, type SkillCategory } from "./schemas";

export function sortByStartDesc<T extends { start: string; end?: string | null }>(items: T[]): T[] {
    return [...items].sort((a, b) => {
        const byStart = compareYearMonth(b.start, a.start);
        if (byStart !== 0) return byStart;
        return Number(b.end === null) - Number(a.end === null);
    });
}

export function groupSkills<T extends { category: SkillCategory; title: string }>(skills: T[]) {
    return skillCategories
        .map((category) => ({
            category,
            items: skills
                .filter((s) => s.category === category)
                .sort((a, b) => a.title.localeCompare(b.title, "es")),
        }))
        .filter((group) => group.items.length > 0);
}
