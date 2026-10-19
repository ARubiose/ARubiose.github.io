// Vista del CV: una selección sobre la wiki (qué se muestra, en qué orden y con qué énfasis). Pura: sin astro:content.
import { defaultLocale, type Locale } from "@i18n/ui";
import { localize, useTranslations } from "@i18n/utils";
import { formatPeriod } from "./dates";
import type { HomeData } from "./home";
import { groupSkills, sortByStartDesc } from "./order";
import type { CvSpec } from "./schemas";

export type CvEntry = {
    id: string; title: string; org: string; period: string; current: boolean;
    summary?: string; highlights: string[]; compact: boolean;
};
export type CvView = {
    name: string; headline: string; tagline?: string; summary: string; location: string;
    links: { email: string; linkedin: string; github: string };
    photo: boolean; pillars: { title: string; text: string }[];
    experience: CvEntry[]; projects: CvEntry[]; education: CvEntry[];
    skills: { label: string; items: string[] }[]; languages: { name: string; level: string }[];
};

/** Referencias del spec a páginas que no existen (la build falla con estos mensajes). */
export function cvRefErrors(data: HomeData, spec: CvSpec): string[] {
    const errors: string[] = [];
    const experience = new Map(data.experience.map((e) => [e.id, e.data]));
    for (const item of spec.experience ?? []) {
        const entry = experience.get(item.id);
        if (!entry) {
            errors.push(`cv: experiencia inexistente: ${item.id}`);
            continue;
        }
        for (const i of item.highlights ?? []) if (i >= entry.highlights.length) errors.push(`cv: ${item.id}: highlight ${i} fuera de rango`);
    }
    const missing = (ids: string[] | undefined, known: { id: string }[], label: string) => {
        const set = new Set(known.map((k) => k.id));
        for (const id of ids ?? []) if (!set.has(id)) errors.push(`cv: ${label} inexistente: ${id}`);
    };
    missing(spec.projects, data.projects, "proyecto");
    missing(spec.education, data.education, "formación");
    missing(spec.skills?.flatMap((g) => g.items), data.skills, "habilidad");
    return errors;
}

/** Elige y ordena por id; sin lista, todas por fecha descendente. */
function pick<T extends { id: string; data: { start: string; end?: string | null } }>(entries: T[], ids: string[] | undefined): T[] {
    if (!ids) return sortByStartDesc(entries, (e) => ({ start: e.data.start, end: e.data.end ?? null }));
    const byId = new Map(entries.map((e) => [e.id, e]));
    return ids.flatMap((id) => byId.get(id) ?? []);
}

export function buildCvView(data: HomeData, spec: CvSpec | undefined, locale: Locale): CvView {
    if (spec) {
        const errors = cvRefErrors(data, spec);
        if (errors.length) throw new Error(errors.join("\n"));
    }
    const t = useTranslations(locale);
    const en = locale === "en";
    const profile = localize(data.profile, locale);
    // Sin traducción en el spec, el inglés cae en el perfil en inglés (titular, resumen) o en el texto original (listas).
    const text = (es: string | undefined, enText: string | undefined) => (en ? enText : es);

    const experienceSpec = new Map((spec?.experience ?? []).map((e) => [e.id, e]));
    const experience = pick(data.experience, spec?.experience?.map((e) => e.id)).map(({ id, data: d }): CvEntry => {
        const l = localize(d, locale);
        const s = experienceSpec.get(id);
        const compact = s?.compact ?? false;
        const highlights = compact ? [] : s?.highlights ? s.highlights.map((i) => l.highlights[i]) : l.highlights;
        return {
            id, title: l.role, org: l.company, period: formatPeriod(l.start, l.end, locale), current: l.end === null,
            summary: compact || s?.summary === false ? undefined : l.summary, highlights, compact,
        };
    });

    const projects = pick(data.projects, spec?.projects).map(({ id, data: d }): CvEntry => {
        const l = localize(d, locale);
        const current = l.status === "active";
        return { id, title: l.title, org: "", period: formatPeriod(l.start, current ? null : l.start, locale), current, summary: l.summary, highlights: l.highlights, compact: false };
    });

    const education = pick(data.education, spec?.education).map(({ id, data: d }): CvEntry => {
        const l = localize(d, locale);
        return {
            id, title: l.degree, org: l.institution, period: formatPeriod(l.start, l.end, locale), current: l.end === null,
            summary: l.grade ? `${t("education.grade")}: ${l.grade}` : undefined, highlights: [], compact: false,
        };
    });

    const titles = new Map(data.skills.map((s) => [s.id, localize(s.data, locale).title]));
    const skills = spec?.skills
        ? spec.skills.map((g, i) => ({ label: (en ? spec.en?.skills?.[i]?.label : undefined) ?? g.label, items: g.items.map((id) => titles.get(id) ?? id) }))
        : groupSkills(data.skills.map((s) => ({ ...s.data, title: titles.get(s.id) ?? s.data.title }))).map((g) => ({
              label: t(`skills.category.${g.category}`), items: g.items.map((s) => s.title),
          }));

    return {
        name: profile.name,
        headline: text(spec?.headline, spec?.en?.headline) ?? profile.headline,
        tagline: text(spec?.tagline, spec?.en?.tagline),
        summary: text(spec?.summary, spec?.en?.summary) ?? profile.summary,
        location: profile.location,
        links: { email: profile.links.email, linkedin: profile.links.linkedin, github: profile.links.github },
        photo: (en ? spec?.en?.photo : undefined) ?? spec?.photo ?? true,
        pillars: (en ? spec?.en?.pillars : undefined) ?? spec?.pillars ?? [],
        experience, projects, education, skills,
        languages: (en ? spec?.en?.languages : undefined) ?? spec?.languages ?? [],
    };
}

/** Nombre del PDF: «cv-<nombre en ASCII>-<idioma>.pdf». */
export function cvPdfName(name: string, locale: Locale): string {
    const slug = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `cv-${slug}-${locale}.pdf`;
}

/** Página del CV por idioma, con la base del sitio. */
export function cvUrl(locale: Locale, base = "/"): string {
    const root = base.endsWith("/") ? base : `${base}/`;
    return `${root}${locale === defaultLocale ? "" : `${locale}/`}cv/`;
}
