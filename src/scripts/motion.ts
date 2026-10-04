import { gsap } from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type IntroContext = { wide: boolean; prompt: HTMLElement | null; full: string };

const scramble = (chars: string) => ({ duration: 1.1, scrambleText: { text: "{original}", chars, revealDelay: 0.15, speed: 0.6 } });

// El texto descifrado no tiene espacios: escrito sobre el nombre real, cambiaba sus saltos de línea
// y la altura de la página, y un salto del menú a mitad de intro se quedaba corto. Se descifra una
// copia superpuesta a la caja del titular; el nombre real conserva su sitio y su texto accesible.
function scrambleName(tl: gsap.core.Timeline, chars: string, position: gsap.Position) {
    const name = document.querySelector<HTMLElement>(".hero-name");
    const title = name?.parentElement;
    if (!name || !title) return;
    const copy = document.createElement("span");
    copy.className = "hero-name-scramble";
    copy.setAttribute("aria-hidden", "true");
    copy.textContent = name.textContent;
    title.append(copy);
    gsap.set(name, { visibility: "hidden" });
    const done = () => {
        copy.remove();
        gsap.set(name, { clearProps: "visibility" });
    };
    tl.from(copy, { ...scramble(chars), onComplete: done }, position);
}

// El resto del hero aparece igual en todas las skins; la foto entra desde su lado.
function revealRest(tl: gsap.core.Timeline, wide: boolean, photoFrom: -1 | 1) {
    tl.from([".hero-role", ".hero-loc", ".hero-sum", ".hero-cta"], { opacity: 0, y: 12, duration: 0.5, stagger: 0.08 }, "-=0.4")
        .from(".photo-window", { opacity: 0, x: wide ? 24 * photoFrom : 0, y: wide ? 0 : 16, duration: 0.6 }, "<");
}

// Intro por skin. Una skin sin preset usa la de Terminal sin la escritura del prompt.
const introPresets: Record<string, (tl: gsap.core.Timeline, ctx: IntroContext) => void> = {
    // El comando se escribe, el nombre se descifra y el resto aparece.
    terminal(tl, { wide, prompt, full }) {
        if (prompt) {
            tl.fromTo(prompt, { "--typed": 0 }, {
                "--typed": full.length, duration: full.length * 0.06, ease: `steps(${full.length})`,
                onUpdate() { prompt.textContent = full.slice(0, Math.round(Number(gsap.getProperty(prompt, "--typed")))); },
            });
        }
        scrambleName(tl, "01<>/#$%_", "+=0.1");
        revealRest(tl, wide, -1);
    },
    // Arranque de HUD: las esquinas de la foto se dibujan, la línea del adorno se extiende y el
    // nombre se descifra con caracteres de HUD. La foto está a la derecha: entra desde ahí.
    tactical(tl, { wide }) {
        tl.fromTo(".photo-window", { "--corner-size": "0px" }, { "--corner-size": "38px", duration: 0.4, ease: "power3.out" })
            .fromTo(".hero .prompt", { "--kicker-line": "0px" }, { "--kicker-line": "26px", duration: 0.35 }, "<0.1");
        scrambleName(tl, "0123456789/◆", "-=0.1");
        revealRest(tl, wide, 1);
    },
    // Pantalla de selección: el panel diagonal barre desde la derecha, la foto entra tras él, el
    // nombre llega de golpe desde la izquierda y el bloque del rol se estira. La foto ya ha entrado:
    // no se usa revealRest, que la animaría otra vez.
    game(tl, { wide }) {
        tl.fromTo(".photo-window", { "--panel-reveal": 0 }, { "--panel-reveal": 1, duration: 0.35, ease: "power3.out" })
            .from(".photo-window img, .photo-window > .window-bar", { opacity: 0, x: wide ? 40 : 0, y: wide ? 0 : 16, duration: 0.45 }, "-=0.15")
            .from(".hero-name", { opacity: 0, x: -48, filter: "blur(6px)", duration: 0.45, ease: "power4.out", clearProps: "filter" }, "-=0.25")
            .from(".hero-role", { scaleX: 0, transformOrigin: "left center", duration: 0.3, ease: "power3.out" }, "-=0.15")
            .from([".hero-loc", ".hero-sum", ".hero-cta"], { opacity: 0, y: 12, duration: 0.5, stagger: 0.08 }, "-=0.1");
    },
};

export function initMotion(): void {
    gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin);
    const mm = gsap.matchMedia();

    // Intro del hero, en su propio contexto: si dependiera del ancho, cruzar 768 px la
    // revertiría y repetiría, dejando el prompt cortado. Su dirección y su preset se fijan al cargar.
    const prompt = document.querySelector<HTMLElement>('.hero .prompt [data-for-skin="terminal"]');
    const full = prompt?.textContent ?? "";
    mm.add("(prefers-reduced-motion: no-preference)", () => {
        const skin = document.documentElement.dataset.skin ?? "";
        const ctx = { wide: matchMedia("(min-width: 768px)").matches, prompt, full };
        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
        const preset = introPresets[skin];
        if (preset) preset(tl, ctx);
        else introPresets.terminal(tl, { ...ctx, prompt: null });
        // Al revertir (p. ej. si se activa el movimiento reducido) el prompt vuelve a estar completo
        // y desaparece la copia del nombre que se estaba descifrando.
        return () => {
            if (prompt) prompt.textContent = full;
            document.querySelector(".hero-name-scramble")?.remove();
        };
    });

    mm.add({ ok: "(prefers-reduced-motion: no-preference)", wide: "(min-width: 768px)" }, (ctx) => {
        const { ok, wide } = ctx.conditions as { ok: boolean; wide: boolean };
        if (!ok) return;

        // Timelines: la línea se dibuja con el scroll y las tarjetas entran desde su lado.
        gsap.utils.toArray<HTMLElement>(".timeline").forEach((timeline) => {
            gsap.from(timeline.querySelector(".timeline-fill"), {
                scaleY: 0, ease: "none",
                scrollTrigger: { trigger: timeline, start: "top 70%", end: "bottom 60%", scrub: 0.6 },
            });
            timeline.querySelectorAll<HTMLElement>(".t-item").forEach((item) => {
                const st = { trigger: item, start: "top 82%" };
                // En modo single todas las tarjetas están a la derecha del eje: entran desde ahí. El modo
                // se lee en cada refresco (el cambio de skin lo provoca) para las tarjetas aún por entrar.
                const dx = () => {
                    const single = document.documentElement.dataset.timeline === "single";
                    return wide && !single ? (item.dataset.side === "left" ? -60 : 60) : 30;
                };
                gsap.from(item.querySelector(".t-card"), { opacity: 0, x: dx, duration: 0.7, ease: "power3.out", scrollTrigger: { ...st, invalidateOnRefresh: true } });
                gsap.from(item.querySelector(".timeline-node"), { scale: 0, duration: 0.4, ease: "back.out(3)", scrollTrigger: st });
                gsap.from(item.querySelector(".t-when"), { opacity: 0, duration: 0.6, delay: 0.2, scrollTrigger: st });
            });
        });

        gsap.utils.toArray<HTMLElement>(".reveal, [data-builder]").forEach((el) =>
            gsap.from(el, { opacity: 0, y: 24, duration: 0.6, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 85%" } }),
        );
    });
    // Cambiar de skin cambia la distribución: se recalculan las posiciones, sin repetir la intro. Las
    // fuentes de la skin nueva no se precargan y, al llegar, vuelven a cambiar las alturas: se recalcula
    // otra vez. Se espera un fotograma para que sus descargas hayan empezado y fonts.ready las incluya.
    document.addEventListener("skinchange", () => {
        ScrollTrigger.refresh();
        requestAnimationFrame(() => document.fonts.ready.then(() => ScrollTrigger.refresh()));
    });
    document.documentElement.setAttribute("data-motion-ready", "");
}
