import { defineConfig } from "vitest/config";

// Tests que construyen el sitio (lentos): fuera de `pnpm test`, dentro de `pnpm test:e2e`.
export default defineConfig({ test: { include: ["tests/build/**/*.test.ts"], testTimeout: 240_000 } });
