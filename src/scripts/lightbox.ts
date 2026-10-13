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
