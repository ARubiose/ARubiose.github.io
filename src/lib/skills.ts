import type { Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";
import { monthIndex } from "./dates";

export type Span = { start: string; end: string | null };
type WithSkills = { id: string; skills?: string[] };

export const BUILD_CAP = 6;

export function monthsCovered(spans: Span[], now: string): number {
    const covered = new Set<number>();
    for (const { start, end } of spans) {
        for (let m = monthIndex(start); m < monthIndex(end ?? now); m++) covered.add(m);
    }
    return covered.size;
}

export function skillUsage(entries: WithSkills[]): Record<string, string[]> {
    const usage: Record<string, string[]> = {};
    for (const entry of entries) {
        for (const skill of entry.skills ?? []) (usage[skill] ??= []).push(entry.id);
    }
    return usage;
}

export function formatXp(months: number, locale: Locale): string {
    const t = useTranslations(locale);
    if (months <= 0) return t("skills.noUse");
    const y = Math.floor(months / 12);
    const m = months % 12;
    const parts = [
        y ? `${y} ${t(y === 1 ? "xp.year" : "xp.years")}` : "",
        m ? `${m} ${t(m === 1 ? "xp.month" : "xp.months")}` : "",
    ].filter(Boolean);
    const joiner = t("xp.and") ? ` ${t("xp.and")} ` : " ";
    return parts.join(joiner);
}

export function formatXpShort(months: number, locale: Locale): string {
    const t = useTranslations(locale);
    if (months <= 0) return t("skills.noUse");
    if (months < 12) return `${months} ${t(months === 1 ? "xp.month" : "xp.months")}`;
    const years = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(months / 12);
    return `${years} ${t("xp.years")}`;
}

export function rankCombination(build: string[], usage: Record<string, string[]>) {
    const order: string[] = [];
    const hits = new Map<string, number>();
    for (const ids of Object.values(usage)) for (const id of ids) if (!order.includes(id)) order.push(id);
    for (const skill of build) for (const id of usage[skill] ?? []) hits.set(id, (hits.get(id) ?? 0) + 1);
    return order
        .filter((id) => hits.has(id))
        .map((id) => ({ id, hits: hits.get(id)! }))
        .sort((a, b) => b.hits - a.hits);
}

export function isBrokenBuild(count: number): boolean {
    return count > BUILD_CAP;
}

export function findBrokenSkillRefs(entries: WithSkills[], skillIds: string[]) {
    const known = new Set(skillIds);
    return entries.flatMap((e) => (e.skills ?? []).filter((s) => !known.has(s)).map((skill) => ({ entry: e.id, skill })));
}
