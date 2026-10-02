import { existsSync, readFileSync } from "node:fs";

const RULES: { rule: string; pattern: RegExp }[] = [
    { rule: "teléfono", pattern: /(?:\+34[\s.-]?)?\b[6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/ },
    { rule: "dirección", pattern: /\b(?:C\/|Calle|Avda\.?|Avenida|Plaza|Paseo)\s+[A-ZÁÉÍÓÚÑ]/ },
    { rule: "código postal", pattern: /\b(?:0[1-9]|[1-4]\d|5[0-2])\d{3}\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+/ },
    { rule: "nacimiento", pattern: /fecha de nacimiento|date of birth|nacid[oa] el|born on/i },
];

export function findLeaks(text: string, extra: string[] = []) {
    const leaks = RULES.flatMap(({ rule, pattern }) => {
        const m = text.match(pattern);
        return m ? [{ rule, match: m[0] }] : [];
    });
    const lower = text.toLowerCase();
    for (const s of extra) {
        if (s && lower.includes(s.toLowerCase())) leaks.push({ rule: "cadena prohibida", match: s });
    }
    return leaks;
}

export function visibleText(html: string): string {
    return html
        .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function loadForbiddenStrings(path: string): string[] {
    if (!existsSync(path)) return [];
    return readFileSync(path, "utf8")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"));
}
