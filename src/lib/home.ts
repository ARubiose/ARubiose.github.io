import type { Locale } from "@i18n/ui";
import { localize, useTranslations, type Localized } from "@i18n/utils";
import { formatPeriod } from "./dates";
import { groupSkills, sortByStartDesc } from "./order";
import type { EducationData, ExperienceData, ProfileData, ProjectData, SkillCategory, SkillData } from "./schemas";
import { formatXp, formatXpShort, monthsCovered, skillUsage, type Span } from "./skills";

export type SectionId = "experience" | "projects" | "skills" | "education" | "contact";
export type Entry<T> = { id: string; data: T };
export type HomeData = {
    profile: ProfileData;
    experience: Entry<ExperienceData>[];
    projects: Entry<ProjectData>[];
    skills: Entry<SkillData>[];
    education: Entry<EducationData>[];
};
export type TimelineView = {
    id: string; file: string; title: string; subtitle: string;
    start: string; end: string | null; period: string; current: boolean; duration: string;
    summary: string; highlights: string[]; note?: string;
};
export type ProjectView = Localized<ProjectData> & { id: string; file: string; statusLabel: string };
export type SkillView = {
    id: string; title: string; summary: string; icon: string; category: SkillCategory;
    months: number; xp: string; xpShort: string; since: number | null;
    usedIn: { id: string; name: string; role: string }[];
};
export type HomeView = {
    profile: Localized<ProfileData>;
    experience: TimelineView[];
    education: TimelineView[];
    projects: ProjectView[];
    skillGroups: { category: SkillCategory; label: string; items: SkillView[] }[];
    professionalXp: string;
    usage: Record<string, string[]>;
    entryNames: Record<string, string>;
    siteRepo: string; // repo de este sitio (links.source) o el GitHub del perfil
    sections: { id: SectionId; label: string }[];
};

/** Usuario del prompt de terminal: primer nombre, en minúsculas y sin tildes. */
export function handleFromName(name: string): string {
    return (name.trim().split(/\s+/)[0] ?? "").normalize("NFD").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export function displayUrl(url: string): string {
    return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

const byStart = <T extends { data: { start: string; end?: string | null } }>(entries: T[]) =>
    sortByStartDesc(entries, (e) => ({ start: e.data.start, end: e.data.end ?? null }));

export function buildHomeView(data: HomeData, locale: Locale, now: string): HomeView {
    const t = useTranslations(locale);

    const experience = byStart(data.experience).map(({ id, data: d }): TimelineView => {
        const l = localize(d, locale);
        return {
            id, file: `${id}.log`, title: l.role, subtitle: l.company,
            start: l.start, end: l.end, period: formatPeriod(l.start, l.end, locale), current: l.end === null,
            duration: l.end === null ? "" : formatXp(monthsCovered([{ start: l.start, end: l.end }], now), locale),
            summary: l.summary, highlights: l.highlights,
        };
    });

    const education = byStart(data.education).map(({ id, data: d }): TimelineView => {
        const l = localize(d, locale);
        return {
            id, file: `${id}.md`, title: l.degree, subtitle: l.institution,
            start: l.start, end: l.end, period: formatPeriod(l.start, l.end, locale), current: l.end === null, duration: "",
            summary: l.summary, highlights: [],
            note: l.grade ? `${t("education.grade")}: ${l.grade}` : undefined,
        };
    });

    const projects = byStart(data.projects).map(({ id, data: d }): ProjectView => {
        const l = localize(d, locale);
        return { ...l, id, file: `${l.repo.split("/").filter(Boolean).pop()?.replace(/\.git$/, "")}/README.md`, statusLabel: t(`projects.status.${l.status}`) };
    });

    // Ids con prefijo por tipo: un puesto y un proyecto pueden compartir nombre de archivo.
    const spans: Record<string, Span & { name: string; role: string }> = {};
    for (const { id, data: d } of data.experience) {
        spans[`experience/${id}`] = { start: d.start, end: d.end, name: d.company, role: localize(d, locale).role };
    }
    for (const { id, data: d } of data.projects) {
        spans[`project/${id}`] = { start: d.start, end: null, name: d.title, role: t("projects.kind") };
    }
    const entriesWithSkills = [
        ...data.experience.map((e) => ({ id: `experience/${e.id}`, skills: e.data.skills })),
        ...data.projects.map((e) => ({ id: `project/${e.id}`, skills: e.data.skills })),
    ];
    const usage = skillUsage(entriesWithSkills);

    const skillViews: SkillView[] = data.skills.map(({ id, data: d }) => {
        const l = localize(d, locale);
        const used = (usage[id] ?? []).map((eid) => ({ id: eid, ...spans[eid] }));
        const months = monthsCovered(used, now);
        return {
            id, title: l.title, summary: l.summary, icon: l.icon, category: l.category,
            months, xp: formatXp(months, locale), xpShort: formatXpShort(months, locale),
            since: used.length ? Math.min(...used.map((u) => Number(u.start.slice(0, 4)))) : null,
            usedIn: sortByStartDesc(used).map((u) => ({ id: u.id, name: u.name, role: u.role })),
        };
    });
    const skillGroups = groupSkills(skillViews).map((g) => ({ ...g, label: t(`skills.category.${g.category}`) }));

    const professionalXp = formatXpShort(monthsCovered(data.experience.map((e) => e.data), now), locale);
    const entryNames = Object.fromEntries(Object.entries(spans).map(([id, s]) => [id, s.name]));

    const counts: Record<SectionId, number> = {
        experience: experience.length, projects: projects.length, skills: skillGroups.length,
        education: education.length, contact: 1,
    };
    const sections = (Object.keys(counts) as SectionId[])
        .filter((id) => counts[id] > 0)
        .map((id) => ({ id, label: t(`section.${id}`) }));

    return {
        profile: localize(data.profile, locale), experience, education, projects, skillGroups,
        professionalXp, usage, entryNames, siteRepo: data.profile.links.source ?? data.profile.links.github, sections,
    };
}
