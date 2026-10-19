---
title: Portfolio con LLM Wiki
type: project
repo: https://github.com/ARubiose/ARubiose.github.io
status: active
start: 2025-01
summary: Portfolio en Astro cuyo contenido mantiene un agente LLM como una wiki.
highlights:
  - Un agente (Claude Code) convierte el CV, LinkedIn y otras fuentes en una wiki enlazada.
  - Wiki dividida en parte pública, que alimenta la web, y privada, fuera de git.
  - El frontmatter de la wiki es un contrato validado con Zod en cada build.
  - Web estática bilingüe con tests unitarios, de contrato, de privacidad y E2E.
skills: [llm-agents, web-fundamentals, github-actions]
tags: [astro, tailwind, llm, claude-code, plantilla]
en:
  title: Portfolio with an LLM Wiki
  summary: Astro portfolio whose content an LLM agent maintains as a wiki.
  highlights:
    - An agent (Claude Code) turns the CV, LinkedIn and other sources into a linked wiki.
    - The wiki is split into a public part, which feeds the site, and a private part kept out of git.
    - The wiki frontmatter is a contract validated with Zod on every build.
    - Bilingual static site with unit, contract, privacy and E2E tests.
sources: ["humano (2026-10-02)", "https://github.com/ARubiose/portfolio-astro (2026-10-02)", "humano (2026-10-04)", "humano (2026-10-19)"]
updated: 2026-10-19
---

# Portfolio con LLM Wiki

Este mismo sitio. En lugar de escribir el contenido a mano, un agente LLM mantiene una base
de conocimiento en Markdown a partir de fuentes en bruto: ingiere, responde preguntas y
revisa la wiki con tres operaciones (`ingest`, `query`, `lint`). El portfolio en Astro y
Tailwind solo lee la parte pública.

Es también una plantilla reutilizable. El repositorio es público y separa con `.gitignore`
lo personal de lo publicable. Ver [agentes LLM](../skills/llm-agents.md).

## Relacionado

- Detalle: [español](portfolio-llm-wiki/es.md) · [English](portfolio-llm-wiki/en.md)
- [Agentes LLM](../skills/llm-agents.md)
- [GitHub Actions](../skills/github-actions.md)
- [Arquitectura de software](../skills/software-architecture.md)
- [Perfil](../profile.md)

## Fuentes

- humano (2026-10-02): es el único proyecto que se muestra por ahora
- https://github.com/ARubiose/portfolio-astro (2026-10-02): repositorio y fecha del primer commit
- humano (2026-10-04): el repositorio se renombra a ARubiose.github.io para publicarse en GitHub Pages
