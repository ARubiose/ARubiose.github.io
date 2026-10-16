import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import {
    educationSchema,
    experienceSchema,
    profileSchema,
    projectDetailSchema,
    projectSchema,
    skillSchema,
} from "@lib/schemas";
import { buildDirs } from "@lib/site";

// WIKI_DIR permite construir otra wiki (los e2e usan tests/fixtures/site); por defecto, wiki/public.
const { wikiDir } = buildDirs(process.env);
const wiki = (pattern: string, base: string) => glob({ pattern, base: `${wikiDir}/${base}` });

export const collections = {
    profile: defineCollection({ loader: wiki("profile.md", ""), schema: ({ image }) => profileSchema.extend({ photo: image() }) }),
    experience: defineCollection({ loader: wiki("*.md", "experience"), schema: experienceSchema }),
    projects: defineCollection({ loader: wiki("*.md", "projects"), schema: projectSchema }),
    // Detalles opcionales: una carpeta por proyecto con es.md y en.md (el loader de projects no entra en subcarpetas).
    projectDetails: defineCollection({ loader: wiki("*/{es,en}.md", "projects"), schema: projectDetailSchema }),
    skills: defineCollection({ loader: wiki("*.md", "skills"), schema: skillSchema }),
    education: defineCollection({ loader: wiki("*.md", "education"), schema: educationSchema }),
};
