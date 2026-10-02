---
paths:
  - "wiki/**"
  - "raw/**"
---

# Convenciones de la LLM Wiki

Se cargan automáticamente al trabajar con `wiki/` o `raw/`. Las operaciones están en las
skills `ingest`, `query` y `lint`.

## Capas

| Ruta | Quién escribe | En git | Contenido |
| --- | --- | --- | --- |
| `raw/` | Humano | No | Fuentes inmutables. Escribir aquí está bloqueado por permisos. |
| `wiki/public/` | Agente | **Sí** | Solo lo que puede aparecer en el portfolio. |
| `wiki/private/` | Agente | No | Todo lo personal o no apto para la web, el log y las síntesis. |

```text
wiki/
├── index.md            # Catálogo de páginas públicas (versionado)
├── public/
│   ├── profile.md      # Visión general: quién es, qué hace, propuesta de valor
│   ├── experience/     # Una página por puesto/empresa
│   ├── projects/       # Una página por proyecto
│   ├── skills/         # Una página por tecnología, dominio o competencia
│   └── education/      # Estudios, cursos, certificaciones
└── private/
    ├── index.md        # Catálogo de páginas privadas
    ├── log.md          # Registro append-only de operaciones
    ├── notes/          # Datos personales y contexto no publicable
    └── synthesis/      # Respuestas a consultas que merece la pena conservar
```

No crees carpetas nuevas sin proponerlo antes.

## Fuentes

Un dato solo entra en la wiki si sale de una fuente:

- **`raw/`** (preferente): archivos que deja el humano. Son estables y revisables.
- **Web, con validación humana:** URLs públicas que da el humano o que encuentra el agente.
  Antes de escribir nada, presenta la URL y los datos extraídos, y espera a que el humano
  los valide de forma explícita. Lo no validado no se usa.
  - No intentes saltar muros de login ni bloqueos (LinkedIn, por ejemplo): pide al humano
    que guarde la página en `raw/`.
  - La web cambia. Si la fuente es importante, sugiere guardar una copia en `raw/`.
  - Que un dato sea público en internet no lo hace publicable aquí: la regla de privacidad
    se aplica igual.
- **Declaraciones del humano:** lo que cuenta en la conversación. Se cita como
  `humano (AAAA-MM-DD)`. Si es extenso, sugiere guardarlo como nota en `raw/`.

## Regla de privacidad

El repo es público. **Ante la duda, un dato va a `wiki/private/`.** Nunca escribas en
`wiki/public/`, `wiki/index.md`, `docs/` ni en mensajes de commit:

- Teléfono, dirección, email personal, fecha de nacimiento, documentos de identidad.
- Salarios, condiciones contractuales, motivos de salida, valoraciones de empresas o personas.
- Datos de terceros (compañeros, referencias, clientes) salvo que ya sean públicos.
- Información confidencial de empleadores (clientes, cifras internas, código).
- Contenido de `wiki/private/` o enlaces a sus páginas.

Si una página pública necesita un dato privado, el dato va a `wiki/private/notes/` y la
pública solo lleva la parte publicable. Lo privado sí puede enlazar a lo público.

## Páginas

- **Nombre:** `kebab-case.md` en inglés (`acme-corp.md`, `typescript.md`). Contenido en español.
- **Frontmatter obligatorio:**

  ```yaml
  ---
  title: Acme Corp
  type: experience     # profile | experience | project | skill | education | note | synthesis
  summary: Una frase; se usa en el índice y en el portfolio.
  tags: [backend, typescript]
  sources: [raw/cv-2026.pdf, "https://github.com/usuario (2026-10-02)", "humano (2026-10-02)"]
  updated: 2026-10-01
  ---
  ```

  Opcionales: `period` (`2023-03 – actualidad`), `role`, `company`, `url`, `repo`, `status`.
  Una fuente web se cita con su URL y la fecha de consulta entre paréntesis.
- **Enlaces:** Markdown relativos (`[TypeScript](../skills/typescript.md)`), no `[[wikilinks]]`.
- **Respaldo:** todo dato concreto (fechas, cifras, cargos) sale de una fuente (ver
  *Fuentes*). Lo inferido se
  marca con `> ⚠️ Inferido:`; las discrepancias entre fuentes, con `> ⚠️ Conflicto:` citando
  ambas, y se avisa al humano.
- **Cierre:** cada página termina con `## Relacionado` y `## Fuentes`.

## Índices

`wiki/index.md` y `wiki/private/index.md`: una sección por categoría en el orden de la
estructura, una línea por página:

```markdown
- [Acme Corp](public/experience/acme-corp.md) — Ingeniero de software en Acme Corp.
```

## Log

`wiki/private/log.md`, append-only, lo más reciente al final. Operaciones: `init`,
`ingest`, `query`, `lint`, `schema`.

```markdown
## [2026-10-01] ingest | CV 2026
- Fuente: raw/cv-2026.pdf
- Creadas: public/experience/acme-corp.md, private/notes/acme-corp.md
- Actualizadas: public/profile.md, index.md, private/index.md
```

Si la fuente es web, la línea `Fuente` lleva la URL y la fecha de consulta, y se añade
`- Validado por el humano: sí`.
