import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

const workflow = readFileSync(join(import.meta.dirname, "../../.github/workflows/deploy.yml"), "utf8");

// deploy.yml es compartido con los sitios derivados: un dominio propio se configura con variables
// del repo, nunca editando el workflow (daría conflictos al traer upstream).
test("el job de tests pasa SITE_URL y BASE_PATH desde las variables del repo", () => {
    expect(workflow).toMatch(/^\s+SITE_URL: \$\{\{ vars\.SITE_URL \}\}$/m);
    expect(workflow).toMatch(/^\s+BASE_PATH: \$\{\{ vars\.BASE_PATH \}\}$/m);
});
