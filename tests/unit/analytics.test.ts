import { describe, expect, test } from "vitest";
import { analyticsBeacon, BEACON_SRC } from "@lib/analytics";

describe("analyticsBeacon", () => {
    test("sin token no hay analítica", () => {
        expect(analyticsBeacon(undefined, true)).toBeNull();
    });

    test("un token vacío o de espacios cuenta como ausente", () => {
        expect(analyticsBeacon("", true)).toBeNull();
        expect(analyticsBeacon("   ", true)).toBeNull();
    });

    test("fuera de producción no hay analítica aunque haya token", () => {
        expect(analyticsBeacon("abc123", false)).toBeNull();
    });

    test("en producción con token devuelve el script de Cloudflare y su configuración", () => {
        expect(analyticsBeacon(" abc123 ", true)).toEqual({ src: BEACON_SRC, config: '{"token":"abc123"}' });
        expect(BEACON_SRC).toBe("https://static.cloudflareinsights.com/beacon.min.js");
    });
});
