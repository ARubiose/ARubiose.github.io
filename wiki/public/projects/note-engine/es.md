---
title: Cómo funciona el motor de notas
type: project-detail
summary: Arquitectura del motor de notas, una app en Expo que organiza notas con un agente LLM.
tags: [demo]
sources: ["humano (2026-10-14)"]
updated: 2026-10-14
---

Proyecto ficticio de la demo: sirve de ejemplo de página de detalle.

## El problema

Las notas rápidas se acumulan sin orden. El motor de notas las clasifica y las enlaza entre
sí con un agente LLM, sin que haga falta etiquetarlas a mano.

## Arquitectura

![Diagrama: la app en Expo envía las notas a la API en FastAPI, que consulta al agente LLM](./architecture.svg)

- **App:** Expo, con un solo código para iOS, Android y web.
- **API:** FastAPI, que guarda las notas y orquesta al agente.
- **Agente:** propone etiquetas y enlaces entre notas; la persona los acepta o los descarta.

## Decisiones

| Decisión | Motivo |
| --- | --- |
| Expo | Un solo código para tres plataformas |
| FastAPI | Tipos y documentación de la API automáticos |
| Sugerencias, no cambios | El agente nunca modifica una nota sin confirmación |

```ts
type Suggestion = { noteId: string; tags: string[]; links: string[] };
```

El código está en el [repositorio](https://github.com/ada-example/note-engine).
