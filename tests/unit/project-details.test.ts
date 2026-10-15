import { describe, expect, test } from "vitest";
import { bodyIssues, detailUrl, lineOffset, pairDetails, svgIssues } from "@lib/project-details";

describe("pairDetails", () => {
    test("empareja es y en de un proyecto que existe", () => {
        expect(pairDetails(["site", "other"], ["site/es", "site/en"])).toEqual({ slugs: ["site"], errors: [] });
    });

    test("falta un idioma", () => {
        const { slugs, errors } = pairDetails(["site"], ["site/es"]);
        expect(slugs).toEqual([]);
        expect(errors).toEqual(["projects/site/: falta en.md"]);
    });

    test("carpeta de detalle sin ficha", () => {
        const { slugs, errors } = pairDetails([], ["ghost/es", "ghost/en"]);
        expect(slugs).toEqual([]);
        expect(errors).toEqual(["projects/ghost/: no existe la ficha projects/ghost.md"]);
    });

    test("ordena los slugs", () => {
        expect(pairDetails(["b", "a"], ["b/es", "b/en", "a/en", "a/es"]).slugs).toEqual(["a", "b"]);
    });
});

describe("bodyIssues", () => {
    const messages = (md: string) => bodyIssues(md).map((i) => i.message);

    test("un cuerpo válido no da avisos", () => {
        const md = [
            "## Problema",
            "",
            "Texto con [web](https://example.com), [ancla](#problema) y <https://example.org>.",
            "",
            "![Diagrama del flujo](./architecture.svg)",
            "",
            "![Foto](./img/screen.webp)",
            "",
            "| a | b |",
            "| - | - |",
            "| 1 | 2 |",
            "",
            "```ts",
            "const x = 1;",
            "```",
        ].join("\n");
        expect(bodyIssues(md)).toEqual([]);
    });

    test.each([
        "<div>x</div>",
        "texto <b>x</b>",
        "<script>alert(1)</script>",
        '<a href="javascript:alert(1)">x</a>',
        '<img src="/abs.png">',
    ])("rechaza HTML crudo: %s", (md) => {
        expect(messages(md)).toContain("HTML crudo no permitido");
    });

    test.each([
        "[x](../skills/python.md)",
        "[x](./otra.md)",
        "[x](/projects/a/)",
        "[x](otra-pagina)",
        "[x](mailto:a@example.com)",
        "[x](javascript:alert(1))",
        "[x](data:text/html,hola)",
        "[x][ref]\n\n[ref]: ../profile.md",
    ])("rechaza el enlace: %s", (md) => {
        expect(messages(md).some((m) => m.startsWith("Enlace no permitido"))).toBe(true);
    });

    test.each(["[x](https://a.example)", "[x](http://a.example)", "<https://a.example>", "[x](#seccion)", "[x][r]\n\n[r]: https://a.example"])(
        "acepta el enlace: %s",
        (md) => {
            expect(bodyIssues(md)).toEqual([]);
        },
    );

    test.each([
        ["![a](../profile.jpg)", "Imagen no permitida"],
        ["![a](./x/../../profile.jpg)", "Imagen no permitida"],
        ["![a](/abs.png)", "Imagen no permitida"],
        ["![a](https://example.com/x.png)", "Imagen no permitida"],
        ["![a](./x.gif)", "Imagen no permitida"],
        ["![](./x.png)", "Imagen sin texto alternativo"],
        ["![  ](./x.png)", "Imagen sin texto alternativo"],
    ])("rechaza la imagen: %s", (md, prefix) => {
        expect(messages(md).some((m) => m.startsWith(prefix))).toBe(true);
    });

    test.each([
        "./%2e%2e/%2e%2e/private/x.jpg",
        "./%2E%2E/x.png",
        "./a%2fb.png",
        "./a\\..\\b.png",
    ])("rechaza rutas de imagen codificadas o con barras invertidas: %s", (url) => {
        expect(messages(`![a](${url})`).some((m) => m.startsWith("Imagen no permitida"))).toBe(true);
    });

    test("imagen por referencia: aplica las reglas de imagen a su definición", () => {
        expect(messages("![][px]\n\n[px]: https://tracker.example/p.gif").some((m) => m.startsWith("Imagen no permitida"))).toBe(true);
        expect(messages("![][r]\n\n[r]: ./x.svg")).toContain("Imagen sin texto alternativo: ./x.svg");
        expect(bodyIssues("![Logo][r]\n\n[r]: ./x.svg")).toEqual([]);
    });

    test("rechaza el h1: el título lo pone la página", () => {
        expect(messages("# Título")).toContain("Sin # h1: el título sale de `title`");
    });

    test.each(["Relacionado", "Fuentes", "Related", "Sources"])("rechaza la sección de cierre de wiki %s", (name) => {
        expect(messages(`## ${name}\n\n- x`)).toContain(`Sección de wiki no publicable: ## ${name}`);
    });

    test("da la línea del problema, desplazada por el frontmatter", () => {
        const md = "## A\n\ntexto\n\n[x](./a.md)";
        expect(bodyIssues(md)).toEqual([{ line: 5, message: "Enlace no permitido: ./a.md" }]);
        expect(bodyIssues(md, 7)).toEqual([{ line: 12, message: "Enlace no permitido: ./a.md" }]);
    });
});

describe("lineOffset", () => {
    test("cuenta las líneas anteriores al cuerpo", () => {
        const raw = "---\ntitle: x\n---\n\n## A\n";
        expect(lineOffset(raw, "\n## A\n")).toBe(3);
    });

    test("sin frontmatter o cuerpo vacío, 0", () => {
        expect(lineOffset("## A\n", "## A\n")).toBe(0);
        expect(lineOffset("---\na: 1\n---\n", "")).toBe(0);
    });
});

describe("detailUrl", () => {
    test.each([
        ["es", "/", "/projects/site/"],
        ["en", "/", "/en/projects/site/"],
        ["es", "/repo/", "/repo/projects/site/"],
        ["en", "/repo", "/repo/en/projects/site/"],
    ] as const)("%s con base %s", (locale, base, expected) => {
        expect(detailUrl("site", locale, base)).toBe(expected);
    });

    test("base por defecto: raíz", () => {
        expect(detailUrl("site", "es")).toBe("/projects/site/");
    });
});

describe("svgIssues", () => {
    test("un SVG estático no da avisos", () => {
        expect(svgIssues('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1" fill="#fff"/><text>App</text></svg>')).toEqual([]);
    });

    test.each([
        ['<svg><script>alert(1)</script></svg>', "<script"],
        ['<svg><rect onload="alert(1)"/></svg>', "atributo on*"],
        ['<svg><foreignObject><div>x</div></foreignObject></svg>', "<foreignObject"],
        ['<svg><a href="javascript:alert(1)"><text>x</text></a></svg>', "javascript:"],
        ['<svg><image href="https://tracker.example/p.png"/></svg>', "recurso externo"],
    ])("rechaza contenido activo o externo: %s", (svg, what) => {
        expect(svgIssues(svg).some((m) => m.includes(what))).toBe(true);
    });
});
