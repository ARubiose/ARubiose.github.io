import { z } from "astro/zod";
import type { Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";

export const PERIOD_SEPARATOR = " - ";

const YEAR_MONTH = /^\d{4}(-(0[1-9]|1[0-2]))?$/;

export const yearMonth = z
    .union([z.string(), z.number()])
    .transform(String)
    .pipe(z.string().regex(YEAR_MONTH, "Formato esperado: AAAA o AAAA-MM"));

function parts(value: string): { year: number; month?: number } {
    const [year, month] = value.split("-").map(Number);
    return month ? { year, month } : { year };
}

export function compareYearMonth(a: string, b: string): number {
    const pa = parts(a);
    const pb = parts(b);
    if (pa.year !== pb.year) return pa.year - pb.year;
    if (pa.month === undefined || pb.month === undefined) return 0;
    return pa.month - pb.month;
}

function formatOne(value: string, locale: Locale): string {
    const { year, month } = parts(value);
    if (!month) return String(year);
    return new Intl.DateTimeFormat(locale, {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function formatPeriod(start: string, end: string | null, locale: Locale): string {
    const from = formatOne(start, locale);
    if (end === start) return from;
    const to = end === null ? useTranslations(locale)("period.present") : formatOne(end, locale);
    return `${from}${PERIOD_SEPARATOR}${to}`;
}

export function toDatetime(value: string): string {
    return value;
}

export function monthIndex(value: string): number {
    const { year, month } = parts(value);
    return year * 12 + ((month ?? 1) - 1);
}
