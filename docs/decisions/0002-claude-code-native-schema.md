# 0002 Esquema de la wiki con mecanismos nativos de Claude Code

- Estado: aceptada
- Fecha: 2026-10-01

## Contexto
El patrón de Karpathy concentra el esquema (convenciones y procedimientos) en un único
documento. Una primera versión lo puso en `CLAUDE.md`, que se carga en cada sesión aunque
solo se toque `src/`. La segunda lo movió a `wiki/SCHEMA.md`, pero obligaba a las skills a
referenciarlo y dependía de que el agente lo leyera.

## Decisión
Repartir el esquema según cuándo hace falta:

- **Convenciones** → `.claude/rules/wiki.md` con `paths: ["wiki/**", "raw/**"]`. Se cargan
  automáticamente al leer archivos de la wiki.
- **Procedimientos** → cada skill (`ingest`, `query`, `lint`) contiene el suyo completo.
  `lint` se ejecuta en un subagente (`context: fork`).
- **Inmutabilidad de `raw/`** → `deny` de `Edit(raw/**)` y `Write(raw/**)` en
  `.claude/settings.json`.
- **`CLAUDE.md`** → solo el mapa del repo y las reglas que aplican en toda sesión.

## Consecuencias
- Menos contexto por sesión y ninguna indirección entre skills y esquema.
- El esquema deja de ser portable a otros agentes; habría que reconstruir un `AGENTS.md`.
- `raw/README.md` tampoco lo puede editar el agente; lo mantiene el humano.
- Las reglas con ámbito de rutas se activan al **leer** archivos que coinciden. Las tres
  skills empiezan leyendo `raw/` o los índices, así que la regla siempre está cargada
  cuando escriben.
