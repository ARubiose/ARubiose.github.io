# Tareas

Estado del proyecto y trabajo pendiente. Es la **única fuente** de la hoja de ruta: el
diseño está en [system-design.md](system-design.md), el detalle de cada bloque en su plan
(`superpowers/plans/`) y el historial exacto en `git log`.

Se actualiza al terminar o aplazar trabajo: lo terminado pasa a *Hecho* con una línea y su
enlace, y lo aplazado entra en *Pendiente* con su archivo y línea.

## Hecho

| Fecha | Bloque | Referencia |
| --- | --- | --- |
| 2026-10-01 | Estructura de la LLM Wiki (pública/privada), regla, skills `ingest`/`query`/`lint` y permisos | `083d350`, `e0a89bc`; decisiones [0001](decisions/0001-public-private-wiki.md), [0002](decisions/0002-claude-code-native-schema.md) |
| 2026-10-01 | Diseño del sistema y README | `fdfc796`, `1959e03` |
| 2026-10-02 | Actualización a Astro 7.3, Tailwind 4.3, Node 24 y pnpm 11 | `28f6ddf` |
| 2026-10-02 | Fuentes web y declaraciones del humano en la wiki | `8ab7eac`; decisión [0003](decisions/0003-web-and-human-sources.md) |
| 2026-10-02 | Fase 5: arquitectura de skins y skin Terminal (timeline, creador de personaje, foto ampliable, animaciones GSAP, regresión visual) | [spec](superpowers/specs/2026-10-02-terminal-skin-design.md), [plan](superpowers/plans/2026-10-02-terminal-skin.md), [maquetas](design/mockups/) |
| 2026-10-02 | Fases 1–4: contenido inicial, base del sitio, contrato de contenido y secciones, con tests (unitarios, contrato, componentes, privacidad y E2E con axe) | [spec](superpowers/specs/2026-10-02-portfolio-content-design.md), [plan](superpowers/plans/2026-10-02-portfolio-content.md); `af663b9`..`6384a1b` |

## Pendiente

### Fases

- [ ] **5b. Más skins.** Táctico y Menú de juego (ver `design/mockups/hud-directions.html`)
  y selector de skin visible.
- [ ] **6. Despliegue.** `site` en `astro.config.mjs`, workflow de GitHub Actions a GitHub
  Pages con `pnpm check`, `pnpm test` y `pnpm test:e2e`, y etiquetas `hreflang`
  (`getAbsoluteLocaleUrlList()`).
  Al crear el CI, añadir `github-actions` a `skills` de `wiki/public/projects/portfolio-llm-wiki.md`
  (decisión del humano, 2026-10-02).

### Mejoras menores (revisión final de las fases 1–4)

- [ ] El test de la cabecera se cumple sin `aria-current`: exigir
  `/<span[^>]*aria-current="true"[^>]*>English<\/span>/` (`tests/components/header.test.ts:22`).
- [ ] Una fecha YAML completa (`start: 2026-06-01`) llega como `Date` y da un error críptico
  en lugar del mensaje de formato: aceptar `z.date()` en la unión y transformarla, o
  rechazarla con mensaje claro (`src/lib/dates.ts:7`).
- [ ] `url: null` en un proyecto rompe la build: aceptar `.nullish()` o documentar en la
  regla de la wiki que se omite (`src/lib/schemas.ts:59`).
- [ ] `z.url()` acepta `javascript:`: restringir a `http(s)` en `links`, `repo` y `url`
  (`src/lib/schemas.ts:36,58,59`).
- [ ] `compareYearMonth` no es un orden total si en el mismo año se mezclan `AAAA` y
  `AAAA-MM`: para ordenar, tratar el mes ausente como 0 y dejar «mismo año = igual» solo
  para la validación `end ≥ start` (`src/lib/dates.ts:21`).
- [ ] El `summary` de cada habilidad solo aparece en el `title`, invisible con teclado o
  lector de pantalla: mostrarlo o dejar de exigirlo (`src/components/SkillGroup.astro:12`).
- [ ] El test de la wiki exige al menos un proyecto aunque el sitio soporta la colección
  vacía; molesta a quien use la plantilla (`tests/content/wiki.test.ts:39`).
- [ ] Los tests de componentes no cubren ambos idiomas ni la lista vacía en todas las
  secciones: completar con `test.each(["es", "en"])` (`tests/components/sections.test.ts`).
- [ ] El diagrama de `system-design.md` §1 aún marca las colecciones como `[pendiente]`.
- [ ] La comprobación de valores sin resolver del E2E podría dar falsos positivos con prosa
  inglesa: usar `\bundefined\b` y `\bNaN\b` (`tests/e2e/home.spec.ts:35`).
- [ ] Recomendación: que cada fixture inválido compruebe la ruta del error (`["en",
  "summary"]`, `["end"]`) y no solo que falle (`tests/content/schemas.test.ts`).

### Cuestiones abiertas

- [ ] **Imágenes del contenido** (logos de empresas, capturas de proyectos): ¿van en
  `wiki/public/` junto a la página o en `src/assets/`?
- [ ] **Dominio:** `arubiose.github.io` (repo de usuario) o `/<repo>/` (requiere `base`).
- [ ] **Foto de perfil:** hay una foto alternativa en `raw/assets/` sin usar; decidir si
  sustituye a `src/assets/images/profile.jpg`.

### Acciones locales (no versionadas)

- [ ] Crear `wiki/private/forbidden-strings.txt` con los datos personales que nunca deben
  publicarse, uno por línea; el test de privacidad los busca además de los patrones.
