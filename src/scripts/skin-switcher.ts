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
