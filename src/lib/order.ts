import { sortKey } from "./dates";
import { skillCategories, type SkillCategory } from "./schemas";

type Period = { start: string; end?: string | null };

export function sortByStartDesc<T extends Period>(items: T[]): T[];
export function sortByStartDesc<T>(items: T[], period: (item: T) => Period): T[];
export function sortByStartDesc<T>(items: T[], period = (item: T) => item as Period): T[] {
    return [...items].sort((a, b) => {
        const pa = period(a);
        const pb = period(b);
        const byStart = sortKey(pb.start) - sortKey(pa.start);
        if (byStart !== 0) return byStart;
        return Number(pb.end === null) - Number(pa.end === null);
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
