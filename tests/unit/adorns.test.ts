import { describe, expect, test } from "vitest";
import { adorns, locales } from "@i18n/ui";
import { adornTexts } from "@lib/adorns";
import { skins } from "@lib/skins";

describe("diccionario de adornos", () => {
    test("es y en tienen las mismas claves", () => {
        expect(Object.keys(adorns.en).sort()).toEqual(Object.keys(adorns.es).sort());
    });

    test("cada skin que define un adorno lo define en los dos idiomas", () => {
        for (const key of Object.keys(adorns.es) as (keyof typeof adorns.es)[]) {
            expect(Object.keys(adorns.en[key]).sort(), key).toEqual(Object.keys(adorns.es[key]).sort());
        }
    });

    test("Juego define todos los adornos que define Táctico", () => {
        for (const locale of locales) {
            for (const [key, variants] of Object.entries(adorns[locale])) {
                if ("tactical" in variants) expect(variants, `${locale}.${key}`).toHaveProperty("game");
            }
        }
    });

    test("solo usa skins registradas", () => {
        for (const locale of locales) {
            for (const variants of Object.values(adorns[locale])) {
                for (const skin of Object.keys(variants)) expect(skins).toContain(skin);
            }
        }
    });
});

describe("adornTexts", () => {
    test("una entrada por skin que lo define, con variables sustituidas", () => {
        expect(adornTexts("handle", "es", { handle: "ada", callsign: "ADA // L" })).toContainEqual({ skin: "terminal", text: "ada@portfolio:~$" });
    });

    test("el nombre corto de Juego se sustituye en la cabecera", () => {
        expect(adornTexts("handle", "en", { shortName: "ADA LOVELACE" })).toContainEqual({ skin: "game", text: "ADA LOVELACE" });
    });

    test("una skin sin el adorno no aparece", () => {
        expect(adornTexts("sectionSub.experience", "es").map((a) => a.skin)).not.toContain("terminal");
    });
});
