# Diseño: fase 5b, skin Táctico y selector de skin

- Fecha: 2026-10-03
- Estado: aprobada en conversación; pendiente de revisión escrita
- Alcance: primera mitad de la fase 5b de [tasks.md](../../tasks.md). Añade la skin **Táctico**,
  el **selector de skin** y lo que la arquitectura de skins necesita para que una skin cambie
  también la distribución. La skin Menú de juego queda para el ciclo siguiente.
- Parte de: [diseño de la fase 5](2026-10-02-terminal-skin-design.md) (arquitectura de skins y
  skin Terminal).
- Maquetas aprobadas: [tactical-desktop.html](../../design/mockups/tactical-desktop.html),
  [tactical-mobile.html](../../design/mockups/tactical-mobile.html) y
  [skin-selector.html](../../design/mockups/skin-selector.html) (opción A). La dirección de
  partida es la A de [hud-directions.html](../../design/mockups/hud-directions.html).

## 1. Objetivo

Que el visitante pueda cambiar la estética del portfolio entre **Terminal** (consola hacker) y
**Táctico** (HUD sci-fi de shooter/mecha) como rasgo de marca personal, y que esta fase
demuestre que añadir una skin es añadir una hoja de estilos, sus fuentes y sus adornos, sin
duplicar componentes.

**Criterios de éxito:**

- La portada en Táctico reproduce las maquetas aprobadas en escritorio y móvil, con contenido real.
- El cambio de skin es instantáneo, se recuerda entre visitas y no produce parpadeo al cargar.
- El contenido (títulos, textos, enlaces) es idéntico en ambas skins; solo cambian aspecto,
  distribución y adornos decorativos.
- Sin JavaScript o con `prefers-reduced-motion`, todo el contenido es visible y usable en la skin
  por defecto; el selector no aparece sin JavaScript.
- axe sin violaciones graves en las dos skins, en escritorio y móvil, también con diálogos abiertos.
- El presupuesto de JS de la portada sigue en 60 KB comprimidos.

**Fuera de alcance:** skin Menú de juego, modo claro, textos de contenido distintos por skin.

## 2. Skin Táctico

| Token | Valor | Uso |
| --- | --- | --- |
| `bg` | `#0b0e12` | Fondo de página |
| `surface` | `#11161d` | Paneles y tarjetas |
| `surface-2` | `#18202a` | Elemento seleccionado |
| `line` | `#263140` | Bordes y líneas |
| `text` | `#e7eaef` | Texto principal |
| `body` | `#c6cdd6` | Texto de párrafos |
| `muted` | `#93a0b0` | Texto secundario |
| `accent` | `#f0a83a` | Acento único (ámbar) |
| `accent-ink` | `#17110a` | Texto sobre acento |
| `warn` | `#ef5350` | Solo el aviso de personaje roto (el ámbar ya es el acento) |

- **Tipografía:** Chakra Petch 500/600/700 (titulares), Barlow 400/500 (texto) y JetBrains Mono
  400/500 (etiquetas, en mayúsculas con espaciado ancho). `--skin-font-mono` es JetBrains Mono y
  `--skin-font-display` Chakra Petch; el texto corrido usa un tercer token, `--skin-font-body`
  (Barlow; en Terminal apunta a IBM Plex Mono, así que no cambia nada allí). El `<body>` de
  `Layout.astro` pasa de `font-mono` a `font-body`.
- **Forma:** esquinas cortadas con `clip-path` en paneles, botones y pestañas; radio 0.
- **Decoración:** rombo ámbar delante de cada `h2` y línea que se desvanece detrás; rombos huecos
  como viñetas; la foto enmarcada por dos esquinas en ángulo (arriba a la izquierda y abajo a la
  derecha) en lugar de ventana; subrayado ámbar en el enlace activo; etiquetas de las barras en
  mayúsculas monoespaciadas. Sin scanlines ni cursor.
- **Distribución:** en escritorio, texto del hero a la izquierda y foto a la derecha; línea de
  tiempo de una columna con el eje a la izquierda y un rombo por nodo (relleno en el puesto vigente).
  En móvil, igual que Terminal: una columna, menú en popover y creador con panel inferior.

### 2.1 Adornos

Textos decorativos, todos con `aria-hidden`. Cada skin define los suyos; si una skin no define un
adorno, no se pinta nada en su lugar.

| Clave | Terminal (`es` / `en`) | Táctico (`es` / `en`) | Dónde |
| --- | --- | --- | --- |
| `adorn.handle` | `{handle}@portfolio:~$` | `{first} // {second}`: las dos primeras palabras del nombre del perfil, en mayúsculas (`ÁLVARO // RUBIO`) | Cabecera |
| `adorn.menuMark` | `$` | rombo (CSS, sin texto) | Botón del menú móvil |
| `adorn.navList` | `$ ls secciones/` / `$ ls sections/` | `Navegación` / `Navigation` | Menú móvil |
| `adorn.heroKicker` | `whoami` | `Perfil de operador` / `Operator profile` | Hero |
| `adorn.photo` | `profile.jpg` | `ID-01 · AMPLIAR` / `ID-01 · ENLARGE` | Foto y visor |
| `adorn.sectionSub.<id>` | — | experiencia `Registro de misiones` / `Mission log`; proyectos `Operaciones` / `Operations`; habilidades `Loadout`; formación `Entrenamiento` / `Training`; contacto `Canal seguro` / `Secure channel` | Bajo cada `h2` |
| `adorn.sheet` | `personaje.sav` / `character.sav` | `Ficha de operador` / `Operator sheet` | Creador |
| `adorn.level` | `nv.` / `lv.` | `NV` / `LV` | Creador |
| `adorn.inspect` | `inspeccionar` / `inspect` | `Análisis` / `Analysis` | Creador |
| `adorn.mailCmd`, `adorn.openCmd` | `$ mail`, `$ open` | `◆ MAIL`, `◆ LINK` | Contacto |

Los nombres de archivo de las ventanas (`zalcu.log`, `my-site/README.md`) no son claves del
diccionario: se derivan del id de cada entrada. Llevan la clase `window-file` y Táctico la oculta;
la barra conserva la etiqueta (`EN CURSO`) y el metadato (duración).

## 3. Arquitectura

### 3.1 Registro de skins

`src/lib/skins.ts` pasa de una lista de ids a una lista con metadatos:

```ts
export const skinRegistry = [
    { id: "terminal", swatch: "#9fd65a" },
    { id: "tactical", swatch: "#f0a83a" },
] as const;
```

El nombre visible de cada skin sale del diccionario (`skin.terminal`, `skin.tactical`). `skins`,
`defaultSkin`, `resolveSkin` y `skinBootScript` siguen existiendo y se derivan del registro.
Terminal sigue siendo la predeterminada.

### 3.2 Tokens de distribución

Además de color, fuente y radio, cada skin define tokens de distribución en su bloque
`[data-skin="…"]`. Los componentes los leen con utilidades arbitrarias de Tailwind
(`md:grid-cols-(--hero-cols)`), así que la maquetación sigue en el marcado pero el valor lo
decide la skin.

| Token | Terminal | Táctico | Lo lee |
| --- | --- | --- | --- |
| `--hero-cols` | `340px 1fr` | `1.35fr 1fr` | `intro.astro` |
| `--hero-photo-order` | `0` | `1` | `ProfilePhoto` en el hero |
| `--hero-photo-max` | `none` | `400px` | `ProfilePhoto` en el hero |

Solo se crean tokens donde las skins difieren. Los tamaños de letra se mantienen en el marcado
salvo que una skin necesite otros; Táctico usa los mismos tamaños del hero que Terminal.

**Modo de la línea de tiempo.** La línea de tiempo tiene dos modos: `alternate` (Terminal: eje
central, tarjetas a ambos lados) y `single` (Táctico: eje a la izquierda, tarjetas en una
columna). Un valor de CSS no puede elegir clases de Tailwind, así que el modo es una variante
propia:

```css
@custom-variant timeline-single (&:where([data-timeline="single"] *, [data-timeline="single"]));
```

Cada skin declara su modo en `skinRegistry` (`timeline: "alternate" | "single"`) y el script de
arranque y el selector escriben `data-timeline` en `<html>` junto a `data-skin`. Los componentes
de la línea de tiempo añaden las utilidades del modo `single` con ese prefijo
(`timeline-single:md:col-start-2`). Sin JavaScript se aplica el modo de la skin por defecto, que
`Layout.astro` escribe en el HTML.

### 3.3 Adornos

- `src/i18n/ui.ts`: las claves `adorn.*` tienen la forma `{ [skin]: texto }` dentro de cada
  idioma. Las claves de Terminal que hoy son adornos (`nav.prompt`, `nav.list`,
  `contact.mailCmd`, `contact.openCmd`, `skills.sheet`, `skills.level`, `skills.inspect`) pasan
  a `adorn.*`.
- `src/components/Adorn.astro` recibe la clave (y valores para interpolar, como el handle) y pinta
  un `<span aria-hidden="true" data-for-skin="…">` por cada skin que defina el adorno.
- `src/styles/states.css` oculta los adornos de las demás skins con una regla por skin:
  `:root[data-skin="tactical"] [data-for-skin]:not([data-for-skin="tactical"]) { display: none }`.
  Las reglas se generan a partir del registro en un test que compara la hoja con la lista, para
  que añadir una skin sin su regla falle.

### 3.4 Estilos

```text
src/styles/
├── global.css         Tailwind + @theme + variante timeline-single
├── base.css           @layer base
├── states.css         reglas de estado (sin capa) + visibilidad de adornos
└── skins/
    ├── terminal.css   @layer components
    └── tactical.css   @layer components
```

### 3.5 Fuentes

Chakra Petch, Barlow y JetBrains Mono se declaran con la API de fuentes de Astro, con fallback
métrico. Solo se precargan las fuentes de la skin predeterminada; las de Táctico se descargan al
activarla (`font-display: swap`).

### 3.6 Selector

- `src/components/SkinSwitcher.astro`: un grupo de botones (`role="group"`, `aria-label`
  «Skin»), uno por skin, con `aria-pressed` y su muestra de color. Solo se pinta si el registro
  tiene dos skins o más. Sale con `hidden` y lo muestra el script (sin JavaScript no podría
  guardar la elección).
- Está en la cabecera de escritorio, junto a ES / EN, y en el menú móvil, debajo del idioma.
- `src/scripts/skin-switcher.ts`: al pulsar, escribe `data-skin` y `data-timeline` en `<html>`,
  guarda la skin en `localStorage` (la clave del script de arranque), actualiza `aria-pressed` en
  todos los selectores, anuncia el cambio en una región `aria-live="polite"` y emite el evento
  `skinchange` en `document`. El foco se queda en el botón pulsado. La lógica pura (resolver el
  estado siguiente, el modo de línea de tiempo de cada skin) va en `src/lib/skins.ts`.

### 3.7 Movimiento

- `src/scripts/motion.ts` elige el preset de intro según `data-skin` al cargar.
  - **Terminal:** como ahora (prompt que se escribe, nombre que se descifra con `01<>/#$%_`, resto
    que aparece).
  - **Táctico:** las esquinas de la foto se dibujan (escala desde su esquina, unos 0,4 s), la línea
    del adorno del hero se extiende, el nombre se descifra con `0123456789/◆` y el resto aparece
    como en Terminal.
  - Una skin sin preset propio usa el de Terminal sin la escritura del prompt.
- Las animaciones con el scroll son comunes. En modo `single`, todas las tarjetas de la línea de
  tiempo entran desde la derecha.
- Con `skinchange`, la intro no se repite: se llama a `ScrollTrigger.refresh()` y las animaciones
  ya completadas conservan su estado final.
- Con `prefers-reduced-motion` no se ejecuta nada, en ninguna skin.

## 4. Pruebas

- **Unitarias:** registro y funciones derivadas; `skinBootScript` con las dos skins y el modo de
  línea de tiempo; lógica del selector; cada adorno existe en `es` y `en` para cada skin que lo
  define; `states.css` tiene la regla de visibilidad de adornos de cada skin registrada.
- **Componentes:** `Adorn` (un span por skin, `aria-hidden`, `data-for-skin`); `SkinSwitcher`
  (solo con dos o más skins, oculto, `aria-pressed` en la actual, presente en cabecera y menú);
  `intro` y la línea de tiempo usan los tokens y la variante en lugar de valores fijos.
- **E2E, escritorio y móvil:**
  - cambiar de skin cambia `data-skin` al instante; la elección sobrevive a una recarga y el
    primer pintado ya tiene la skin guardada (registrado con `addInitScript`);
  - en Táctico (escritorio), la foto queda a la derecha del texto, la línea de tiempo es de una
    columna y cada tarjeta queda a la derecha del eje (comprobado con las cajas de los elementos);
  - en cada skin solo se ven sus adornos;
  - en las dos skins: axe sin violaciones graves (también con diálogos abiertos), sin
    desbordamiento horizontal, movimiento reducido sin `style` en línea y, sin JavaScript,
    contenido completo con el selector oculto.
- **Regresión visual:** portada `es` y `en` en las dos skins y los dos tamaños (8 capturas).
- **Presupuesto:** JS de la portada ≤ 60 KB comprimido.
- **Verificación manual:** capturas a 1280 y 390 px de cada skin, comparadas con las maquetas.

## 5. Decisiones

| Decisión | Alternativa descartada | Motivo |
| --- | --- | --- |
| Selector en la cabecera, junto al idioma | Botón de ajustes con panel; solo en el pie | Siempre visible: la skin es rasgo de marca |
| Adornos por skin en el diccionario, un span por skin | Textos neutros; cambiar textos con JS | Cada skin con personalidad, cambio instantáneo y sin depender de JS |
| Intro por skin, scroll común | Mismo movimiento para todas | La intro de consola no encaja en un HUD |
| Tokens de distribución y variante de modo | Distribución común; reglas de skin que pisan utilidades | Respeta las maquetas sin romper el orden de capas; sirve para skins futuras |
