import { gsap } from "gsap";

// Entrada del CV: la hoja sale línea a línea, como de una impresora, y después aparecen sus secciones.
// Mejora progresiva: sin JavaScript o con movimiento reducido (también al imprimir el PDF en la build)
// la hoja se ve completa al instante. Al terminar no queda ningún estilo en línea.
export function initCvMotion(): void {
    const sheet = document.querySelector<HTMLElement>(".cv-sheet");
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (!sheet) return;
        const parts = sheet.querySelectorAll<HTMLElement>(".cv-head, .cv-sec");
        const printer = document.querySelector<HTMLElement>("[data-cv-printer]");
        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
        tl.fromTo(printer, { opacity: 0, scaleX: 0.6 }, { opacity: 1, scaleX: 1, duration: 0.15 })
            .fromTo(sheet, { clipPath: "inset(0 0 100% 0)", y: -18 }, { clipPath: "inset(0 0 0% 0)", y: 0, duration: 0.6, ease: "steps(20)", clearProps: "clipPath,transform" })
            .from(parts, { opacity: 0, y: 8, duration: 0.3, stagger: 0.04, clearProps: "opacity,transform" }, "<0.1")
            .to(printer, { opacity: 0, duration: 0.2, clearProps: "opacity,transform" }, "-=0.15");
        return () => gsap.set([sheet, ...parts], { clearProps: "all" });
    });
    // La hoja ya está recortada en su estado inicial: puede pintarse (ver states.css).
    document.documentElement.removeAttribute("data-motion-pending");
    document.documentElement.setAttribute("data-cv-motion-ready", "");
}
