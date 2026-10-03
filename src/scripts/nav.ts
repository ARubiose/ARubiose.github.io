export function initNav(): void {
    const links = [...document.querySelectorAll<HTMLAnchorElement>("a.nav-link[href^='#']")];
    const menu = document.getElementById("site-menu");
    // Al elegir en el menú móvil, el salto es instantáneo: tras cerrarse el popover, Chromium
    // cancelaba a veces el scroll suave y la página se quedaba arriba. El menú ocupa la pantalla,
    // así que no se pierde nada. La navegación sigue siendo la nativa (hash y punto de partida del foco).
    const root = document.documentElement;
    links.forEach((a) =>
        a.addEventListener("click", () => {
            if (!menu?.matches(":popover-open")) return;
            menu.hidePopover();
            root.style.scrollBehavior = "auto";
            setTimeout(() => root.style.removeProperty("scroll-behavior"));
        }),
    );

    const setActive = (id: string) => {
        for (const a of links) {
            if (a.getAttribute("href") === `#${id}`) a.setAttribute("aria-current", "true");
            else a.removeAttribute("aria-current");
        }
    };

    // Solo las secciones enlazadas: los paneles del creador también son <section id>.
    const linked = new Set(links.map((a) => a.getAttribute("href")!.slice(1)));
    const sections = [...document.querySelectorAll<HTMLElement>("main section[id]")].filter((s) => linked.has(s.id));
    const footer = document.querySelector("footer");

    // Se recalcula con la geometría actual en cada fotograma de scroll. Antes se usaban
    // IntersectionObserver: sus avisos llegaban en lotes durante el scroll suave, y el del pie
    // (threshold 1) no saltaba nunca si su altura era fraccionaria, así que «contacto» no se marcaba.
    const update = () => {
        const line = innerHeight * 0.5 + 1;
        // La última sección nunca alcanza la franja central: con el pie entero a la vista, se marca ella.
        const footerVisible = footer && footer.getBoundingClientRect().bottom <= innerHeight + 1;
        const current = footerVisible ? sections.at(-1) : sections.findLast((s) => s.getBoundingClientRect().top <= line);
        if (current) setActive(current.id);
    };
    let queued = false;
    const schedule = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            update();
        });
    };
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule, { passive: true });
    update();
}
