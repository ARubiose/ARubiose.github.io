import type { Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";
import { monthIndex } from "./dates";
export { BUILD_CAP, isBrokenBuild, rankCombination } from "./build";

export type Span = { start: string; end: string | null };
type WithSkills = { id: string; skills?: string[] };

// Un fin solo con año (`end: 2020`) cuenta como diciembre, no como enero.
const endIndex = (end: string) => monthIndex(/^\d{4}$/.test(end) ? `${end}-12` : end);

export function monthsCovered(spans: Span[], now: string): number {
    const covered = new Set<number>();
    for (const { start, end } of spans) {
        for (let m = monthIndex(start); m < endIndex(end ?? now); m++) covered.add(m);
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



export function findBrokenSkillRefs(entries: WithSkills[], skillIds: string[]) {
    const known = new Set(skillIds);
    return entries.flatMap((e) => (e.skills ?? []).filter((s) => !known.has(s)).map((skill) => ({ entry: e.id, skill })));
}
