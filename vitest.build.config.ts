import { defineConfig } from "vitest/config";

// Tests que construyen el sitio (lentos): fuera de `pnpm test`, dentro de `pnpm test:e2e`.
// En serie: las builds de Astro comparten .astro/ en la raíz y en paralelo se pisan.
export default defineConfig({ test: { include: ["tests/build/**/*.test.ts"], testTimeout: 240_000, hookTimeout: 240_000, fileParallelism: false } });
