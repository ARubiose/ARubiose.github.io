# Skin Terminal (fase 5) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar la arquitectura de skins y la skin Terminal aprobada en las maquetas: tokens, fuentes, iconos, cabecera con menú móvil, hero con foto ampliable, timelines, creador de personaje, animaciones GSAP y su batería de tests (incluida la regresión visual).

**Architecture:** Los tokens semánticos de Tailwind (`@theme inline`) apuntan a variables `--skin-*` que define cada skin bajo `[data-skin="…"]`. Los componentes maquetan con utilidades y se visten con clases semánticas que estiliza la skin. El JavaScript son módulos pequeños (`src/scripts/`) que mejoran un HTML ya completo; la lógica testeable vive en funciones puras de `src/lib/`.

**Tech Stack:** Astro 7.3 (API de fuentes, Container API), Tailwind 4.3, TypeScript 6, GSAP 3.15 (ScrollTrigger, ScrambleTextPlugin), simple-icons 16, @phosphor-icons/core 2, Vitest 5, Playwright 1.63 + @axe-core/playwright.

**Spec:** [docs/superpowers/specs/2026-10-02-terminal-skin-design.md](../specs/2026-10-02-terminal-skin-design.md) · Maquetas: [docs/design/mockups/](../../design/mockups/)

## Global Constraints

- Node 24: antes de cualquier comando, `source ~/.nvm/nvm.sh && nvm use`.
- Solo modo oscuro. `<html data-skin="terminal">`. Esquinas rectas (radio 0).
- Tokens de la skin Terminal (spec §2): `bg #0c0f0d`, `surface #121714`, `surface-2 #18201b`, `line #223228`, `text #e3ece5`, `body #c4d0c7`, `muted #93a59a`, `accent #9fd65a`, `accent-ink #0c0f0d`, `warn #e0a63a` (solo para el aviso de personaje roto).
- Fuentes: Space Grotesk 500/700 (titulares) e IBM Plex Mono 400/500 (resto), vía API de fuentes de Astro. Nunca `<link>` a Google Fonts.
- Iconos: `simple-icons` y `@phosphor-icons/core` como SVG en línea con `currentColor`. Sin CDN ni SVG dibujados a mano.
- Periodos con guion con espacios (`jun 2026 - actualidad`) y fechas en `<time datetime>`.
- Sin JavaScript o con `prefers-reduced-motion`, todo el contenido es visible. Animaciones solo con `gsap.from()` y dentro de `gsap.matchMedia("(prefers-reduced-motion: no-preference)")`.
- Prohibido `window.addEventListener("scroll")`; usar `IntersectionObserver` o ScrollTrigger.
- Sin raya (`—`) en textos visibles de la página.
- El contenido sale solo de `wiki/public/`; lo único escrito a mano en `src/` es `src/i18n/ui.ts`.
- Nada de `raw/` ni `wiki/private/` en archivos versionados ni en mensajes de commit.
- Commits como `ARubiose`, terminando con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- **Periodos solapados** (un proyecto personal que coincide con un puesto): la XP de una habilidad cuenta los meses una sola vez. Test en Task 4 (`skillXp no suma meses solapados`).
- **Habilidad que ningún puesto cita:** muestra «sin uso registrado», nunca 0 ni un valor inventado, y no rompe el inspector ni la combinación. Tests en Task 4 y Task 12.
- **Build que sobrevive al cambio de pestaña:** equipar en Backend, cambiar a DevOps, equipar y quitar desde los huecos de la ficha mantiene un estado coherente. Test E2E en Task 13.
- **Texto largo en 390 px** (habilidades como «Deep learning y visión por computador», títulos de máster): sin scroll horizontal en la página. Test E2E en Task 15 (`sin desbordamiento horizontal`).
- **Visor de la foto con teclado:** Tab no escapa del diálogo, Esc cierra y el foco vuelve al botón. Test E2E en Task 9.

---

## Mapa de archivos

| Archivo | Responsabilidad |
| --- | --- |
| `astro.config.mjs` | Fuentes (API de Astro) |
| `src/styles/global.css` | Tailwind, `@theme inline` con tokens semánticos, imports |
| `src/styles/base.css` | Reset, foco, scroll suave, reduced-motion, utilidades |
| `src/styles/skins/terminal.css` | Variables y decoración de la skin Terminal |
| `src/lib/skins.ts` | Registro de skins y `resolveSkin` |
| `src/lib/dates.ts` | `formatPeriod` (guion), `toDatetime`, `monthIndex` |
| `src/lib/icons.ts` | `parseIcon`, `iconExists`, `iconSvg` |
| `src/lib/skills.ts` | XP, combinación, personaje roto, referencias rotas |
| `src/lib/schemas.ts` | Campos `skills` e `icon` |
| `src/lib/home.ts` | Vista de la portada con ids, archivos, XP y usos |
| `src/i18n/ui.ts` | Claves nuevas de interfaz |
| `src/components/Icon.astro` | SVG en línea a partir de `si:`/`ph:` |
| `src/components/Window.astro` | Ventana con barra de título |
| `src/components/Header.astro` | Cabecera + menú móvil (popover) |
| `src/components/ProfilePhoto.astro` | Foto con botón y `<dialog>` |
| `src/components/Timeline.astro`, `TimelineItem.astro` | Timeline alterno |
| `src/components/SkillBuilder.astro` | Creador de personaje (HTML completo sin JS) |
| `src/sections/*.astro` | Secciones reescritas |
| `src/scripts/nav.ts` | Sección activa |
| `src/scripts/lightbox.ts` | Visor de la foto |
| `src/scripts/skill-builder.ts` | Interactividad del creador |
| `src/scripts/tab-edges.ts` | Flechas de scroll de las pestañas |
| `src/scripts/motion.ts` | Animaciones GSAP |
| `tests/unit/{skins,icons,skills}.test.ts` | Unitarios nuevos |
| `tests/e2e/{nav,photo,builder,motion,visual}.spec.ts` | E2E nuevos |
| `tests/perf/budget.test.ts` | Presupuesto de JS |

**Cambio respecto a la spec §3.3 (se recoge en Task 16):** la integridad de `skills` no usa `reference("skills")` de Astro, sino `findBrokenSkillRefs` (pura) llamada en `HomePage.astro` (el build falla) y en el test de contrato. Motivo: los esquemas viven en `src/lib/schemas.ts`, que los tests importan sin `astro:content`.

---

### Task 1: Dependencias, fuentes, tokens y skin base

**Files:**
- Modify: `package.json`, `astro.config.mjs`, `src/styles/global.css`, `src/layouts/Layout.astro`
- Create: `src/styles/base.css`, `src/styles/skins/terminal.css`, `src/lib/skins.ts`
- Test: `tests/unit/skins.test.ts`

**Interfaces:**
- Produces: `skins: readonly ["terminal"]`, `type Skin`, `defaultSkin: Skin`, `resolveSkin(stored: string | null): Skin`, `SKIN_STORAGE_KEY = "skin"`. Utilidades Tailwind `bg-bg`, `bg-surface`, `bg-surface-2`, `text-text`, `text-body`, `text-muted`, `text-accent`, `bg-accent`, `text-accent-ink`, `border-line`, `text-warn`, `border-warn`, `font-display`, `font-mono`. Clases semánticas de la skin listadas en `terminal.css`.

- [ ] **Step 1: Instalar dependencias**

```bash
source ~/.nvm/nvm.sh && nvm use
pnpm add gsap simple-icons @phosphor-icons/core
```

- [ ] **Step 2: Test que falla**

`tests/unit/skins.test.ts`:

```ts
import { expect, test } from "vitest";
import { defaultSkin, resolveSkin, skins } from "@lib/skins";

test("la skin por defecto es terminal y está registrada", () => {
    expect(defaultSkin).toBe("terminal");
    expect(skins).toContain(defaultSkin);
});

test("resolveSkin acepta una skin registrada", () => {
    expect(resolveSkin("terminal")).toBe("terminal");
});

test("resolveSkin vuelve a la predeterminada con valores desconocidos o vacíos", () => {
    expect(resolveSkin(null)).toBe(defaultSkin);
    expect(resolveSkin("")).toBe(defaultSkin);
    expect(resolveSkin("tactical")).toBe(defaultSkin);
});
```

Run: `pnpm test tests/unit/skins.test.ts` → Expected: FAIL (no se resuelve `@lib/skins`).

- [ ] **Step 3: Registro de skins**

`src/lib/skins.ts`:

```ts
export const skins = ["terminal"] as const;
export type Skin = (typeof skins)[number];
export const defaultSkin: Skin = "terminal";
export const SKIN_STORAGE_KEY = "skin";

export function resolveSkin(stored: string | null): Skin {
    return (skins as readonly string[]).includes(stored ?? "") ? (stored as Skin) : defaultSkin;
}
```

Run: `pnpm test tests/unit/skins.test.ts` → Expected: 3 PASS.

- [ ] **Step 4: Fuentes en `astro.config.mjs`**

```js
// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
    i18n: {
        locales: ["en", "es"],
        defaultLocale: "es",
    },
    fonts: [
        {
            provider: fontProviders.fontsource(),
            name: "Space Grotesk",
            cssVariable: "--font-space-grotesk",
            weights: [500, 700],
            styles: ["normal"],
            subsets: ["latin", "latin-ext"],
            fallbacks: ["sans-serif"],
        },
        {
            provider: fontProviders.fontsource(),
            name: "IBM Plex Mono",
            cssVariable: "--font-ibm-plex-mono",
            weights: [400, 500],
            styles: ["normal"],
            subsets: ["latin", "latin-ext"],
            fallbacks: ["monospace"],
        },
    ],
    vite: {
        plugins: [tailwindcss()],
    },
});
```

- [ ] **Step 5: Tokens (`src/styles/global.css`)**

```css
@import "tailwindcss";
@import "./base.css";
@import "./skins/terminal.css";

/* Tokens semánticos: apuntan a variables que define cada skin. */
@theme inline {
    --color-bg: var(--skin-bg);
    --color-surface: var(--skin-surface);
    --color-surface-2: var(--skin-surface-2);
    --color-line: var(--skin-line);
    --color-text: var(--skin-text);
    --color-body: var(--skin-body);
    --color-muted: var(--skin-muted);
    --color-accent: var(--skin-accent);
    --color-accent-ink: var(--skin-accent-ink);
    --color-warn: var(--skin-warn);
    --font-display: var(--skin-font-display);
    --font-mono: var(--skin-font-mono);
    --radius-skin: var(--skin-radius);
}
```

- [ ] **Step 6: Base (`src/styles/base.css`)**

```css
:root {
    --header-h: 52px;
}

html {
    scroll-behavior: smooth;
    background: var(--skin-bg);
    color: var(--skin-text);
    font-family: var(--skin-font-mono);
    -webkit-text-size-adjust: 100%;
}

body {
    min-height: 100dvh;
    overflow-x: clip;
}

[id] {
    scroll-margin-top: calc(var(--header-h) + 16px);
}

a {
    color: inherit;
    text-decoration: none;
}

button {
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    cursor: pointer;
}

:focus-visible {
    outline: 2px solid var(--skin-accent);
    outline-offset: 3px;
}

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

@media (prefers-reduced-motion: reduce) {
    html {
        scroll-behavior: auto;
    }
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
```

- [ ] **Step 7: Skin Terminal (`src/styles/skins/terminal.css`)**

```css
[data-skin="terminal"] {
    --skin-bg: #0c0f0d;
    --skin-surface: #121714;
    --skin-surface-2: #18201b;
    --skin-line: #223228;
    --skin-text: #e3ece5;
    --skin-body: #c4d0c7;
    --skin-muted: #93a59a;
    --skin-accent: #9fd65a;
    --skin-accent-ink: #0c0f0d;
    --skin-warn: #e0a63a;
    --skin-font-display: var(--font-space-grotesk);
    --skin-font-mono: var(--font-ibm-plex-mono);
    --skin-radius: 0;
}

/* Scanlines: capa fija sin eventos, nunca sobre contenedores con scroll */
[data-skin="terminal"] body::after {
    content: "";
    position: fixed;
    inset: 0;
    z-index: 60;
    pointer-events: none;
    background: repeating-linear-gradient(0deg, rgb(255 255 255 / 0.016) 0 1px, transparent 1px 3px);
}

/* Ventanas */
[data-skin="terminal"] .window {
    border: 1px solid var(--skin-line);
    background: var(--skin-surface);
}
[data-skin="terminal"] .window-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 7px 14px;
    border-bottom: 1px solid var(--skin-line);
    font-size: 12.5px;
    color: var(--skin-muted);
}
[data-skin="terminal"] .window-tag {
    color: var(--skin-accent-ink);
    background: var(--skin-accent);
    padding: 0 6px;
    font-size: 11px;
}

/* Titulares de sección */
[data-skin="terminal"] .section-title {
    font-family: var(--skin-font-display);
    font-weight: 700;
    letter-spacing: -0.01em;
}
[data-skin="terminal"] .section-title::before {
    content: "## ";
    color: var(--skin-accent);
    font-family: var(--skin-font-mono);
    font-weight: 500;
    font-size: 0.73em;
}

/* Prompt y cursor */
[data-skin="terminal"] .prompt {
    color: var(--skin-accent);
}
[data-skin="terminal"] .prompt::before {
    content: "> ";
}
[data-skin="terminal"] .cursor {
    display: inline-block;
    width: 0.5em;
    height: 0.8em;
    background: var(--skin-accent);
    vertical-align: -0.05em;
    margin-left: 0.15em;
    animation: terminal-blink 1.1s steps(1) infinite;
}
@keyframes terminal-blink {
    50% {
        opacity: 0;
    }
}

/* Listas con marcador */
[data-skin="terminal"] .marker-list {
    list-style: none;
}
[data-skin="terminal"] .marker-list li {
    padding-left: 2ch;
    text-indent: -2ch;
}
[data-skin="terminal"] .marker-list li::before {
    content: "> ";
    color: var(--skin-accent);
}

/* Navegación */
[data-skin="terminal"] .nav-link::before {
    content: "> ";
    color: var(--skin-accent);
    opacity: 0;
    margin-left: -2ch;
    transition: opacity 0.2s, margin 0.2s;
}
[data-skin="terminal"] .nav-link[aria-current="true"] {
    color: var(--skin-text);
}
[data-skin="terminal"] .nav-link[aria-current="true"]::before {
    opacity: 1;
    margin-left: 0;
}

/* Botones */
[data-skin="terminal"] .btn {
    display: inline-flex;
    justify-content: center;
    padding: 10px 16px;
    border: 1px solid var(--skin-accent);
    font-size: 13.5px;
    transition: transform 0.15s, background 0.2s, color 0.2s;
}
[data-skin="terminal"] .btn:active {
    transform: translateY(1px);
}
[data-skin="terminal"] .btn-primary {
    background: var(--skin-accent);
    color: var(--skin-accent-ink);
    font-weight: 500;
}
[data-skin="terminal"] .btn-primary:hover {
    background: transparent;
    color: var(--skin-accent);
}
[data-skin="terminal"] .btn-secondary {
    color: var(--skin-accent);
}
[data-skin="terminal"] .btn-secondary:hover {
    background: var(--skin-accent);
    color: var(--skin-accent-ink);
}

/* Timeline */
[data-skin="terminal"] .timeline-rail {
    background: var(--skin-line);
}
[data-skin="terminal"] .timeline-fill {
    background: var(--skin-accent);
    transform-origin: top;
}
[data-skin="terminal"] .timeline-node {
    width: 14px;
    height: 14px;
    background: var(--skin-bg);
    border: 2px solid var(--skin-accent);
    transform: rotate(45deg);
}
[data-skin="terminal"] .t-item[data-current] .timeline-node {
    background: var(--skin-accent);
    box-shadow: 0 0 0 5px color-mix(in oklab, var(--skin-accent) 22%, transparent);
}
[data-skin="terminal"] .t-when {
    color: var(--skin-accent);
    font-size: 13px;
}

/* Tree de habilidades y README */
[data-skin="terminal"] .readme-title::before {
    content: "# ";
    color: var(--skin-accent);
}
[data-skin="terminal"] .badge {
    border: 1px solid var(--skin-accent);
    color: var(--skin-accent);
    padding: 1px 7px;
    font-size: 11.5px;
}

/* Creador de personaje */
[data-skin="terminal"] .tile {
    border: 1px solid var(--skin-line);
    background: var(--skin-surface);
    transition: border-color 0.15s, transform 0.15s, background 0.15s;
}
[data-skin="terminal"] .tile:hover {
    border-color: color-mix(in oklab, var(--skin-accent) 50%, var(--skin-line));
}
[data-skin="terminal"] .tile[data-selected] {
    border-color: var(--skin-accent);
    background: var(--skin-surface-2);
}
[data-skin="terminal"] .tile-equip {
    border-left: 1px solid var(--skin-line);
    color: var(--skin-muted);
    transition: background 0.15s, color 0.15s;
}
[data-skin="terminal"] .tile-equip[aria-pressed="true"] {
    background: var(--skin-accent);
    color: var(--skin-accent-ink);
    border-left-color: var(--skin-accent);
}
[data-skin="terminal"] .tile-equip.is-popping {
    animation: terminal-pop 0.25s ease-out;
}
@keyframes terminal-pop {
    50% {
        transform: scale(1.25);
    }
}
[data-skin="terminal"] .tab {
    border: 1px solid var(--skin-line);
    color: var(--skin-muted);
    padding: 6px 10px;
    font-size: 12.5px;
}
[data-skin="terminal"] .tab[aria-selected="true"] {
    color: var(--skin-accent-ink);
    background: var(--skin-accent);
    border-color: var(--skin-accent);
}
[data-skin="terminal"] .slot {
    border: 1px dashed var(--skin-line);
}
[data-skin="terminal"] .slot[data-filled] {
    border-style: solid;
    border-color: var(--skin-accent);
    background: color-mix(in oklab, var(--skin-accent) 8%, var(--skin-surface));
}
[data-skin="terminal"] .slot[data-over] {
    border-color: var(--skin-warn);
    background: color-mix(in oklab, var(--skin-warn) 10%, var(--skin-surface));
}
[data-skin="terminal"] .broken {
    border: 1px solid var(--skin-warn);
    color: #f0c06a;
    padding: 8px 10px;
    font-size: 12.5px;
    animation: terminal-glitch 0.35s steps(2) 2;
}
@keyframes terminal-glitch {
    0% {
        transform: translateX(-2px);
    }
    50% {
        transform: translateX(2px);
    }
    100% {
        transform: none;
    }
}
[data-skin="terminal"] .edge-btn {
    border: 1px solid var(--skin-accent);
    color: var(--skin-accent);
    background: var(--skin-bg);
}
[data-skin="terminal"] .edge-btn {
    animation: terminal-nudge 1.6s ease-in-out 2;
}
@keyframes terminal-nudge {
    50% {
        transform: translateX(3px);
    }
}
```

- [ ] **Step 8: Layout con skin, fuentes y script de preferencia**

`src/layouts/Layout.astro`:

```astro
---
import "@styles/global.css";
import { Font } from "astro:assets";
import type { Locale } from "@i18n/ui";
import { defaultSkin, SKIN_STORAGE_KEY, skins } from "@lib/skins";

interface Props {
    locale: Locale;
    title: string;
    description: string;
}
const { locale, title, description } = Astro.props;
---

<!doctype html>
<html lang={locale} data-skin={defaultSkin}>
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="dark" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:locale" content={locale === "es" ? "es_ES" : "en_US"} />
        <Font cssVariable="--font-space-grotesk" preload />
        <Font cssVariable="--font-ibm-plex-mono" preload />
        <script is:inline define:vars={{ skins, key: SKIN_STORAGE_KEY }}>
            try {
                const stored = localStorage.getItem(key);
                if (stored && skins.includes(stored)) document.documentElement.dataset.skin = stored;
            } catch {}
        </script>
    </head>
    <body class="bg-bg text-text font-mono">
        <slot />
    </body>
</html>
```

- [ ] **Step 9: Comprobar**

Run: `pnpm test && pnpm build && pnpm check`
Expected: tests en verde (las secciones aún usan clases antiguas: es normal que se vean sin estilo), build correcta, 0 errores. `grep -o 'data-skin="terminal"' dist/index.html` devuelve una línea y en `dist/_astro/` hay archivos `.woff2`.

Run: `pnpm test:e2e`
Expected: puede fallar solo `sin violaciones de accesibilidad graves` por contraste de clases antiguas (`text-neutral-*`, `bg-white`); se arregla en Tasks 8–12. Cualquier otro fallo hay que corregirlo aquí. Anotar el resultado en el commit.

- [ ] **Step 10: Commit**

```bash
git add package.json pnpm-lock.yaml astro.config.mjs src/styles src/lib/skins.ts src/layouts/Layout.astro tests/unit/skins.test.ts
git commit -m "feat(style): Add skin architecture, Terminal tokens and self-hosted fonts"
```

---

### Task 2: Periodos con guion y `<time datetime>`

**Files:**
- Modify: `src/lib/dates.ts`, `tests/unit/dates.test.ts`, `tests/unit/home.test.ts`, `tests/components/sections.test.ts`

**Interfaces:**
- Produces: `formatPeriod(start, end, locale): string` con separador `" - "`; `toDatetime(value: string): string` (devuelve el mismo `AAAA` o `AAAA-MM`); `monthIndex(value: string): number` (año·12 + mes-1; sin mes = enero); `PERIOD_SEPARATOR = " - "`.

- [ ] **Step 1: Actualizar tests (fallan)**

En `tests/unit/dates.test.ts`, sustituir cada `–` por `-` en las expectativas de `formatPeriod` y añadir al final:

```ts
import { monthIndex, toDatetime } from "@lib/dates";

describe("toDatetime", () => {
    test("devuelve un valor válido para el atributo datetime", () => {
        expect(toDatetime("2026-06")).toBe("2026-06");
        expect(toDatetime("2015")).toBe("2015");
    });
});

describe("monthIndex", () => {
    test("cuenta meses desde el año 0; sin mes es enero", () => {
        expect(monthIndex("2026-06") - monthIndex("2026-01")).toBe(5);
        expect(monthIndex("2015")).toBe(monthIndex("2015-01"));
    });
});
```

(Fusionar el `import` con el existente.) En `tests/unit/home.test.ts:55` y `tests/components/sections.test.ts:22,35` cambiar `"Jun 2026 – present"` por `"Jun 2026 - present"`.

Run: `pnpm test tests/unit/dates.test.ts` → Expected: FAIL (separador y funciones nuevas).

- [ ] **Step 2: Implementar**

En `src/lib/dates.ts`, añadir y cambiar:

```ts
export const PERIOD_SEPARATOR = " - ";

export function toDatetime(value: string): string {
    return value;
}

export function monthIndex(value: string): number {
    const { year, month } = parts(value);
    return year * 12 + ((month ?? 1) - 1);
}
```

y en `formatPeriod` sustituir `` return `${from} – ${to}`; `` por `` return `${from}${PERIOD_SEPARATOR}${to}`; ``.

Run: `pnpm test` → Expected: todo PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/dates.ts tests/unit tests/components/sections.test.ts
git commit -m "feat(lib): Use hyphen period separator and expose datetime helpers"
```

---

### Task 3: Iconos (`si:` / `ph:`) y campo `icon`

**Files:**
- Create: `src/lib/icons.ts`, `tests/unit/icons.test.ts`, `tests/fixtures/wiki/invalid/bad-icon-format.md`, `tests/fixtures/wiki/invalid/unknown-icon.md`
- Modify: `src/lib/schemas.ts`, `tests/fixtures/wiki/valid/skill.md`, `tests/fixtures/wiki/invalid/unknown-category.md`

**Interfaces:**
- Produces: `type IconRef = { set: "si" | "ph"; name: string }`, `parseIcon(ref: string): IconRef | null`, `iconExists(ref: string): boolean`, `iconSvg(ref: string): string` (SVG con `fill="currentColor"`, `aria-hidden="true"`, `focusable="false"`; lanza si no existe). `skillSchema` exige `icon` válido y existente.

- [ ] **Step 1: Tests que fallan**

`tests/unit/icons.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { iconExists, iconSvg, parseIcon } from "@lib/icons";

describe("parseIcon", () => {
    test("separa el origen del nombre", () => {
        expect(parseIcon("si:python")).toEqual({ set: "si", name: "python" });
        expect(parseIcon("ph:tree-structure")).toEqual({ set: "ph", name: "tree-structure" });
    });

    test("rechaza formatos inválidos", () => {
        expect(parseIcon("python")).toBeNull();
        expect(parseIcon("fa:python")).toBeNull();
        expect(parseIcon("si:Python")).toBeNull();
    });
});

describe("iconExists", () => {
    test.each(["si:python", "si:githubactions", "si:html5", "ph:robot", "ph:detective", "ph:scan", "ph:tree-structure"])(
        "%s existe",
        (ref) => expect(iconExists(ref)).toBe(true),
    );

    test.each(["si:notarealicon", "ph:not-a-real-icon", "nope"])("%s no existe", (ref) => {
        expect(iconExists(ref)).toBe(false);
    });
});

describe("iconSvg", () => {
    test("Simple Icons: SVG en línea con currentColor y oculto a lectores", () => {
        const svg = iconSvg("si:python");
        expect(svg).toMatch(/^<svg[^>]*viewBox="0 0 24 24"/);
        expect(svg).toContain('fill="currentColor"');
        expect(svg).toContain('aria-hidden="true"');
        expect(svg).toContain("<path");
    });

    test("Phosphor: SVG en línea con currentColor y oculto a lectores", () => {
        const svg = iconSvg("ph:robot");
        expect(svg).toMatch(/^<svg[^>]*viewBox="0 0 256 256"/);
        expect(svg).toContain('fill="currentColor"');
        expect(svg).toContain('aria-hidden="true"');
    });

    test("lanza con un icono inexistente", () => {
        expect(() => iconSvg("si:notarealicon")).toThrow(/notarealicon/);
    });
});
```

Run: `pnpm test tests/unit/icons.test.ts` → Expected: FAIL (módulo inexistente).

- [ ] **Step 2: Implementar `src/lib/icons.ts`**

```ts
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import * as simpleIcons from "simple-icons";

export type IconRef = { set: "si" | "ph"; name: string };

const ICON_REF = /^(si|ph):([a-z0-9-]+)$/;
const require = createRequire(import.meta.url);
const phosphorDir = join(dirname(require.resolve("@phosphor-icons/core/package.json")), "assets", "regular");

type SimpleIcon = { path: string; title: string };

export function parseIcon(ref: string): IconRef | null {
    const m = ref.match(ICON_REF);
    return m ? { set: m[1] as IconRef["set"], name: m[2] } : null;
}

function simpleIcon(name: string): SimpleIcon | undefined {
    const key = `si${name.charAt(0).toUpperCase()}${name.slice(1)}`;
    return (simpleIcons as unknown as Record<string, SimpleIcon>)[key];
}

function phosphorPath(name: string): string {
    return join(phosphorDir, `${name}.svg`);
}

export function iconExists(ref: string): boolean {
    const icon = parseIcon(ref);
    if (!icon) return false;
    return icon.set === "si" ? simpleIcon(icon.name) !== undefined : existsSync(phosphorPath(icon.name));
}

const A11Y = 'fill="currentColor" aria-hidden="true" focusable="false"';

export function iconSvg(ref: string): string {
    const icon = parseIcon(ref);
    if (!icon || !iconExists(ref)) throw new Error(`Icono desconocido: ${ref}`);
    if (icon.set === "si") {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${A11Y}><path d="${simpleIcon(icon.name)!.path}"/></svg>`;
    }
    const raw = readFileSync(phosphorPath(icon.name), "utf8").trim();
    return raw.replace(/^<svg([^>]*)>/, (_m, attrs: string) => `<svg${attrs.replace(/\s*fill="[^"]*"/, "")} ${A11Y}>`);
}
```

Run: `pnpm test tests/unit/icons.test.ts` → Expected: PASS. Si `si:githubactions` falla, comprobar la clave real con `node -e "console.log(Object.keys(require('simple-icons')).filter(k=>/github/i.test(k)))"` y ajustar la conversión de nombre (no el test).

- [ ] **Step 3: Campo `icon` en el esquema (test de contrato que falla)**

Añadir `icon: si:python` a `tests/fixtures/wiki/valid/skill.md` (después de `category`) y `icon: si:python` también a `tests/fixtures/wiki/invalid/unknown-category.md`, para que ese fixture siga fallando solo por la categoría. Crear:

`tests/fixtures/wiki/invalid/bad-icon-format.md`: copia de `valid/skill.md` con `icon: python`.
`tests/fixtures/wiki/invalid/unknown-icon.md`: copia de `valid/skill.md` con `icon: si:notarealicon`.

Run: `pnpm test tests/content/schemas.test.ts` → Expected: FAIL (los dos inválidos nuevos pasan porque el esquema aún no conoce `icon`).

- [ ] **Step 4: Implementar en `src/lib/schemas.ts`**

Añadir el import y el campo en `skillSchema`:

```ts
import { iconExists } from "./icons";

const icon = z
    .string()
    .regex(/^(si|ph):[a-z0-9-]+$/, "Formato esperado: si:<slug> o ph:<nombre>")
    .refine(iconExists, { message: "El icono no existe en simple-icons ni en Phosphor" });
```

```ts
export const skillSchema = z.object({
    ...meta,
    type: z.literal("skill"),
    category: z.enum(skillCategories),
    icon,
    en: z.object({ summary: text }),
});
```

Run: `pnpm test tests/content/schemas.test.ts tests/unit/icons.test.ts` → Expected: PASS. `tests/content/wiki.test.ts` fallará porque las habilidades reales no tienen `icon`: se resuelve en Task 6 (anotarlo en el commit).

- [ ] **Step 5: Commit**

```bash
git add src/lib/icons.ts src/lib/schemas.ts tests/unit/icons.test.ts tests/fixtures/wiki
git commit -m "feat(content): Add icon references resolved from simple-icons and Phosphor"
```

---

### Task 4: Lógica de habilidades (XP, combinación, personaje roto)

**Files:**
- Create: `src/lib/skills.ts`, `tests/unit/skills.test.ts`
- Modify: `src/i18n/ui.ts` (claves de XP)

**Interfaces:**
- Consumes: `monthIndex` (Task 2), `Locale`, `useTranslations`.
- Produces:
  - `type Span = { start: string; end: string | null }`
  - `monthsCovered(spans: Span[], now: string): number`
  - `skillUsage(entries: { id: string; skills?: string[] }[]): Record<string, string[]>` (skill id → ids de entradas)
  - `formatXp(months: number, locale: Locale): string` (largo: «3 años y 10 meses» / «3 years 10 months»; 0 → texto de `skills.noUse`)
  - `formatXpShort(months: number, locale: Locale): string` («3,8 años» / «3.8 years» / «6 meses»)
  - `rankCombination(build: string[], usage: Record<string, string[]>): { id: string; hits: number }[]` (orden: más aciertos primero; empate por orden de aparición en `usage`)
  - `BUILD_CAP = 6`, `isBrokenBuild(count: number): boolean`
  - `findBrokenSkillRefs(entries: { id: string; skills?: string[] }[], skillIds: string[]): { entry: string; skill: string }[]`

- [ ] **Step 1: Claves de interfaz**

En `src/i18n/ui.ts` añadir en `es`:

```ts
        "xp.year": "año",
        "xp.years": "años",
        "xp.month": "mes",
        "xp.months": "meses",
        "xp.and": "y",
        "skills.noUse": "sin uso registrado",
```

y en `en`:

```ts
        "xp.year": "year",
        "xp.years": "years",
        "xp.month": "month",
        "xp.months": "months",
        "xp.and": "",
        "skills.noUse": "no recorded use",
```

- [ ] **Step 2: Tests que fallan**

`tests/unit/skills.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import {
    BUILD_CAP,
    findBrokenSkillRefs,
    formatXp,
    formatXpShort,
    isBrokenBuild,
    monthsCovered,
    rankCombination,
    skillUsage,
} from "@lib/skills";

const NOW = "2026-10";

describe("monthsCovered", () => {
    test("cuenta los meses de un periodo cerrado (fin exclusivo)", () => {
        expect(monthsCovered([{ start: "2020-01", end: "2020-07" }], NOW)).toBe(6);
    });

    test("un periodo vigente cuenta hasta la fecha del build", () => {
        expect(monthsCovered([{ start: "2026-06", end: null }], NOW)).toBe(4);
    });

    test("no suma meses solapados", () => {
        const spans = [
            { start: "2022-08", end: "2026-06" },
            { start: "2025-01", end: null },
        ];
        expect(monthsCovered(spans, NOW)).toBe(monthsCovered([{ start: "2022-08", end: null }], NOW));
    });

    test("sin periodos son 0 meses", () => {
        expect(monthsCovered([], NOW)).toBe(0);
    });
});

describe("skillUsage", () => {
    test("invierte entradas → habilidades en habilidad → entradas", () => {
        expect(
            skillUsage([
                { id: "zalcu", skills: ["python", "docker"] },
                { id: "gofore", skills: ["python"] },
                { id: "oesia" },
            ]),
        ).toEqual({ python: ["zalcu", "gofore"], docker: ["zalcu"] });
    });
});

describe("formatXp", () => {
    test("largo en español e inglés", () => {
        expect(formatXp(46, "es")).toBe("3 años y 10 meses");
        expect(formatXp(46, "en")).toBe("3 years 10 months");
        expect(formatXp(12, "es")).toBe("1 año");
        expect(formatXp(1, "en")).toBe("1 month");
    });

    test("0 meses es «sin uso registrado»", () => {
        expect(formatXp(0, "es")).toBe("sin uso registrado");
        expect(formatXp(0, "en")).toBe("no recorded use");
    });

    test("corto con decimales según el idioma", () => {
        expect(formatXpShort(46, "es")).toBe("3,8 años");
        expect(formatXpShort(46, "en")).toBe("3.8 years");
        expect(formatXpShort(6, "es")).toBe("6 meses");
        expect(formatXpShort(0, "es")).toBe("sin uso registrado");
    });
});

describe("rankCombination", () => {
    const usage = { fastapi: ["skin-ai", "zalcu"], celery: ["zalcu"], docker: ["zalcu"], expo: ["skin-ai"] };

    test("ordena por aciertos y omite entradas sin ninguno", () => {
        expect(rankCombination(["fastapi", "celery", "docker"], usage)).toEqual([
            { id: "zalcu", hits: 3 },
            { id: "skin-ai", hits: 1 },
        ]);
    });

    test("empate: conserva el orden de aparición", () => {
        expect(rankCombination(["expo", "celery"], usage)).toEqual([
            { id: "skin-ai", hits: 1 },
            { id: "zalcu", hits: 1 },
        ]);
    });

    test("build vacía o habilidades sin uso → lista vacía", () => {
        expect(rankCombination([], usage)).toEqual([]);
        expect(rankCombination(["llm-agents"], usage)).toEqual([]);
    });
});

describe("isBrokenBuild", () => {
    test(`hasta ${BUILD_CAP} no está roto; a partir de ${BUILD_CAP + 1} sí`, () => {
        expect(BUILD_CAP).toBe(6);
        expect(isBrokenBuild(6)).toBe(false);
        expect(isBrokenBuild(7)).toBe(true);
    });
});

describe("findBrokenSkillRefs", () => {
    test("lista cada referencia a una habilidad inexistente", () => {
        expect(
            findBrokenSkillRefs(
                [
                    { id: "zalcu", skills: ["python", "cobol"] },
                    { id: "oesia", skills: ["osint"] },
                    { id: "gofore" },
                ],
                ["python", "osint"],
            ),
        ).toEqual([{ entry: "zalcu", skill: "cobol" }]);
    });
});
```

Run: `pnpm test tests/unit/skills.test.ts` → Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `src/lib/skills.ts`**

```ts
import type { Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";
import { monthIndex } from "./dates";

export type Span = { start: string; end: string | null };
type WithSkills = { id: string; skills?: string[] };

export const BUILD_CAP = 6;

export function monthsCovered(spans: Span[], now: string): number {
    const covered = new Set<number>();
    for (const { start, end } of spans) {
        for (let m = monthIndex(start); m < monthIndex(end ?? now); m++) covered.add(m);
    }
    return covered.size;
}

export function skillUsage(entries: WithSkills[]): Record<string, string[]> {
    const usage: Record<string, string[]> = {};
    for (const entry of entries) {
        for (const skill of entry.skills ?? []) (usage[skill] ??= []).push(entry.id);
    }
    return usage;
}

export function formatXp(months: number, locale: Locale): string {
    const t = useTranslations(locale);
    if (months <= 0) return t("skills.noUse");
    const y = Math.floor(months / 12);
    const m = months % 12;
    const parts = [
        y ? `${y} ${t(y === 1 ? "xp.year" : "xp.years")}` : "",
        m ? `${m} ${t(m === 1 ? "xp.month" : "xp.months")}` : "",
    ].filter(Boolean);
    const joiner = t("xp.and") ? ` ${t("xp.and")} ` : " ";
    return parts.join(joiner);
}

export function formatXpShort(months: number, locale: Locale): string {
    const t = useTranslations(locale);
    if (months <= 0) return t("skills.noUse");
    if (months < 12) return `${months} ${t(months === 1 ? "xp.month" : "xp.months")}`;
    const years = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(months / 12);
    return `${years} ${t("xp.years")}`;
}

export function rankCombination(build: string[], usage: Record<string, string[]>) {
    const order: string[] = [];
    const hits = new Map<string, number>();
    for (const ids of Object.values(usage)) for (const id of ids) if (!order.includes(id)) order.push(id);
    for (const skill of build) for (const id of usage[skill] ?? []) hits.set(id, (hits.get(id) ?? 0) + 1);
    return order
        .filter((id) => hits.has(id))
        .map((id) => ({ id, hits: hits.get(id)! }))
        .sort((a, b) => b.hits - a.hits);
}

export function isBrokenBuild(count: number): boolean {
    return count > BUILD_CAP;
}

export function findBrokenSkillRefs(entries: WithSkills[], skillIds: string[]) {
    const known = new Set(skillIds);
    return entries.flatMap((e) => (e.skills ?? []).filter((s) => !known.has(s)).map((skill) => ({ entry: e.id, skill })));
}
```

Nota para el implementador: el empate depende del orden de `Object.values(usage)`; en el test, `fastapi` aparece antes y aporta `skin-ai` antes que `zalcu`. `Array.prototype.sort` es estable, así que a igual `hits` se conserva ese orden.

Run: `pnpm test tests/unit/skills.test.ts tests/unit/i18n.test.ts` → Expected: PASS (el test de claves iguales entre idiomas sigue en verde).

- [ ] **Step 4: Commit**

```bash
git add src/lib/skills.ts src/i18n/ui.ts tests/unit/skills.test.ts
git commit -m "feat(lib): Compute skill XP, build combinations and broken references"
```

---

### Task 5: Campo `skills` en puestos y proyectos

**Files:**
- Modify: `src/lib/schemas.ts`, `tests/fixtures/wiki/valid/experience.md`, `tests/fixtures/wiki/valid/project.md`, `tests/content/wiki.test.ts`
- Create: `tests/fixtures/wiki/invalid/skills-not-array.md`

**Interfaces:**
- Consumes: `findBrokenSkillRefs` (Task 4).
- Produces: `ExperienceData.skills?: string[]`, `ProjectData.skills?: string[]` (ids de habilidades, en minúsculas con guiones).

- [ ] **Step 1: Tests que fallan**

Añadir `skills: [python]` a `tests/fixtures/wiki/valid/experience.md` y `skills: []` a `valid/project.md` (antes de `tags`). Crear `tests/fixtures/wiki/invalid/skills-not-array.md`: copia de `valid/experience.md` con `skills: python`.

En `tests/content/wiki.test.ts`, añadir al final:

```ts
import { findBrokenSkillRefs } from "@lib/skills";

test("cada habilidad citada por un puesto o proyecto existe", () => {
    const ids = (folder: string) =>
        readdirSync(join(WIKI, folder))
            .filter((f) => f.endsWith(".md"))
            .map((f) => f.replace(/\.md$/, ""));
    const entries = ["experience", "projects"].flatMap((folder) =>
        ids(folder).map((id) => ({ id, skills: readFrontmatter(join(WIKI, folder, `${id}.md`)).skills as string[] | undefined })),
    );
    expect(findBrokenSkillRefs(entries, ids("skills"))).toEqual([]);
});
```

(Fusionar el import con los existentes.)

Run: `pnpm test tests/content` → Expected: FAIL en `skills-not-array.md` (el esquema aún no conoce el campo y lo descarta).

- [ ] **Step 2: Implementar**

En `src/lib/schemas.ts` añadir:

```ts
const skillRefs = z.array(z.string().regex(/^[a-z0-9-]+$/, "id de habilidad en minúsculas con guiones")).optional();
```

y `skills: skillRefs,` dentro de los `z.object` de `experienceSchema` y `projectSchema`.

En `src/layouts/HomePage.astro`, justo después de cargar las colecciones (en Task 7 se reescribe; aquí basta con añadir la comprobación):

```ts
import { findBrokenSkillRefs } from "@lib/skills";
// …tras obtener experiencia, proyectos y habilidades:
const broken = findBrokenSkillRefs(
    [...experienceEntries, ...projectEntries].map((e) => ({ id: e.id, skills: e.data.skills })),
    skillEntries.map((e) => e.id),
);
if (broken.length) throw new Error(`Habilidades inexistentes en la wiki: ${broken.map((b) => `${b.entry} → ${b.skill}`).join(", ")}`);
```

Para ello, en `HomePage.astro` guardar las colecciones en variables antes de pasarlas a `buildHomeView`:

```ts
const experienceEntries = await getCollection("experience");
const projectEntries = await getCollection("projects");
const skillEntries = await getCollection("skills");
const educationEntries = await getCollection("education");
```

y usar `experienceEntries.map((e) => e.data)` (etc.) donde antes se llamaba a `getCollection`.

Run: `pnpm test tests/content` → Expected: PASS salvo las habilidades reales sin `icon` (Task 6).

- [ ] **Step 3: Commit**

```bash
git add src/lib/schemas.ts src/layouts/HomePage.astro tests/fixtures/wiki tests/content/wiki.test.ts
git commit -m "feat(content): Relate roles and projects to the skills they used"
```

---

### Task 6: Mini ingesta (relaciones e iconos) y regla de la wiki

> **Interactiva:** requiere la validación del humano antes de escribir.

**Files:**
- Modify: `wiki/public/experience/*.md`, `wiki/public/projects/portfolio-llm-wiki.md`, `wiki/public/skills/*.md`, `.claude/rules/wiki.md`, `wiki/private/log.md`

**Interfaces:**
- Produces: wiki real que cumple el contrato con `skills` e `icon`.

- [ ] **Step 1: Proponer y validar**

Presentar al humano esta propuesta (fuentes: CV, LinkedIn, `humano (2026-10-02)`) y esperar su confirmación; las dudas marcadas las decide él:

| Página | `skills` propuestas | Duda |
| --- | --- | --- |
| `skin-ai` | `fastapi`, `expo`, `computer-vision` | ¿`python`? (FastAPI es Python, no está declarado) |
| `zalcu` | `python`, `fastapi`, `django`, `celery`, `redis`, `software-architecture`, `docker`, `pytest`, `github-actions`, `react`, `web-fundamentals` | |
| `gofore` | `python`, `computer-vision` | |
| `oesia` | `python`, `osint` | |
| `portfolio-llm-wiki` | `llm-agents` | ¿`github-actions` cuando exista CI? (hoy no) |

Iconos: `python si:python`, `fastapi si:fastapi`, `django si:django`, `celery si:celery`, `redis si:redis`, `software-architecture ph:tree-structure`, `computer-vision ph:scan`, `llm-agents ph:robot`, `react si:react`, `expo si:expo`, `web-fundamentals si:html5`, `docker si:docker`, `pytest si:pytest`, `github-actions si:githubactions`, `osint ph:detective`.

- [ ] **Step 2: Escribir en la wiki**

Añadir `skills: [...]` (antes de `tags`) en cada puesto/proyecto y `icon: ...` (después de `category`) en cada habilidad, con lo validado. Añadir `"humano (2026-10-02)"` a `sources` donde una relación venga de una decisión del humano. Actualizar `updated: 2026-10-02`.

- [ ] **Step 3: Regla de la wiki**

En `.claude/rules/wiki.md`, en la tabla *Campos por tipo*: añadir `skills?` a `experience` y `project` («ids de `skills/` usadas») e `icon` a `skill` («`si:<slug>` de Simple Icons o `ph:<nombre>` de Phosphor»). Debajo de *Fechas*, añadir:

```markdown
- **Habilidades y XP:** la experiencia de una habilidad no se escribe; el portfolio la calcula
  como la unión de los meses de los puestos y proyectos que la citan en `skills`. Una
  habilidad que nadie cita se muestra «sin uso registrado».
```

- [ ] **Step 4: Log y comprobación**

Añadir a `wiki/private/log.md` una entrada `ingest` con la fecha, «relaciones skills e iconos», las páginas tocadas y «Validado por el humano: sí».

Run: `pnpm test` → Expected: todo PASS (incluido `wiki.test.ts`).
Run: invocar la skill `lint` → Expected: sin fugas ni enlaces rotos.

- [ ] **Step 5: Commit**

```bash
git add wiki/public .claude/rules/wiki.md
git commit -m "feat(wiki): Add skill relations and icons to roles, projects and skills"
```

---

### Task 7: Vista de la portada (ids, archivos, XP y usos)

**Files:**
- Modify: `src/lib/home.ts`, `src/layouts/HomePage.astro`, `tests/unit/home.test.ts`, `src/i18n/ui.ts`

**Interfaces:**
- Consumes: `monthsCovered`, `skillUsage`, `formatXp`, `formatXpShort` (Task 4); `toDatetime` (Task 2); `localize`, `useTranslations`.
- Produces (sustituye la interfaz de Task 7 de la fase anterior):

```ts
export type Entry<T> = { id: string; data: T };
export type HomeData = {
    profile: ProfileData;
    experience: Entry<ExperienceData>[];
    projects: Entry<ProjectData>[];
    skills: Entry<SkillData>[];
    education: Entry<EducationData>[];
};
export type TimelineView = {
    id: string;
    file: string;          // "zalcu.log" | "upm-emse.md"
    title: string;         // role | degree
    subtitle: string;      // company | institution
    start: string; end: string | null; period: string;
    current: boolean;      // end === null
    duration: string;      // formatXp de su propio periodo (vacío si vigente)
    summary: string; highlights: string[];
    note?: string;         // nota media formateada
};
export type ProjectView = Localized<ProjectData> & { id: string; file: string; statusLabel: string };
export type SkillView = {
    id: string; title: string; summary: string; icon: string; category: SkillCategory;
    months: number; xp: string; xpShort: string; since: number | null;
    usedIn: { id: string; name: string; role: string }[];
};
export type HomeView = {
    profile: Localized<ProfileData>;
    experience: TimelineView[];
    education: TimelineView[];
    projects: ProjectView[];
    skillGroups: { category: SkillCategory; label: string; items: SkillView[] }[];
    professionalXp: string;          // formatXpShort de la unión de puestos
    usage: Record<string, string[]>; // skill → ids de entradas (para el cliente)
    entryNames: Record<string, string>; // id de entrada → nombre visible
    sections: { id: SectionId; label: string }[];
};
export function buildHomeView(data: HomeData, locale: Locale, now: string): HomeView
export function displayUrl(url: string): string // sin protocolo, sin barra final
```

- [ ] **Step 1: Clave de interfaz**

En `src/i18n/ui.ts` añadir `"projects.kind": "Proyecto"` (es) y `"projects.kind": "Project"` (en).

- [ ] **Step 2: Reescribir `tests/unit/home.test.ts` (falla)**

```ts
import { expect, test } from "vitest";
import { buildHomeView, displayUrl, type HomeData } from "@lib/home";

const meta = { tags: [], sources: ["x"], updated: new Date("2026-10-02") };
const NOW = "2026-10";

const data: HomeData = {
    profile: {
        ...meta, type: "profile", title: "Perfil", name: "Ada", headline: "Ingeniera", location: "Londres", summary: "Resumen",
        links: { email: "a@example.com", linkedin: "https://www.linkedin.com/in/ada/", github: "https://github.com/ada" },
        en: { headline: "Engineer", summary: "Summary" },
    },
    experience: [
        { id: "old", data: { ...meta, type: "experience", title: "Old", company: "Old Co", role: "Becaria", start: "2020-01", end: "2020-07", summary: "s", highlights: [], skills: ["python"], en: { role: "Intern", summary: "s", highlights: [] } } },
        { id: "new", data: { ...meta, type: "experience", title: "New", company: "New Co", role: "Ingeniera", start: "2026-06", end: null, summary: "s", highlights: [], skills: ["python", "expo"], en: { role: "Engineer", summary: "s", highlights: [] } } },
    ],
    projects: [
        { id: "site", data: { ...meta, type: "project", title: "Web", repo: "https://github.com/ada/my-site", status: "active", start: "2025-01", summary: "s", highlights: [], skills: ["python"], en: { title: "Site", summary: "s", highlights: [] } } },
    ],
    skills: [
        { id: "python", data: { ...meta, type: "skill", title: "Python", category: "backend", icon: "si:python", summary: "s", en: { summary: "s" } } },
        { id: "expo", data: { ...meta, type: "skill", title: "Expo", category: "frontend", icon: "si:expo", summary: "s", en: { summary: "s" } } },
        { id: "cobol", data: { ...meta, type: "skill", title: "COBOL", category: "backend", icon: "ph:robot", summary: "s", en: { summary: "s" } } },
    ],
    education: [],
};

test("timeline: orden, archivo, periodo y vigente", () => {
    const view = buildHomeView(data, "en", NOW);
    expect(view.experience.map((e) => e.id)).toEqual(["new", "old"]);
    expect(view.experience[0]).toMatchObject({ file: "new.log", title: "Engineer", subtitle: "New Co", period: "Jun 2026 - present", current: true, duration: "" });
    expect(view.experience[1]).toMatchObject({ current: false, duration: "6 months" });
});

test("proyectos: archivo README a partir del repo", () => {
    expect(buildHomeView(data, "es", NOW).projects[0]).toMatchObject({ file: "my-site/README.md", statusLabel: "En desarrollo" });
});

test("habilidades: XP por unión de usos, desde y dónde se usó", () => {
    const view = buildHomeView(data, "es", NOW);
    const python = view.skillGroups.flatMap((g) => g.items).find((s) => s.id === "python")!;
    expect(python.since).toBe(2020);
    expect(python.usedIn.map((u) => u.id)).toEqual(["new", "site", "old"]);
    expect(python.months).toBeGreaterThan(6);
});

test("habilidad sin uso: «sin uso registrado» y sin año", () => {
    const cobol = buildHomeView(data, "es", NOW).skillGroups.flatMap((g) => g.items).find((s) => s.id === "cobol")!;
    expect(cobol).toMatchObject({ months: 0, xp: "sin uso registrado", xpShort: "sin uso registrado", since: null, usedIn: [] });
});

test("XP profesional solo cuenta puestos", () => {
    expect(buildHomeView(data, "es", NOW).professionalXp).toBe("10 meses");
});

test("datos para el cliente: uso y nombres", () => {
    const view = buildHomeView(data, "es", NOW);
    expect(view.usage).toEqual({ python: ["old", "new", "site"], expo: ["new"] });
    expect(view.entryNames).toEqual({ old: "Old Co", new: "New Co", site: "Web" });
});

test("las secciones vacías no aparecen en la navegación", () => {
    expect(buildHomeView(data, "es", NOW).sections.map((s) => s.id)).toEqual(["experience", "projects", "skills", "contact"]);
});

test("displayUrl quita protocolo y barra final", () => {
    expect(displayUrl("https://www.linkedin.com/in/ada/")).toBe("linkedin.com/in/ada");
    expect(displayUrl("https://github.com/ada")).toBe("github.com/ada");
});
```

Run: `pnpm test tests/unit/home.test.ts` → Expected: FAIL.

- [ ] **Step 3: Implementar `src/lib/home.ts`**

```ts
import type { Locale } from "@i18n/ui";
import { localize, useTranslations, type Localized } from "@i18n/utils";
import { formatPeriod } from "./dates";
import { groupSkills, sortByStartDesc } from "./order";
import type { EducationData, ExperienceData, ProfileData, ProjectData, SkillCategory, SkillData } from "./schemas";
import { formatXp, formatXpShort, monthsCovered, skillUsage, type Span } from "./skills";

export type SectionId = "experience" | "projects" | "skills" | "education" | "contact";
export type Entry<T> = { id: string; data: T };
export type HomeData = {
    profile: ProfileData;
    experience: Entry<ExperienceData>[];
    projects: Entry<ProjectData>[];
    skills: Entry<SkillData>[];
    education: Entry<EducationData>[];
};
export type TimelineView = {
    id: string; file: string; title: string; subtitle: string;
    start: string; end: string | null; period: string; current: boolean; duration: string;
    summary: string; highlights: string[]; note?: string;
};
export type ProjectView = Localized<ProjectData> & { id: string; file: string; statusLabel: string };
export type SkillView = {
    id: string; title: string; summary: string; icon: string; category: SkillCategory;
    months: number; xp: string; xpShort: string; since: number | null;
    usedIn: { id: string; name: string; role: string }[];
};
export type HomeView = {
    profile: Localized<ProfileData>;
    experience: TimelineView[];
    education: TimelineView[];
    projects: ProjectView[];
    skillGroups: { category: SkillCategory; label: string; items: SkillView[] }[];
    professionalXp: string;
    usage: Record<string, string[]>;
    entryNames: Record<string, string>;
    sections: { id: SectionId; label: string }[];
};

export function displayUrl(url: string): string {
    return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

const byStart = <T extends { data: { start: string; end?: string | null } }>(entries: T[]) =>
    sortByStartDesc(entries.map((e) => ({ ...e, start: e.data.start, end: e.data.end ?? null }))).map(({ start: _s, end: _e, ...e }) => e as unknown as T);

export function buildHomeView(data: HomeData, locale: Locale, now: string): HomeView {
    const t = useTranslations(locale);

    const experience = byStart(data.experience).map(({ id, data: d }): TimelineView => {
        const l = localize(d, locale);
        return {
            id, file: `${id}.log`, title: l.role, subtitle: l.company,
            start: l.start, end: l.end, period: formatPeriod(l.start, l.end, locale), current: l.end === null,
            duration: l.end === null ? "" : formatXp(monthsCovered([{ start: l.start, end: l.end }], now), locale),
            summary: l.summary, highlights: l.highlights,
        };
    });

    const education = byStart(data.education).map(({ id, data: d }): TimelineView => {
        const l = localize(d, locale);
        return {
            id, file: `${id}.md`, title: l.degree, subtitle: l.institution,
            start: l.start, end: l.end, period: formatPeriod(l.start, l.end, locale), current: l.end === null, duration: "",
            summary: l.summary, highlights: [],
            note: l.grade ? `${t("education.grade")}: ${l.grade}` : undefined,
        };
    });

    const projects = byStart(data.projects).map(({ id, data: d }): ProjectView => {
        const l = localize(d, locale);
        return { ...l, id, file: `${l.repo.split("/").filter(Boolean).pop()}/README.md`, statusLabel: t(`projects.status.${l.status}`) };
    });

    const spans: Record<string, Span & { name: string; role: string }> = {};
    for (const { id, data: d } of data.experience) {
        spans[id] = { start: d.start, end: d.end, name: d.company, role: localize(d, locale).role };
    }
    for (const { id, data: d } of data.projects) {
        spans[id] = { start: d.start, end: null, name: d.title, role: t("projects.kind") };
    }
    const entriesWithSkills = [...data.experience, ...data.projects].map((e) => ({ id: e.id, skills: e.data.skills }));
    const usage = skillUsage(entriesWithSkills);

    const skillViews: SkillView[] = data.skills.map(({ id, data: d }) => {
        const l = localize(d, locale);
        const used = (usage[id] ?? []).map((eid) => ({ id: eid, ...spans[eid] }));
        const months = monthsCovered(used, now);
        return {
            id, title: l.title, summary: l.summary, icon: l.icon, category: l.category,
            months, xp: formatXp(months, locale), xpShort: formatXpShort(months, locale),
            since: used.length ? Math.min(...used.map((u) => Number(u.start.slice(0, 4)))) : null,
            usedIn: sortByStartDesc(used).map((u) => ({ id: u.id, name: u.name, role: u.role })),
        };
    });
    const skillGroups = groupSkills(skillViews).map((g) => ({ ...g, label: t(`skills.category.${g.category}`) }));

    const professionalXp = formatXpShort(monthsCovered(data.experience.map((e) => e.data), now), locale);
    const entryNames = Object.fromEntries(Object.entries(spans).map(([id, s]) => [id, s.name]));

    const counts: Record<SectionId, number> = {
        experience: experience.length, projects: projects.length, skills: skillGroups.length,
        education: education.length, contact: 1,
    };
    const sections = (Object.keys(counts) as SectionId[])
        .filter((id) => counts[id] > 0)
        .map((id) => ({ id, label: t(`section.${id}`) }));

    return {
        profile: localize(data.profile, locale), experience, education, projects, skillGroups,
        professionalXp, usage, entryNames, sections,
    };
}
```

Nota: `usedIn` ordena por inicio descendente (vigentes primero, `sortByStartDesc` de Task 7 anterior). En el test, `new` (2026-06) va antes que `site` (2025-01) y que `old` (2020-01).

- [ ] **Step 4: `HomePage.astro` pasa entradas con id y fecha del build**

Sustituir la llamada a `buildHomeView` por:

```ts
const now = new Date().toISOString().slice(0, 7);
const view = buildHomeView(
    {
        profile: profile.data,
        experience: experienceEntries.map(({ id, data }) => ({ id, data })),
        projects: projectEntries.map(({ id, data }) => ({ id, data })),
        skills: skillEntries.map(({ id, data }) => ({ id, data })),
        education: educationEntries.map(({ id, data }) => ({ id, data })),
    },
    locale,
    now,
);
```

Las secciones aún esperan la vista antigua; se adaptan en Tasks 8–12. Para que el build no se rompa entre tareas, en este paso pasar a `Experience`/`Education` las nuevas listas y adaptar temporalmente sus props (`items: HomeView["experience"]`, usando `title`/`subtitle` en lugar de `role`/`company`/`degree`/`institution`). Ajustar `tests/components/sections.test.ts` a esos nombres de props.

Run: `pnpm test && pnpm check && pnpm build` → Expected: todo en verde.

- [ ] **Step 5: Commit**

```bash
git add src/lib/home.ts src/layouts/HomePage.astro src/sections src/i18n/ui.ts tests/unit/home.test.ts tests/components/sections.test.ts
git commit -m "feat(lib): Extend home view with entry ids, card files, skill XP and usage"
```

---

### Task 8: Componentes base (`Icon`, `Window`) y cabecera con menú móvil

**Files:**
- Create: `src/components/Icon.astro`, `src/components/Window.astro`, `src/scripts/nav.ts`, `tests/components/base.test.ts`
- Modify: `src/components/Header.astro`, `src/components/LanguageSwitcher.astro`, `src/i18n/ui.ts`, `tests/components/header.test.ts`

**Interfaces:**
- Consumes: `iconSvg` (Task 3), `SectionId`.
- Produces:
  - `Icon` props `{ name: string; class?: string }` → `<span class="icon …">{svg}</span>`
  - `Window` props `{ file: string; meta?: string; tag?: string; class?: string; as?: "div" | "article" | "li" }` + `<slot />` → `.window` con `.window-bar` (`aria-hidden` en el nombre de archivo).
  - `Header` props `{ locale; sections; urls }`; ids `site-menu` (popover), clase `nav-link`; `aria-current="true"` lo pone `nav.ts`.
  - `initNav(): void` en `src/scripts/nav.ts`.

- [ ] **Step 1: Claves de interfaz**

En `src/i18n/ui.ts` añadir (es / en):

```ts
        "nav.menu": "menu",            // en: "menu"
        "nav.close": "cerrar",         // en: "close"
        "nav.prompt": "alvaro@portfolio:~$", // en: igual
        "nav.list": "ls secciones/",   // en: "ls sections/"
```

- [ ] **Step 2: Tests que fallan**

`tests/components/base.test.ts`:

```ts
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { expect, test } from "vitest";
import Icon from "@components/Icon.astro";
import Window from "@components/Window.astro";

test("Icon pinta el SVG en línea y oculto a lectores", async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(Icon, { props: { name: "si:python" } });
    expect(html).toMatch(/<span class="icon[^"]*"><svg[^>]*aria-hidden="true"/);
});

test("Window pinta barra con archivo (oculto a lectores), etiqueta y contenido", async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(Window, {
        props: { file: "zalcu.log", tag: "EN CURSO" },
        slots: { default: "<p>Contenido</p>" },
    });
    expect(html).toContain('class="window');
    expect(html).toMatch(/<span aria-hidden="true">zalcu\.log<\/span>/);
    expect(html).toContain("EN CURSO");
    expect(html).toContain("<p>Contenido</p>");
});
```

En `tests/components/header.test.ts`, sustituir el primer test por:

```ts
test("enlaza solo las secciones recibidas, en la barra y en el menú móvil", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Header, {
        props: { locale: "es", urls, sections: [{ id: "experience", label: "Experiencia" }] },
    });
    expect(html.match(/href="#experience"/g)).toHaveLength(2);
    expect(html).not.toContain('href="#projects"');
    expect(html).toContain('id="site-menu" popover');
    expect(html).toContain('popovertarget="site-menu"');
});
```

Run: `pnpm test tests/components` → Expected: FAIL.

- [ ] **Step 3: Componentes**

`src/components/Icon.astro`:

```astro
---
import { iconSvg } from "@lib/icons";

interface Props {
    name: string;
    class?: string;
}
const { name, class: className = "" } = Astro.props;
const svg = iconSvg(name);
---

<span class={`icon inline-grid size-[1.6em] place-items-center ${className}`} set:html={svg} />
```

`src/components/Window.astro`:

```astro
---
interface Props {
    file: string;
    meta?: string;
    tag?: string;
    class?: string;
    as?: "div" | "article" | "li";
}
const { file, meta, tag, class: className = "", as: Tag = "div" } = Astro.props;
---

<Tag class={`window ${className}`}>
    <div class="window-bar">
        <span aria-hidden="true">{file}</span>
        {tag ? <span class="window-tag">{tag}</span> : meta ? <span>{meta}</span> : null}
    </div>
    <slot />
</Tag>
```

`src/components/LanguageSwitcher.astro`: conservar la lógica, cambiar clases a tokens (`text-muted`, `text-text`, sin `underline` ni `font-semibold`):

```astro
<nav aria-label={t("lang.label")}>
    <ul class="flex gap-2 text-[13px] text-muted">
        {
            locales.map((l, i) => (
                <li class="flex gap-2">
                    {i > 0 && <span aria-hidden="true">/</span>}
                    {l === locale ? (
                        <span aria-current="true" class="text-text">{l.toUpperCase()}</span>
                    ) : (
                        <a href={urls[l]} hreflang={l} lang={l} aria-label={t(`lang.${l}`)} class="hover:text-text">
                            {l.toUpperCase()}
                        </a>
                    )}
                </li>
            ))
        }
    </ul>
</nav>
```

Ajustar `tests/components/header.test.ts` (segundo test) a la nueva marca: `expect(html).toMatch(/<a[^>]*href="\/"[^>]*hreflang="es"/)` sigue valiendo; sustituir la segunda aserción por `expect(html).toMatch(/<span aria-current="true"[^>]*>EN<\/span>/)`. En `tests/e2e/home.spec.ts`, el test del selector usa `getByRole("link", { name: p.otherLabel })`: sigue funcionando gracias a `aria-label`.

`src/components/Header.astro`:

```astro
---
import type { Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";
import type { SectionId } from "@lib/home";
import LanguageSwitcher from "./LanguageSwitcher.astro";

interface Props {
    locale: Locale;
    sections: { id: SectionId; label: string }[];
    urls: Record<Locale, string>;
}
const { locale, sections, urls } = Astro.props;
const t = useTranslations(locale);
---

<header class="sticky top-0 z-50 h-[var(--header-h)] border-b border-line bg-bg/90 backdrop-blur-md">
    <div class="mx-auto flex h-full max-w-6xl items-center gap-7 px-4 md:px-10">
        <span class="whitespace-nowrap text-[13px] text-accent" aria-hidden="true">{t("nav.prompt")}</span>
        <nav aria-label={t("nav.label")} class="site-nav mr-auto hidden md:block">
            <ul class="flex gap-5 text-[13px] text-muted">
                {sections.map((s) => <li><a class="nav-link hover:text-text" href={`#${s.id}`}>{s.label.toLowerCase()}</a></li>)}
            </ul>
        </nav>
        <div class="ml-auto hidden md:block"><LanguageSwitcher locale={locale} urls={urls} /></div>
        <button class="ml-auto border border-line px-2.5 py-1 text-[12.5px] md:hidden" popovertarget="site-menu" aria-label={t("nav.menu")}>
            <span class="text-accent" aria-hidden="true">$</span> {t("nav.menu")}
        </button>
    </div>
    <div id="site-menu" popover class="site-menu m-0 h-[calc(100dvh-var(--header-h))] w-full max-w-none border-0 bg-bg p-5 text-text md:hidden" style="inset: var(--header-h) 0 auto 0">
        <p class="text-xs text-muted" aria-hidden="true">$ {t("nav.list")}</p>
        <nav aria-label={t("nav.label")}>
            <ul class="mt-2.5 grid">
                {sections.map((s) => (
                    <li>
                        <a class="nav-link flex items-center border-b border-dashed border-line px-1 py-3.5 font-display text-2xl font-bold" href={`#${s.id}`}>
                            {s.label.toLowerCase()}<span class="ml-auto font-mono text-sm font-normal text-muted" aria-hidden="true">↵</span>
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
        <div class="mt-6 border border-line px-3 py-2.5"><LanguageSwitcher locale={locale} urls={urls} /></div>
    </div>
</header>

<script>
    import { initNav } from "../scripts/nav";
    initNav();
</script>
```

Nota: `popovertarget` no es válido en un `<a>`; el menú se cierra al pulsar un enlace desde `initNav` con `hidePopover()`.

`src/scripts/nav.ts`:

```ts
export function initNav(): void {
    const links = [...document.querySelectorAll<HTMLAnchorElement>("a.nav-link[href^='#']")];
    const menu = document.getElementById("site-menu");
    links.forEach((a) => a.addEventListener("click", () => menu?.hidePopover?.()));

    const sections = [...document.querySelectorAll<HTMLElement>("main section[id]")];
    const io = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                for (const a of links) {
                    if (a.getAttribute("href") === `#${entry.target.id}`) a.setAttribute("aria-current", "true");
                    else a.removeAttribute("aria-current");
                }
            }
        },
        { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((s) => io.observe(s));
}
```

Run: `pnpm test tests/components` → Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components src/scripts/nav.ts src/i18n/ui.ts tests/components
git commit -m "feat(site): Add icon and window components, header with mobile popover menu"
```

---

### Task 9: Hero con foto ampliable

**Files:**
- Create: `src/components/ProfilePhoto.astro`, `src/scripts/lightbox.ts`, `tests/e2e/photo.spec.ts`
- Modify: `src/sections/intro.astro`, `src/i18n/ui.ts`, `tests/components/sections.test.ts`, `playwright.config.ts`
- Delete: `src/components/ProfileAvatar.astro`

**Interfaces:**
- Produces: botón `#photo-open` (abre `#photo-dialog`), `initLightbox(): void`. Playwright con proyectos `desktop` (1280×800) y `mobile` (390×844, `isMobile`, `hasTouch`).

- [ ] **Step 1: Proyectos de Playwright**

En `playwright.config.ts`, sustituir `projects` por:

```ts
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
        { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
    ],
```

- [ ] **Step 2: Claves y tests que fallan**

`src/i18n/ui.ts` (es / en): `"photo.open": "Ampliar la foto de"` / `"Enlarge the photo of"`, `"photo.hint": "ampliar"` / `"enlarge"`, `"photo.close": "Cerrar"` / `"Close"`, `"photo.dialog": "Foto de perfil ampliada"` / `"Enlarged profile photo"`.

En `tests/components/sections.test.ts`, sustituir el test de `Intro` por:

```ts
test("Intro: nombre como h1, adorno whoami oculto a lectores y botón de foto etiquetado", async () => {
    const profile = {
        type: "profile" as const, title: "Perfil", name: "Ada Lovelace", headline: "Engineer", location: "London",
        summary: "Analytical engine.",
        links: { email: "a@example.com", linkedin: "https://linkedin.com/in/a", github: "https://github.com/a" },
        tags: [], sources: ["x"], updated: new Date(),
    };
    const html = await container.renderToString(Intro, { props: { profile, locale: "en" } });
    expect(html).toMatch(/<h1[^>]*>[\s\S]*Ada Lovelace[\s\S]*<\/h1>/);
    expect(html).toMatch(/<p class="prompt[^"]*" aria-hidden="true">whoami<\/p>/);
    expect(html).toMatch(/<button[^>]*id="photo-open"[^>]*aria-label="Enlarge the photo of Ada Lovelace"/);
    expect(html).toContain('<dialog id="photo-dialog"');
});
```

`tests/e2e/photo.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.describe("foto ampliable", () => {
    test("abre, atrapa el foco, cierra con Esc y devuelve el foco", async ({ page }) => {
        await page.goto("/");
        const open = page.locator("#photo-open");
        await open.click();
        const dialog = page.locator("#photo-dialog");
        await expect(dialog).toBeVisible();
        for (let i = 0; i < 4; i++) await page.keyboard.press("Tab");
        expect(await page.evaluate(() => !!document.activeElement?.closest("#photo-dialog"))).toBe(true);
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await expect(open).toBeFocused();
    });

    test("cierra al pulsar fuera de la imagen", async ({ page }) => {
        await page.goto("/");
        await page.locator("#photo-open").click();
        await page.mouse.click(5, 5);
        await expect(page.locator("#photo-dialog")).toBeHidden();
    });

    test("en móvil la foto ocupa el ancho de la pantalla", async ({ page }, info) => {
        test.skip(info.project.name !== "mobile");
        await page.goto("/");
        const box = await page.locator("#photo-open").boundingBox();
        expect(box!.width).toBeGreaterThan(390 - 2 * 16 - 4);
    });
});
```

Run: `pnpm test tests/components/sections.test.ts` → Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/components/ProfilePhoto.astro`:

```astro
---
import { Image } from "astro:assets";
import profileImage from "@assets/images/profile.jpg";
import type { Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";
import Icon from "./Icon.astro";

interface Props {
    name: string;
    locale: Locale;
}
const { name, locale } = Astro.props;
const t = useTranslations(locale);
---

<div class="window photo-window">
    <div class="window-bar"><span aria-hidden="true">profile.jpg</span><Icon name="ph:arrows-out-simple" class="text-accent" /></div>
    <button id="photo-open" class="group relative block w-full cursor-zoom-in" aria-haspopup="dialog" aria-label={`${t("photo.open")} ${name}`}>
        <Image src={profileImage} alt="" widths={[400, 720]} sizes="(min-width: 768px) 340px, 100vw" class="block aspect-[4/4.2] w-full object-cover object-[50%_30%] grayscale-[.3] transition group-active:grayscale-0 md:aspect-square" loading="eager" />
        <span class="absolute bottom-2 right-2 flex items-center gap-1.5 border border-line bg-bg/80 px-2 py-0.5 text-[11.5px]" aria-hidden="true">
            <Icon name="ph:magnifying-glass-plus" class="text-accent" />{t("photo.hint")}
        </span>
    </button>
</div>

<dialog id="photo-dialog" class="photo-dialog m-auto max-h-[92dvh] w-[min(92vw,720px)] bg-transparent p-0 text-text backdrop:bg-[rgb(5_7_6/.92)] backdrop:backdrop-blur-sm" aria-label={t("photo.dialog")}>
    <figure>
        <div class="window-bar border border-b-0 border-line bg-surface">
            <span aria-hidden="true">profile.jpg</span>
            <button data-photo-close class="border border-line px-2 py-0.5 text-[13px]">✕ <span class="sr-only">{t("photo.close")}</span><span aria-hidden="true">esc</span></button>
        </div>
        <Image src={profileImage} alt={name} widths={[720, 1440]} sizes="min(92vw, 720px)" class="block w-full border border-line" />
    </figure>
</dialog>

<script>
    import { initLightbox } from "../scripts/lightbox";
    initLightbox();
</script>
```

`src/scripts/lightbox.ts`:

```ts
export function initLightbox(): void {
    const open = document.getElementById("photo-open");
    const dialog = document.getElementById("photo-dialog") as HTMLDialogElement | null;
    if (!open || !dialog) return;
    open.addEventListener("click", () => dialog.showModal());
    dialog.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (target === dialog || target.closest("[data-photo-close]")) dialog.close();
    });
    dialog.addEventListener("close", () => open.focus());
}
```

Añadir a `src/styles/skins/terminal.css`:

```css
[data-skin="terminal"] .photo-dialog[open] figure {
    animation: terminal-zoom-in 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes terminal-zoom-in {
    from {
        opacity: 0;
        transform: scale(0.92);
    }
}
```

`src/sections/intro.astro`:

```astro
---
import ProfilePhoto from "@components/ProfilePhoto.astro";
import type { Locale } from "@i18n/ui";
import type { HomeView } from "@lib/home";

interface Props {
    profile: HomeView["profile"];
    locale: Locale;
}
const { profile, locale } = Astro.props;
---

<section id="about" class="hero grid gap-6 pt-6 md:grid-cols-[340px_1fr] md:items-center md:gap-13 md:pt-14">
    <ProfilePhoto name={profile.name} locale={locale} />
    <div>
        <p class="prompt text-[13px]" aria-hidden="true">whoami</p>
        <h1 class="mt-2 font-display text-[38px] leading-[1.04] font-bold tracking-tight md:text-[58px]">
            <span class="hero-name">{profile.name}</span><span class="cursor" aria-hidden="true"></span>
        </h1>
        <p class="hero-role mt-2.5 font-display text-[19px] text-accent md:text-[23px]">{profile.headline}</p>
        <p class="hero-loc text-[13px] text-muted">{profile.location}</p>
        <p class="hero-sum mt-4 max-w-[56ch] text-[13.5px] leading-[1.7] text-body md:text-[14.5px]">{profile.summary}</p>
        <div class="hero-cta mt-6 grid grid-cols-2 gap-3 md:flex">
            <a class="btn btn-primary" href="#contact">contacto</a>
            <a class="btn btn-secondary" href={profile.links.github} target="_blank" rel="noopener">github</a>
        </div>
    </div>
</section>
```

Los textos `contacto`/`github` de los botones deben salir del diccionario: añadir `"hero.contact": "contacto"` / `"contact"` y `"hero.github": "github"` / `"github"` a `ui.ts` y usarlos con `useTranslations(locale)`.

Borrar `src/components/ProfileAvatar.astro` y pasar `locale` a `<Intro>` en `HomePage.astro`.

Run: `pnpm test tests/components && pnpm test:e2e --grep "foto ampliable"` → Expected: PASS en `desktop` y `mobile`.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProfilePhoto.astro src/scripts/lightbox.ts src/sections/intro.astro src/layouts/HomePage.astro src/styles/skins/terminal.css src/i18n/ui.ts playwright.config.ts tests
git rm src/components/ProfileAvatar.astro
git commit -m "feat(site): Hero with full-width photo and accessible lightbox"
```

---

### Task 10: Timeline (experiencia y formación)

**Files:**
- Create: `src/components/Timeline.astro`
- Modify: `src/components/TimelineItem.astro`, `src/sections/experience.astro`, `src/sections/education.astro`, `src/i18n/ui.ts`, `tests/components/sections.test.ts`

**Interfaces:**
- Consumes: `TimelineView` (Task 7), `Window` (Task 8), `toDatetime` (Task 2).
- Produces: `Timeline` props `{ items: TimelineView[]; locale: Locale; currentTag: string }`; cada `.t-item` con `data-side="left|right"` (por índice: par → left) y `data-current` si vigente; `.timeline-fill` para la animación.

- [ ] **Step 1: Clave y tests que fallan**

`ui.ts`: `"timeline.current": "EN CURSO"` / `"CURRENT"`.

En `tests/components/sections.test.ts`, sustituir los tests de `Experience` y `Education` por:

```ts
const item = (over: Partial<import("@lib/home").TimelineView> = {}) => ({
    id: "acme", file: "acme.log", title: "Engineer", subtitle: "Acme", start: "2026-06", end: null,
    period: "Jun 2026 - present", current: true, duration: "", summary: "Python backend.", highlights: ["API design."], ...over,
});

describe("Experience", () => {
    test("timeline alterno con fechas en <time> y etiqueta del puesto vigente", async () => {
        const items = [item(), item({ id: "old", file: "old.log", start: "2020-01", end: "2020-07", period: "Jan 2020 - Jul 2020", current: false, duration: "6 months" })];
        const html = await container.renderToString(Experience, { props: { items, locale: "en" } });
        expect(html).toContain('id="experience"');
        expect(html.match(/data-side="left"/g)).toHaveLength(1);
        expect(html.match(/data-side="right"/g)).toHaveLength(1);
        expect(html).toContain('<time datetime="2026-06">');
        expect(html).toContain("CURRENT");
        expect(html).toContain("6 months");
        expect(html).toContain("API design.");
    });

    test("sin elementos no renderiza nada", async () => {
        const html = await container.renderToString(Experience, { props: { items: [], locale: "es" } });
        expect(html.trim()).toBe("");
    });
});

test("Education muestra la nota", async () => {
    const html = await container.renderToString(Education, {
        props: { items: [item({ id: "upm", file: "upm.md", end: "2022", current: false, period: "2020 - 2022", note: "Average grade: 8.55", highlights: [] })], locale: "en" },
    });
    expect(html).toContain('id="education"');
    expect(html).toContain("Average grade: 8.55");
});
```

Run: `pnpm test tests/components/sections.test.ts` → Expected: FAIL.

- [ ] **Step 2: Implementar**

`src/components/TimelineItem.astro`:

```astro
---
import type { TimelineView } from "@lib/home";
import { toDatetime } from "@lib/dates";
import Window from "./Window.astro";

interface Props {
    item: TimelineView;
    side: "left" | "right";
    currentTag: string;
}
const { item, side, currentTag } = Astro.props;
const [from, to] = item.period.split(" - ");
---

<li class="t-item relative grid grid-cols-[28px_1fr] md:grid-cols-[1fr_56px_1fr]" data-side={side} data-current={item.current || undefined}>
    <span class="timeline-node relative z-[1] col-start-1 row-start-1 mt-1 md:col-start-2 md:mt-[18px] md:justify-self-center" aria-hidden="true"></span>
    <p class:list={["t-when col-start-2 row-start-1 md:pt-3.5", side === "left" ? "md:col-start-3 md:pl-1" : "md:col-start-1 md:pr-1 md:text-right"]}>
        <time datetime={toDatetime(item.start)}>{from}</time>{to && <> - {item.end ? <time datetime={toDatetime(item.end)}>{to}</time> : to}</>}
    </p>
    <Window file={item.file} tag={item.current ? currentTag : undefined} meta={item.duration || undefined} class={["t-card col-start-2 row-start-2 mt-1.5 md:row-start-1 md:mt-0", side === "left" ? "md:col-start-1" : "md:col-start-3"].join(" ")}>
        <div class="p-3 md:px-[18px] md:py-4">
            <h3 class="font-display text-[17px] leading-tight font-bold md:text-[19px]">{item.title}</h3>
            <p class="text-[12.5px] text-muted md:text-[13.5px]">@ {item.subtitle}</p>
            {item.summary && <p class="mt-2 text-[13px] text-body md:text-[14px]">{item.summary}</p>}
            {item.note && <p class="mt-2 text-[12.5px] text-body">{item.note}</p>}
            {item.highlights.length > 0 && <ul class="marker-list mt-2 text-[13px] text-body md:text-[14px]">{item.highlights.map((h) => <li>{h}</li>)}</ul>}
        </div>
    </Window>
</li>
```

`src/components/Timeline.astro`:

```astro
---
import type { Locale } from "@i18n/ui";
import type { TimelineView } from "@lib/home";
import TimelineItem from "./TimelineItem.astro";

interface Props {
    items: TimelineView[];
    locale: Locale;
    currentTag: string;
}
const { items, currentTag } = Astro.props;
---

<div class="timeline relative py-2">
    <div class="timeline-rail absolute top-0 bottom-0 left-[6px] w-0.5 md:left-1/2 md:-translate-x-1/2" aria-hidden="true">
        <div class="timeline-fill absolute inset-0"></div>
    </div>
    <ol class="grid gap-[18px] md:gap-7">
        {items.map((item, i) => <TimelineItem item={item} side={i % 2 === 0 ? "left" : "right"} currentTag={currentTag} />)}
    </ol>
</div>
```

`src/sections/experience.astro`:

```astro
---
import Timeline from "@components/Timeline.astro";
import type { Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";
import type { HomeView } from "@lib/home";

interface Props {
    items: HomeView["experience"];
    locale: Locale;
}
const { items, locale } = Astro.props;
const t = useTranslations(locale);
---

{items.length > 0 && (
    <section id="experience" class="mt-11 md:mt-18">
        <h2 class="section-title mb-4 text-[26px] md:mb-5 md:text-[30px]">{t("section.experience")}</h2>
        <Timeline items={items} locale={locale} currentTag={t("timeline.current")} />
    </section>
)}
```

`src/sections/education.astro`: idéntico cambiando `id="education"`, `t("section.education")` e `items: HomeView["education"]`.

Run: `pnpm test tests/components && pnpm build` → Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/Timeline.astro src/components/TimelineItem.astro src/components/Window.astro src/sections/experience.astro src/sections/education.astro src/i18n/ui.ts tests/components
git commit -m "feat(site): Alternating timeline for experience and education"
```

---

### Task 11: Proyectos, contacto, pie y página

**Files:**
- Modify: `src/components/ProjectCard.astro`, `src/sections/projects.astro`, `src/sections/contact.astro`, `src/layouts/HomePage.astro`, `src/i18n/ui.ts`, `tests/components/sections.test.ts`
- Create: `src/components/Footer.astro`

**Interfaces:**
- Consumes: `ProjectView`, `displayUrl` (Task 7), `Window` (Task 8).
- Produces: secciones `#projects` y `#contact` con la marca de la skin; pie con enlace al repositorio.

- [ ] **Step 1: Claves y tests que fallan**

`ui.ts` (es / en): `"contact.mailCmd": "$ mail"`, `"contact.openCmd": "$ open"` (iguales en inglés), `"footer.madeWith": "hecho con Astro y una LLM Wiki"` / `"built with Astro and an LLM Wiki"`, `"footer.code": "código en GitHub"` / `"source on GitHub"`.

En `tests/components/sections.test.ts`, sustituir los tests de `Projects` y `Contact`:

```ts
describe("Projects", () => {
    const project = {
        id: "site", file: "my-site/README.md", statusLabel: "En desarrollo",
        type: "project" as const, title: "Este portfolio", repo: "https://github.com/ada/my-site", status: "active" as const,
        start: "2026-10", summary: "Portfolio desde una wiki.", highlights: ["Uno."], tags: [], sources: ["x"], updated: new Date(),
    };

    test("README con archivo, estado y enlace al repo", async () => {
        const html = await container.renderToString(Projects, { props: { items: [project], locale: "es" } });
        expect(html).toContain('id="projects"');
        expect(html).toMatch(/aria-hidden="true">my-site\/README\.md</);
        expect(html).toContain("En desarrollo");
        expect(html).toContain('href="https://github.com/ada/my-site"');
    });

    test("sin proyectos no renderiza nada", async () => {
        const html = await container.renderToString(Projects, { props: { items: [], locale: "es" } });
        expect(html.trim()).toBe("");
    });
});

test("Contact: comandos con enlaces reales y URL visible sin protocolo", async () => {
    const links = { email: "a@example.com", linkedin: "https://www.linkedin.com/in/a/", github: "https://github.com/a" };
    const html = await container.renderToString(Contact, { props: { links, locale: "es" } });
    expect(html).toContain('href="mailto:a@example.com"');
    expect(html).toContain('href="https://www.linkedin.com/in/a/"');
    expect(html).toContain("linkedin.com/in/a<");
    expect(html).toContain("$ mail");
});
```

Run: `pnpm test tests/components/sections.test.ts` → Expected: FAIL.

- [ ] **Step 2: Implementar**

`src/components/ProjectCard.astro`:

```astro
---
import type { ProjectView } from "@lib/home";
import Window from "./Window.astro";

interface Props {
    project: ProjectView;
    repoLabel: string;
    visitLabel: string;
}
const { project, repoLabel, visitLabel } = Astro.props;
---

<Window file={project.file} meta="cat" as="article" class="reveal">
    <div class="px-3 py-3 md:px-[22px] md:py-5">
        <h3 class="readme-title font-display text-[18px] font-bold md:text-[22px]">
            {project.title}<span class="badge ml-2.5 align-[4px] font-mono font-normal">{project.statusLabel}</span>
        </h3>
        <p class="mt-2.5 max-w-[78ch] text-[13.5px] text-body md:text-[14.5px]">{project.summary}</p>
        {project.highlights.length > 0 && <ul class="marker-list mt-3 grid gap-1.5 text-[13px] text-body md:text-[14px]">{project.highlights.map((h) => <li>{h}</li>)}</ul>}
        <p class="mt-4 flex gap-4.5 text-accent">
            <a class="border-b border-accent" href={project.repo} target="_blank" rel="noopener">{repoLabel}</a>
            {project.url && <a class="border-b border-accent" href={project.url} target="_blank" rel="noopener">{visitLabel}</a>}
        </p>
    </div>
</Window>
```

`src/sections/projects.astro`:

```astro
---
import ProjectCard from "@components/ProjectCard.astro";
import type { Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";
import type { HomeView } from "@lib/home";

interface Props {
    items: HomeView["projects"];
    locale: Locale;
}
const { items, locale } = Astro.props;
const t = useTranslations(locale);
---

{items.length > 0 && (
    <section id="projects" class="mt-11 md:mt-18">
        <h2 class="section-title mb-4 text-[26px] md:mb-5 md:text-[30px]">{t("section.projects")}</h2>
        <div class="grid gap-4">
            {items.map((p) => <ProjectCard project={p} repoLabel={t("projects.repo")} visitLabel={t("projects.visit")} />)}
        </div>
    </section>
)}
```

`src/sections/contact.astro`:

```astro
---
import type { Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";
import { displayUrl, type HomeView } from "@lib/home";

interface Props {
    links: HomeView["profile"]["links"];
    locale: Locale;
}
const { links, locale } = Astro.props;
const t = useTranslations(locale);
const rows = [
    { cmd: t("contact.mailCmd"), href: `mailto:${links.email}`, text: links.email, label: t("contact.email"), external: false },
    { cmd: t("contact.openCmd"), href: links.linkedin, text: displayUrl(links.linkedin), label: t("contact.linkedin"), external: true },
    { cmd: t("contact.openCmd"), href: links.github, text: displayUrl(links.github), label: t("contact.github"), external: true },
];
---

<section id="contact" class="mt-11 md:mt-18">
    <h2 class="section-title mb-4 text-[26px] md:mb-5 md:text-[30px]">{t("section.contact")}</h2>
    <ul class="grid gap-2.5 text-[15px] md:text-[16px]">
        {rows.map((r) => (
            <li>
                <a class="group inline-flex flex-wrap gap-x-2.5" href={r.href} aria-label={`${r.label}: ${r.text}`} {...(r.external ? { target: "_blank", rel: "noopener" } : {})}>
                    <span class="text-accent" aria-hidden="true">{r.cmd}</span>
                    <span class="break-all border-b border-transparent group-hover:border-accent">{r.text}</span>
                </a>
            </li>
        ))}
    </ul>
</section>
```

El test `"Contact enlaza …"` del E2E existente (`tests/e2e/home.spec.ts`) busca `#contact a` con `mailto:` y URLs que empiezan por `https://www.linkedin.com/in/`: sigue valiendo.

`src/components/Footer.astro`:

```astro
---
import type { Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";

interface Props {
    locale: Locale;
    repo: string;
}
const { locale, repo } = Astro.props;
const t = useTranslations(locale);
---

<footer class="mt-18 border-t border-line">
    <div class="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-4.5 text-[12.5px] text-muted md:px-10">
        <span>{t("footer.madeWith")}</span>
        <a class="hover:text-text" href={repo} target="_blank" rel="noopener">{t("footer.code")}</a>
    </div>
</footer>
```

En `src/layouts/HomePage.astro`, el `<main>` pasa a `class="mx-auto max-w-6xl px-4 md:px-10"`, se añade `<Footer locale={locale} repo={view.projects[0]?.repo ?? view.profile.links.github} />` tras `</main>` y se quita el import de `SkillGroup` si existiera.

Run: `pnpm test tests/components && pnpm build` → Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProjectCard.astro src/components/Footer.astro src/sections/projects.astro src/sections/contact.astro src/layouts/HomePage.astro src/i18n/ui.ts tests/components
git commit -m "feat(site): Terminal-style projects, contact and footer"
```

---

### Task 12: Creador de personaje (HTML completo, sin JS)

**Files:**
- Create: `src/components/SkillBuilder.astro`
- Modify: `src/sections/skills.astro`, `src/i18n/ui.ts`, `tests/components/sections.test.ts`
- Delete: `src/components/SkillGroup.astro`

**Interfaces:**
- Consumes: `HomeView` (`skillGroups`, `professionalXp`, `usage`, `entryNames`, `profile`), `Icon`, `Window`, `BUILD_CAP`.
- Produces (marcado del que depende Task 13):
  - raíz `[data-builder]` con `data-cap="6"`, `data-broken-template` (con `{n}`), `data-equip-label`, `data-unequip-label`
  - `<script type="application/json" data-builder-data>` con `{ usage, entryNames }`
  - `[data-tabs]` (`role="tablist"`, `hidden` sin JS) con `button[role=tab][data-tab=<cat>]`
  - `section[data-panel=<cat>][role=tabpanel]` con `h3.panel-title`
  - `li.tile[data-skill=<id>]` con `button.tile-main[data-inspect=<id>]`, `button.tile-equip[data-equip=<id>][aria-pressed][hidden]`, `div.skill-detail[data-detail=<id>]`
  - ficha: `[data-slots]`, `[data-count]`, `[data-broken]` (`role="status"`), `[data-combo]`
  - inspector de escritorio `[data-inspector]` (`hidden`) y `dialog[data-sheet]` (móvil)

- [ ] **Step 1: Claves**

`ui.ts` (es / en):

```ts
        "skills.lead": "Equipa habilidades para ver en qué puestos las he combinado.",   // en: "Equip skills to see where I have combined them."
        "skills.sheet": "personaje.sav",        // en: "character.sav"
        "skills.level": "nv.",                  // en: "lv."
        "skills.xpPro": "XP profesional",       // en: "Professional XP"
        "skills.count": "habilidades",          // en: "skills"
        "skills.class": "clase",                // en: "class"
        "skills.build": "build",                // en: "build"
        "skills.combo": "combinación usada en", // en: "combination used at"
        "skills.comboEmpty": "Equipa habilidades con + para verlo.", // en: "Equip skills with + to see it."
        "skills.equip": "Equipar",              // en: "Equip"
        "skills.unequip": "Quitar",             // en: "Remove"
        "skills.equipAction": "equipar",        // en: "equip"
        "skills.unequipAction": "quitar de la build", // en: "remove from build"
        "skills.inspect": "inspeccionar",       // en: "inspect"
        "skills.since": "desde",                // en: "since"
        "skills.usedIn": "usada en",            // en: "used at"
        "skills.close": "cerrar",               // en: "close"
        "skills.broken": "Personaje roto. Con {n} habilidades equipadas, el equipo de balanceo ya está preparando un nerf.", // en: "Broken character. With {n} skills equipped, the balance team is already preparing a nerf."
        "skills.brokenTitle": "Personaje roto.", // en: "Broken character."
```

- [ ] **Step 2: Test que falla (versión sin JS)**

En `tests/components/sections.test.ts`, sustituir el test de `Skills` por:

```ts
test("Skills sin JS: todas las categorías, XP, desde y dónde se usó cada habilidad", async () => {
    const skill = (id: string, title: string, category: "backend" | "ai", over = {}) => ({
        id, title, category, summary: `${title} summary.`, icon: "si:python", months: 46, xp: "3 years 10 months",
        xpShort: "3.8 years", since: 2022, usedIn: [{ id: "zalcu", name: "Zalcu Technologies", role: "Developer" }], ...over,
    });
    const props = {
        locale: "en",
        groups: [
            { category: "backend", label: "Backend", items: [skill("python", "Python", "backend")] },
            { category: "ai", label: "Artificial intelligence", items: [skill("llm", "LLM agents", "ai", { months: 0, xp: "no recorded use", xpShort: "no recorded use", since: null, usedIn: [] })] },
        ],
        profile: { name: "Ada", headline: "Engineer" },
        professionalXp: "5.3 years",
        usage: { python: ["zalcu"] },
        entryNames: { zalcu: "Zalcu Technologies" },
    };
    const html = await container.renderToString(Skills, { props });
    expect(html).toContain('id="skills"');
    expect(html).toMatch(/<h3 class="panel-title[^"]*">Backend<\/h3>/);
    expect(html).toMatch(/<h3 class="panel-title[^"]*">Artificial intelligence<\/h3>/);
    expect(html).toContain("3 years 10 months");
    expect(html).toContain("Zalcu Technologies");
    expect(html).toContain("no recorded use");
    expect(html).toMatch(/data-tabs[^>]*hidden|hidden[^>]*data-tabs/);
    expect(html).toContain('data-cap="6"');
    expect(html).toContain("data-builder-data");
});
```

Run: `pnpm test tests/components/sections.test.ts` → Expected: FAIL.

- [ ] **Step 3: Implementar `src/components/SkillBuilder.astro`**

```astro
---
import type { Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";
import type { HomeView } from "@lib/home";
import { BUILD_CAP } from "@lib/skills";
import Icon from "./Icon.astro";

interface Props {
    locale: Locale;
    groups: HomeView["skillGroups"];
    profile: Pick<HomeView["profile"], "name" | "headline">;
    professionalXp: string;
    usage: HomeView["usage"];
    entryNames: HomeView["entryNames"];
}
const { locale, groups, profile, professionalXp, usage, entryNames } = Astro.props;
const t = useTranslations(locale);
const total = groups.reduce((n, g) => n + g.items.length, 0);
---

<div
    class="builder grid items-start gap-4.5 lg:grid-cols-[250px_1fr_290px]"
    data-builder
    data-cap={BUILD_CAP}
    data-broken-template={t("skills.broken")}
    data-equip-label={t("skills.equip")}
    data-unequip-label={t("skills.unequip")}
    data-equip-action={t("skills.equipAction")}
    data-unequip-action={t("skills.unequipAction")}
>
    <script type="application/json" data-builder-data set:html={JSON.stringify({ usage, entryNames })} />

    <aside class="window sheet">
        <div class="window-bar"><span aria-hidden="true">{t("skills.sheet")}</span><span aria-hidden="true">{t("skills.level")} {new Date().getFullYear()}</span></div>
        <div class="p-3 lg:p-4">
            <p class="font-display text-[15px] leading-tight font-bold lg:text-[16px]">{profile.name}</p>
            <p class="text-[12px] text-accent lg:text-[12.5px]">{profile.headline}</p>
            <dl class="mt-3 grid grid-cols-3 gap-1.5 text-center lg:grid-cols-1 lg:gap-1 lg:text-left">
                <div class="border border-line p-1.5 lg:flex lg:justify-between lg:border-0 lg:p-0"><dt class="text-[10.5px] text-muted lg:text-[13px]">{t("skills.xpPro")}</dt><dd class="text-[13.5px]">{professionalXp}</dd></div>
                <div class="border border-line p-1.5 lg:flex lg:justify-between lg:border-0 lg:p-0"><dt class="text-[10.5px] text-muted lg:text-[13px]">{t("skills.count")}</dt><dd class="text-[13.5px]">{total}</dd></div>
                <div class="border border-line p-1.5 lg:flex lg:justify-between lg:border-0 lg:p-0"><dt class="text-[10.5px] text-muted lg:text-[13px]">{t("skills.class")}</dt><dd class="text-[13.5px]">IA + backend</dd></div>
            </dl>
            <div class="builder-only" hidden>
                <p class="mt-3 flex justify-between text-[12px] text-muted"><span>{t("skills.build")}</span><span data-count>0 / {BUILD_CAP}</span></p>
                <div class="slots mt-1.5 flex gap-1.5 overflow-x-auto lg:grid lg:grid-cols-3 lg:gap-2" data-slots aria-label={t("skills.build")}></div>
                <div data-broken role="status" class="mt-2.5"></div>
                <details class="mt-2.5 text-[12.5px] lg:mt-4" open>
                    <summary class="flex cursor-pointer justify-between text-muted">{t("skills.combo")}</summary>
                    <div data-combo><p class="text-muted">{t("skills.comboEmpty")}</p></div>
                </details>
            </div>
        </div>
    </aside>

    <div class="inventory">
        <div class="tabbar relative sticky top-[var(--header-h)] z-10 -mx-4 mb-2.5 border-b border-line bg-bg lg:static lg:mx-0 lg:border-0" data-tabbar>
            <div class="tabs flex gap-1.5 overflow-x-auto px-4 py-2 lg:flex-wrap lg:px-0 lg:py-0 lg:pb-3" role="tablist" aria-label={t("section.skills")} data-tabs hidden>
                {groups.map((g, i) => (
                    <button class="tab flex-none" role="tab" id={`tab-${g.category}`} aria-controls={`panel-${g.category}`} aria-selected={i === 0 ? "true" : "false"} tabindex={i === 0 ? 0 : -1} data-tab={g.category}>{g.label}</button>
                ))}
            </div>
            <div class="edge edge-l pointer-events-none absolute inset-y-0 left-0 hidden w-14 items-center pl-1.5 lg:!hidden" aria-hidden="true"><button tabindex="-1" class="edge-btn pointer-events-auto grid size-7 place-items-center" data-scroll="-1"><Icon name="ph:caret-left" /></button></div>
            <div class="edge edge-r pointer-events-none absolute inset-y-0 right-0 hidden w-14 items-center justify-end pr-1.5 lg:!hidden" aria-hidden="true"><button tabindex="-1" class="edge-btn pointer-events-auto grid size-7 place-items-center" data-scroll="1"><Icon name="ph:caret-right" /></button></div>
        </div>

        {groups.map((g) => (
            <section class="skill-panel mb-4" id={`panel-${g.category}`} role="tabpanel" aria-labelledby={`tab-${g.category}`} data-panel={g.category}>
                <h3 class="panel-title mb-2 text-[13px] text-accent">{g.label}</h3>
                <ul class="grid gap-2 lg:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] lg:gap-2.5">
                    {g.items.map((s) => (
                        <li class="tile flex flex-wrap" data-skill={s.id}>
                            <button class="tile-main flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-3 text-left" data-inspect={s.id}>
                                <Icon name={s.icon} class="text-accent" />
                                <span><span class="tile-name block text-[13.5px] leading-tight">{s.title}</span><span class="block text-[11.5px] text-muted">XP {s.xpShort}</span></span>
                            </button>
                            <button class="tile-equip grid w-12 flex-none place-items-center text-xl lg:w-[34px] lg:text-lg" data-equip={s.id} aria-pressed="false" aria-label={`${t("skills.equip")} ${s.title}`} hidden>+</button>
                            <div class="skill-detail w-full border-t border-line px-2.5 py-2 text-[12.5px]" data-detail={s.id}>
                                <div class="detail-head hidden items-center gap-3">
                                    <Icon name={s.icon} class="size-11 border border-line text-[28px] text-accent" />
                                    <div><p class="font-display text-[19px] leading-tight font-bold">{s.title}</p><p class="text-[12px] text-muted">{g.label}</p></div>
                                </div>
                                <dl class="grid gap-1.5">
                                    <div class="flex justify-between border border-line px-2.5 py-2"><dt>XP</dt><dd class="text-accent">{s.xp}</dd></div>
                                    {s.since && <div class="flex justify-between border border-line px-2.5 py-2"><dt>{t("skills.since")}</dt><dd class="text-accent">{s.since}</dd></div>}
                                </dl>
                                <p class="mt-2.5 text-body">{s.summary}</p>
                                {s.usedIn.length > 0 && (
                                    <div class="mt-2.5"><p class="text-[12px] text-muted">{t("skills.usedIn")}</p>
                                        <ul class="marker-list mt-1">{s.usedIn.map((u) => <li>{u.name} <span class="text-[12px] text-muted">{u.role}</span></li>)}</ul>
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </section>
        ))}
    </div>

    <div class="window inspector hidden lg:block" data-inspector hidden>
        <div class="window-bar"><span aria-hidden="true">{t("skills.inspect")}</span><span aria-hidden="true">i</span></div>
        <div class="p-4" data-inspector-body></div>
    </div>

    <dialog class="sheet-dialog fixed inset-x-0 bottom-0 top-auto m-0 max-h-[78dvh] w-full max-w-none overflow-y-auto border-0 border-t border-accent bg-surface px-4 pt-2.5 pb-5 text-text backdrop:bg-black/55 lg:hidden" data-sheet aria-label={t("skills.inspect")}>
        <div class="mx-auto mb-3 h-1 w-10 bg-line" aria-hidden="true"></div>
        <div data-sheet-body></div>
        <div class="mt-4 grid grid-cols-2 gap-2.5">
            <button class="border border-line p-3 text-[13.5px]" data-sheet-close>{t("skills.close")}</button>
            <button class="sheet-equip border border-accent p-3 text-[13.5px]" data-sheet-equip></button>
        </div>
    </dialog>
</div>

<script>
    import { initSkillBuilder } from "../scripts/skill-builder";
    initSkillBuilder();
</script>
```

Estilos de mejora progresiva en `src/styles/skins/terminal.css` (la clase `is-enhanced` la pone el script):

```css
[data-builder].is-enhanced .panel-title,
[data-builder].is-enhanced .skill-detail {
    display: none;
}
[data-builder].is-enhanced .skill-panel:not([data-active]) {
    display: none;
}
[data-inspector-body] .skill-detail,
[data-sheet-body] .skill-detail {
    display: block;
    border: 0;
    padding: 0;
}
[data-inspector-body] .detail-head,
[data-sheet-body] .detail-head {
    display: flex;
    margin-bottom: 14px;
}
[data-skin="terminal"] .sheet-dialog[open] {
    animation: terminal-sheet-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes terminal-sheet-up {
    from {
        transform: translateY(100%);
    }
}
.tabbar[data-more-l] .edge-l,
.tabbar[data-more-r] .edge-r {
    display: flex;
}
.tabbar[data-more-l] .edge-l {
    background: linear-gradient(90deg, var(--skin-bg) 45%, transparent);
}
.tabbar[data-more-r] .edge-r {
    background: linear-gradient(270deg, var(--skin-bg) 45%, transparent);
}
```

`src/sections/skills.astro`:

```astro
---
import SkillBuilder from "@components/SkillBuilder.astro";
import type { Locale } from "@i18n/ui";
import { useTranslations } from "@i18n/utils";
import type { HomeView } from "@lib/home";

interface Props {
    groups: HomeView["skillGroups"];
    locale: Locale;
    profile: Pick<HomeView["profile"], "name" | "headline">;
    professionalXp: string;
    usage: HomeView["usage"];
    entryNames: HomeView["entryNames"];
}
const { groups, locale, ...rest } = Astro.props;
const t = useTranslations(locale);
---

{groups.length > 0 && (
    <section id="skills" class="mt-11 md:mt-18">
        <h2 class="section-title mb-1.5 text-[26px] md:text-[30px]">{t("section.skills")}</h2>
        <p class="mb-5 text-muted">{t("skills.lead")}</p>
        <SkillBuilder locale={locale} groups={groups} {...rest} />
    </section>
)}
```

En `HomePage.astro`: `<Skills groups={view.skillGroups} locale={locale} profile={view.profile} professionalXp={view.professionalXp} usage={view.usage} entryNames={view.entryNames} />`. Borrar `src/components/SkillGroup.astro`.

Crear un `src/scripts/skill-builder.ts` mínimo para que el build compile (se completa en Task 13):

```ts
export function initSkillBuilder(): void {}
```

Run: `pnpm test tests/components && pnpm build && pnpm check` → Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/SkillBuilder.astro src/sections/skills.astro src/layouts/HomePage.astro src/scripts/skill-builder.ts src/styles/skins/terminal.css src/i18n/ui.ts tests/components
git rm src/components/SkillGroup.astro
git commit -m "feat(site): Server-rendered character builder for skills"
```

---

### Task 13: Creador de personaje interactivo y flechas de pestañas

**Files:**
- Modify: `src/scripts/skill-builder.ts`
- Create: `src/scripts/tab-edges.ts`, `tests/e2e/builder.spec.ts`

**Interfaces:**
- Consumes: marcado de Task 12; `rankCombination`, `isBrokenBuild` (Task 4).
- Produces: `initSkillBuilder(): void`, `initTabEdges(tabbar: HTMLElement): void`.

- [ ] **Step 1: Tests E2E que fallan**

`tests/e2e/builder.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";

const builder = (page: Page) => page.locator("[data-builder]");
const equip = (page: Page, id: string) => page.locator(`[data-equip="${id}"]`).click();
const tab = (page: Page, cat: string) => page.locator(`[data-tab="${cat}"]`).click();
const inspectTitle = async (page: Page, project: string) =>
    page.locator(project === "mobile" ? "[data-sheet-body] .detail-head p" : "[data-inspector-body] .detail-head p").first();

test.describe("creador de personaje", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.locator("#skills").scrollIntoViewIfNeeded();
    });

    test("cambiar de pestaña muestra su panel e inspecciona su primera habilidad", async ({ page }, info) => {
        test.skip(info.project.name === "mobile", "en móvil el inspector solo se abre al tocar");
        await tab(page, "devops");
        await expect(page.locator('[data-panel="devops"]')).toBeVisible();
        await expect(page.locator('[data-panel="backend"]')).toBeHidden();
        await expect(await inspectTitle(page, info.project.name)).toHaveText("Docker");
    });

    test("+ equipa, la build sobrevive al cambio de pestaña y se quita desde la ficha", async ({ page }) => {
        await equip(page, "fastapi");
        await tab(page, "devops");
        await equip(page, "docker");
        await expect(page.locator("[data-count]")).toHaveText("2 / 6");
        await page.locator('[data-slots] [data-unequip="fastapi"]').click();
        await expect(page.locator("[data-count]")).toHaveText("1 / 6");
        await tab(page, "backend");
        await expect(page.locator('[data-equip="fastapi"]')).toHaveAttribute("aria-pressed", "false");
    });

    test("FastAPI + Celery + Docker se combinaron en Zalcu (3/3)", async ({ page }) => {
        await equip(page, "fastapi");
        await equip(page, "celery");
        await tab(page, "devops");
        await equip(page, "docker");
        await expect(page.locator("[data-combo] .combo-row").first()).toContainText("Zalcu Technologies");
        await expect(page.locator("[data-combo] .combo-row").first()).toContainText("3/3");
    });

    test("con 7 habilidades el personaje está roto; con 6 no", async ({ page }) => {
        for (const id of ["python", "fastapi", "django", "celery", "redis", "software-architecture"]) await equip(page, id);
        await expect(page.locator("[data-broken] .broken")).toHaveCount(0);
        await tab(page, "devops");
        await equip(page, "docker");
        await expect(page.locator("[data-broken] .broken")).toContainText("Personaje roto");
        await expect(page.locator("[data-count]")).toHaveText("7 / 6");
        await equip(page, "docker");
        await expect(page.locator("[data-broken] .broken")).toHaveCount(0);
    });

    test("pestañas con teclado (flechas)", async ({ page }) => {
        await page.locator('[data-tab="backend"]').focus();
        await page.keyboard.press("ArrowRight");
        await expect(page.locator('[data-tab="ai"]')).toBeFocused();
        await expect(page.locator('[data-tab="ai"]')).toHaveAttribute("aria-selected", "true");
    });

    test("móvil: tocar una habilidad abre el panel inferior y equipa desde él", async ({ page }, info) => {
        test.skip(info.project.name !== "mobile");
        await page.locator('[data-inspect="python"]').click();
        const sheet = page.locator("[data-sheet]");
        await expect(sheet).toBeVisible();
        await expect(sheet.locator(".detail-head p").first()).toHaveText("Python");
        await sheet.locator("[data-sheet-equip]").click();
        await expect(page.locator('[data-equip="python"]')).toHaveAttribute("aria-pressed", "true");
        await sheet.locator("[data-sheet-close]").click();
        await expect(sheet).toBeHidden();
    });

    test("móvil: flechas de scroll según la posición de las pestañas", async ({ page }, info) => {
        test.skip(info.project.name !== "mobile");
        const bar = page.locator("[data-tabbar]");
        await expect(bar).toHaveAttribute("data-more-r", "");
        await expect(bar).not.toHaveAttribute("data-more-l", "");
        await page.locator(".edge-r .edge-btn").click();
        await expect(bar).toHaveAttribute("data-more-l", "");
    });
});
```

Run: `pnpm test:e2e --grep "creador de personaje"` → Expected: FAIL (sin interactividad).

- [ ] **Step 2: `src/scripts/tab-edges.ts`**

```ts
export function initTabEdges(tabbar: HTMLElement): void {
    const tabs = tabbar.querySelector<HTMLElement>("[data-tabs]");
    if (!tabs) return;
    const first = tabs.firstElementChild;
    const last = tabs.lastElementChild;
    if (!first || !last) return;
    const io = new IntersectionObserver(
        (entries) => {
            for (const e of entries) {
                const side = e.target === first ? "l" : "r";
                tabbar.toggleAttribute(`data-more-${side}`, e.intersectionRatio < 0.98);
            }
        },
        { root: tabs, threshold: [0, 0.98, 1] },
    );
    io.observe(first);
    io.observe(last);
    tabbar.addEventListener("click", (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-scroll]");
        if (btn) tabs.scrollBy({ left: Number(btn.dataset.scroll) * tabs.clientWidth * 0.6, behavior: "smooth" });
    });
}
```

- [ ] **Step 3: `src/scripts/skill-builder.ts`**

```ts
import { isBrokenBuild, rankCombination } from "../lib/skills";
import { initTabEdges } from "./tab-edges";

type Data = { usage: Record<string, string[]>; entryNames: Record<string, string> };

export function initSkillBuilder(): void {
    const root = document.querySelector<HTMLElement>("[data-builder]");
    if (!root) return;
    const data: Data = JSON.parse(root.querySelector("[data-builder-data]")!.textContent!);
    const cap = Number(root.dataset.cap);
    const tabs = [...root.querySelectorAll<HTMLButtonElement>("[role=tab]")];
    const panels = [...root.querySelectorAll<HTMLElement>("[data-panel]")];
    const inspector = root.querySelector<HTMLElement>("[data-inspector]")!;
    const inspectorBody = root.querySelector<HTMLElement>("[data-inspector-body]")!;
    const sheet = root.querySelector<HTMLDialogElement>("[data-sheet]")!;
    const sheetBody = root.querySelector<HTMLElement>("[data-sheet-body]")!;
    const sheetEquip = root.querySelector<HTMLButtonElement>("[data-sheet-equip]")!;
    const desktop = matchMedia("(min-width: 1024px)");

    const state = { tab: tabs[0]?.dataset.tab ?? "", selected: "", build: [] as string[] };

    root.classList.add("is-enhanced");
    root.querySelector<HTMLElement>("[data-tabs]")!.hidden = false;
    root.querySelectorAll<HTMLElement>(".builder-only, [data-equip]").forEach((el) => (el.hidden = false));
    inspector.hidden = false;

    const titleOf = (id: string) => root.querySelector(`[data-skill="${id}"] .tile-name`)?.textContent ?? id;
    const detailOf = (id: string) => root.querySelector<HTMLElement>(`[data-detail="${id}"]`)!;
    const firstSkill = (cat: string) => root.querySelector<HTMLElement>(`[data-panel="${cat}"] [data-skill]`)?.dataset.skill ?? "";

    function toggle(id: string) {
        state.build = state.build.includes(id) ? state.build.filter((s) => s !== id) : [...state.build, id];
        render(id);
    }

    function selectTab(cat: string, focus = false) {
        state.tab = cat;
        state.selected = firstSkill(cat);
        render();
        if (focus) tabs.find((t) => t.dataset.tab === cat)?.focus();
    }

    function render(popped?: string) {
        for (const t of tabs) {
            const on = t.dataset.tab === state.tab;
            t.setAttribute("aria-selected", String(on));
            t.tabIndex = on ? 0 : -1;
        }
        for (const p of panels) p.toggleAttribute("data-active", p.dataset.panel === state.tab);

        root.querySelectorAll<HTMLElement>("[data-skill]").forEach((tile) => {
            const id = tile.dataset.skill!;
            const on = state.build.includes(id);
            tile.toggleAttribute("data-selected", id === state.selected);
            const btn = tile.querySelector<HTMLButtonElement>("[data-equip]")!;
            btn.setAttribute("aria-pressed", String(on));
            btn.setAttribute("aria-label", `${on ? root.dataset.unequipLabel : root.dataset.equipLabel} ${titleOf(id)}`);
            btn.textContent = on ? "✓" : "+";
            btn.classList.toggle("is-popping", id === popped);
        });

        if (state.selected) {
            inspectorBody.replaceChildren(detailOf(state.selected).cloneNode(true));
            const action = document.createElement("button");
            const on = state.build.includes(state.selected);
            action.className = `inspector-equip mt-4 w-full border border-accent p-2.5 ${on ? "text-accent" : "bg-accent text-accent-ink"}`;
            action.dataset.toggle = state.selected;
            action.textContent = (on ? root.dataset.unequipAction : root.dataset.equipAction) ?? "";
            inspectorBody.append(action);
            sheetBody.replaceChildren(detailOf(state.selected).cloneNode(true));
            sheetEquip.dataset.toggle = state.selected;
            sheetEquip.textContent = (on ? root.dataset.unequipAction : root.dataset.equipAction) ?? "";
            sheetEquip.className = `sheet-equip border border-accent p-3 text-[13.5px] ${on ? "text-accent" : "bg-accent text-accent-ink"}`;
        }

        const n = state.build.length;
        const over = isBrokenBuild(n);
        const count = root.querySelector<HTMLElement>("[data-count]")!;
        count.textContent = `${n} / ${cap}`;
        count.classList.toggle("text-warn", over);

        const slots = root.querySelector<HTMLElement>("[data-slots]")!;
        slots.replaceChildren(
            ...Array.from({ length: Math.max(cap, n) }, (_, i) => {
                const id = state.build[i];
                const el = document.createElement(id ? "button" : "div");
                el.className = "slot grid size-11 flex-none place-items-center lg:aspect-square lg:size-auto";
                if (id) {
                    el.dataset.unequip = id;
                    el.toggleAttribute("data-filled", true);
                    el.toggleAttribute("data-over", i >= cap);
                    el.setAttribute("aria-label", `${root.dataset.unequipLabel} ${titleOf(id)}`);
                    const icon = root.querySelector(`[data-skill="${id}"] .tile-main .icon`)!.cloneNode(true);
                    el.append(icon);
                }
                return el;
            }),
        );

        const broken = root.querySelector<HTMLElement>("[data-broken]")!;
        broken.innerHTML = over ? `<p class="broken">${root.dataset.brokenTemplate!.replace("{n}", String(n))}</p>` : "";

        const combo = root.querySelector<HTMLElement>("[data-combo]")!;
        const rows = rankCombination(state.build, data.usage);
        if (!n) combo.innerHTML = combo.dataset.empty ?? combo.innerHTML;
        else {
            combo.dataset.empty ??= combo.innerHTML;
            combo.replaceChildren(
                ...rows.map((r) => {
                    const row = document.createElement("p");
                    row.className = "combo-row mt-1 flex justify-between";
                    const name = document.createElement("b");
                    name.className = "font-medium";
                    name.textContent = data.entryNames[r.id] ?? r.id;
                    const hits = document.createElement("span");
                    hits.textContent = `${r.hits}/${n}`;
                    if (r.hits === n) hits.className = "text-accent";
                    row.append(name, hits);
                    return row;
                }),
            );
        }
    }

    root.addEventListener("click", (e) => {
        const el = e.target as HTMLElement;
        const tab = el.closest<HTMLElement>("[data-tab]");
        if (tab) return selectTab(tab.dataset.tab!);
        const eq = el.closest<HTMLElement>("[data-equip], [data-unequip], [data-toggle]");
        if (eq) return toggle(eq.dataset.equip ?? eq.dataset.unequip ?? eq.dataset.toggle!);
        const inspect = el.closest<HTMLElement>("[data-inspect]");
        if (inspect) {
            state.selected = inspect.dataset.inspect!;
            render();
            if (!desktop.matches) sheet.showModal();
            return;
        }
        if (el.closest("[data-sheet-close]") || el === sheet) sheet.close();
    });

    root.querySelector("[role=tablist]")!.addEventListener("keydown", (e) => {
        const key = (e as KeyboardEvent).key;
        const i = tabs.findIndex((t) => t.dataset.tab === state.tab);
        const next = key === "ArrowRight" ? i + 1 : key === "ArrowLeft" ? i - 1 : key === "Home" ? 0 : key === "End" ? tabs.length - 1 : -2;
        if (next === -2) return;
        e.preventDefault();
        selectTab(tabs[(next + tabs.length) % tabs.length].dataset.tab!, true);
    });

    initTabEdges(root.querySelector<HTMLElement>("[data-tabbar]")!);
    selectTab(state.tab);
}
```

Nota: el botón de equipar del inspector de escritorio y del panel inferior usan `data-toggle`; el clic en `[data-sheet-equip]` también lo captura el manejador por `data-toggle`.

Run: `pnpm test:e2e --grep "creador de personaje"` → Expected: PASS en `desktop` y `mobile`. Run: `pnpm test && pnpm check` → Expected: verde.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/skill-builder.ts src/scripts/tab-edges.ts tests/e2e/builder.spec.ts
git commit -m "feat(site): Interactive character builder with build combinations"
```

---

### Task 14: Animaciones con GSAP

**Files:**
- Create: `src/scripts/motion.ts`, `tests/e2e/motion.spec.ts`
- Modify: `src/layouts/HomePage.astro`

**Interfaces:**
- Consumes: clases `.hero-name`, `.prompt`, `.hero-role`, `.hero-loc`, `.hero-sum`, `.hero-cta`, `.photo-window`, `.timeline`, `.timeline-fill`, `.t-item[data-side]`, `.t-card`, `.timeline-node`, `.t-when`, `.reveal`.
- Produces: `initMotion(): void`.

- [ ] **Step 1: Tests E2E que fallan**

`tests/e2e/motion.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.describe("sin animaciones", () => {
    test.use({ reducedMotion: "reduce" });

    test("con movimiento reducido todo el contenido está visible y en su sitio", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator(".hero-name")).toHaveCSS("opacity", "1");
        const cards = page.locator(".t-card");
        for (const card of await cards.all()) {
            await card.scrollIntoViewIfNeeded();
            await expect(card).toHaveCSS("opacity", "1");
            await expect(card).toHaveCSS("transform", "none");
        }
    });
});

test.describe("sin JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("la página y el creador de personaje se leen completos", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator(".hero-name")).toBeVisible();
        await expect(page.locator(".panel-title")).toHaveCount(5);
        await expect(page.locator(".skill-detail").first()).toBeVisible();
        await expect(page.locator("[data-tabs]")).toBeHidden();
        await expect(page.locator(".t-card").first()).toBeVisible();
    });
});

test("con animaciones, la intro termina con el nombre completo", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".hero-name")).toHaveText("Álvaro Rubio Segovia", { timeout: 6000 });
});
```

Run: `pnpm test:e2e --grep "sin animaciones|sin JavaScript|intro"` → Expected: los dos primeros PASS (aún no hay animaciones) y el tercero PASS. Este bloque protege contra regresiones: tras el Step 2 deben seguir en verde. Para ver que los dos primeros pueden fallar, cambiar temporalmente en el Step 2 `gsap.from` por `gsap.set(…, { opacity: 0 })` sin `matchMedia` y comprobar que «con movimiento reducido…» falla; deshacer el cambio.

- [ ] **Step 2: `src/scripts/motion.ts`**

```ts
import { gsap } from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function initMotion(): void {
    gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin);
    const mm = gsap.matchMedia();

    mm.add({ ok: "(prefers-reduced-motion: no-preference)", wide: "(min-width: 768px)" }, (ctx) => {
        const { ok, wide } = ctx.conditions as { ok: boolean; wide: boolean };
        if (!ok) return;

        // Intro del hero: el comando se escribe, el nombre se descifra y el resto aparece.
        const prompt = document.querySelector<HTMLElement>(".hero .prompt");
        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
        if (prompt) {
            const full = prompt.textContent ?? "";
            tl.fromTo(prompt, { "--typed": 0 }, {
                "--typed": full.length, duration: full.length * 0.06, ease: `steps(${full.length})`,
                onUpdate() { prompt.textContent = full.slice(0, Math.round(Number(gsap.getProperty(prompt, "--typed")))); },
            });
        }
        tl.from(".hero-name", { duration: 1.1, scrambleText: { text: "{original}", chars: "01<>/#$%_", revealDelay: 0.15, speed: 0.6 } }, "+=0.1")
            .from([".hero-role", ".hero-loc", ".hero-sum", ".hero-cta"], { opacity: 0, y: 12, duration: 0.5, stagger: 0.08 }, "-=0.4")
            .from(".photo-window", { opacity: 0, x: wide ? -24 : 0, y: wide ? 0 : 16, duration: 0.6 }, "<");

        // Timelines: la línea se dibuja con el scroll y las tarjetas entran desde su lado.
        gsap.utils.toArray<HTMLElement>(".timeline").forEach((timeline) => {
            gsap.from(timeline.querySelector(".timeline-fill"), {
                scaleY: 0, ease: "none",
                scrollTrigger: { trigger: timeline, start: "top 70%", end: "bottom 60%", scrub: 0.6 },
            });
            timeline.querySelectorAll<HTMLElement>(".t-item").forEach((item) => {
                const st = { trigger: item, start: "top 82%" };
                const dx = wide ? (item.dataset.side === "left" ? -60 : 60) : 30;
                gsap.from(item.querySelector(".t-card"), { opacity: 0, x: dx, duration: 0.7, ease: "power3.out", scrollTrigger: st });
                gsap.from(item.querySelector(".timeline-node"), { scale: 0, duration: 0.4, ease: "back.out(3)", scrollTrigger: st });
                gsap.from(item.querySelector(".t-when"), { opacity: 0, duration: 0.6, delay: 0.2, scrollTrigger: st });
            });
        });

        gsap.utils.toArray<HTMLElement>(".reveal, [data-builder]").forEach((el) =>
            gsap.from(el, { opacity: 0, y: 24, duration: 0.6, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 85%" } }),
        );
    });
}
```

Nota: `timeline-fill` usa `scaleY`; el nodo `.timeline-node` ya tiene `transform: rotate(45deg)` en CSS: GSAP combina `scale` con la rotación existente porque lee el transform calculado.

En `src/layouts/HomePage.astro`, al final:

```astro
<script>
    import { initMotion } from "../scripts/motion";
    initMotion();
</script>
```

Run: `pnpm test:e2e` → Expected: todo PASS en ambos proyectos.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/motion.ts src/layouts/HomePage.astro tests/e2e/motion.spec.ts
git commit -m "feat(site): GSAP intro, timeline and reveal animations with reduced-motion fallback"
```

---

### Task 15: E2E de conjunto, accesibilidad, regresión visual y presupuesto

**Files:**
- Modify: `tests/e2e/home.spec.ts`, `package.json`
- Create: `tests/e2e/nav.spec.ts`, `tests/e2e/visual.spec.ts`, `tests/perf/budget.test.ts`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: script `test:e2e` = `playwright test && vitest run tests/privacy tests/perf`; script `test:visual:update` = `playwright test tests/e2e/visual.spec.ts --update-snapshots`.

- [ ] **Step 1: Navegación y desbordamiento**

`tests/e2e/nav.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("escritorio: el menú lleva a cada sección y la marca como activa", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.goto("/");
    for (const id of ["experience", "projects", "skills", "education", "contact"]) {
        await page.locator(`.site-nav a[href="#${id}"]`).click();
        await expect(page.locator(`#${id}`)).toBeInViewport();
        await expect(page.locator(`.site-nav a[href="#${id}"]`)).toHaveAttribute("aria-current", "true");
    }
});

test("móvil: el popover abre, navega, se cierra al elegir y con Esc", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile");
    await page.goto("/");
    const menu = page.locator("#site-menu");
    await page.locator('[popovertarget="site-menu"]').click();
    await expect(menu).toBeVisible();
    await menu.locator('a[href="#skills"]').click();
    await expect(menu).toBeHidden();
    await expect(page.locator("#skills")).toBeInViewport();
    await page.locator('[popovertarget="site-menu"]').click();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
});

test("sin desbordamiento horizontal", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
});
```

- [ ] **Step 2: Accesibilidad con diálogos abiertos**

En `tests/e2e/home.spec.ts`, añadir dentro del `for (const p of pages)`:

```ts
        test("axe sin violaciones graves con el visor y el menú abiertos", async ({ page }, info) => {
            await page.goto(p.path);
            await page.locator("#photo-open").click();
            let results = await new AxeBuilder({ page }).analyze();
            expect(results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")).map((v) => v.id)).toEqual([]);
            await page.keyboard.press("Escape");
            if (info.project.name === "mobile") {
                await page.locator('[popovertarget="site-menu"]').click();
                results = await new AxeBuilder({ page }).analyze();
                expect(results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")).map((v) => v.id)).toEqual([]);
            }
        });
```

Revisar el resto de `home.spec.ts`: en «todas las secciones del menú existen», usar `.site-nav a[href^="#"]` (escritorio) o `#site-menu a[href^="#"]` (móvil) según `info.project.name`; el selector antiguo `header a[href^="#"]` ahora encuentra los enlaces dos veces (barra y menú). Añadir también un test de CLS:

```ts
        test("sin saltos de maquetación al cargar", async ({ page }) => {
            await page.emulateMedia({ reducedMotion: "reduce" });
            await page.goto(p.path);
            const cls = await page.evaluate(() => new Promise<number>((resolve) => {
                let total = 0;
                new PerformanceObserver((list) => {
                    for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) total += e.value;
                }).observe({ type: "layout-shift", buffered: true });
                setTimeout(() => resolve(total), 1500);
            }));
            expect(cls).toBeLessThan(0.1);
        });
```

- [ ] **Step 3: Regresión visual**

`tests/e2e/visual.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

for (const path of ["/", "/en/"]) {
    test(`portada ${path}`, async ({ page }) => {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot({ fullPage: true, animations: "disabled", maxDiffPixelRatio: 0.01 });
    });
}
```

Generar las referencias: `pnpm exec playwright test tests/e2e/visual.spec.ts --update-snapshots`. Revisar a ojo las 4 capturas generadas en `tests/e2e/visual.spec.ts-snapshots/` (desktop y mobile, es y en) contra las maquetas antes de versionarlas.

- [ ] **Step 4: Presupuesto de JavaScript**

`tests/perf/budget.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { expect, test } from "vitest";

const DIST = join(import.meta.dirname, "../../dist");
const BUDGET_KB = 60;

test.skipIf(!existsSync(join(DIST, "index.html")) && !process.env.CI)(`JS de la portada ≤ ${BUDGET_KB} KB comprimido`, () => {
    const html = readFileSync(join(DIST, "index.html"), "utf8");
    const scripts = [...html.matchAll(/<script[^>]*src="([^"]+\.js)"/g)].map((m) => m[1]);
    const imports = new Set<string>(scripts);
    for (const s of scripts) {
        const code = readFileSync(join(DIST, s), "utf8");
        for (const m of code.matchAll(/from\s*"(\.\/[^"]+\.js)"/g)) imports.add(join(s, "..", m[1]));
    }
    const total = [...imports].reduce((sum, s) => sum + gzipSync(readFileSync(join(DIST, s))).length, 0);
    expect(total / 1024).toBeLessThanOrEqual(BUDGET_KB);
});
```

En `package.json`:

```json
"test:e2e": "playwright test && vitest run tests/privacy tests/perf",
"test:visual:update": "playwright test tests/e2e/visual.spec.ts --update-snapshots"
```

- [ ] **Step 5: Ejecutar todo**

Run: `pnpm check && pnpm test && pnpm test:e2e`
Expected: todo en verde en `desktop` y `mobile`. Si axe marca contraste, ajustar el token o la clase (no excluir reglas). Si el presupuesto falla, comprobar que solo se cargan los plugins de GSAP usados.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e tests/perf package.json
git commit -m "test: Cover navigation, dialogs, overflow, visual regression and JS budget"
```

---

### Task 16: Documentación

**Files:**
- Modify: `docs/system-design.md`, `docs/tasks.md`, `docs/superpowers/specs/2026-10-02-terminal-skin-design.md`, `README.md`, `CLAUDE.md`

- [ ] **Step 1: `docs/system-design.md`**

- §2 Módulos: añadir `src/styles/skins/`, `src/scripts/`, `src/lib/{icons,skills,skins}.ts`, `docs/design/mockups/`.
- §3.1 Stack: GSAP 3.15 (licencia gratuita, ScrollTrigger y ScrambleText), simple-icons, @phosphor-icons/core, API de fuentes de Astro.
- §3.2 Composición: diagrama con `Header` (popover), `ProfilePhoto` (dialog), `Timeline`, `SkillBuilder`, `Footer`; los scripts de `src/scripts/` y el principio de mejora progresiva.
- §3.4 Estilos: sustituir por la arquitectura de skins (tokens `@theme inline` → `--skin-*`, clases semánticas, regla de componentes) y enlazar la spec.
- §3.7 Tests: proyectos `desktop`/`mobile`, regresión visual (`pnpm test:visual:update`), presupuesto de JS, tests sin JS y con movimiento reducido.
- §8 Decisiones: añadir «Skins por atributo y tokens `--skin-*` | Un único tema fijo | Añadir skins sin tocar el marcado», «GSAP + CSS | Solo CSS / Motion | Efectos de terminal (ScrambleText) y ScrollTrigger; sin framework», «Integridad de `skills` con `findBrokenSkillRefs` | `reference()` de Astro | Esquemas testeables sin `astro:content`», «XP calculada | Niveles escritos a mano | Sin datos inventados».

- [ ] **Step 2: Spec**

En la spec, §3.3: sustituir «validados con `reference("skills")`…» por «validados con `findBrokenSkillRefs` en `HomePage.astro` (el build falla) y en el test de contrato». Cambiar `Estado: pendiente de revisión` por `Estado: implementada`.

- [ ] **Step 3: `docs/tasks.md`**

Mover la fase 5 a *Hecho* (`2026-10-02 | Fase 5: arquitectura de skins y skin Terminal | spec, plan, commits`) y conservar la 5b en *Pendiente*. Añadir a *Pendiente* las mejoras aplazadas que surjan en la revisión final.

- [ ] **Step 4: README y CLAUDE.md**

- `README.md`: mencionar `pnpm test:visual:update` y que las capturas de referencia se regeneran a propósito al cambiar el diseño.
- `CLAUDE.md`: estilos por skins (`src/styles/skins/`), scripts en `src/scripts/`, maquetas en `docs/design/mockups/`.

- [ ] **Step 5: Verificación final y commit**

Run: `pnpm check && pnpm test && pnpm test:e2e` → Expected: todo en verde.

```bash
git add docs README.md CLAUDE.md
git commit -m "docs: Document skin architecture, scripts and visual tests"
```
