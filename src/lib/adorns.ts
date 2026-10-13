import { adorns, type AdornKey, type Locale } from "@i18n/ui";
import { skins } from "./skins";

/** Fragmento de un adorno; `mark` lo resalta la skin (en el diccionario va entre [[ y ]]). */
export type AdornPart = { text: string; mark?: true };

/**
 * Texto de un adorno para cada skin que lo define, en orden de registro. Las marcas se leen de la
 * plantilla antes de sustituir las variables, así que un valor nunca puede crear una. Una marca que
 * se queda en un extremo (porque su variable vecina estaba vacía) se quita.
 */
export function adornTexts(key: AdornKey, locale: Locale, vars: Record<string, string> = {}) {
    const variants: Partial<Record<string, string>> = adorns[locale][key];
    const fill = (s: string) => s.replace(/\{(\w+)\}/g, (m, name: string) => vars[name] ?? m);
    return skins.flatMap((skin) => {
        const template = variants[skin];
        if (template === undefined) return [];
        let parts: AdornPart[] = template.split(/\[\[(.+?)\]\]/).map((s, i) => (i % 2 ? { text: fill(s), mark: true } : { text: fill(s) }));
        const tidy = () => {
            parts = parts.filter((p) => p.text !== "");
            if (parts.length) {
                parts[0] = { ...parts[0], text: parts[0].text.trimStart() };
                parts[parts.length - 1] = { ...parts.at(-1)!, text: parts.at(-1)!.text.trimEnd() };
            }
            parts = parts.filter((p) => p.text !== "");
        };
        tidy();
        while (parts[0]?.mark) parts.shift();
        while (parts.at(-1)?.mark) parts.pop();
        tidy();
        return [{ skin, text: parts.map((p) => p.text).join(""), parts }];
    });
}
