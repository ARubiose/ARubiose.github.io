import { describe, expect, test } from "vitest";
import { defaultSkin, resolveSkin, SKIN_STORAGE_KEY, skinBootScript, skins } from "@lib/skins";

test("la skin por defecto es terminal y está registrada", () => {
    expect(defaultSkin).toBe("terminal");
    expect(skins).toContain(defaultSkin);
});

test("resolveSkin acepta una skin registrada", () => {
    expect(resolveSkin("terminal")).toBe("terminal");
});

test("resolveSkin vuelve a la predeterminada con valores desconocidos o vacíos", () => {
    expect(resolveSkin(null)).toBe(defaultSkin);
    expect(resolveSkin("")).toBe(defaultSkin);
    expect(resolveSkin("tactical")).toBe(defaultSkin);
});

describe("skinBootScript", () => {
    // Ejecuta el script en línea del <head> con un localStorage y un documento simulados.
    function boot(stored: string | null | Error) {
        const root = { dataset: {} as Record<string, string> };
        const localStorage = {
            getItem: (key: string) => {
                if (stored instanceof Error) throw stored;
                return key === SKIN_STORAGE_KEY ? stored : null;
            },
        };
        new Function("localStorage", "document", skinBootScript())(localStorage, { documentElement: root });
        return root.dataset.skin;
    }

    test("aplica la skin guardada si está registrada", () => {
        expect(boot("terminal")).toBe("terminal");
    });

    test("con un valor desconocido aplica la predeterminada", () => {
        expect(boot("tactical")).toBe(defaultSkin);
        expect(boot(null)).toBe(defaultSkin);
    });

    test("sin acceso a localStorage no rompe la página", () => {
        expect(() => boot(new Error("SecurityError"))).not.toThrow();
    });
});
