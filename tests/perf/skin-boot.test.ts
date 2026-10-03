import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { defaultSkin, SKIN_STORAGE_KEY } from "@lib/skins";

const INDEX = join(import.meta.dirname, "../../dist/index.html");

// El script se genera serializando resolveSkin: si la build le inyecta algo de fuera de la
// función, el try/catch se tragaría el ReferenceError y la skin guardada nunca se aplicaría.
test.skipIf(!existsSync(INDEX) && !process.env.CI)("el script de skin del dist se ejecuta solo y aplica la skin", () => {
    const html = readFileSync(INDEX, "utf8");
    const script = html.match(/<script>(try \{ document\.documentElement\.dataset\.skin[\s\S]*?)<\/script>/)?.[1];
    expect(script, "no se encontró el script de skin en el <head>").toBeDefined();
    for (const [stored, expected] of [["terminal", "terminal"], ["desconocida", defaultSkin]]) {
        const root = { dataset: {} as Record<string, string> };
        const localStorage = { getItem: (key: string) => (key === SKIN_STORAGE_KEY ? stored : null) };
        new Function("localStorage", "document", script!)(localStorage, { documentElement: root });
        expect(root.dataset.skin).toBe(expected);
    }
});
