import { existsSync, readFileSync } from "node:fs";

type Rule = { rule: string; pattern: RegExp };

// Datos personales: solo en lo publicable (wiki pública y dist); los tests contienen ejemplos.
const PII_RULES: Rule[] = [
    { rule: "teléfono", pattern: /(?:\+34[\s.-]?)?\b[6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/ },
    { rule: "dirección", pattern: /\b(?:C\/|Calle|Avda\.?|Avenida|Plaza|Paseo)\s+[A-ZÁÉÍÓÚÑ]/ },
    { rule: "código postal", pattern: /\b(?:0[1-9]|[1-4]\d|5[0-2])\d{3}\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+/ },
    { rule: "nacimiento", pattern: /fecha de nacimiento|date of birth|nacid[oa] el|born on/i },
];

// Credenciales y rutas de la máquina local: en cualquier archivo versionado y en el historial.
// Patrones adaptados del agente opensource-sanitizer de ECC (github.com/affaan-m/ECC).
const SECRET_RULES: Rule[] = [
    { rule: "token de GitHub", pattern: /\bgh[pousr]_[A-Za-z0-9_]{36,}|\bgithub_pat_[A-Za-z0-9_]{22,}/ },
    { rule: "clave privada", pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
    { rule: "clave de AWS", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
    { rule: "clave de Anthropic", pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}/ },
    { rule: "URL con credenciales", pattern: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s:/@]+:[^\s@]+@/ },
    { rule: "JWT", pattern: /\beyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+/ },
    // /home/user/ es el marcador genérico habitual; cualquier otro usuario es una ruta real.
    { rule: "ruta personal", pattern: /\/home\/(?!user\/)[a-z][a-z0-9_-]*\/|\/Users\/[A-Za-z][A-Za-z0-9_-]*\/|C:\\Users\\[A-Za-z]/ },
];

function match(text: string, rules: Rule[], extra: string[]) {
    const leaks = rules.flatMap(({ rule, pattern }) => {
        const m = text.match(pattern);
        return m ? [{ rule, match: m[0] }] : [];
    });
    const lower = text.toLowerCase();
    for (const s of extra) {
        if (s && lower.includes(s.toLowerCase())) leaks.push({ rule: "cadena prohibida", match: s });
    }
    return leaks;
}

/** Todo lo que no puede publicarse: datos personales, credenciales, rutas locales y cadenas prohibidas. */
export function findLeaks(text: string, extra: string[] = []) {
    return match(text, [...PII_RULES, ...SECRET_RULES], extra);
}

/** Lo que no puede estar en ningún archivo versionado ni en el historial (sin las reglas de datos personales). */
export function findSecrets(text: string, extra: string[] = []) {
    return match(text, SECRET_RULES, extra);
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
