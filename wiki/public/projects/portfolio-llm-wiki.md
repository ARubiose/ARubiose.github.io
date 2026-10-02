---
title: Portfolio con LLM Wiki
type: project
repo: https://github.com/ARubiose/portfolio-astro
status: active
start: 2025-01
summary: Portfolio personal en Astro cuyo contenido mantiene un agente LLM como una wiki de conocimiento, siguiendo el patrón LLM Wiki de Andrej Karpathy.
highlights:
  - Un agente (Claude Code) convierte el CV, LinkedIn y otras fuentes en una wiki enlazada con una página por puesto, proyecto, habilidad y formación.
  - Wiki dividida en parte pública, que alimenta la web, y privada, fuera de git.
  - El frontmatter de la wiki es un contrato validado con Zod en cada build.
  - Web estática en español e inglés con tests unitarios, de contrato, de componentes, de privacidad y E2E.
tags: [astro, tailwind, llm, claude-code, plantilla]
en:
  title: Portfolio with an LLM Wiki
  summary: Personal portfolio built with Astro whose content is maintained by an LLM agent as a knowledge wiki, following Andrej Karpathy's LLM Wiki pattern.
  highlights:
    - An agent (Claude Code) turns the CV, LinkedIn and other sources into a linked wiki with one page per role, project, skill and degree.
    - The wiki is split into a public part, which feeds the site, and a private part kept out of git.
    - The wiki frontmatter is a contract validated with Zod on every build.
    - Static site in Spanish and English with unit, contract, component, privacy and E2E tests.
sources: ["humano (2026-10-02)", "https://github.com/ARubiose/portfolio-astro (2026-10-02)"]
updated: 2026-10-02
---

# Portfolio con LLM Wiki

Este mismo sitio. En lugar de escribir el contenido a mano, un agente LLM mantiene una base
de conocimiento en Markdown a partir de fuentes en bruto: ingiere, responde preguntas y
revisa la wiki con tres operaciones (`ingest`, `query`, `lint`). El portfolio en Astro y
Tailwind solo lee la parte pública.

Es también una plantilla reutilizable. El repositorio es público y separa con `.gitignore`
lo personal de lo publicable. Ver [agentes LLM](../skills/llm-agents.md).

## Relacionado

- [Agentes LLM](../skills/llm-agents.md)
- [Arquitectura de software](../skills/software-architecture.md)
- [Perfil](../profile.md)

## Fuentes

- humano (2026-10-02): es el único proyecto que se muestra por ahora
- https://github.com/ARubiose/portfolio-astro (2026-10-02): repositorio y fecha del primer commit
