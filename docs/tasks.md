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
| 2026-10-03 | Fase 5b (1/2): skin Táctico y selector de skin (registro con metadatos, adornos y distribución por skin, intro por skin, e2e en las dos skins) | [spec](superpowers/specs/2026-10-03-tactical-skin-design.md), [plan](superpowers/plans/2026-10-03-tactical-skin.md), [maquetas](design/mockups/) |
| 2026-10-03 | Test de privacidad ampliado: credenciales y rutas personales en todo el repo y en el historial de git (patrones del agente `opensource-sanitizer` de ECC) | `72f94e1` |
| 2026-10-03 | Fixes pendientes: alineación del menú móvil, sección activa y saltos del menú fiables (fallaban 1 de cada 40 ejecuciones), JSON Schema del editor alineado con la build. Descartado: respaldo para navegadores sin `@supports selector()` (Tailwind 4 ya exige navegadores posteriores) | `f31f3cb` |
| 2026-10-03 | Mejoras menores de las revisiones de las fases 1–5: contrato (URLs solo http(s), fechas YAML completas, `url: null`, orden total), skin en `@layer components`, respaldo sin Popover API, intro del hero estable al cambiar de ancho, JSON del creador escapado, tests más estrictos | `85ba009` |
| 2026-10-02 | Fases 1–4: contenido inicial, base del sitio, contrato de contenido y secciones, con tests (unitarios, contrato, componentes, privacidad y E2E con axe) | [spec](superpowers/specs/2026-10-02-portfolio-content-design.md), [plan](superpowers/plans/2026-10-02-portfolio-content.md); `af663b9`..`6384a1b` |

## Pendiente

### Fases

- [ ] **5b (2/2). Skin Menú de juego** (ver `design/mockups/hud-directions.html`, dirección C),
  siguiendo «Añadir una skin» de [system-design.md](system-design.md) §3.4.
- [ ] **6. Despliegue.** `site` en `astro.config.mjs`, workflow de GitHub Actions a GitHub
  Pages con `pnpm check`, `pnpm test` y `pnpm test:e2e`, y etiquetas `hreflang`
  (`getAbsoluteLocaleUrlList()`).
  Al crear el CI, añadir `github-actions` a `skills` de `wiki/public/projects/portfolio-llm-wiki.md`
  (decisión del humano, 2026-10-02).
  SEO a incluir en el plan: `sitemap.xml`, `robots.txt`, `canonical`, JSON-LD `Person` e imagen
  Open Graph (checklist de la skill `seo` de ECC, sin instalarla).

### Cuestiones abiertas

- [ ] **Imágenes del contenido** (logos de empresas, capturas de proyectos): ¿van en
  `wiki/public/` junto a la página o en `src/assets/`?
- [ ] **Dominio:** `arubiose.github.io` (repo de usuario) o `/<repo>/` (requiere `base`).
- [ ] **Foto de perfil:** hay una foto alternativa en `raw/assets/` sin usar; decidir si
  sustituye a `src/assets/images/profile.jpg`.

### Acciones locales (no versionadas)

- [ ] Crear `wiki/private/forbidden-strings.txt` con los datos personales que nunca deben
  publicarse, uno por línea; el test de privacidad los busca además de los patrones.
