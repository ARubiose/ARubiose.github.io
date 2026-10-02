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
