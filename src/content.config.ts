import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import {
    educationSchema,
    experienceSchema,
    profileSchema,
    projectSchema,
    skillSchema,
} from "@lib/schemas";

const wiki = (pattern: string, base: string) => glob({ pattern, base: `./wiki/public/${base}` });

export const collections = {
    profile: defineCollection({ loader: wiki("profile.md", ""), schema: ({ image }) => profileSchema.extend({ photo: image() }) }),
    experience: defineCollection({ loader: wiki("*.md", "experience"), schema: experienceSchema }),
    projects: defineCollection({ loader: wiki("*.md", "projects"), schema: projectSchema }),
    skills: defineCollection({ loader: wiki("*.md", "skills"), schema: skillSchema }),
    education: defineCollection({ loader: wiki("*.md", "education"), schema: educationSchema }),
};
