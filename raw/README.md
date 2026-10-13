# raw/ — Fuentes

Capa de **fuentes inmutables** de la LLM Wiki. Aquí dejas tú (el humano) el material en bruto;
el LLM lo lee pero **nunca lo modifica**.

Ejemplos de lo que va aquí:

- CV en PDF o Markdown (`cv-2026.pdf`)
- Exportación de LinkedIn
- Notas sueltas sobre proyectos, logros, tecnologías
- Descripciones de puestos, cartas de recomendación, certificados
- Imágenes de referencia en `assets/`

Convención de nombres: `kebab-case` con fecha si aplica (`linkedin-export-2026-10.md`).

Cuando añadas algo, pide al agente que lo ingiera: `/ingest raw/<archivo>`.
