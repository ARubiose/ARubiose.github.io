// Mismo patrón que lightbox.ts, en un módulo aparte: si lo compartieran, Astro sacaría el script
// de la foto de la portada a un archivo propio en vez de incrustarlo, y cambiaría su tiempo de carga.

/** Envuelve cada imagen del cuerpo de un detalle en un botón que la abre a tamaño natural. */
export function initFigureZoom(): void {
    const dialog = document.getElementById("figure-dialog") as HTMLDialogElement | null;
    const view = dialog?.querySelector<HTMLImageElement>(".figure-scroll img");
    if (!dialog || !view) return;
    const label = dialog.dataset.openLabel ?? "";
    let origin: HTMLElement | null = null;
    for (const img of document.querySelectorAll<HTMLImageElement>("article.prose-detail img")) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "figure-open";
        button.setAttribute("aria-haspopup", "dialog");
        button.setAttribute("aria-label", `${label} ${img.alt}`.trim());
        img.replaceWith(button);
        button.append(img);
        button.addEventListener("click", () => {
            view.src = img.currentSrc || img.src;
            view.alt = img.alt;
            origin = button;
            dialog.showModal();
        });
    }
    dialog.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (target === dialog || target.closest("[data-figure-close]")) dialog.close();
    });
    dialog.addEventListener("close", () => origin?.focus());
}
