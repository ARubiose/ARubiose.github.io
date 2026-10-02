import { readFileSync } from "node:fs";
import matter from "gray-matter";

export function readFrontmatter(path: string): Record<string, unknown> {
    return matter(readFileSync(path, "utf8")).data;
}
