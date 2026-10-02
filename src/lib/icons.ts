import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import * as simpleIcons from "simple-icons";

export type IconRef = { set: "si" | "ph"; name: string };

const ICON_REF = /^(si|ph):([a-z0-9-]+)$/;
const require = createRequire(import.meta.url);
// El paquete no exporta package.json: se localiza la carpeta a partir de un SVG exportado.
const phosphorDir = dirname(require.resolve("@phosphor-icons/core/assets/regular/robot.svg"));

type SimpleIcon = { path: string; title: string };

export function parseIcon(ref: string): IconRef | null {
    const m = ref.match(ICON_REF);
    return m ? { set: m[1] as IconRef["set"], name: m[2] } : null;
}

function simpleIcon(name: string): SimpleIcon | undefined {
    const key = `si${name.charAt(0).toUpperCase()}${name.slice(1)}`;
    return (simpleIcons as unknown as Record<string, SimpleIcon>)[key];
}

function phosphorPath(name: string): string {
    return join(phosphorDir, `${name}.svg`);
}

export function iconExists(ref: string): boolean {
    const icon = parseIcon(ref);
    if (!icon) return false;
    return icon.set === "si" ? simpleIcon(icon.name) !== undefined : existsSync(phosphorPath(icon.name));
}

const A11Y = 'fill="currentColor" aria-hidden="true" focusable="false"';

export function iconSvg(ref: string): string {
    const icon = parseIcon(ref);
    if (!icon || !iconExists(ref)) throw new Error(`Icono desconocido: ${ref}`);
    if (icon.set === "si") {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${A11Y}><path d="${simpleIcon(icon.name)!.path}"/></svg>`;
    }
    const raw = readFileSync(phosphorPath(icon.name), "utf8").trim();
    return raw.replace(/^<svg([^>]*)>/, (_m, attrs: string) => `<svg${attrs.replace(/\s*fill="[^"]*"/, "")} ${A11Y}>`);
}
