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
