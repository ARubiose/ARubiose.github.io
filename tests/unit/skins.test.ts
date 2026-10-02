import { expect, test } from "vitest";
import { defaultSkin, resolveSkin, skins } from "@lib/skins";

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
