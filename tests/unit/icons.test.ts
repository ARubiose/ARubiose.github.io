import { describe, expect, test } from "vitest";
import { iconExists, iconSvg, parseIcon } from "@lib/icons";

describe("parseIcon", () => {
    test("separa el origen del nombre", () => {
        expect(parseIcon("si:python")).toEqual({ set: "si", name: "python" });
        expect(parseIcon("ph:tree-structure")).toEqual({ set: "ph", name: "tree-structure" });
    });

    test("rechaza formatos inválidos", () => {
        expect(parseIcon("python")).toBeNull();
        expect(parseIcon("fa:python")).toBeNull();
        expect(parseIcon("si:Python")).toBeNull();
    });
});

describe("iconExists", () => {
    test.each(["si:python", "si:githubactions", "si:html5", "ph:robot", "ph:detective", "ph:scan", "ph:tree-structure"])(
        "%s existe",
        (ref) => expect(iconExists(ref)).toBe(true),
    );

    test.each(["si:notarealicon", "ph:not-a-real-icon", "nope"])("%s no existe", (ref) => {
        expect(iconExists(ref)).toBe(false);
    });
});

describe("iconSvg", () => {
    test("Simple Icons: SVG en línea con currentColor y oculto a lectores", () => {
        const svg = iconSvg("si:python");
        expect(svg).toMatch(/^<svg[^>]*viewBox="0 0 24 24"/);
        expect(svg).toContain('fill="currentColor"');
        expect(svg).toContain('aria-hidden="true"');
        expect(svg).toContain("<path");
    });

    test("Phosphor: SVG en línea con currentColor y oculto a lectores", () => {
        const svg = iconSvg("ph:robot");
        expect(svg).toMatch(/^<svg[^>]*viewBox="0 0 256 256"/);
        expect(svg).toContain('fill="currentColor"');
        expect(svg).toContain('aria-hidden="true"');
    });

    test("lanza con un icono inexistente", () => {
        expect(() => iconSvg("si:notarealicon")).toThrow(/notarealicon/);
    });
});
