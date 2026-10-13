import { defaultLocale, ui, type Locale, type UiKey } from "./ui";

export function useTranslations(locale: Locale) {
    return (key: UiKey): string => ui[locale][key] ?? ui[defaultLocale][key];
}

export type Localized<T> = Omit<T, "en">;

export function localize<T extends { en: object }>(entry: T, locale: Locale): Localized<T> {
    const { en, ...base } = entry;
    return (locale === "en" ? { ...base, ...en } : base) as Localized<T>;
}
