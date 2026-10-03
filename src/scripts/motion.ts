import { gsap } from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function initMotion(): void {
    gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin);
    const mm = gsap.matchMedia();

    // Intro del hero, en su propio contexto: si dependiera del ancho, cruzar 768 px la
    // revertiría y repetiría, dejando el prompt cortado. Su dirección se fija al cargar.
    const prompt = document.querySelector<HTMLElement>('.hero .prompt [data-for-skin="terminal"]');
    const full = prompt?.textContent ?? "";
    mm.add("(prefers-reduced-motion: no-preference)", () => {
        const wide = matchMedia("(min-width: 768px)").matches;
        // El comando se escribe, el nombre se descifra y el resto aparece.
        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
        if (prompt) {
            tl.fromTo(prompt, { "--typed": 0 }, {
                "--typed": full.length, duration: full.length * 0.06, ease: `steps(${full.length})`,
                onUpdate() { prompt.textContent = full.slice(0, Math.round(Number(gsap.getProperty(prompt, "--typed")))); },
            });
        }
        tl.from(".hero-name", { duration: 1.1, scrambleText: { text: "{original}", chars: "01<>/#$%_", revealDelay: 0.15, speed: 0.6 } }, "+=0.1")
            .from([".hero-role", ".hero-loc", ".hero-sum", ".hero-cta"], { opacity: 0, y: 12, duration: 0.5, stagger: 0.08 }, "-=0.4")
            .from(".photo-window", { opacity: 0, x: wide ? -24 : 0, y: wide ? 0 : 16, duration: 0.6 }, "<");
        // Al revertir (p. ej. si se activa el movimiento reducido) el prompt vuelve a estar completo.
        return () => { if (prompt) prompt.textContent = full; };
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
                const dx = wide ? (item.dataset.side === "left" ? -60 : 60) : 30;
                gsap.from(item.querySelector(".t-card"), { opacity: 0, x: dx, duration: 0.7, ease: "power3.out", scrollTrigger: st });
                gsap.from(item.querySelector(".timeline-node"), { scale: 0, duration: 0.4, ease: "back.out(3)", scrollTrigger: st });
                gsap.from(item.querySelector(".t-when"), { opacity: 0, duration: 0.6, delay: 0.2, scrollTrigger: st });
            });
        });

        gsap.utils.toArray<HTMLElement>(".reveal, [data-builder]").forEach((el) =>
            gsap.from(el, { opacity: 0, y: 24, duration: 0.6, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 85%" } }),
        );
    });
    document.documentElement.setAttribute("data-motion-ready", "");
}
