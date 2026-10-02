// Lógica de la build sin dependencias: se empaqueta en el cliente (no debe arrastrar Zod ni el diccionario).
export const BUILD_CAP = 6;

export function rankCombination(build: string[], usage: Record<string, string[]>) {
    const order: string[] = [];
    const hits = new Map<string, number>();
    for (const ids of Object.values(usage)) for (const id of ids) if (!order.includes(id)) order.push(id);
    for (const skill of build) for (const id of usage[skill] ?? []) hits.set(id, (hits.get(id) ?? 0) + 1);
    return order
        .filter((id) => hits.has(id))
        .map((id) => ({ id, hits: hits.get(id)! }))
        .sort((a, b) => b.hits - a.hits);
}

export function isBrokenBuild(count: number): boolean {
    return count > BUILD_CAP;
}
