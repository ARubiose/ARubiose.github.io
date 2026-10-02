import { describe, expect, test } from "vitest";
import { findLeaks, visibleText } from "../support/privacy";

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

describe("visibleText", () => {
    test("ignora atributos y scripts", () => {
        const html = '<img src="/_astro/a600111222b.jpg"><script>var t="600111222"</script><p>Hola</p>';
        expect(visibleText(html)).toBe("Hola");
    });
});
