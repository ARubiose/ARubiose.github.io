import { adorns, type AdornKey, type Locale } from "@i18n/ui";
import { skins } from "./skins";

/** Texto de un adorno para cada skin que lo define, en orden de registro. */
export function adornTexts(key: AdornKey, locale: Locale, vars: Record<string, string> = {}) {
    const variants: Partial<Record<string, string>> = adorns[locale][key];
    return skins.flatMap((skin) => {
        const text = variants[skin];
        if (text === undefined) return [];
        return [{ skin, text: text.replace(/\{(\w+)\}/g, (m, name: string) => vars[name] ?? m) }];
    });
}
