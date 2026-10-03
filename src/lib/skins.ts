export type TimelineMode = "alternate" | "single";

// Registro de skins: la lista manda. El nombre visible sale del diccionario (`skin.<id>`).
export const skinRegistry = [
    { id: "terminal", swatch: "#9fd65a", timeline: "alternate" },
    { id: "tactical", swatch: "#f0a83a", timeline: "single" },
] as const satisfies readonly { id: string; swatch: string; timeline: TimelineMode }[];

export type Skin = (typeof skinRegistry)[number]["id"];
export const skins: readonly Skin[] = skinRegistry.map((s) => s.id);
export const defaultSkin: Skin = "terminal";
export const SKIN_STORAGE_KEY = "skin";

// Se serializa en el script en línea del <head> (skinBootScript): no puede usar nada de fuera
// de la función, por eso recibe la lista y la predeterminada como parámetros.
export function resolveSkin(stored: string | null, registered: readonly string[] = skins, fallback: string = defaultSkin): Skin {
    return (registered.includes(stored ?? "") ? stored : fallback) as Skin;
}

export function timelineOf(skin: string): TimelineMode {
    const entry = skinRegistry.find((s) => s.id === skin) ?? skinRegistry.find((s) => s.id === defaultSkin)!;
    return entry.timeline;
}

/** Script en línea que aplica la skin guardada y su modo de línea de tiempo antes de pintar. */
export function skinBootScript(): string {
    const modes = Object.fromEntries(skinRegistry.map((s) => [s.id, s.timeline]));
    const args = [`localStorage.getItem(${JSON.stringify(SKIN_STORAGE_KEY)})`, JSON.stringify(skins), JSON.stringify(defaultSkin)];
    return `try { var r = document.documentElement, s = (${resolveSkin.toString()})(${args.join(", ")}); r.dataset.skin = s; r.dataset.timeline = ${JSON.stringify(modes)}[s]; } catch {}`;
}
