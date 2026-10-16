import type { Page } from "@playwright/test";

/** Elementos que se salen del viewport sin estar dentro de un contenedor con scroll horizontal. */
export function overflowOffenders(page: Page): Promise<string[]> {
    // body usa overflow-x: clip, así que scrollWidth no ve el desbordamiento: se miden los elementos (como nav.spec.ts).
    return page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const scrollsX = (el: Element) => ["auto", "scroll"].includes(getComputedStyle(el).overflowX);
        return [...document.querySelectorAll("body *")]
            .filter((el) => {
                const r = el.getBoundingClientRect();
                if (r.width === 0 || r.height === 0 || r.right <= vw + 1) return false;
                for (let a = el.parentElement; a; a = a.parentElement) if (scrollsX(a)) return false;
                return getComputedStyle(el).visibility !== "hidden";
            })
            .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 3).join(".")} → ${Math.round(el.getBoundingClientRect().right)}px`);
    });
}
