export function initNav(): void {
    const links = [...document.querySelectorAll<HTMLAnchorElement>("a.nav-link[href^='#']")];
    const menu = document.getElementById("site-menu");
    links.forEach((a) => a.addEventListener("click", () => menu?.hidePopover?.()));

    const setActive = (id: string) => {
        for (const a of links) {
            if (a.getAttribute("href") === `#${id}`) a.setAttribute("aria-current", "true");
            else a.removeAttribute("aria-current");
        }
    };

    const sections = [...document.querySelectorAll<HTMLElement>("main section[id]")];
    const io = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
        },
        { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((s) => io.observe(s));

    // La última sección nunca alcanza la franja central: al ver el pie entero, se marca ella.
    const footer = document.querySelector("footer");
    const last = sections.at(-1);
    if (footer && last) {
        new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) setActive(last.id);
            },
            { threshold: 1 },
        ).observe(footer);
    }
}
