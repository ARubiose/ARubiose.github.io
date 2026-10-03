import { describe, expect, test } from "vitest";
import { findLeaks, findSecrets, visibleText } from "../support/privacy";

describe("findLeaks", () => {
    test.each([
        ["teléfono", "Llámame al +34 600 111 222"],
        ["teléfono", "tel. 600111222"],
        ["dirección", "Vivo en C/ Inventada, 3"],
        ["dirección", "Calle Falsa 123"],
        ["código postal", "28999 Madrid"],
        ["nacimiento", "Fecha de nacimiento: 1 de enero"],
        ["nacimiento", "Date of birth: Jan 1"],
    ])("detecta %s: %s", (_rule, text) => {
        expect(findLeaks(text)).not.toEqual([]);
    });

    test.each([
        "Doble grado 2015 – 2020, nota media 8.55",
        "Ingeniero de software en Madrid",
        "Contacto: ada@example.com",
        "Repositorio con 1234567 estrellas",
    ])("no da falsos positivos: %s", (text) => {
        expect(findLeaks(text)).toEqual([]);
    });

    test("añade cadenas prohibidas extra sin distinguir mayúsculas", () => {
        expect(findLeaks("Vivo en VILLA SECRETA", ["villa secreta"])).toHaveLength(1);
    });
});

describe("findSecrets", () => {
    // Los ejemplos se montan en ejecución: escritos tal cual, este archivo dispararía el escaneo del repo.
    const j = (...parts: string[]) => parts.join("");
    test.each([
        ["token de GitHub", j("gh", "p_", "a".repeat(36))],
        ["token de GitHub", j("github", "_pat_", "A1".repeat(12))],
        ["clave privada", j("-----BEGIN ", "OPENSSH PRIVATE", " KEY-----")],
        ["clave de AWS", j("AK", "IA", "ABCDEFGHIJKLMNOP")],
        ["clave de Anthropic", j("sk-", "ant-", "api03-", "x".repeat(20))],
        ["URL con credenciales", j("postgres", "://admin:", "hunter2@db.example.com/app")],
        ["JWT", j("ey", "J", "a".repeat(20), ".ey", "J", "b".repeat(20), ".sig")],
        ["ruta personal", j("/ho", "me/", "ada/proyectos/app")],
        ["ruta personal", j("/Us", "ers/", "Ada/Documents")],
        ["ruta personal", j("C:\\", "Users\\", "Ada")],
    ])("detecta %s", (_rule, text) => {
        expect(findSecrets(text)).not.toEqual([]);
    });

    test.each([
        "/home/user/app (marcador genérico)",
        "~/.claude/projects y ./wiki/public",
        "https://github.com/ada/repo",
        "Llámame al +34 600 111 222",
    ])("no da falsos positivos: %s", (text) => {
        expect(findSecrets(text)).toEqual([]);
    });

    test("incluye las cadenas prohibidas", () => {
        expect(findSecrets("Vivo en VILLA SECRETA", ["villa secreta"])).toHaveLength(1);
    });
});

describe("visibleText", () => {
    test("ignora atributos y scripts", () => {
        const html = '<img src="/_astro/a600111222b.jpg"><script>var t="600111222"</script><p>Hola</p>';
        expect(visibleText(html)).toBe("Hola");
    });
});
