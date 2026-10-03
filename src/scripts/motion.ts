import { gsap } from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type IntroContext = { wide: boolean; prompt: HTMLElement | null; full: string };

const scramble = (chars: string) => ({ duration: 1.1, scrambleText: { text: "{original}", chars, revealDelay: 0.15, speed: 0.6 } });

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
        tl.from(".hero-name", scramble("01<>/#$%_"), "+=0.1");
        revealRest(tl, wide, -1);
    },
    // Arranque de HUD: las esquinas de la foto se dibujan, la línea del adorno se extiende y el
    // nombre se descifra con caracteres de HUD. La foto está a la derecha: entra desde ahí.
    tactical(tl, { wide }) {
        tl.fromTo(".photo-window", { "--corner-size": "0px" }, { "--corner-size": "38px", duration: 0.4, ease: "power3.out" })
            .fromTo(".hero .prompt", { "--kicker-line": "0px" }, { "--kicker-line": "26px", duration: 0.35 }, "<0.1")
            .from(".hero-name", scramble("0123456789/◆"), "-=0.1");
        revealRest(tl, wide, 1);
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
        // Al revertir (p. ej. si se activa el movimiento reducido) el prompt vuelve a estar completo.
        return () => { if (prompt) prompt.textContent = full; };
    });

    mm.add({ ok: "(prefers-reduced-motion: no-preference)", wide: "(min-width: 768px)" }, (ctx) => {
        const { ok, wide } = ctx.conditions as { ok: boolean; wide: boolean };
        if (!ok) return;

        // Timelines: la línea se dibuja con el scroll y las tarjetas entran desde su lado.
        const single = document.documentElement.dataset.timeline === "single";
        gsap.utils.toArray<HTMLElement>(".timeline").forEach((timeline) => {
            gsap.from(timeline.querySelector(".timeline-fill"), {
                scaleY: 0, ease: "none",
                scrollTrigger: { trigger: timeline, start: "top 70%", end: "bottom 60%", scrub: 0.6 },
            });
            timeline.querySelectorAll<HTMLElement>(".t-item").forEach((item) => {
                const st = { trigger: item, start: "top 82%" };
                // En modo single todas las tarjetas están a la derecha del eje: entran desde ahí.
                const dx = wide && !single ? (item.dataset.side === "left" ? -60 : 60) : 30;
                gsap.from(item.querySelector(".t-card"), { opacity: 0, x: dx, duration: 0.7, ease: "power3.out", scrollTrigger: st });
                gsap.from(item.querySelector(".timeline-node"), { scale: 0, duration: 0.4, ease: "back.out(3)", scrollTrigger: st });
                gsap.from(item.querySelector(".t-when"), { opacity: 0, duration: 0.6, delay: 0.2, scrollTrigger: st });
            });
        });

        gsap.utils.toArray<HTMLElement>(".reveal, [data-builder]").forEach((el) =>
            gsap.from(el, { opacity: 0, y: 24, duration: 0.6, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 85%" } }),
        );
    });
    // Cambiar de skin cambia la distribución: se recalculan las posiciones, sin repetir la intro.
    document.addEventListener("skinchange", () => ScrollTrigger.refresh());
    document.documentElement.setAttribute("data-motion-ready", "");
}
