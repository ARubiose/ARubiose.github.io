import { experimental_AstroContainer as AstroContainer } from "astro/container";

type Component = Parameters<AstroContainer["renderToString"]>[0];
type Options = Parameters<AstroContainer["renderToString"]>[1];

/** Quita los atributos de depuración que añade Astro en desarrollo, para comprobar el HTML final. */
export function clean(html: string): string {
    return html.replace(/\s+data-astro-source-(file|loc)="[^"]*"/g, "");
}

export async function render(component: Component, options?: Options): Promise<string> {
    const container = await AstroContainer.create();
    return clean(await container.renderToString(component, options));
}
