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
| 2026-10-03 | Fase 5b (1/2): skin Táctico y selector de skin (registro con metadatos, adornos y distribución por skin, intro por skin, e2e en las dos skins) | [spec](superpowers/specs/2026-10-03-tactical-skin-design.md), [plan](superpowers/plans/2026-10-03-tactical-skin.md), [maquetas](design/mockups/); `8b68189` |
| 2026-10-03 | Fase 5b (2/2): skin Juego (tokens de tipografía del hero y titulares, nombre corto en la cabecera, intro propia, e2e en las tres skins; cubre también el menor de Táctico de probar el script de arranque con otras skins) | [spec](superpowers/specs/2026-10-03-game-skin-design.md), [plan](superpowers/plans/2026-10-03-game-skin.md), [maquetas](design/mockups/) |
| 2026-10-03 | Test de privacidad ampliado: credenciales y rutas personales en todo el repo y en el historial de git (patrones del agente `opensource-sanitizer` de ECC) | `72f94e1` |
| 2026-10-03 | Fixes pendientes: alineación del menú móvil, sección activa y saltos del menú fiables (fallaban 1 de cada 40 ejecuciones), JSON Schema del editor alineado con la build. Descartado: respaldo para navegadores sin `@supports selector()` (Tailwind 4 ya exige navegadores posteriores) | `f31f3cb` |
| 2026-10-03 | Mejoras menores de las revisiones de las fases 1–5: contrato (URLs solo http(s), fechas YAML completas, `url: null`, orden total), skin en `@layer components`, respaldo sin Popover API, intro del hero estable al cambiar de ancho, JSON del creador escapado, tests más estrictos | `85ba009` |
| 2026-10-02 | Fases 1–4: contenido inicial, base del sitio, contrato de contenido y secciones, con tests (unitarios, contrato, componentes, privacidad y E2E con axe) | [spec](superpowers/specs/2026-10-02-portfolio-content-design.md), [plan](superpowers/plans/2026-10-02-portfolio-content.md); `af663b9`..`6384a1b` |

## Pendiente

### Fases

- [ ] **6. Despliegue.** `site` en `astro.config.mjs`, workflow de GitHub Actions a GitHub
  Pages con `pnpm check`, `pnpm test` y `pnpm test:e2e`, y etiquetas `hreflang`
  (`getAbsoluteLocaleUrlList()`).
  Al crear el CI, añadir `github-actions` a `skills` de `wiki/public/projects/portfolio-llm-wiki.md`
  (decisión del humano, 2026-10-02).
  SEO a incluir en el plan: `sitemap.xml`, `robots.txt`, `canonical`, JSON-LD `Person` e imagen
  Open Graph (checklist de la skill `seo` de ECC, sin instalarla).

### Accesibilidad

- [ ] **Táctico: el foco de teclado no se ve en botones, pestañas y huecos.** El contorno de
  `base.css` va por fuera (`outline-offset: 3px`) y el `clip-path` de la skin lo recorta. Juego lo
  resuelve con el contorno por dentro (`src/styles/skins/game.css`, regla `:focus-visible`);
  aplicar lo mismo en `src/styles/skins/tactical.css`, con su prueba e2e.

### Mejoras menores (revisión final de la fase 5b, skin Juego)

- [ ] El nombre de la cabecera sale a 13 px (utilidad `text-[13px]` en
  `src/components/Header.astro:23`); la maqueta lo lleva a ~22 px en Saira 800. Haría falta un token.
- [ ] El inventario del creador es una rejilla de tarjetas (`lg:grid-cols-[repeat(auto-fill,…)]`,
  `src/components/SkillBuilder.astro:78`); la maqueta lo muestra como lista de dos columnas.
- [ ] El menú móvil conserva el tamaño (24 px) y los separadores del marcado
  (`src/components/Header.astro`, enlaces de `#site-menu`); la maqueta los lleva a ~34 px sin separadores.

- [ ] Una palabra muy larga en el nombre del hero (17 letras o más) desborda a 390 px en Juego y, a
  1280, aplasta la columna de la foto: `overflow-wrap: anywhere` en `.hero-name` y
  `minmax(0, 1.3fr)` en `--hero-cols` (`src/styles/skins/game.css`). El nombre real cabe.
- [ ] Con barras de desplazamiento clásicas, el panel del hero (calculado con `100vw`) ensancha la
  página 8 px; no se puede desplazar con la rueda (`src/styles/skins/game.css`, `.photo-window::before`).
- [ ] Declaraciones de `game.css` que las utilidades anulan: `font-size` de `.site-handle` y de
  `.sheet-equip`. Borrarlas o convertirlas en tokens.
- [ ] Los botones de equipar del inspector y del panel inferior mezclan borde (`border border-accent`,
  `src/scripts/skill-builder.ts:66,73`) y `clip-path`: en estado equipado se cortan las esquinas.
- [ ] Prueba e2e de cambiar de Terminal a Juego tras hacer scroll (hoy solo Juego → Táctico; se
  comprobó a mano que funciona).

### Mejoras menores (revisión final de la fase 5b, skin Táctico)

- [ ] Táctico en móvil pone la foto antes del texto (orden de Terminal); la maqueta la pone entre
  la ubicación y el resumen, y el marcado (texto en un solo bloque) no lo permite
  (`src/sections/intro.astro`).
- [ ] El indicativo de Táctico sale blanco entero; la maqueta lleva el «//» en ámbar, lo que
  exigiría partir el adorno `handle` en dos spans (`src/i18n/ui.ts`, `adorns.*.handle`).
- [ ] Sin Popover API se oculta el selector de skin de la cabecera: esos navegadores solo ven la
  skin predeterminada (`src/styles/states.css`, bloque `@supports not selector(:popover-open)`).
- [ ] Tras cambiar de skin a mitad de página, las tarjetas aún no reveladas entran con la
  dirección de la skin anterior: `single` se lee una vez (`src/scripts/motion.ts`, bloque de
  timelines). Leerlo con valores en función e `invalidateOnRefresh`.
- [ ] Las fuentes de Táctico llegan después del `ScrollTrigger.refresh()` del cambio de skin y las
  posiciones pueden desviarse unos píxeles: refrescar también con `document.fonts.ready`
  (`src/scripts/motion.ts`, escucha de `skinchange`).
- [ ] Tras cambiar de skin, `aria-current` de la navegación no se recalcula hasta el siguiente
  scroll: escuchar `skinchange` en `src/scripts/nav.ts`.
- [ ] Un `data-skin` fuera del registro mostraría los adornos de todas las skins: ocultar
  `[data-for-skin]` por defecto y mostrar solo los de la activa (`src/styles/states.css`).
  No ocurre por `resolveSkin`, pero sería más robusto.
- [ ] El selector usa `text-[12px]` en las dos skins, mientras el idioma va a 13 px
  (`src/components/SkinSwitcher.astro`).

### Cuestiones abiertas

- [ ] **Imágenes del contenido** (logos de empresas, capturas de proyectos): ¿van en
  `wiki/public/` junto a la página o en `src/assets/`?
- [ ] **Dominio:** `arubiose.github.io` (repo de usuario) o `/<repo>/` (requiere `base`).
- [ ] **Foto de perfil:** hay una foto alternativa en `raw/assets/` sin usar; decidir si
  sustituye a `src/assets/images/profile.jpg`.

### Acciones locales (no versionadas)

- [ ] Crear `wiki/private/forbidden-strings.txt` con los datos personales que nunca deben
  publicarse, uno por línea; el test de privacidad los busca además de los patrones.
