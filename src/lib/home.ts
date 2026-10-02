import type { Locale } from "@i18n/ui";
import { localize, useTranslations, type Localized } from "@i18n/utils";
import { formatPeriod } from "./dates";
import { groupSkills, sortByStartDesc } from "./order";
import type {
    EducationData,
    ExperienceData,
    ProfileData,
    ProjectData,
    SkillCategory,
    SkillData,
} from "./schemas";

export type SectionId = "experience" | "projects" | "skills" | "education" | "contact";

export type HomeData = {
    profile: ProfileData;
    experience: ExperienceData[];
    projects: ProjectData[];
    skills: SkillData[];
    education: EducationData[];
};

export type HomeView = {
    profile: Localized<ProfileData>;
    experience: (Localized<ExperienceData> & { period: string })[];
    projects: Localized<ProjectData>[];
    skillGroups: { category: SkillCategory; label: string; items: Localized<SkillData>[] }[];
    education: (Localized<EducationData> & { period: string })[];
    sections: { id: SectionId; label: string }[];
};

export function buildHomeView(data: HomeData, locale: Locale): HomeView {
    const t = useTranslations(locale);
    const withPeriod = <T extends { start: string; end: string | null }>(item: T) => ({
        ...item,
        period: formatPeriod(item.start, item.end, locale),
    });

    const experience = sortByStartDesc(data.experience).map((e) => withPeriod(localize(e, locale)));
    const education = sortByStartDesc(data.education).map((e) => withPeriod(localize(e, locale)));
    const projects = sortByStartDesc(data.projects).map((p) => localize(p, locale));
    const skillGroups = groupSkills(data.skills.map((s) => localize(s, locale))).map((g) => ({
        ...g,
        label: t(`skills.category.${g.category}`),
    }));

    const counts: Record<SectionId, number> = {
        experience: experience.length,
        projects: projects.length,
        skills: skillGroups.length,
        education: education.length,
        contact: 1,
    };
    const sections = (Object.keys(counts) as SectionId[])
        .filter((id) => counts[id] > 0)
        .map((id) => ({ id, label: t(`section.${id}`) }));

    return { profile: localize(data.profile, locale), experience, projects, skillGroups, education, sections };
}
