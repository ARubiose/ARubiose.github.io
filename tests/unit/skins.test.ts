import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { defaultSkin, resolveSkin, SKIN_STORAGE_KEY, skinBootScript, skinRegistry, skins, timelineOf } from "@lib/skins";

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
    expect(resolveSkin("retirada")).toBe(defaultSkin);
});

test("el registro deriva los ids y cada skin declara muestra y modo de línea de tiempo", () => {
    expect(skins).toEqual(skinRegistry.map((s) => s.id));
    for (const s of skinRegistry) {
        expect(s.swatch).toMatch(/^#[0-9a-f]{6}$/i);
        expect(["alternate", "single"]).toContain(s.timeline);
    }
});

test("timelineOf: el modo de cada skin; una desconocida usa el de la predeterminada", () => {
    expect(timelineOf("terminal")).toBe("alternate");
    expect(timelineOf("foo")).toBe(timelineOf(defaultSkin));
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
        return root.dataset;
    }

    test("aplica la skin guardada y su modo de línea de tiempo", () => {
        expect(boot("terminal")).toEqual({ skin: "terminal", timeline: "alternate" });
    });

    test("con un valor desconocido aplica la predeterminada y su modo", () => {
        expect(boot("tactical-retirada")).toEqual({ skin: defaultSkin, timeline: timelineOf(defaultSkin) });
        expect(boot(null)).toEqual({ skin: defaultSkin, timeline: timelineOf(defaultSkin) });
    });

    test("sin acceso a localStorage no rompe la página", () => {
        expect(() => boot(new Error("SecurityError"))).not.toThrow();
    });
});

test("states.css oculta los adornos de las demás skins para cada skin registrada", () => {
    const css = readFileSync(join(import.meta.dirname, "../../src/styles/states.css"), "utf8");
    for (const skin of skins) {
        expect(css, skin).toContain(`:root[data-skin="${skin}"] [data-for-skin]:not([data-for-skin="${skin}"])`);
    }
});
