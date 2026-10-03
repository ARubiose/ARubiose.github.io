import { skins, type Skin } from "../../src/lib/skins";

/** Skin con la que arranca un proyecto de Playwright («desktop-game» → «game»; sin sufijo, Terminal). */
export function skinOf(projectName: string): Skin {
    const suffix = projectName.split("-").slice(1).join("-");
    return (skins as readonly string[]).includes(suffix) ? (suffix as Skin) : "terminal";
}
