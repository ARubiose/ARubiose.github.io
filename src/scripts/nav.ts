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
