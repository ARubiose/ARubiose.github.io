import { z } from "astro/zod";
import { compareYearMonth, yearMonth } from "./dates";
import { iconExists } from "./icons";

export const skillCategories = ["backend", "ai", "frontend", "devops", "security"] as const;
export type SkillCategory = (typeof skillCategories)[number];
export const projectStatuses = ["active", "paused", "done"] as const;

const text = z.string().trim().min(1);
const highlights = z.array(text).default([]);
const skillRefs = z.array(z.string().regex(/^[a-z0-9-]+$/, "id de habilidad en minúsculas con guiones")).optional();
const icon = z
    .string()
    .regex(/^(si|ph):[a-z0-9-]+$/, "Formato esperado: si:<slug> o ph:<nombre>")
    .refine(iconExists, { message: "El icono no existe en simple-icons ni en Phosphor" });

const meta = {
    title: text,
    summary: text,
    tags: z.array(z.string()).default([]),
    sources: z.array(z.string()).min(1),
    updated: z.coerce.date(),
};

type Dated = { start: string; end: string | null };
const endAfterStart = (d: Dated) => d.end === null || compareYearMonth(d.end, d.start) >= 0;
const endAfterStartIssue = { message: "end es anterior a start", path: ["end"] };

type WithHighlights = { highlights: string[]; en: { highlights: string[] } };
const sameHighlights = (d: WithHighlights) => d.highlights.length === d.en.highlights.length;
const sameHighlightsIssue = {
    message: "highlights y en.highlights deben tener la misma longitud",
    path: ["en", "highlights"],
};

export const profileSchema = z.object({
    ...meta,
    type: z.literal("profile"),
    name: text,
    headline: text,
    location: text,
    links: z.object({ email: z.email(), linkedin: z.url(), github: z.url() }),
    en: z.object({ headline: text, summary: text }),
});

export const experienceSchema = z
    .object({
        ...meta,
        type: z.literal("experience"),
        company: text,
        role: text,
        start: yearMonth,
        end: yearMonth.nullable(),
        highlights,
        skills: skillRefs,
        en: z.object({ role: text, summary: text, highlights }),
    })
    .refine(endAfterStart, endAfterStartIssue)
    .refine(sameHighlights, sameHighlightsIssue);

export const projectSchema = z
    .object({
        ...meta,
        type: z.literal("project"),
        repo: z.url(),
        url: z.url().optional(),
        status: z.enum(projectStatuses),
        start: yearMonth,
        highlights,
        skills: skillRefs,
        en: z.object({ title: text, summary: text, highlights }),
    })
    .refine(sameHighlights, sameHighlightsIssue);

export const skillSchema = z.object({
    ...meta,
    type: z.literal("skill"),
    category: z.enum(skillCategories),
    icon,
    en: z.object({ summary: text }),
});

export const educationSchema = z
    .object({
        ...meta,
        type: z.literal("education"),
        institution: text,
        degree: text,
        start: yearMonth,
        end: yearMonth.nullable(),
        grade: z.union([z.string(), z.number()]).transform(String).optional(),
        en: z.object({ degree: text, summary: text }),
    })
    .refine(endAfterStart, endAfterStartIssue);

export const schemasByType = {
    profile: profileSchema,
    experience: experienceSchema,
    project: projectSchema,
    skill: skillSchema,
    education: educationSchema,
};

export type ProfileData = z.output<typeof profileSchema>;
export type ExperienceData = z.output<typeof experienceSchema>;
export type ProjectData = z.output<typeof projectSchema>;
export type SkillData = z.output<typeof skillSchema>;
export type EducationData = z.output<typeof educationSchema>;
