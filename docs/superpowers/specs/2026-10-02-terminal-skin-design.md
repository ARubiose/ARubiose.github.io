# Diseño: fase 5, diseño visual con la skin Terminal

- Fecha: 2026-10-02
- Estado: implementada
- Alcance: fase 5 de [tasks.md](../../tasks.md) (diseño visual). Construye la arquitectura de
  skins y la skin **Terminal** completa. Las skins Táctico y Menú de juego quedan para una
  fase posterior.
- Maquetas aprobadas: [docs/design/mockups/](../../design/mockups/)
  (`terminal-full-v2.html` escritorio, `mobile-v4.html` móvil, `skills-builder-v2.html`
  creador de personaje, `hud-directions.html` las tres direcciones exploradas). Son HTML
  estáticos de referencia: cargan fuentes e iconos desde CDN y no forman parte del sitio.

## 1. Objetivo y dirección

Portfolio de marca personal de un perfil geek (tecnología y videojuegos) con **estética HUD**:
secciones con nombres normales y lenguaje visual de interfaz. La skin Terminal es una consola
de hacker: casi todo en monoespaciada, ventanas con barra de título, prompts y un único acento
lima.

- **Lectura de diseño:** portfolio de desarrollador para perfiles técnicos y algún
  reclutador, lenguaje dark tech con alma de videojuego, Tailwind 4 + CSS nativo + GSAP.
- **Diales:** variación 7, movimiento 5, densidad 4.
- **Solo modo oscuro.** Un tema por skin; ninguna sección invierte colores.
- **Criterios de éxito:**
  - La portada en escritorio y móvil reproduce las maquetas aprobadas con contenido real.
  - Sin JavaScript o con `prefers-reduced-motion`, todo el contenido es visible y usable.
  - Añadir una skin nueva es añadir un CSS (y, si acaso, sus fuentes y efectos), sin tocar el
    marcado de las secciones.
  - axe sin violaciones graves en escritorio y móvil, también con diálogos abiertos.

**Fuera de alcance:** skins Táctico y Menú de juego, selector de skin visible (aparece con 2
o más skins), despliegue, CV descargable.

## 2. Skin Terminal

| Token | Valor | Uso |
| --- | --- | --- |
| `bg` | `#0c0f0d` | Fondo de página |
| `surface` | `#121714` | Ventanas y tarjetas |
| `surface-2` | `#18201b` | Elemento seleccionado |
| `line` | `#223228` | Bordes y líneas |
| `text` | `#e3ece5` | Texto principal |
| `body` | `#c4d0c7` | Texto de párrafos |
| `muted` | `#93a59a` | Texto secundario |
| `accent` | `#9fd65a` | Acento único (lima) |
| `accent-ink` | `#0c0f0d` | Texto sobre acento |
| `warn` | `#e0a63a` | Solo el aviso de personaje roto |

- **Tipografía:** Space Grotesk 500/700 (titulares) e IBM Plex Mono 400/500 (resto).
- **Forma:** esquinas rectas (radio 0) en toda la skin.
- **Decoración:** ventanas con barra (`archivo.ext` a la izquierda, metadato a la derecha),
  `## ` delante de cada `h2`, `> ` en listas y en el enlace activo, `tree` con `├──`/`└──`,
  scanlines casi invisibles en una capa fija sin eventos, cursor parpadeante tras el nombre.
- **Periodos:** guion con espacios (`jun 2026 - actualidad`); cada fecha en
  `<time datetime="2026-06">`.

### 2.1 Secciones

| Sección | Metáfora | Escritorio | Móvil |
| --- | --- | --- | --- |
| Cabecera | `alvaro@portfolio:~$` + comandos | Fija, enlaces + ES/EN | Fija, botón `$ menu` (popover con la lista y ES/EN) |
| Hero | `> whoami` | Foto en ventana a la izquierda, texto a la derecha | Foto a todo el ancho (en vertical), texto debajo |
| Experiencia | `*.log` | Timeline con línea central y tarjetas alternas | Timeline de una columna, línea a la izquierda |
| Proyectos | `README.md` | Tarjeta README con insignia de estado | Igual, a ancho completo |
| Habilidades | `personaje.sav` | Creador de personaje en 3 columnas | Ficha compacta, pestañas desplazables, panel inferior |
| Formación | `*.md` | Timeline como Experiencia | Igual que Experiencia |
| Contacto | `$ mail`, `$ open` | Lista de comandos-enlace | Igual |

- **Foto ampliable** en ambos tamaños: botón sobre la foto (pista «ampliar») que abre un
  `<dialog>` modal a pantalla completa; se cierra con el botón, Esc o tocando fuera, y
  devuelve el foco a la foto. En la página la foto lleva un leve desaturado; ampliada, a
  color.
- **Pestañas desplazables (móvil):** fundido y flecha en el borde que tiene contenido oculto,
  detectado con `IntersectionObserver` sobre la primera y la última pestaña. Las flechas son
  atajos visuales (`aria-hidden`, sin foco).

### 2.2 Creador de personaje

- **Ficha:** foto, nombre, clase (titular), XP profesional, número de habilidades, build.
- **Inventario:** pestañas por categoría; cambiar de pestaña inspecciona su primera
  habilidad. Cada casilla: icono, nombre, XP y botón `+`/`✓` para equipar.
- **Inspector:** XP exacta, año de inicio, descripción, dónde se usó y botón equipar/quitar.
  Panel lateral en escritorio, panel inferior (`<dialog>`) en móvil.
- **Build sin límite:** a partir de 7 habilidades, contador y huecos extra en `warn` y aviso
  «Personaje roto. Con N habilidades equipadas, el equipo de balanceo ya está preparando un
  nerf.» (`role="status"`).
- **Combinación usada en:** puestos y proyectos ordenados por cuántas habilidades de la build
  cubren (`k/N`), en `accent` si cubren todas.
- **Sin estado persistente:** la build se vacía al recargar.

## 3. Arquitectura

### 3.1 Estilos y skins

```text
src/styles/
├── global.css        Tailwind + @theme con tokens semánticos que apuntan a --skin-*
├── base.css          reset, foco visible, scroll suave, reduced-motion
└── skins/
    └── terminal.css  [data-skin="terminal"] { --skin-*: … } + decoración propia
```

- `<html data-skin="terminal">`. Un registro de skins (`src/lib/skins.ts`) lista las
  disponibles y la predeterminada; un script en línea en `<head>` aplica la preferencia
  guardada antes de pintar (preparado para cuando haya más de una).
- **Regla de componentes:** maquetación con utilidades de Tailwind; aspecto con clases
  semánticas estables (`window`, `window-bar`, `prompt`, `timeline`, `t-item`, `tile`…)
  que estiliza la skin. Ningún componente usa colores ni fuentes concretos.
- **Adornos de contenido** (`> whoami`, nombres de archivo de las barras) en el marcado con
  `aria-hidden`; la skin decide si se muestran. Los nombres de archivo se derivan del id de
  la página de la wiki.
- **Fuentes:** API de fuentes de Astro (estable desde Astro 6), descargadas y servidas desde
  el sitio, con fallback métrico. Cada skin declara las suyas.
- **Iconos:** `simple-icons` (logos de tecnologías) y `@phosphor-icons/core` (conceptos),
  como SVG en línea con `currentColor`. Sin CDN.

### 3.2 JavaScript

Sin framework de interfaz. Módulos TypeScript en `<script>` de Astro (empaquetados, diferidos).

| Pieza | Implementación |
| --- | --- |
| Scroll suave | CSS `scroll-behavior` + `scroll-margin-top` |
| Sección activa | `IntersectionObserver` |
| Menú móvil | Popover API (`popover` + `popovertarget`) |
| Foto ampliable | `<dialog>` + `showModal()` |
| Intro del hero | GSAP + ScrambleTextPlugin (escritura de `> whoami`, nombre que se descifra) |
| Timelines | GSAP + ScrollTrigger (línea con `scrub`, tarjetas desde su lado, nodos) |
| Apariciones | GSAP (`from` con opacidad y desplazamiento) |
| Creador de personaje | Módulo propio; lógica pura en `src/lib/skills.ts` |
| Pestañas desplazables | `IntersectionObserver` |

- **GSAP** desde npm (`gsap`), licencia gratuita incluso comercial; solo los plugins usados.
  Siempre `gsap.from()`: el estado final es el HTML, así que sin GSAP el contenido está visible.
- **Movimiento reducido:** no se registra ninguna animación; scroll instantáneo.
- **Mejora progresiva del creador:** el servidor pinta todas las categorías apiladas con
  icono, XP, descripción y dónde se usó cada habilidad. El script la convierte en la
  interfaz interactiva. Pestañas con el patrón ARIA *tabs* (flechas del teclado), equipar
  con `aria-pressed`.

### 3.3 Contrato de la wiki

- **`skills`** (opcional) en `experience` y `project`: ids de habilidades usadas, validados
  con `findBrokenSkillRefs` en `HomePage.astro` (el build falla) y en el test de contrato.
- **`icon`** (obligatorio) en `skill`: `si:<slug>` (Simple Icons) o `ph:<nombre>` (Phosphor);
  el esquema valida el formato y la existencia del icono.
- **Cálculo en build** (`src/lib/skills.ts`):
  - XP de una habilidad: unión de meses de los puestos y proyectos que la citan, sin contar
    solapamientos; lo vigente cuenta hasta la fecha del build.
  - «Desde»: el año de inicio más antiguo entre ellos.
  - XP profesional: unión de los meses de todos los puestos (sin proyectos).
  - Habilidad sin usos: «sin uso registrado», nunca un valor inventado.
- **Mini ingesta:** se propone al humano la relación puesto/proyecto → habilidades a partir
  de las fuentes, y él decide los casos dudosos (p. ej. Python en SKIN AI).
- La regla de la wiki documenta los dos campos y el cálculo.

## 4. Tests

| Nivel | Qué cubre |
| --- | --- |
| Unitario | XP por unión de meses, vigente hasta la fecha de build, «desde», XP profesional, habilidad sin usos, ranking de combinación con empates, umbral de personaje roto (6 no, 7 sí), `formatPeriod` con guion, derivación de nombres de archivo |
| Contrato | Fixtures inválidos: referencia a habilidad inexistente, `icon` mal formado, icono que no existe; wiki real con todas las referencias resueltas |
| Componentes | Timeline alterno con `<time datetime>`; creador sin JS con todas las categorías, XP y usos; adorno `> whoami` con `aria-hidden`; botón de la foto etiquetado |
| E2E (1280 y 390 px) | Menú lleva a cada sección y la marca activa; popover móvil abre y cierra con Esc; visor de foto abre, cierra (Esc, fuera) y devuelve el foco; creador: pestaña selecciona la primera, `+` equipa, aviso con 7 y no con 6, FastAPI+Celery+Docker → Zalcu 3/3, teclado en pestañas, panel inferior y flechas en móvil |
| E2E sin JS | Todo el contenido visible; creador en su versión legible |
| E2E movimiento reducido | Nada oculto por animaciones a medio terminar |
| Accesibilidad | axe en ambos tamaños, también con visor y menú abiertos |
| Regresión visual | `toHaveScreenshot` de la portada en escritorio y móvil con movimiento reducido; se regeneran a propósito con `pnpm test:e2e --update-snapshots` |
| Rendimiento | JS de la portada contenido (~50 KB comprimidos); sin saltos de maquetación por fuentes o foto |

## 5. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Capturas de referencia inestables entre máquinas | Fuentes servidas desde el sitio, movimiento reducido, umbral de diferencia pequeño; generarlas en el mismo entorno que CI |
| La API de fuentes de Astro cambia | Está estable desde Astro 6; si falla, Fontsource por npm |
| Animaciones que dejan contenido oculto | Solo `gsap.from()`; test E2E con movimiento reducido y sin JS |
| Relaciones `skills` incompletas inflan o desinflan la XP | Mini ingesta validada por el humano; «sin uso registrado» en vez de inventar |
| Ámbar de aviso rompe la regla de un solo acento | Restringido al estado de personaje roto |
