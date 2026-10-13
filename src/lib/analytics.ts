export const BEACON_SRC = "https://static.cloudflareinsights.com/beacon.min.js";

export type AnalyticsBeacon = { src: string; config: string };

/**
 * Cloudflare Web Analytics es opcional: solo se activa con token y en producción, para que
 * quien use la plantilla no envíe nada sin configurarlo y `pnpm dev` no cuente visitas propias.
 */
export function analyticsBeacon(token: string | undefined, production: boolean): AnalyticsBeacon | null {
    const value = token?.trim();
    if (!value || !production) return null;
    return { src: BEACON_SRC, config: JSON.stringify({ token: value }) };
}
