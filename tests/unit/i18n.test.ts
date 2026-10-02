import { describe, expect, test } from "vitest";
import { ui } from "@i18n/ui";
import { localize, useTranslations } from "@i18n/utils";

describe("useTranslations", () => {
    test("devuelve la cadena del idioma pedido", () => {
        expect(useTranslations("es")("section.experience")).toBe("Experiencia");
        expect(useTranslations("en")("section.experience")).toBe("Experience");
    });

    test("ambos idiomas tienen exactamente las mismas claves", () => {
        expect(Object.keys(ui.en).sort()).toEqual(Object.keys(ui.es).sort());
    });
});

describe("localize", () => {
    const entry = {
        company: "Acme",
        role: "Ingeniero",
        highlights: ["Uno"],
        en: { role: "Engineer", highlights: ["One"] },
    };

    test("en español quita el bloque en y deja los campos originales", () => {
        expect(localize(entry, "es")).toEqual({
            company: "Acme",
            role: "Ingeniero",
            highlights: ["Uno"],
        });
    });

    test("en inglés sustituye los campos traducidos y conserva los propios", () => {
        expect(localize(entry, "en")).toEqual({
            company: "Acme",
            role: "Engineer",
            highlights: ["One"],
        });
    });

    test("no muta la entrada", () => {
        localize(entry, "en");
        expect(entry.role).toBe("Ingeniero");
    });
});
