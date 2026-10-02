export const skins = ["terminal"] as const;
export type Skin = (typeof skins)[number];
export const defaultSkin: Skin = "terminal";
export const SKIN_STORAGE_KEY = "skin";

export function resolveSkin(stored: string | null): Skin {
    return (skins as readonly string[]).includes(stored ?? "") ? (stored as Skin) : defaultSkin;
}
