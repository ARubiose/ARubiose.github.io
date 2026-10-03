# Diseño: fase 5b (2/2), skin Juego

- Fecha: 2026-10-03
- Estado: aprobada en conversación; pendiente de revisión escrita
- Alcance: segunda mitad de la fase 5b de [tasks.md](../../tasks.md). Añade la tercera skin,
  **Juego** (la dirección «Menú de juego»), siguiendo «Añadir una skin» de
  [system-design.md](../../system-design.md) §3.4.
- Parte de: [diseño del skin Táctico](2026-10-03-tactical-skin-design.md) (registro, adornos,
  tokens de distribución, selector e intro por skin), que no cambia.
- Maquetas aprobadas: [game-menu-desktop.html](../../design/mockups/game-menu-desktop.html) (línea
  de tiempo **A**, una columna) y [game-menu-mobile.html](../../design/mockups/game-menu-mobile.html).
  La dirección de partida es la C de [hud-directions.html](../../design/mockups/hud-directions.html).

## 1. Objetivo

Una tercera estética de marca personal, la de una pantalla de selección de un juego moderno
(Valorant, Apex Legends, Street Fighter 6), y la prueba de que la receta de §3.4 basta para añadir
una skin con cambios mínimos fuera de su hoja.

**Criterios de éxito:**

- La portada en Juego reproduce las maquetas aprobadas en escritorio y móvil, con contenido real.
- El contenido es idéntico en las tres skins; solo cambian aspecto, distribución y adornos.
- Terminal y Táctico no cambian: sus capturas de referencia siguen pasando sin regenerarse.
- El cambio de skin sigue siendo instantáneo, se recuerda y no parpadea al cargar.
- Sin JavaScript o con `prefers-reduced-motion`, todo el contenido es visible.
- axe sin violaciones graves en Juego, en escritorio y móvil, también con diálogos abiertos.
- El JS de la portada sigue por debajo de 60 KB comprimidos.

**Fuera de alcance:** los menores aplazados de Táctico (bloque propio en `tasks.md`), el
despliegue, la foto en proporción 4:5 y los cambios de marcado para partir el nombre en dos líneas.

## 2. Skin Juego

Id `game`; nombre visible **«Juego» / «Game»** (`skin.game` en `ui.ts`; «Menú de juego» no cabe en
el selector móvil). Muestra de color `#ec4c56`; línea de tiempo `single`.

| Token | Valor | Uso |
| --- | --- | --- |
| `bg` | `#0f0f13` | Fondo de página |
| `surface` | `#17171d` | Paneles, tarjetas y panel diagonal del hero |
| `surface-2` | `#1f1f27` | Barras de los paneles |
| `line` | `#2a2a33` | Bordes y separadores |
| `text` | `#ececf1` | Texto principal; fondo del rol y de la pestaña o skin activas |
| `body` | `#cfcfd8` | Texto de párrafos |
| `muted` | `#9a9aa8` | Texto secundario |
| `accent` | `#ec4c56` | Acento único (rojo) |
| `accent-ink` | `#ffffff` | Texto sobre acento |
| `warn` | `#f0a83a` | Solo el aviso de personaje roto (el rojo ya es el acento) |

- **Tipografía:** Saira Condensed 600/700/800 (`--skin-font-display`: titulares, navegación,
  botones, pestañas, etiquetas, todo en mayúsculas), Geist 400/500 (`--skin-font-body`) y Geist
  Mono 400/500 (`--skin-font-mono`: fechas, duraciones y metadatos).
- **Forma:** paralelogramos con `clip-path` (inclinación de unos 12°) en el enlace activo de la
  navegación, los botones, las pestañas, los huecos de equipamiento, el rol, las etiquetas
  (`badge`, etiqueta de la foto), el botón del menú y el selector de skin. Se usa `clip-path` y no
  `skewX` para que el texto no se incline sin añadir spans al marcado. El foco visible se resuelve
  como en Táctico (el `clip-path` no debe recortar el indicador de foco). Radio 0.
- **Decoración:**
  - `h2` en Saira 800 grande, con el subtítulo (adorno `sectionSub`) en rojo y espaciado ancho, y
    una línea que se desvanece detrás.
  - Hero: panel `surface` inclinado detrás de la foto, con un filo rojo, como pseudoelementos de
    `.hero`; la foto recortada en trapecio; el rol como bloque `text` con texto `bg`.
  - Línea de tiempo: tarjetas con borde izquierdo de 4 px (`line`; rojo y degradado rojo en el
    puesto vigente) y viñetas «▸» rojas; sin eje ni nodos.
  - Creador de personaje: los elementos como lista de menú (filas separadas por líneas, la fila
    seleccionada con degradado rojo y «▶», el equipado con «✓» rojo); pestaña activa en bloque
    `text`; huecos llenos en rojo; panel de detalles con el nombre en Saira grande.
  - Menú móvil como menú de pausa: secciones en Saira 800 a ~34 px y la activa en bloque rojo
    inclinado con «▶».
  - Sin scanlines, cursor ni esquinas.
- **Distribución:**

  | Token | Terminal / Táctico | Juego | Lo lee |
  | --- | --- | --- | --- |
  | `--hero-cols` | `340px 1fr` / `1.35fr 1fr` | `1.3fr 1fr` | `intro.astro` |
  | `--hero-photo-order` | `0` / `1` | `1` | `ProfilePhoto` |
  | `--hero-photo-max` | `none` / `400px` | `380px` | `ProfilePhoto` |
  | `--hero-name-size` (nuevo) | `38px` | `50px` | `intro.astro` |
  | `--hero-name-size-md` (nuevo) | `58px` | `84px` | `intro.astro` |

  En móvil, el orden es el de las otras skins (foto antes del texto); el panel diagonal y la foto
  forman una «carta de personaje». La línea de tiempo es de una columna en los dos tamaños.

### 2.1 Adornos

Todos con `aria-hidden`. Claves existentes de `adorns` en `src/i18n/ui.ts`:

| Clave | Juego `es` | Juego `en` |
| --- | --- | --- |
| `handle` | `{shortName}` (`ÁLVARO RUBIO`) | igual |
| `menuMark` | `▶` | `▶` |
| `navList` | `Menú principal` | `Main menu` |
| `heroKicker` | `▶ Jugador 1` | `▶ Player 1` |
| `photo` | `P1 · Ampliar` | `P1 · Enlarge` |
| `photoDialog` | `P1` | `P1` |
| `sheet` | `Ficha de jugador` | `Player sheet` |
| `level` | `NV {year}` | `LV {year}` |
| `inspect` | `Detalles` | `Details` |
| `inspectMark` | `▶` | `▶` |
| `mailCmd` | `▶ MAIL` | `▶ MAIL` |
| `openCmd` | `▶ ABRIR` | `▶ OPEN` |
| `projectMeta` | `Ficha` | `Info` |
| `sectionSub.experience` | `Modo historia` | `Story mode` |
| `sectionSub.projects` | `Misiones secundarias` | `Side quests` |
| `sectionSub.skills` | `Selección de personaje` | `Character select` |
| `sectionSub.education` | `Tutorial` | `Tutorial` |
| `sectionSub.contact` | `Multijugador` | `Multiplayer` |

Si al implementar aparece una clave de `adorns` que no está en esta tabla, se le da un texto de Juego
coherente con estos; una skin sin adorno no pinta nada.

## 3. Cambios fuera de la hoja de la skin

Además de lo que la receta de §3.4 ya prevé (registro, hoja en `src/styles/skins/game.css`
importada en `global.css`, regla de adornos en `states.css`, nombre en `ui.ts`, adornos, preset de
intro, fuentes en `astro.config.mjs` y `<Font>` sin precarga en `Layout`, proyectos de Playwright):

1. **Tamaño del nombre como token.** `intro.astro` sustituye `text-[38px] md:text-[58px]` por
   `text-(length:--hero-name-size) md:text-(length:--hero-name-size-md)`; los valores de Terminal van
   en `base.css` y Táctico los hereda, así que ninguna de las dos cambia. El interlineado y las
   mayúsculas de Juego los pone su hoja (la utilidad `leading-[1.04]` pasa también a token,
   `--hero-name-leading`, si la hoja no puede ganarle; se decide en el plan comprobando la cascada).
2. **Color del rol en la skin.** `.hero-role` deja la utilidad `text-accent`; cada hoja declara su
   color (Terminal y Táctico, el acento; Juego, bloque `text` con texto `bg`). Las capturas de
   Terminal y Táctico no deben cambiar.
3. **Nombre corto.** `shortNameFromName(name)` en `src/lib/home.ts`: dos primeras palabras en
   mayúsculas (`ÁLVARO RUBIO`). `callsignFromName` se reescribe sobre ella. `Header` recibe
   `shortName` como variable más para `Adorn`.

## 4. Movimiento

Preset `game` en `src/scripts/motion.ts`:

1. El panel diagonal del hero entra barriendo desde la derecha (escala horizontal desde su borde,
   ~0,35 s) y el filo rojo lo sigue.
2. La foto se desliza desde la derecha tras el panel.
3. El nombre entra «de golpe» desde la izquierda (desplazamiento corto, opacidad y un desenfoque de
   movimiento breve), sin descifrado.
4. El bloque del rol se estira desde la izquierda y el resto aparece con `revealRest` (la foto ya ha
   entrado, así que no se anima dos veces).

Las animaciones con el scroll son las comunes (modo `single`). Con `skinchange` no se repite la
intro. Con `prefers-reduced-motion` no se ejecuta nada.

## 5. Pruebas

- **Unitarias:** el registro incluye `game` con su modo; `skinBootScript` y `applySkin` con `game`
  (caso que también cubre el menor aplazado de probar una skin no predeterminada en el arranque);
  `shortNameFromName` y `callsignFromName`; cada adorno de Juego en `es` y `en`; `states.css` tiene la
  regla de Juego (el test existente lo exige al registrarla).
- **Componentes:** `intro` usa los tokens del nombre y `.hero-role` no lleva color de utilidad;
  `Header` pinta el nombre corto en el adorno de Juego.
- **E2E:** proyectos `desktop-game` y `mobile-game` que ejecutan la batería común (navegación, menú,
  visor, creador, sin JS, movimiento reducido, desbordamiento, CLS, axe con diálogos abiertos); en
  Juego (escritorio), la foto queda a la derecha del texto y la línea de tiempo es de una columna;
  solo se ven los adornos de Juego; el selector ofrece las tres skins.
- **Regresión visual:** 4 capturas nuevas (`es`/`en` × escritorio/móvil); las 8 existentes no se
  regeneran y deben seguir pasando.
- **Presupuesto:** JS de la portada ≤ 60 KB comprimido.
- **Verificación manual:** capturas a 1280 y 390 px de Juego, comparadas con las maquetas, y de
  Terminal y Táctico para confirmar que no cambian.

## 6. Decisiones

| Decisión | Alternativa descartada | Motivo |
| --- | --- | --- |
| Solo tokens, adornos y distribución existentes, con cambios mínimos fuera de la hoja | Habilidades como lista propia en lugar del creador; solo color y fuentes | Rápido, prueba la receta y conserva la dirección C |
| Línea de tiempo de una columna (`single`) | Alterna, como Terminal | Más cercana a la maqueta C y a un menú de juego |
| Paralelogramos con `clip-path` | `skewX` con spans que enderezan el texto | No cambia el marcado de los componentes |
| Nombre visible «Juego» / «Game» | «Menú de juego» | Cabe en el selector móvil junto a las otras dos |
| Tamaño del nombre como token | Mismo tamaño que las otras skins | La tipografía condensada enorme es el rasgo principal de la dirección |
