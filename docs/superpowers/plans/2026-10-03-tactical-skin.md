# Skin Táctico y selector de skin: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir la skin Táctico y un selector de skin visible, con adornos, distribución e intro propios de cada skin, sin duplicar componentes.

**Architecture:** El registro de skins (`src/lib/skins.ts`) pasa a tener metadatos (muestra de color y modo de línea de tiempo). La distribución que cambia entre skins sale a tokens CSS y a una variante de Tailwind (`timeline-single`) que lee `data-timeline` en `<html>`. Los textos decorativos pasan a un diccionario de adornos por skin que pinta `Adorn.astro`; `states.css` muestra solo los de la skin activa. Un script de selector cambia `data-skin`/`data-timeline`, guarda la elección y emite `skinchange`.

**Tech Stack:** Astro 7, Tailwind CSS 4 (plugin de Vite), TypeScript, GSAP 3 (ScrollTrigger, ScrambleTextPlugin), Vitest 5, Playwright + axe, pnpm 11, Node 24.

**Spec:** [docs/superpowers/specs/2026-10-03-tactical-skin-design.md](../specs/2026-10-03-tactical-skin-design.md)

## Global Constraints

- Antes de cualquier comando de Node: `source ~/.nvm/nvm.sh && nvm use` (la shell trae Node 18; el proyecto usa Node 24).
- Comandos: `pnpm check`, `pnpm test`, `pnpm test:e2e`, `pnpm test:visual:update`. Los e2e construyen el sitio solos (`playwright.config.ts`).
- El contenido se deriva solo de `wiki/public/`; los textos de interfaz y adornos, solo de `src/i18n/ui.ts`.
- Ningún componente usa colores ni fuentes concretos: clases semánticas y tokens (`text-accent`, `font-display`…). La muestra de color del selector es un dato del registro, pasado como variable CSS.
- Las hojas de skin van en `@layer components` (`global.css`); las reglas de estado que deben ganar a utilidades, en `src/styles/states.css` (sin capa).
- Adornos siempre con `aria-hidden="true"`. El contenido real (títulos, textos, enlaces, etiquetas accesibles) es idéntico en todas las skins.
- JS de cliente solo como mejora progresiva en `src/scripts/`; la lógica testeable en `src/lib/`.
- JS de la portada ≤ 60 KB comprimido (`tests/perf/budget.test.ts`).
- Terminal es la skin predeterminada y su aspecto no cambia: tras las tareas 1–3 las capturas de regresión visual de Terminal deben pasar sin regenerarse.
- Nombres de archivos en inglés; contenido y comentarios en español. Commits en inglés, con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Tras trabajo de interfaz: capturas a 1280 y 390 px con movimiento reducido, revisadas a ojo (memoria `ui-verification`).

## Review Focus

1. **Skin guardada desconocida** (`localStorage.skin = "foo"` o una skin retirada): la página carga con la predeterminada y su modo de línea de tiempo, sin errores. Test en la tarea 1 (script de arranque) y en la tarea 5 (e2e).
2. **`localStorage` bloqueado** (modo privado estricto, `setItem` lanza): el selector cambia la skin en la sesión igualmente y no rompe nada. Test e2e en la tarea 5.
3. **Cambiar de skin con la página a mitad de scroll:** ninguna tarjeta ni sección ya revelada vuelve a quedar invisible y las posiciones de ScrollTrigger se recalculan. Test e2e en la tarea 6.
4. **Dos selectores en la página** (cabecera y menú móvil): pulsar en uno actualiza `aria-pressed` en los dos. Test e2e en la tarea 5.
5. **Skin sin adorno o sin intro propia** (como será Menú de juego): no se pinta nada en el hueco del adorno y la intro usa la de Terminal sin la escritura del prompt. Tests en la tarea 2 (adornos) y la tarea 6 (preset por defecto).

---

## File Structure

| Archivo | Responsabilidad | Tarea |
| --- | --- | --- |
| `src/lib/skins.ts` | Registro de skins con metadatos, resolución, modo de línea de tiempo, script de arranque | 1, 4 |
| `src/layouts/Layout.astro` | `data-skin`/`data-timeline` por defecto, script de arranque, fuentes, `font-body` | 1, 3, 4 |
| `src/i18n/ui.ts` | Diccionario de interfaz + diccionario `adorns` por idioma y skin + etiquetas del selector | 2, 4, 5 |
| `src/components/Adorn.astro` | Pinta un span decorativo por skin que define el adorno | 2 |
| `src/lib/adorns.ts` | Resolución pura de adornos (texto por skin con interpolación) | 2 |
| `src/lib/home.ts` | `callsignFromName` | 2 |
| `src/styles/states.css` | Visibilidad de adornos por skin (sin capa) | 2, 4 |
| `src/styles/base.css` | Valores por defecto de los tokens de distribución | 3 |
| `src/styles/global.css` | `--font-body`, variante `timeline-single`, import de `tactical.css` | 3, 4 |
| `src/sections/intro.astro`, `src/components/ProfilePhoto.astro`, `Timeline.astro`, `TimelineItem.astro` | Leen tokens y variante | 3 |
| `src/components/Header.astro`, `Window.astro`, `SkillBuilder.astro`, `src/sections/*.astro` | Usan `Adorn` | 2 |
| `src/styles/skins/tactical.css` | Skin Táctico | 4 |
| `astro.config.mjs` | Fuentes de Táctico | 4 |
| `src/components/SkinSwitcher.astro`, `src/scripts/skin-switcher.ts` | Selector | 5 |
| `src/scripts/motion.ts` | Presets de intro, modo `single`, `skinchange` | 6 |
| `playwright.config.ts`, `tests/e2e/*` | Proyectos por skin y e2e | 4–7 |
| `docs/system-design.md`, `docs/tasks.md` | Documentación | 7 |

---

### Task 1: Registro de skins con metadatos y modo de línea de tiempo

**Files:**
- Modify: `src/lib/skins.ts`
- Modify: `src/layouts/Layout.astro:16`
- Test: `tests/unit/skins.test.ts`, `tests/perf/skin-boot.test.ts`

**Interfaces:**
- Produces:
  - `export type TimelineMode = "alternate" | "single"`
  - `export const skinRegistry: readonly { id: string; swatch: string; timeline: TimelineMode }[]` (con `as const`; en esta tarea solo `terminal`)
  - `export const skins: readonly Skin[]` (ids, derivado), `export type Skin`, `export const defaultSkin: Skin`, `export const SKIN_STORAGE_KEY = "skin"`
  - `export function resolveSkin(stored: string | null, registered?: readonly string[], fallback?: string): Skin` (sin cambios)
  - `export function timelineOf(skin: string): TimelineMode` (skin desconocida → modo de la predeterminada)
  - `export function skinBootScript(): string`: aplica `data-skin` y `data-timeline`

- [ ] **Step 1: Write the failing tests**

En `tests/unit/skins.test.ts`, sustituir la importación y añadir (el helper `boot()` existente pasa a devolver el `dataset` entero):

```ts
import { describe, expect, test } from "vitest";
import { defaultSkin, resolveSkin, SKIN_STORAGE_KEY, skinBootScript, skinRegistry, skins, timelineOf } from "@lib/skins";

test("el registro deriva los ids y cada skin declara muestra y modo de línea de tiempo", () => {
    expect(skins).toEqual(skinRegistry.map((s) => s.id));
    for (const s of skinRegistry) {
        expect(s.swatch).toMatch(/^#[0-9a-f]{6}$/i);
        expect(["alternate", "single"]).toContain(s.timeline);
    }
});

test("timelineOf: el modo de cada skin; una desconocida usa el de la predeterminada", () => {
    expect(timelineOf("terminal")).toBe("alternate");
    expect(timelineOf("foo")).toBe(timelineOf(defaultSkin));
});
```

Y en el `describe("skinBootScript")`, cambiar `boot` y sus expectativas:

```ts
    function boot(stored: string | null | Error) {
        const root = { dataset: {} as Record<string, string> };
        const localStorage = {
            getItem: (key: string) => {
                if (stored instanceof Error) throw stored;
                return key === SKIN_STORAGE_KEY ? stored : null;
            },
        };
        new Function("localStorage", "document", skinBootScript())(localStorage, { documentElement: root });
        return root.dataset;
    }

    test("aplica la skin guardada y su modo de línea de tiempo", () => {
        expect(boot("terminal")).toEqual({ skin: "terminal", timeline: "alternate" });
    });

    test("con un valor desconocido aplica la predeterminada y su modo", () => {
        expect(boot("tactical-retirada")).toEqual({ skin: defaultSkin, timeline: timelineOf(defaultSkin) });
        expect(boot(null)).toEqual({ skin: defaultSkin, timeline: timelineOf(defaultSkin) });
    });

    test("sin acceso a localStorage no rompe la página", () => {
        expect(() => boot(new Error("SecurityError"))).not.toThrow();
    });
```

En `tests/perf/skin-boot.test.ts`, la expectativa del bucle pasa a comprobar también el modo:

```ts
        expect(root.dataset.skin).toBe(expected);
        expect(root.dataset.timeline).toBe(timelineOf(expected));
```

(importar `timelineOf` de `@lib/skins`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/skins.test.ts`
Expected: FAIL — `skinRegistry`/`timelineOf` no exportados.

- [ ] **Step 3: Implement**

`src/lib/skins.ts` completo:

```ts
export type TimelineMode = "alternate" | "single";

// Registro de skins: la lista manda. El nombre visible sale del diccionario (`skin.<id>`).
export const skinRegistry = [
    { id: "terminal", swatch: "#9fd65a", timeline: "alternate" },
] as const satisfies readonly { id: string; swatch: string; timeline: TimelineMode }[];

export type Skin = (typeof skinRegistry)[number]["id"];
export const skins: readonly Skin[] = skinRegistry.map((s) => s.id);
export const defaultSkin: Skin = "terminal";
export const SKIN_STORAGE_KEY = "skin";

// Se serializa en el script en línea del <head> (skinBootScript): no puede usar nada de fuera
// de la función, por eso recibe la lista y la predeterminada como parámetros.
export function resolveSkin(stored: string | null, registered: readonly string[] = skins, fallback: string = defaultSkin): Skin {
    return (registered.includes(stored ?? "") ? stored : fallback) as Skin;
}

export function timelineOf(skin: string): TimelineMode {
    const entry = skinRegistry.find((s) => s.id === skin) ?? skinRegistry.find((s) => s.id === defaultSkin)!;
    return entry.timeline;
}

/** Script en línea que aplica la skin guardada y su modo de línea de tiempo antes de pintar. */
export function skinBootScript(): string {
    const modes = Object.fromEntries(skinRegistry.map((s) => [s.id, s.timeline]));
    const args = [`localStorage.getItem(${JSON.stringify(SKIN_STORAGE_KEY)})`, JSON.stringify(skins), JSON.stringify(defaultSkin)];
    return `try { var r = document.documentElement, s = (${resolveSkin.toString()})(${args.join(", ")}); r.dataset.skin = s; r.dataset.timeline = ${JSON.stringify(modes)}[s]; } catch {}`;
}
```

El regex de `tests/perf/skin-boot.test.ts` busca `<script>(try \{ document\.documentElement\.dataset\.skin…`; cambiarlo a `/<script>(try \{ var r = document\.documentElement[\s\S]*?)<\/script>/`.

`src/layouts/Layout.astro`: importar `timelineOf` y escribir el modo por defecto en `<html>`:

```astro
import { defaultSkin, skinBootScript, timelineOf } from "@lib/skins";
…
<html lang={locale} data-skin={defaultSkin} data-timeline={timelineOf(defaultSkin)}>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm check && pnpm vitest run tests/unit/skins.test.ts && pnpm build && pnpm vitest run tests/perf`
Expected: 0 errores; todo PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/skins.ts src/layouts/Layout.astro tests/unit/skins.test.ts tests/perf/skin-boot.test.ts
git commit -m "feat(skins): Registry with metadata and per-skin timeline mode in the boot script"
```

---

### Task 2: Adornos por skin

**Files:**
- Create: `src/lib/adorns.ts`, `src/components/Adorn.astro`
- Modify: `src/i18n/ui.ts`, `src/lib/home.ts`, `src/styles/states.css`, `src/components/Header.astro`, `src/components/Window.astro`, `src/components/ProfilePhoto.astro`, `src/components/SkillBuilder.astro`, `src/sections/intro.astro`, `src/sections/contact.astro`, `src/sections/{experience,projects,skills,education,contact}.astro` (subtítulo), `src/layouts/HomePage.astro`, `src/scripts/motion.ts` (selector del prompt)
- Test: `tests/unit/adorns.test.ts` (nuevo), `tests/unit/home.test.ts`, `tests/components/adorn.test.ts` (nuevo), `tests/components/header.test.ts`, `tests/components/sections.test.ts`, `tests/e2e/motion.spec.ts`

**Interfaces:**
- Consumes: `skinRegistry`, `skins`, `type Skin` (tarea 1).
- Produces:
  - En `ui.ts`: `export const adorns: Record<Locale, Record<AdornKey, Partial<Record<string, string>>>>` y `export type AdornKey`.
  - `src/lib/adorns.ts`: `export function adornTexts(key: AdornKey, locale: Locale, vars?: Record<string, string>): { skin: string; text: string }[]` — una entrada por skin del registro que define el adorno, en orden de registro, con `{var}` sustituido.
  - `Adorn.astro` props: `{ name: AdornKey; locale: Locale; vars?: Record<string, string>; class?: string }`; pinta `<span aria-hidden="true" data-for-skin={skin} class={class}>{text}</span>` por entrada.
  - `src/lib/home.ts`: `export function callsignFromName(name: string): string` (dos primeras palabras en mayúsculas unidas por ` // `).
  - Clases nuevas: `window-file` (nombre de archivo de la barra), `site-handle` (adorno de la cabecera), `photo-hint` (aviso «ampliar»), `section-sub` (subtítulo de sección).

Claves de adorno de Terminal (los textos actuales; Táctico se añade en la tarea 4):

| Clave | `es` | `en` |
| --- | --- | --- |
| `handle` | `{handle}@portfolio:~$` | `{handle}@portfolio:~$` |
| `menuMark` | `$` | `$` |
| `navList` | `$ ls secciones/` | `$ ls sections/` |
| `heroKicker` | `whoami` | `whoami` |
| `photo` | `profile.jpg` | `profile.jpg` |
| `photoDialog` | `profile.jpg` | `profile.jpg` |
| `sheet` | `personaje.sav` | `character.sav` |
| `level` | `nv. {year}` | `lv. {year}` |
| `inspect` | `inspeccionar` | `inspect` |
| `inspectMark` | `i` | `i` |
| `mailCmd` | `$ mail` | `$ mail` |
| `openCmd` | `$ open` | `$ open` |
| `sectionSub.experience`, `.projects`, `.skills`, `.education`, `.contact` | (sin Terminal) | (sin Terminal) |

`skills.inspect` se queda en `ui` porque además es la etiqueta accesible del panel inferior; `nav.prompt`, `nav.list`, `contact.mailCmd`, `contact.openCmd`, `skills.sheet` y `skills.level` se eliminan de `ui`.

- [ ] **Step 1: Write the failing unit tests**

`tests/unit/adorns.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { adorns, locales } from "@i18n/ui";
import { adornTexts } from "@lib/adorns";
import { skins } from "@lib/skins";

describe("diccionario de adornos", () => {
    test("es y en tienen las mismas claves", () => {
        expect(Object.keys(adorns.en).sort()).toEqual(Object.keys(adorns.es).sort());
    });

    test("cada skin que define un adorno lo define en los dos idiomas", () => {
        for (const key of Object.keys(adorns.es) as (keyof typeof adorns.es)[]) {
            expect(Object.keys(adorns.en[key]).sort(), key).toEqual(Object.keys(adorns.es[key]).sort());
        }
    });

    test("solo usa skins registradas", () => {
        for (const locale of locales) {
            for (const variants of Object.values(adorns[locale])) {
                for (const skin of Object.keys(variants)) expect(skins).toContain(skin);
            }
        }
    });
});

describe("adornTexts", () => {
    test("una entrada por skin que lo define, con variables sustituidas", () => {
        expect(adornTexts("handle", "es", { handle: "ada", callsign: "ADA // L" })).toContainEqual({ skin: "terminal", text: "ada@portfolio:~$" });
    });

    test("una skin sin el adorno no aparece", () => {
        expect(adornTexts("sectionSub.experience", "es").map((a) => a.skin)).not.toContain("terminal");
    });
});
```

En `tests/unit/home.test.ts` (añadir `callsignFromName` a la importación):

```ts
test("indicativo de Táctico: dos primeras palabras en mayúsculas", () => {
    expect(callsignFromName("Álvaro Rubio Segovia")).toBe("ÁLVARO // RUBIO");
    expect(callsignFromName("  Ada  ")).toBe("ADA");
});
```

Run: `pnpm vitest run tests/unit/adorns.test.ts tests/unit/home.test.ts`
Expected: FAIL — `adorns`, `adornTexts`, `callsignFromName` no existen.

- [ ] **Step 2: Implement the dictionary, resolver and callsign**

En `src/i18n/ui.ts`, quitar de `ui.es` y `ui.en` las claves `nav.prompt`, `nav.list`, `contact.mailCmd`, `contact.openCmd`, `skills.sheet`, `skills.level`, y añadir al final del archivo:

```ts
// Adornos decorativos (siempre aria-hidden): un texto por skin. Una skin sin entrada no pinta nada.
// Variables: {handle} (prompt de Terminal), {callsign} (indicativo de Táctico), {year}.
type AdornVariants = Partial<Record<string, string>>;
export const adorns = {
    es: {
        handle: { terminal: "{handle}@portfolio:~$" },
        menuMark: { terminal: "$" },
        navList: { terminal: "$ ls secciones/" },
        heroKicker: { terminal: "whoami" },
        photo: { terminal: "profile.jpg" },
        photoDialog: { terminal: "profile.jpg" },
        sheet: { terminal: "personaje.sav" },
        level: { terminal: "nv. {year}" },
        inspect: { terminal: "inspeccionar" },
        inspectMark: { terminal: "i" },
        mailCmd: { terminal: "$ mail" },
        openCmd: { terminal: "$ open" },
        "sectionSub.experience": {},
        "sectionSub.projects": {},
        "sectionSub.skills": {},
        "sectionSub.education": {},
        "sectionSub.contact": {},
    },
    en: {
        handle: { terminal: "{handle}@portfolio:~$" },
        menuMark: { terminal: "$" },
        navList: { terminal: "$ ls sections/" },
        heroKicker: { terminal: "whoami" },
        photo: { terminal: "profile.jpg" },
        photoDialog: { terminal: "profile.jpg" },
        sheet: { terminal: "character.sav" },
        level: { terminal: "lv. {year}" },
        inspect: { terminal: "inspect" },
        inspectMark: { terminal: "i" },
        mailCmd: { terminal: "$ mail" },
        openCmd: { terminal: "$ open" },
        "sectionSub.experience": {},
        "sectionSub.projects": {},
        "sectionSub.skills": {},
        "sectionSub.education": {},
        "sectionSub.contact": {},
    },
} as const satisfies Record<Locale, Record<string, AdornVariants>>;

export type AdornKey = keyof (typeof adorns)["es"];
```

`src/lib/adorns.ts`:

```ts
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
```

En `src/lib/home.ts`, junto a `handleFromName`:

```ts
/** Indicativo de Táctico: dos primeras palabras del nombre, en mayúsculas («ÁLVARO // RUBIO»). */
export function callsignFromName(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).join(" // ").toLocaleUpperCase("es");
}
```

Run: `pnpm vitest run tests/unit/adorns.test.ts tests/unit/home.test.ts tests/unit/i18n.test.ts`
Expected: PASS.

- [ ] **Step 3: Write the failing component tests**

`tests/components/adorn.test.ts`:

```ts
import { expect, test } from "vitest";
import Adorn from "@components/Adorn.astro";
import { render } from "../support/render";

test("pinta un span oculto a lectores por cada skin que define el adorno", async () => {
    const html = await render(Adorn, { props: { name: "heroKicker", locale: "es", class: "k" } });
    expect(html).toMatch(/<span aria-hidden="true" data-for-skin="terminal" class="k">whoami<\/span>/);
});

test("sustituye variables", async () => {
    const html = await render(Adorn, { props: { name: "handle", locale: "en", vars: { handle: "ada", callsign: "ADA" } } });
    expect(html).toContain(">ada@portfolio:~$<");
});

test("si ninguna skin lo define, no pinta nada", async () => {
    const html = await render(Adorn, { props: { name: "sectionSub.experience", locale: "es" } });
    expect(html.replace(/<!--.*?-->/g, "").trim()).toBe("");
});
```

En `tests/components/header.test.ts`, el test del prompt pasa a:

```ts
test("el prompt usa el handle recibido, no un nombre fijo", async () => {
    const container = await AstroContainer.create();
    const html = clean(await container.renderToString(Header, { props: { locale: "es", urls, sections: [], handle: "ada", callsign: "ADA" } }));
    expect(html).toMatch(/data-for-skin="terminal"[^>]*>ada@portfolio:~\$</);
    expect(html).not.toContain("alvaro@");
});
```

En `tests/components/sections.test.ts`, la línea del adorno del Intro pasa a:

```ts
    expect(html).toMatch(/<p class="prompt[^"]*" aria-hidden="true"><span aria-hidden="true" data-for-skin="terminal"[^>]*>whoami<\/span>/);
```

Run: `pnpm vitest run tests/components`
Expected: FAIL — `Adorn.astro` no existe y los componentes aún pintan los textos directamente.

- [ ] **Step 4: Implement `Adorn` and migrate the components**

`src/components/Adorn.astro`:

```astro
---
import type { AdornKey, Locale } from "@i18n/ui";
import { adornTexts } from "@lib/adorns";

interface Props {
    name: AdornKey;
    locale: Locale;
    vars?: Record<string, string>;
    class?: string;
}
const { name, locale, vars, class: className } = Astro.props;
---

{adornTexts(name, locale, vars).map(({ skin, text }) => <span aria-hidden="true" data-for-skin={skin} class={className}>{text}</span>)}
```

Cambios en componentes (cada uno importa `Adorn from "./Adorn.astro"` o `"@components/Adorn.astro"`):

- `Header.astro`: nueva prop `callsign?: string` (por defecto `""`).
  - Línea del handle: `<span class="site-handle whitespace-nowrap text-[13px] text-accent" aria-hidden="true"><Adorn name="handle" locale={locale} vars={{ handle, callsign }} /></span>`
  - Botón de menú: `<span class="menu-mark text-accent" aria-hidden="true"><Adorn name="menuMark" locale={locale} /></span> {t("nav.menu")}`
  - Menú: `<p class="text-xs text-muted" aria-hidden="true"><Adorn name="navList" locale={locale} /></p>`
- `HomePage.astro`: importar `callsignFromName` y pasar `callsign={callsignFromName(view.profile.name)}` a `Header` junto a `handle`.
- `Window.astro`: `<span aria-hidden="true" class="window-file">{file}</span>`.
- `ProfilePhoto.astro`:
  - Barra de la ventana: `<span aria-hidden="true"><Adorn name="photo" locale={locale} /></span>`.
  - El aviso del botón: añadir la clase `photo-hint` al `<span class="absolute bottom-2 right-2 …">`.
  - Barra del visor: `<span aria-hidden="true"><Adorn name="photoDialog" locale={locale} /></span>`.
- `intro.astro`: `<p class="prompt text-[13px]" aria-hidden="true"><Adorn name="heroKicker" locale={locale} /></p>`.
- `contact.astro`: las filas usan `cmd: "mailCmd" as const` / `"openCmd" as const` y el span pasa a `<span class="text-accent" aria-hidden="true"><Adorn name={r.cmd} locale={locale} /></span>`.
- `SkillBuilder.astro:37`: `<div class="window-bar"><span aria-hidden="true"><Adorn name="sheet" locale={locale} /></span><span aria-hidden="true"><Adorn name="level" locale={locale} vars={{ year: String(new Date().getFullYear()) }} /></span></div>`
- `SkillBuilder.astro:109`: `<div class="window-bar"><span aria-hidden="true"><Adorn name="inspect" locale={locale} /></span><span aria-hidden="true"><Adorn name="inspectMark" locale={locale} /></span></div>`
- Las cinco secciones: dentro de su `h2`, tras el título, `<Adorn name="sectionSub.experience" locale={locale} class="section-sub" />` (con el id de cada sección). El nombre accesible del `h2` no cambia porque el span es `aria-hidden`.

`src/scripts/motion.ts`: la escritura del prompt debe animar solo el adorno de Terminal (el `<p>` contendrá también los de otras skins):

```ts
    const prompt = document.querySelector<HTMLElement>('.hero .prompt [data-for-skin="terminal"]');
```

`tests/e2e/motion.spec.ts`: el locator del test de 768 px pasa a `page.locator('.hero .prompt [data-for-skin="terminal"]')`.

- [ ] **Step 5: Visibility rule and its guard test**

Añadir a `tests/unit/skins.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("states.css oculta los adornos de las demás skins para cada skin registrada", () => {
    const css = readFileSync(join(import.meta.dirname, "../../src/styles/states.css"), "utf8");
    for (const skin of skins) {
        expect(css, skin).toContain(`:root[data-skin="${skin}"] [data-for-skin]:not([data-for-skin="${skin}"])`);
    }
});
```

Run: `pnpm vitest run tests/unit/skins.test.ts` → FAIL.

Añadir a `src/styles/states.css`:

```css
/* Adornos por skin: cada skin muestra solo los suyos. Una regla por skin del registro
   (tests/unit/skins.test.ts comprueba que no falte ninguna). */
:root[data-skin="terminal"] [data-for-skin]:not([data-for-skin="terminal"]) {
    display: none;
}
```

- [ ] **Step 6: Run everything**

Run: `pnpm check && pnpm test && pnpm test:e2e`
Expected: todo PASS, **incluida la regresión visual de Terminal sin regenerar capturas** (los adornos pintan el mismo texto en el mismo sitio).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(site): Per-skin adornments rendered by Adorn, shown only for the active skin"
```

---

### Task 3: Tokens de distribución y variante `timeline-single`

**Files:**
- Modify: `src/styles/base.css`, `src/styles/global.css`, `src/sections/intro.astro:15`, `src/components/ProfilePhoto.astro:15`, `src/components/Timeline.astro:14`, `src/components/TimelineItem.astro:14-20`, `src/layouts/Layout.astro` (`font-body`)
- Test: `tests/components/sections.test.ts`, `tests/e2e/layout.spec.ts` (nuevo)

**Interfaces:**
- Consumes: `data-timeline` en `<html>` (tarea 1).
- Produces: tokens `--hero-cols`, `--hero-photo-order`, `--hero-photo-max` (por defecto, los de Terminal, en `:root`); token de Tailwind `--font-body` ← `--skin-font-body` (por defecto `--skin-font-mono`); variante `timeline-single:`.

- [ ] **Step 1: Write the failing tests**

En `tests/components/sections.test.ts`, en el test del Intro:

```ts
    expect(html).toMatch(/<section id="about" class="[^"]*md:grid-cols-\(--hero-cols\)/);
    expect(html).toMatch(/class="window photo-window[^"]*md:order-\(--hero-photo-order\)/);
```

En el test «timeline alterno…» de Experience:

```ts
        expect(html).toMatch(/class="t-item[^"]*timeline-single:md:grid-cols-\[28px_1fr\]/);
```

`tests/e2e/layout.spec.ts` (nuevo): fuerza el modo `single` y comprueba la geometría. Se usa `data-timeline` directamente para no depender aún de la skin Táctico:

```ts
import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

test("modo single en escritorio: eje a la izquierda y todas las tarjetas a su derecha, en una columna", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.goto("/");
    await page.evaluate(() => (document.documentElement.dataset.timeline = "single"));
    const rail = await page.locator("#experience .timeline-rail").boundingBox();
    const cards = await page.locator("#experience .t-card").all();
    expect(cards.length).toBeGreaterThan(1);
    const lefts = new Set<number>();
    for (const card of cards) {
        const box = (await card.boundingBox())!;
        expect(box.x).toBeGreaterThan(rail!.x + rail!.width);
        lefts.add(Math.round(box.x));
    }
    expect(lefts.size).toBe(1);
});

test("modo alternate (Terminal) en escritorio: tarjetas a ambos lados del eje", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.goto("/");
    const rail = (await page.locator("#experience .timeline-rail").boundingBox())!;
    const xs = await page.locator("#experience .t-card").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().x));
    expect(xs.some((x) => x < rail.x)).toBe(true);
    expect(xs.some((x) => x > rail.x)).toBe(true);
});
```

Run: `pnpm vitest run tests/components/sections.test.ts && pnpm playwright test tests/e2e/layout.spec.ts`
Expected: FAIL en las tres expectativas nuevas de componentes y en el test de modo `single`.

- [ ] **Step 2: Implement tokens, font token and variant**

`src/styles/base.css`, dentro de `:root` (junto a `--header-h`):

```css
        /* Tokens de distribución: valores de Terminal; cada skin puede redefinirlos. */
        --hero-cols: 340px 1fr;
        --hero-photo-order: 0;
        --hero-photo-max: none;
```

`src/styles/global.css`:
- en `@theme inline`, añadir `--font-body: var(--skin-font-body, var(--skin-font-mono));`
- tras el bloque `@theme`, añadir:

```css
/* Modo de línea de tiempo de la skin (data-timeline en <html>): en "single", eje a la izquierda
   y tarjetas en una columna también en escritorio. */
@custom-variant timeline-single (&:where([data-timeline="single"] *));
```

`src/layouts/Layout.astro`: el `<body>` pasa de `font-mono` a `font-body`.

`src/sections/intro.astro:15`: `md:grid-cols-[340px_1fr]` → `md:grid-cols-(--hero-cols)`.

`src/components/ProfilePhoto.astro:15`: `<div class="window photo-window md:order-(--hero-photo-order) md:ml-auto md:w-full md:max-w-(--hero-photo-max)">`.

`src/components/Timeline.astro:14` (rail): añadir `timeline-single:md:left-[6px] timeline-single:md:translate-x-0`.

`src/components/TimelineItem.astro`:
- `<li>`: añadir `timeline-single:md:grid-cols-[28px_1fr]`.
- nodo: añadir `timeline-single:md:col-start-1 timeline-single:md:mt-1 timeline-single:md:justify-self-start`.
- `t-when`: añadir `timeline-single:md:col-start-2 timeline-single:md:pt-0 timeline-single:md:pl-0 timeline-single:md:pr-0 timeline-single:md:text-left`.
- `Window` (`t-card`): añadir `timeline-single:md:col-start-2 timeline-single:md:row-start-2 timeline-single:md:mt-1.5`.

- [ ] **Step 3: Run tests**

Run: `pnpm check && pnpm test && pnpm test:e2e`
Expected: todo PASS, incluida la regresión visual de Terminal sin regenerar. Si `timeline-single:md:*` no gana a `md:*` (lo detecta `layout.spec.ts`), invertir el orden a `md:timeline-single:*` y repetir; no usar `!important`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(site): Layout tokens for the hero and a timeline-single variant driven by the skin"
```

---

### Task 4: Skin Táctico

**Files:**
- Create: `src/styles/skins/tactical.css`
- Modify: `src/lib/skins.ts` (registro), `src/styles/global.css` (import), `src/styles/states.css` (regla de adornos), `src/i18n/ui.ts` (adornos y nombres de skin), `astro.config.mjs` (fuentes), `src/layouts/Layout.astro` (`<Font>`), `playwright.config.ts` (proyectos Táctico), `tests/e2e/motion.spec.ts` y `tests/e2e/nav.spec.ts` (tests propios de Terminal)
- Test: `tests/unit/skins.test.ts`, `tests/e2e/tactical.spec.ts` (nuevo)

**Interfaces:**
- Consumes: registro (1), adornos y clases `window-file`, `site-handle`, `photo-hint`, `section-sub`, `menu-mark` (2), tokens y variante (3).
- Produces: skin `tactical` registrada; proyectos de Playwright `desktop-tactical` y `mobile-tactical`; claves de interfaz `skin.label`, `skin.terminal`, `skin.tactical` (usadas en la tarea 5).

- [ ] **Step 1: Write the failing tests**

En `tests/unit/skins.test.ts`:

```ts
test("Táctico está registrada con su muestra y modo single", () => {
    expect(skinRegistry.find((s) => s.id === "tactical")).toEqual({ id: "tactical", swatch: "#f0a83a", timeline: "single" });
});
```

`tests/e2e/tactical.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });
test.beforeEach(({}, info) => test.skip(!info.project.name.endsWith("-tactical")));

test("se carga Táctico con su modo de línea de tiempo", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-skin", "tactical");
    await expect(page.locator("html")).toHaveAttribute("data-timeline", "single");
});

test("solo se ven los adornos de Táctico", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-for-skin="terminal"]').first()).toBeHidden();
    const visible = await page.locator("[data-for-skin]").evaluateAll((els) =>
        els.filter((e) => getComputedStyle(e).display !== "none").map((e) => e.getAttribute("data-for-skin")),
    );
    expect(new Set(visible)).toEqual(new Set(["tactical"]));
});

test("escritorio: foto a la derecha del texto y línea de tiempo en una columna", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-tactical");
    await page.goto("/");
    const photo = (await page.locator(".photo-window").boundingBox())!;
    const name = (await page.locator(".hero-name").boundingBox())!;
    expect(photo.x).toBeGreaterThan(name.x + name.width);
    const rail = (await page.locator("#experience .timeline-rail").boundingBox())!;
    for (const card of await page.locator("#experience .t-card").all()) {
        expect((await card.boundingBox())!.x).toBeGreaterThan(rail.x + rail.width);
    }
});

test("la cabecera muestra el indicativo derivado del nombre", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('.site-handle [data-for-skin="tactical"]')).toHaveText(/^\S+ \/\/ \S+$/);
});
```

En `playwright.config.ts`, añadir los proyectos (el `storageState` guarda la skin en `localStorage` antes de cargar):

```ts
const tactical = { cookies: [], origins: [{ origin: `http://127.0.0.1:${PORT}`, localStorage: [{ name: "skin", value: "tactical" }] }] };
…
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
        { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
        { name: "desktop-tactical", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, storageState: tactical } },
        { name: "mobile-tactical", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, storageState: tactical } },
    ],
```

Los tests que hoy filtran por `info.project.name === "desktop"`/`"mobile"` (nav, photo, builder, layout, motion) pasan a filtrar por prefijo, para que también se ejecuten en Táctico: sustituir `info.project.name === "mobile"` por `info.project.name.startsWith("mobile")` y `!== "mobile"` por `!info.project.name.startsWith("mobile")` (y lo mismo con `desktop`). Excepciones, propias de Terminal y que se saltan en Táctico con `test.skip(info.project.name.endsWith("-tactical"))`:
- `motion.spec.ts`: «cruzar 768 px…» (escritura del prompt) y «con animaciones, la intro termina…» hasta la tarea 6.
- `layout.spec.ts`: «modo alternate (Terminal)…».

Run: `pnpm vitest run tests/unit/skins.test.ts && pnpm playwright test tests/e2e/tactical.spec.ts`
Expected: FAIL — `tactical` no registrada.

- [ ] **Step 2: Register the skin, fonts and dictionary**

`src/lib/skins.ts`, en `skinRegistry`:

```ts
    { id: "tactical", swatch: "#f0a83a", timeline: "single" },
```

`astro.config.mjs`, en `fonts`:

```js
        {
            provider: fontProviders.fontsource(),
            name: "Chakra Petch",
            cssVariable: "--font-chakra-petch",
            weights: [500, 600, 700],
            styles: ["normal"],
            subsets: ["latin", "latin-ext"],
            fallbacks: ["sans-serif"],
        },
        {
            provider: fontProviders.fontsource(),
            name: "Barlow",
            cssVariable: "--font-barlow",
            weights: [400, 500],
            styles: ["normal"],
            subsets: ["latin", "latin-ext"],
            fallbacks: ["sans-serif"],
        },
        {
            provider: fontProviders.fontsource(),
            name: "JetBrains Mono",
            cssVariable: "--font-jetbrains-mono",
            weights: [400, 500],
            styles: ["normal"],
            subsets: ["latin", "latin-ext"],
            fallbacks: ["monospace"],
        },
```

`src/layouts/Layout.astro`, tras los `<Font>` actuales (sin `preload`: solo se descargan si la skin activa las usa):

```astro
        <Font cssVariable="--font-chakra-petch" />
        <Font cssVariable="--font-barlow" />
        <Font cssVariable="--font-jetbrains-mono" />
```

`src/i18n/ui.ts`:
- en `ui.es`: `"skin.label": "Skin"`, `"skin.terminal": "Terminal"`, `"skin.tactical": "Táctico"`, `"skin.changed": "Skin: {name}"`.
- en `ui.en`: `"skin.label": "Skin"`, `"skin.terminal": "Terminal"`, `"skin.tactical": "Tactical"`, `"skin.changed": "Skin: {name}"`.
- en `adorns.es`, añadir `tactical` a cada clave: `handle: "{callsign}"`, `navList: "Navegación"`, `heroKicker: "Perfil de operador"`, `photo: "ID-01 · AMPLIAR"`, `photoDialog: "ID-01"`, `sheet: "Ficha de operador"`, `level: "NV {year}"`, `inspect: "Análisis"`, `inspectMark: "◆"`, `mailCmd: "◆ MAIL"`, `openCmd: "◆ LINK"`, `"sectionSub.experience": "Registro de misiones"`, `"sectionSub.projects": "Operaciones"`, `"sectionSub.skills": "Loadout"`, `"sectionSub.education": "Entrenamiento"`, `"sectionSub.contact": "Canal seguro"`. `menuMark` no tiene variante Táctico (la skin pinta un rombo por CSS).
- en `adorns.en`: igual con `navList: "Navigation"`, `heroKicker: "Operator profile"`, `photo: "ID-01 · ENLARGE"`, `sheet: "Operator sheet"`, `level: "LV {year}"`, `inspect: "Analysis"`, `"sectionSub.experience": "Mission log"`, `"sectionSub.projects": "Operations"`, `"sectionSub.skills": "Loadout"`, `"sectionSub.education": "Training"`, `"sectionSub.contact": "Secure channel"`.

`src/styles/states.css`, junto a la regla de Terminal:

```css
:root[data-skin="tactical"] [data-for-skin]:not([data-for-skin="tactical"]) {
    display: none;
}
```

`src/styles/global.css`: `@import "./skins/tactical.css" layer(components);` tras el de Terminal.

- [ ] **Step 3: Write `src/styles/skins/tactical.css`**

Traducción de [tactical-desktop.html](../../design/mockups/tactical-desktop.html) y [tactical-mobile.html](../../design/mockups/tactical-mobile.html) a las clases semánticas que estiliza Terminal. Todas las reglas con el prefijo `[data-skin="tactical"]`; colores y fuentes solo con `var(--skin-*)`.

```css
[data-skin="tactical"] {
    --skin-bg: #0b0e12;
    --skin-surface: #11161d;
    --skin-surface-2: #18202a;
    --skin-line: #263140;
    --skin-text: #e7eaef;
    --skin-body: #c6cdd6;
    --skin-muted: #93a0b0;
    --skin-accent: #f0a83a;
    --skin-accent-ink: #17110a;
    --skin-warn: #ef5350;
    --skin-font-display: var(--font-chakra-petch);
    --skin-font-body: var(--font-barlow);
    --skin-font-mono: var(--font-jetbrains-mono);
    --skin-radius: 0;
    --skin-cut: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%);
    --skin-cut-sm: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);

    /* Distribución: texto a la izquierda y foto a la derecha. */
    --hero-cols: 1.35fr 1fr;
    --hero-photo-order: 1;
    --hero-photo-max: 400px;
}

/* Etiquetas monoespaciadas en mayúsculas: el lenguaje de los rótulos del HUD. */
[data-skin="tactical"] :is(.window-bar, .nav-link, .tab, .btn, .t-when, .badge, .window-tag, .section-sub, .prompt, .slot) {
    font-family: var(--skin-font-mono);
    text-transform: uppercase;
    letter-spacing: 0.1em;
}

/* Cabecera */
[data-skin="tactical"] .site-handle {
    font-family: var(--skin-font-display);
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--skin-text);
}
[data-skin="tactical"] .menu-toggle::before {
    content: "";
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-right: 8px;
    background: var(--skin-accent);
    transform: rotate(45deg);
}
[data-skin="tactical"] .site-nav .nav-link {
    font-size: 12px;
}
[data-skin="tactical"] .site-nav .nav-link[aria-current="true"] {
    color: var(--skin-text);
    box-shadow: inset 0 -2px 0 var(--skin-accent);
    padding-bottom: 5px;
}
[data-skin="tactical"] .site-menu .nav-link {
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-family: var(--skin-font-display);
}
[data-skin="tactical"] .site-menu .nav-link::before {
    content: "";
    width: 8px;
    height: 8px;
    margin-right: 12px;
    border: 1px solid var(--skin-muted);
    transform: rotate(45deg);
}
[data-skin="tactical"] .site-menu .nav-link[aria-current="true"] {
    color: var(--skin-accent);
}
[data-skin="tactical"] .site-menu .nav-link[aria-current="true"]::before {
    background: var(--skin-accent);
    border-color: var(--skin-accent);
}

/* Ventanas → paneles con esquina cortada */
[data-skin="tactical"] .window {
    background: var(--skin-surface);
    box-shadow: inset 0 0 0 1px var(--skin-line);
    clip-path: var(--skin-cut);
}
[data-skin="tactical"] .window-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 14px;
    border-bottom: 1px solid var(--skin-line);
    font-size: 11px;
    color: var(--skin-muted);
}
[data-skin="tactical"] .window-file {
    display: none;
}
[data-skin="tactical"] .window-tag {
    color: var(--skin-accent-ink);
    background: var(--skin-accent);
    padding: 2px 7px;
    font-size: 10.5px;
}

/* Hero */
[data-skin="tactical"] .prompt {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--skin-muted);
    font-size: 12px;
}
[data-skin="tactical"] .prompt::before {
    content: "";
    width: var(--kicker-line, 26px);
    height: 2px;
    background: var(--skin-accent);
}
[data-skin="tactical"] .cursor,
[data-skin="tactical"] .photo-hint,
[data-skin="tactical"] body::after {
    display: none;
}
[data-skin="tactical"] .hero-name {
    letter-spacing: -0.01em;
}
[data-skin="tactical"] .hero-role {
    font-weight: 600;
}

/* Foto: dos esquinas en ángulo en lugar de ventana */
[data-skin="tactical"] .photo-window {
    position: relative;
    padding: 14px;
    background: none;
    box-shadow: none;
    clip-path: none;
}
[data-skin="tactical"] .photo-window::before,
[data-skin="tactical"] .photo-window::after {
    content: "";
    position: absolute;
    z-index: 1;
    width: var(--corner-size, 38px);
    height: var(--corner-size, 38px);
    border: 2px solid var(--skin-accent);
    pointer-events: none;
}
[data-skin="tactical"] .photo-window::before {
    top: 0;
    left: 0;
    border-right: 0;
    border-bottom: 0;
}
[data-skin="tactical"] .photo-window::after {
    right: 0;
    bottom: 0;
    border-left: 0;
    border-top: 0;
}
[data-skin="tactical"] .photo-window > .window-bar {
    position: absolute;
    left: 24px;
    bottom: 5px;
    z-index: 2;
    padding: 0 8px;
    border: 0;
    background: var(--skin-bg);
}
[data-skin="tactical"] .photo-window > .window-bar .icon {
    display: none;
}
[data-skin="tactical"] .photo-window img {
    clip-path: polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%, 0 24px);
    filter: saturate(0.8) contrast(1.05);
}

/* Titulares de sección: rombo, subtítulo y línea que se desvanece */
[data-skin="tactical"] .section-title {
    display: flex;
    align-items: center;
    gap: 14px;
    font-family: var(--skin-font-display);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}
[data-skin="tactical"] .section-title::before {
    content: "";
    flex: none;
    width: 11px;
    height: 11px;
    background: var(--skin-accent);
    transform: rotate(45deg);
}
[data-skin="tactical"] .section-title::after {
    content: "";
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, var(--skin-line), transparent);
}
[data-skin="tactical"] .section-sub {
    font-size: 11.5px;
    font-weight: 400;
    color: var(--skin-muted);
    letter-spacing: 0.14em;
}

/* Listas: rombos huecos */
[data-skin="tactical"] .marker-list {
    list-style: none;
}
[data-skin="tactical"] .marker-list li {
    position: relative;
    padding-left: 18px;
}
[data-skin="tactical"] .marker-list li::before {
    content: "";
    position: absolute;
    left: 2px;
    top: 0.6em;
    width: 6px;
    height: 6px;
    border: 1px solid var(--skin-accent);
    transform: rotate(45deg);
}

/* Botones con esquinas cortadas */
[data-skin="tactical"] .btn {
    display: inline-flex;
    justify-content: center;
    padding: 12px 20px;
    font-size: 12.5px;
    clip-path: var(--skin-cut-sm);
    transition: background 0.2s, color 0.2s;
}
[data-skin="tactical"] .btn-primary {
    background: var(--skin-accent);
    color: var(--skin-accent-ink);
    font-weight: 500;
}
[data-skin="tactical"] .btn-primary:hover {
    background: color-mix(in oklab, var(--skin-accent) 85%, white);
}
[data-skin="tactical"] .btn-secondary {
    background: var(--skin-surface);
    color: var(--skin-text);
    box-shadow: inset 0 0 0 1px var(--skin-line);
}
[data-skin="tactical"] .btn-secondary:hover {
    box-shadow: inset 0 0 0 1px var(--skin-accent);
}

/* Línea de tiempo */
[data-skin="tactical"] .timeline-rail {
    background: var(--skin-line);
}
[data-skin="tactical"] .timeline-fill {
    background: var(--skin-accent);
    transform-origin: top;
}
[data-skin="tactical"] .timeline-node {
    width: 12px;
    height: 12px;
    background: var(--skin-bg);
    border: 2px solid var(--skin-accent);
    transform: rotate(45deg);
}
[data-skin="tactical"] .t-item[data-current] .timeline-node {
    background: var(--skin-accent);
}
[data-skin="tactical"] .t-when {
    color: var(--skin-muted);
    font-size: 12px;
}

/* Proyectos */
[data-skin="tactical"] .readme-title {
    font-family: var(--skin-font-display);
}
[data-skin="tactical"] .badge {
    color: var(--skin-accent-ink);
    background: var(--skin-accent);
    padding: 2px 7px;
    font-size: 10.5px;
}

/* Creador de personaje */
[data-skin="tactical"] .tile {
    background: var(--skin-surface);
    box-shadow: inset 0 0 0 1px var(--skin-line);
    transition: box-shadow 0.15s, background 0.15s;
}
[data-skin="tactical"] .tile:hover,
[data-skin="tactical"] .tile[data-selected] {
    box-shadow: inset 0 0 0 1px var(--skin-accent);
}
[data-skin="tactical"] .tile[data-selected] {
    background: var(--skin-surface-2);
}
[data-skin="tactical"] .tile-name {
    font-family: var(--skin-font-display);
    font-weight: 600;
}
[data-skin="tactical"] .tile-equip {
    border-left: 1px solid var(--skin-line);
    color: var(--skin-accent);
}
[data-skin="tactical"] .tile-equip[aria-pressed="true"] {
    background: var(--skin-accent);
    color: var(--skin-accent-ink);
    border-left-color: var(--skin-accent);
}
[data-skin="tactical"] .tab {
    padding: 7px 12px;
    font-size: 11.5px;
    color: var(--skin-muted);
    box-shadow: inset 0 0 0 1px var(--skin-line);
    clip-path: var(--skin-cut-sm);
}
[data-skin="tactical"] .tab[aria-selected="true"] {
    color: var(--skin-accent-ink);
    background: var(--skin-accent);
    box-shadow: none;
}
[data-skin="tactical"] .slot {
    box-shadow: inset 0 0 0 1px var(--skin-line);
    color: var(--skin-muted);
}
[data-skin="tactical"] .slot[data-filled] {
    box-shadow: inset 0 0 0 1px var(--skin-accent);
    background: color-mix(in oklab, var(--skin-accent) 8%, var(--skin-surface));
    color: var(--skin-accent);
}
[data-skin="tactical"] .slot[data-over] {
    box-shadow: inset 0 0 0 1px var(--skin-warn);
    background: color-mix(in oklab, var(--skin-warn) 10%, var(--skin-surface));
}
[data-skin="tactical"] .broken {
    border-left: 3px solid var(--skin-warn);
    background: color-mix(in oklab, var(--skin-warn) 10%, var(--skin-surface));
    color: var(--skin-text);
    padding: 8px 10px;
    font-size: 13px;
}
[data-skin="tactical"] .edge-btn {
    color: var(--skin-accent);
    background: var(--skin-bg);
    box-shadow: inset 0 0 0 1px var(--skin-accent);
}
[data-skin="tactical"] .sheet-dialog {
    border-top: 2px solid var(--skin-accent);
}
```

Los nombres de clase de la regla se contrastan con los que existen en los componentes (`grep -rn "class=" src/components src/sections`); si alguno no existe (p. ej. `menu-toggle` está en `Header.astro`, `readme-title` en `ProjectCard.astro`), se corrige el selector, no el componente.

- [ ] **Step 4: Run tests and look**

Run: `pnpm check && pnpm test && pnpm test:e2e`
Expected: PASS; las capturas de regresión visual de los proyectos Táctico aún no existen, así que `visual.spec.ts` falla solo en ellos («A snapshot doesn't exist»). Generarlas tras revisar las capturas a ojo:

1. `pnpm build && pnpm astro preview --port 4399 --host 127.0.0.1 --ignore-lock` en segundo plano.
2. Script de Playwright que fije `localStorage.skin = "tactical"` con `addInitScript` y haga capturas a 1280 y 390 px con movimiento reducido: portada completa, visor de foto, menú móvil abierto y creador con una habilidad equipada.
3. Comparar con las maquetas; ajustar `tactical.css` hasta que coincidan. Parar el preview por PID.
4. `pnpm test:visual:update` y revisar que solo se crean `*-desktop-tactical-*` y `*-mobile-tactical-*` (las de Terminal no deben cambiar: `git status` no muestra modificadas las existentes).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(skins): Tactical skin with its fonts, adornments and layout tokens"
```

---

### Task 5: Selector de skin

**Files:**
- Create: `src/components/SkinSwitcher.astro`, `src/scripts/skin-switcher.ts`
- Modify: `src/components/Header.astro`, `src/lib/skins.ts`, `src/styles/skins/terminal.css`, `src/styles/skins/tactical.css`
- Test: `tests/unit/skins.test.ts`, `tests/components/header.test.ts`, `tests/e2e/switcher.spec.ts` (nuevo)

**Interfaces:**
- Consumes: `skinRegistry`, `timelineOf`, `SKIN_STORAGE_KEY` (1); `skin.label`, `skin.<id>`, `skin.changed` (4).
- Produces:
  - `src/lib/skins.ts`: `export function applySkin(root: { dataset: DOMStringMap }, skin: string, storage?: Pick<Storage, "setItem">): Skin` — escribe `data-skin`/`data-timeline` con la skin resuelta, intenta guardarla (un error de `storage` se ignora) y la devuelve.
  - Evento `skinchange` en `document`, `CustomEvent<{ skin: Skin }>`.
  - Marcado: `[data-skin-switcher]` (grupo), `[data-skin-option="<id>"]` (botones), `[data-skin-status]` (región `aria-live`, una en `Header`).

- [ ] **Step 1: Write the failing tests**

En `tests/unit/skins.test.ts`:

```ts
describe("applySkin", () => {
    test("escribe la skin y su modo, la guarda y la devuelve", () => {
        const root = { dataset: {} as DOMStringMap };
        const saved: Record<string, string> = {};
        expect(applySkin(root, "tactical", { setItem: (k, v) => (saved[k] = v) })).toBe("tactical");
        expect(root.dataset).toEqual({ skin: "tactical", timeline: "single" });
        expect(saved[SKIN_STORAGE_KEY]).toBe("tactical");
    });

    test("una skin desconocida aplica la predeterminada", () => {
        const root = { dataset: {} as DOMStringMap };
        expect(applySkin(root, "foo")).toBe(defaultSkin);
    });

    test("si guardar falla, la skin se aplica igualmente", () => {
        const root = { dataset: {} as DOMStringMap };
        const blocked = { setItem: () => { throw new Error("QuotaExceededError"); } };
        expect(() => applySkin(root, "tactical", blocked)).not.toThrow();
        expect(root.dataset.skin).toBe("tactical");
    });
});
```

En `tests/components/header.test.ts`:

```ts
test("selector de skin en la cabecera y en el menú: oculto sin JS, un botón por skin", async () => {
    const container = await AstroContainer.create();
    const html = clean(await container.renderToString(Header, { props: { locale: "es", urls, sections: [] } }));
    expect(html.match(/data-skin-switcher[^>]*hidden|hidden[^>]*data-skin-switcher/g)).toHaveLength(2);
    expect(html.match(/data-skin-option="terminal"/g)).toHaveLength(2);
    expect(html.match(/data-skin-option="tactical"/g)).toHaveLength(2);
    expect(html).toMatch(/role="group"[^>]*aria-label="Skin"/);
    expect(html.match(/data-skin-status/g)).toHaveLength(1);
});
```

`tests/e2e/switcher.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";

test.use({ reducedMotion: "reduce" });
test.beforeEach(({}, info) => test.skip(info.project.name.endsWith("-tactical"), "parte de Terminal"));

async function openSwitcher(page: Page, mobile: boolean) {
    if (mobile) await page.locator('[popovertarget="site-menu"]').click();
    return page.locator(mobile ? "#site-menu [data-skin-switcher]" : ".header-lang [data-skin-switcher]");
}

test("cambia al instante, sincroniza los dos selectores y se recuerda al recargar", async ({ page }, info) => {
    const mobile = info.project.name.startsWith("mobile");
    await page.goto("/");
    const switcher = await openSwitcher(page, mobile);
    await switcher.locator('[data-skin-option="tactical"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-skin", "tactical");
    await expect(page.locator("html")).toHaveAttribute("data-timeline", "single");
    await expect(page.locator('[data-skin-option="tactical"][aria-pressed="true"]')).toHaveCount(2);
    await expect(page.locator('[data-skin-option="terminal"][aria-pressed="false"]')).toHaveCount(2);
    await expect(page.locator("[data-skin-status]")).toHaveText(/Táctico/);
    await expect(switcher.locator('[data-skin-option="tactical"]')).toBeFocused();

    await page.addInitScript(() => {
        const obs = new MutationObserver(() => {
            if (document.body) {
                (window as unknown as { firstSkin: string }).firstSkin = document.documentElement.dataset.skin ?? "";
                obs.disconnect();
            }
        });
        obs.observe(document, { childList: true, subtree: true });
    });
    await page.reload();
    expect(await page.evaluate(() => (window as unknown as { firstSkin: string }).firstSkin)).toBe("tactical");
});

test("en Terminal solo se ven los adornos de Terminal", async ({ page }) => {
    await page.goto("/");
    const visible = await page.locator("[data-for-skin]").evaluateAll((els) =>
        els.filter((e) => getComputedStyle(e).display !== "none").map((e) => e.getAttribute("data-for-skin")),
    );
    expect(visible.length).toBeGreaterThan(5);
    expect(new Set(visible)).toEqual(new Set(["terminal"]));
});

test("una skin guardada desconocida carga la predeterminada", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("skin", "retirada"));
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-skin", "terminal");
    await expect(page.locator("html")).toHaveAttribute("data-timeline", "alternate");
});

test("con localStorage bloqueado el selector sigue funcionando", async ({ page }, info) => {
    await page.addInitScript(() => {
        Storage.prototype.setItem = () => { throw new DOMException("bloqueado", "SecurityError"); };
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    const switcher = await openSwitcher(page, info.project.name.startsWith("mobile"));
    await switcher.locator('[data-skin-option="tactical"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-skin", "tactical");
    expect(errors).toEqual([]);
});
```

En `tests/e2e/motion.spec.ts`, en el test «sin JavaScript», añadir:

```ts
        await expect(page.locator("[data-skin-switcher]").first()).toBeHidden();
```

Run: `pnpm vitest run tests/unit/skins.test.ts tests/components/header.test.ts && pnpm playwright test tests/e2e/switcher.spec.ts`
Expected: FAIL — `applySkin` y el selector no existen.

- [ ] **Step 2: Implement**

`src/lib/skins.ts`:

```ts
/** Aplica una skin a <html> y la guarda; si guardar falla (modo privado), se aplica igualmente. */
export function applySkin(root: { dataset: DOMStringMap }, skin: string, storage?: Pick<Storage, "setItem">): Skin {
    const resolved = resolveSkin(skin);
    root.dataset.skin = resolved;
    root.dataset.timeline = timelineOf(resolved);
    try {
        storage?.setItem(SKIN_STORAGE_KEY, resolved);
    } catch {}
    return resolved;
}
```

`src/components/SkinSwitcher.astro`:

```astro
---
import type { Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";
import { defaultSkin, skinRegistry } from "@lib/skins";

interface Props {
    locale: Locale;
}
const { locale } = Astro.props;
const t = useTranslations(locale);
---

{skinRegistry.length > 1 && (
    <div class="skin-switcher flex" role="group" aria-label={t("skin.label")} data-skin-switcher hidden>
        {skinRegistry.map((s) => (
            <button type="button" class="skin-option flex items-center gap-1.5 px-2 py-0.5 text-[12px]" data-skin-option={s.id} data-label={t(`skin.${s.id}`)} aria-pressed={s.id === defaultSkin ? "true" : "false"}>
                <span class="skin-swatch size-2 flex-none" style={`--swatch: ${s.swatch}`} aria-hidden="true"></span>
                {t(`skin.${s.id}`)}
            </button>
        ))}
    </div>
)}
```

`src/scripts/skin-switcher.ts`:

```ts
import { applySkin, type Skin } from "../lib/skins";

export function initSkinSwitcher(): void {
    const switchers = [...document.querySelectorAll<HTMLElement>("[data-skin-switcher]")];
    if (!switchers.length) return;
    const root = document.documentElement;
    const status = document.querySelector<HTMLElement>("[data-skin-status]");
    const options = switchers.flatMap((s) => [...s.querySelectorAll<HTMLButtonElement>("[data-skin-option]")]);

    const sync = (skin: string) => {
        for (const o of options) o.setAttribute("aria-pressed", String(o.dataset.skinOption === skin));
    };

    switchers.forEach((s) => (s.hidden = false));
    sync(root.dataset.skin ?? "");

    for (const option of options) {
        option.addEventListener("click", () => {
            let storage: Storage | undefined;
            try {
                storage = localStorage;
            } catch {}
            const skin: Skin = applySkin(root, option.dataset.skinOption!, storage);
            sync(skin);
            if (status) status.textContent = (status.dataset.template ?? "{name}").replace("{name}", option.dataset.label ?? skin);
            document.dispatchEvent(new CustomEvent("skinchange", { detail: { skin } }));
        });
    }
}
```

`src/components/Header.astro`:
- importar `SkinSwitcher from "./SkinSwitcher.astro"`.
- el bloque de idioma de escritorio pasa a `<div class="header-lang ml-auto hidden items-center gap-4 md:flex"><SkinSwitcher locale={locale} /><LanguageSwitcher locale={locale} urls={urls} /></div>`.
- en el menú, tras la caja del idioma: `<div class="mt-3 flex items-center justify-between border border-line px-3 py-2.5"><span class="text-xs text-muted" aria-hidden="true">{t("skin.label")}</span><SkinSwitcher locale={locale} /></div>`. Si el registro tiene una sola skin, la caja no debe pintarse: envolverla en `{skinRegistry.length > 1 && (…)}` (importar `skinRegistry`).
- antes de `</header>`: `<p class="sr-only" aria-live="polite" data-skin-status data-template={t("skin.changed")}></p>`.
- en el `<script>`: `import { initSkinSwitcher } from "../scripts/skin-switcher"; initSkinSwitcher();`.
- en `states.css`, el bloque `@supports not selector(:popover-open)` muestra `.header-lang` como `block`: cambiarlo a `display: flex` para que el selector y el idioma queden en fila.

Estilo del selector en las dos skins:
- `terminal.css`:

```css
[data-skin="terminal"] .skin-switcher {
    border: 1px solid var(--skin-line);
}
[data-skin="terminal"] .skin-option {
    color: var(--skin-muted);
}
[data-skin="terminal"] .skin-option[aria-pressed="true"] {
    background: var(--skin-accent);
    color: var(--skin-accent-ink);
}
[data-skin="terminal"] .skin-swatch {
    background: var(--swatch);
}
```

- `tactical.css`:

```css
[data-skin="tactical"] .skin-option {
    font-family: var(--skin-font-mono);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 11.5px;
    color: var(--skin-muted);
    box-shadow: inset 0 0 0 1px var(--skin-line);
}
[data-skin="tactical"] .skin-option[aria-pressed="true"] {
    background: var(--skin-accent);
    color: var(--skin-accent-ink);
    box-shadow: none;
}
[data-skin="tactical"] .skin-swatch {
    background: var(--swatch);
    transform: rotate(45deg);
}
```

- [ ] **Step 3: Run tests and look**

Run: `pnpm check && pnpm test && pnpm test:e2e`
Expected: PASS salvo las capturas de regresión visual (la cabecera ahora tiene el selector): revisar a ojo cabecera y menú en las dos skins y tamaños; si coinciden con [skin-selector.html](../../design/mockups/skin-selector.html) (opción A), `pnpm test:visual:update`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(site): Skin switcher in the header and mobile menu, remembered and announced"
```

---

### Task 6: Movimiento por skin

**Files:**
- Modify: `src/scripts/motion.ts`, `src/styles/skins/tactical.css` (variables animables)
- Test: `tests/e2e/motion.spec.ts`

**Interfaces:**
- Consumes: `data-skin`, `data-timeline` (1), evento `skinchange` (5), variables `--corner-size` y `--kicker-line` de `tactical.css` (4).
- Produces: `introPresets: Record<string, (tl: gsap.core.Timeline, ctx: IntroContext) => void>` interno de `motion.ts`, con `IntroContext = { wide: boolean; prompt: HTMLElement | null; full: string }`.

- [ ] **Step 1: Write the failing tests**

En `tests/e2e/motion.spec.ts`:

```ts
test("Táctico: la intro termina con el nombre completo, las esquinas dibujadas y sin prompt escrito", async ({ page }, info) => {
    test.skip(!info.project.name.endsWith("-tactical"));
    await page.goto("/");
    await expect(page.locator(".hero-name")).toHaveText("Álvaro Rubio Segovia", { timeout: 6000 });
    await expect.poll(() => page.locator(".photo-window").evaluate((el) => getComputedStyle(el, "::before").width), { timeout: 6000 }).toBe("38px");
    await expect(page.locator('.hero .prompt [data-for-skin="terminal"]')).toHaveText("whoami");
});

test("cambiar de skin a mitad de página no deja contenido revelado invisible", async ({ page }, info) => {
    test.skip(info.project.name.endsWith("-tactical"));
    const mobile = info.project.name.startsWith("mobile");
    await page.goto("/");
    for (const card of await page.locator(".t-card").all()) {
        await card.scrollIntoViewIfNeeded();
        await expect(card).toHaveCSS("opacity", "1");
    }
    if (mobile) await page.locator('[popovertarget="site-menu"]').click();
    await page.locator(`${mobile ? "#site-menu" : ".header-lang"} [data-skin-option="tactical"]`).click();
    if (mobile) await page.keyboard.press("Escape");
    for (const card of await page.locator(".t-card").all()) {
        await card.scrollIntoViewIfNeeded();
        await expect(card).toHaveCSS("opacity", "1");
    }
});
```

test("una skin sin preset de intro usa la de Terminal sin escribir el prompt", async ({ page }, info) => {
    test.skip(info.project.name.endsWith("-tactical"));
    // Tras el script de arranque y antes de los módulos: simula una skin futura sin preset.
    await page.addInitScript(() => {
        const obs = new MutationObserver(() => {
            if (document.body) {
                document.documentElement.dataset.skin = "sin-preset";
                obs.disconnect();
            }
        });
        obs.observe(document, { childList: true, subtree: true });
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(page.locator(".hero-name")).toHaveText("Álvaro Rubio Segovia", { timeout: 6000 });
    await expect(page.locator('.hero .prompt [data-for-skin="terminal"]')).toHaveText("whoami");
    expect(errors).toEqual([]);
});

Quitar el `test.skip` de Táctico añadido en la tarea 4 a «con animaciones, la intro termina con el nombre completo».

Run: `pnpm playwright test tests/e2e/motion.spec.ts`
Expected: FAIL — en Táctico las esquinas no se animan desde 0 (y la intro de Terminal intenta escribir un prompt oculto).

- [ ] **Step 2: Implement presets, single mode and `skinchange`**

En `src/scripts/motion.ts`, sustituir el bloque de la intro por presets (el contexto de `gsap.matchMedia` sigue dependiendo solo de `prefers-reduced-motion`):

```ts
type IntroContext = { wide: boolean; prompt: HTMLElement | null; full: string };

const NAME_SCRAMBLE = { duration: 1.1, scrambleText: { text: "{original}", revealDelay: 0.15, speed: 0.6 } };

function revealRest(tl: gsap.core.Timeline, wide: boolean) {
    tl.from([".hero-role", ".hero-loc", ".hero-sum", ".hero-cta"], { opacity: 0, y: 12, duration: 0.5, stagger: 0.08 }, "-=0.4")
        .from(".photo-window", { opacity: 0, x: wide ? -24 : 0, y: wide ? 0 : 16, duration: 0.6 }, "<");
}

// Intro por skin. Una skin sin preset usa la de Terminal sin la escritura del prompt.
const introPresets: Record<string, (tl: gsap.core.Timeline, ctx: IntroContext) => void> = {
    terminal(tl, { wide, prompt, full }) {
        if (prompt) {
            tl.fromTo(prompt, { "--typed": 0 }, {
                "--typed": full.length, duration: full.length * 0.06, ease: `steps(${full.length})`,
                onUpdate() { prompt.textContent = full.slice(0, Math.round(Number(gsap.getProperty(prompt, "--typed")))); },
            });
        }
        tl.from(".hero-name", { ...NAME_SCRAMBLE, scrambleText: { ...NAME_SCRAMBLE.scrambleText, chars: "01<>/#$%_" } }, "+=0.1");
        revealRest(tl, wide);
    },
    tactical(tl, { wide }) {
        tl.fromTo(".photo-window", { "--corner-size": "0px" }, { "--corner-size": "38px", duration: 0.4, ease: "power3.out" })
            .fromTo(".hero .prompt", { "--kicker-line": "0px" }, { "--kicker-line": "26px", duration: 0.35 }, "<0.1")
            .from(".hero-name", { ...NAME_SCRAMBLE, scrambleText: { ...NAME_SCRAMBLE.scrambleText, chars: "0123456789/◆" } }, "-=0.1");
        revealRest(tl, wide);
    },
};
```

Y el `mm.add` de la intro:

```ts
    const prompt = document.querySelector<HTMLElement>('.hero .prompt [data-for-skin="terminal"]');
    const full = prompt?.textContent ?? "";
    mm.add("(prefers-reduced-motion: no-preference)", () => {
        const skin = document.documentElement.dataset.skin ?? "";
        const ctx = { wide: matchMedia("(min-width: 768px)").matches, prompt, full };
        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
        const preset = introPresets[skin];
        if (preset) preset(tl, ctx);
        else introPresets.terminal(tl, { ...ctx, prompt: null });
        return () => { if (prompt) prompt.textContent = full; };
    });
```

En las animaciones de la línea de tiempo, la dirección de entrada depende del modo:

```ts
        const single = document.documentElement.dataset.timeline === "single";
        …
                const dx = wide && !single ? (item.dataset.side === "left" ? -60 : 60) : 30;
```

Y al final de `initMotion`, antes de `data-motion-ready`:

```ts
    // Cambiar de skin cambia la distribución: se recalculan las posiciones, sin repetir la intro.
    document.addEventListener("skinchange", () => ScrollTrigger.refresh());
```

En `tactical.css`, registrar las variables animables para que GSAP las interpole como longitudes:

```css
@property --corner-size {
    syntax: "<length>";
    inherits: false;
    initial-value: 38px;
}
@property --kicker-line {
    syntax: "<length>";
    inherits: false;
    initial-value: 26px;
}
```

- [ ] **Step 3: Run tests**

Run: `pnpm check && pnpm test && pnpm test:e2e`
Expected: PASS. Prueba de mutación: quitar la línea `document.addEventListener("skinchange", …)` y comprobar que «cambiar de skin a mitad de página…» falla en alguna ejecución con `--repeat-each 10`; si no falla nunca, el test no prueba nada y hay que endurecerlo (p. ej. cambiar de skin con la línea de tiempo aún sin revelar y luego hacer scroll). Restaurar la línea.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(motion): Per-skin hero intro, single-mode card entry and refresh on skin change"
```

---

### Task 7: Cierre: verificación en las dos skins y documentación

**Files:**
- Modify: `docs/system-design.md`, `docs/tasks.md`
- Test: suite completa

- [ ] **Step 1: Suite completa y estabilidad**

Run: `pnpm check && pnpm test && pnpm test:e2e`
Expected: PASS en los cuatro proyectos (axe, desbordamiento, movimiento reducido, sin JS, regresión visual con 8 capturas por página).
Run: `pnpm playwright test tests/e2e/switcher.spec.ts tests/e2e/motion.spec.ts --repeat-each 20 --workers 8`
Expected: 0 fallos.

- [ ] **Step 2: Verificación visual**

Capturas a 1280 y 390 px de las dos skins (portada, visor, menú móvil, creador con panel abierto) con movimiento reducido; compararlas con las maquetas aprobadas y anotar diferencias. Comprobar también que el presupuesto de JS pasa (`pnpm vitest run tests/perf`).

- [ ] **Step 3: Documentación**

`docs/system-design.md`, §3 (Portfolio):
- §3.1: el árbol de estilos con `states.css` y `tactical.css`; tokens de distribución (`--hero-*`) y variante `timeline-single` con `data-timeline`; adornos por skin (`adorns` en `ui.ts`, `Adorn.astro`, regla en `states.css` por skin).
- Tabla de JavaScript: fila «Selector de skin | `skin-switcher.ts` + `applySkin` en `src/lib/skins.ts`; evento `skinchange`».
- Pasos para añadir una skin: entrada en `skinRegistry`, hoja en `src/styles/skins/`, import en `global.css`, regla de adornos en `states.css`, nombre `skin.<id>` en `ui.ts`, adornos opcionales, fuentes en `astro.config.mjs`, preset de intro opcional, proyectos de Playwright.

`docs/tasks.md`: en *Hecho*, una línea «Fase 5b (1/2): skin Táctico y selector de skin» con enlaces a spec y plan; en *Pendiente*, la fase 5b pasa a «Skin Menú de juego (ver `design/mockups/hud-directions.html`, dirección C)»; cualquier mejora aplazada en la revisión final, con archivo y línea.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: Document the skin architecture and the Tactical skin"
```
