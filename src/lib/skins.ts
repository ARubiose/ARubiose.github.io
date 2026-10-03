export const skins = ["terminal"] as const;
export type Skin = (typeof skins)[number];
export const defaultSkin: Skin = "terminal";
export const SKIN_STORAGE_KEY = "skin";

// Se serializa en el script en línea del <head> (skinBootScript): no puede usar nada de fuera
// de la función, por eso recibe la lista y la predeterminada como parámetros.
export function resolveSkin(stored: string | null, registered: readonly string[] = skins, fallback: string = defaultSkin): Skin {
    return (registered.includes(stored ?? "") ? stored : fallback) as Skin;
}

/** Script en línea que aplica la skin guardada antes de pintar, sin parpadeo. */
export function skinBootScript(): string {
    const args = [`localStorage.getItem(${JSON.stringify(SKIN_STORAGE_KEY)})`, JSON.stringify(skins), JSON.stringify(defaultSkin)];
    return `try { document.documentElement.dataset.skin = (${resolveSkin.toString()})(${args.join(", ")}); } catch {}`;
}
