# Diseño: plantilla reutilizable y repo personal con `upstream`

- Fecha: 2026-10-13
- Estado: aprobada
- Alcance: issue [#8](https://github.com/ARubiose/ARubiose.github.io/issues/8). Este spec vive
  solo en el repo personal: `docs/superpowers/` no pasa a la plantilla (ver §5).

## 1. Objetivo

Separar el proyecto en dos repos:

- **Plantilla `ARubiose/llm-wiki-portfolio`**: genérica, marcada como *Template repository*,
  con contenido ficticio (Ada) y una demo publicada en `https://arubiose.github.io/llm-wiki-portfolio/`.
- **Web personal `ARubiose/ARubiose.github.io`** (este repo): conserva el contenido real y su
  despliegue en `https://arubiose.github.io`, y trae las mejoras de la plantilla con
  `git pull upstream main`.

**Criterios de éxito:**

- La plantilla no contiene datos del autor en el árbol de `main`: ni contenido, ni imágenes, ni
  capturas, ni maquetas, ni URLs o nombres en código, tests o docs. Se comprueba con un `grep`
  de nombre, apellidos, empleadores, centros de estudios y dominio.
- Quien crea un repo desde la plantilla, con cualquier nombre, obtiene una web que funciona en
  GitHub Pages sin editar código: en la raíz si el repo es `<owner>.github.io` y en
  `/<repo>/` si no.
- Quien sustituye el contenido de Ada por el suyo (`/ingest`) no tiene que tocar ningún test:
  `pnpm check`, `pnpm build`, `pnpm test` y `pnpm test:e2e` siguen en verde.
- En el repo personal, después del primer merge desde `upstream`, todo lo compartido (código,
  tests, `CLAUDE.md`, `docs/system-design.md`, `docs/decisions/`) es idéntico a la plantilla, y
  los pulls siguientes no dan conflictos en el contenido.
- El repo personal sigue desplegando en `https://arubiose.github.io` con la misma URL, el mismo
  contenido y la analítica.
- README principal en inglés (`README.md`) y `README.es.md`, con selector de idioma, y una guía
  de uso bilingüe (`docs/guide.md`, `docs/guide.es.md`).
- `LICENSE` MIT en los dos repos.

**Fuera de alcance:**

- Traducir al inglés los docs existentes (`docs/system-design.md`, `docs/decisions/`), que
  siguen en español.
- Automatizar la sincronización con `upstream` (Action, bot o similares).
- Regresión visual del contenido real del autor: la sustituye el smoke e2e genérico (§3.3).

## 2. Topología y migración

### 2.1 Historial compartido

La plantilla arranca con el historial actual (los 149 commits) más los commits de
generalización. Así el repo personal comparte ancestro con ella y `git pull upstream main`
funciona sin `--allow-unrelated-histories`. El contenido real queda en el historial de la
plantilla. Ya es público en el repo personal, y «Use this template» crea repos con un único
commit, sin historial.

### 2.2 Pasos

1. **Rama `feat/template` en este repo.** Aquí se generaliza el código (§3) y el contenido
   pasa a ser el de Ada. Se trabaja en este directorio, no en un worktree, porque `raw/` y
   `wiki/private/` están ignorados y solo existen aquí.
2. **Crear `ARubiose/llm-wiki-portfolio`**: público, *Template repository*, Pages con fuente
   «GitHub Actions». Se sube `feat/template` como su `main`, se comprueba el deploy de la demo
   y se crean sus issues aplazados.
3. **Unir el repo personal** (rama `feat/upstream` desde `main`):
   - `git remote add upstream git@github-portfolio:ARubiose/llm-wiki-portfolio.git`.
   - `git merge upstream/main` resolviendo así: se conserva la versión personal de los
     archivos de contenido (§2.3) y de lo que la plantilla borra pero el repo personal guarda
     (`docs/superpowers/`, `docs/design/mockups/`), y se acepta la de la plantilla en todo lo
     demás.
   - `.gitattributes` con `merge=ours` para los archivos de contenido, y en local
     `git config merge.ours.driver true`. La guía y `docs/system-design.md` documentan este
     paso, porque la configuración del driver no se versiona.
   - La nota de licencia del contenido en `README.md` y `README.es.md` (§5).
4. **Verificar el repo personal**: `pnpm check`, `pnpm build`, `pnpm test` y
   `pnpm test:e2e` en verde con el contenido real, y una build con
   `GITHUB_REPOSITORY=ARubiose/ARubiose.github.io` que genera `site` = `https://arubiose.github.io`
   sin `base`. Merge a `main` con `Closes #8`. Push solo cuando lo pida el autor.

### 2.3 Archivos de contenido (difieren entre los repos)

Son los únicos archivos que existen en los dos repos con contenido distinto:

- `wiki/public/**`
- `public/og-image.png`, `public/favicon.svg`

Todo lo demás es idéntico (compartido) o existe solo en un repo. Solo en el personal:
`docs/superpowers/` (specs y planes hasta este), `docs/design/mockups/`, `.gitattributes` y la
variable de Actions `CF_ANALYTICS_TOKEN`.

## 3. Generalización (rama `feat/template`)

### 3.1 `site` y `base`

- Función pura `pagesTarget(env)` en `src/lib/site.ts`, que devuelve `{ site, base }`:
  - Si existen `SITE_URL` (y `BASE_PATH`, opcional), se usan y tienen prioridad.
  - Si no, se deducen de `GITHUB_REPOSITORY` (`owner/repo`). Si `repo` es
    `<owner>.github.io` (sin distinguir mayúsculas), `site` = `https://<owner>.github.io` y
    `base` = `/`; si no, el mismo `site` con `base` = `/<repo>/`.
  - Sin ninguna de las dos (desarrollo local), `site` = `http://localhost:4321` y `base` = `/`.
  - `deploy.yml` no cambia: `GITHUB_REPOSITORY` lo pone Actions.
- `astro.config.mjs` usa `pagesTarget(process.env)` y deja de tener `site` fijo.
- Todas las rutas absolutas respetan `base`: favicon, enlaces de idioma, `og:image`,
  `canonical`, `hreflang`, JSON-LD, `robots.txt` y sitemap. Se centraliza en un helper de
  `src/lib/` si hoy hay rutas montadas a mano.
- Tests: unitarios de `pagesTarget` (los cuatro casos y la prioridad) y uno que construye con
  `base` y comprueba que `dist/` no contiene `href="/` ni `src="/` fuera de `base`.

### 3.2 Contenido configurable: `WIKI_DIR`

- `src/content.config.ts` lee el directorio base de `WIKI_DIR` (por defecto `wiki/public`).
- **Fixture `tests/fixtures/site/`**: wiki completa de Ada (perfil, experiencia, proyectos,
  habilidades y formación, con empresas y centros ficticios), con su foto. Es estable: solo
  cambia cuando lo necesita un test.
- En la plantilla, `wiki/public/` es una copia de ese fixture. La duplicación es intencionada:
  `wiki/public/` es del usuario y el fixture es de los tests.

### 3.3 Tests en tres capas

| Capa | Sobre qué corre | Al cambiar el contenido |
| --- | --- | --- |
| Unitarios y de componentes | Datos inline y fixtures de Ada | No se tocan |
| E2E y visuales | Build con `WIKI_DIR=tests/fixtures/site` y un `SITE_URL` fijo de prueba | No se tocan; capturas comunes a los dos repos |
| Contenido real | `wiki/public/` y su `dist/` | Esquemas Zod en el build, escaneo de privacidad, presupuesto de rendimiento y smoke e2e |

- Playwright construye y sirve el build del fixture (su `webServer`). Los tests que hoy fijan
  el dominio (`tests/e2e/seo.spec.ts`, `tests/e2e/home.spec.ts`) leen el `SITE_URL` de
  prueba, y los que fijan textos del autor (`motion`, `builder`, `game`) usan los de Ada.
- Los tests de privacidad y rendimiento (`pnpm test`) siguen escaneando el `dist/` de
  `pnpm build` normal, es decir, el contenido real.
- **Smoke e2e genérico** (proyecto de Playwright aparte, sobre el build real): `/` y `/en/`
  cargan sin errores de consola, no hay desbordamiento horizontal en móvil y se renderizan las
  secciones que tienen contenido. No compara textos ni capturas. CI lo ejecuta junto con
  `pnpm test:e2e`.
- Las capturas de `tests/e2e/visual.spec.ts-snapshots/` se regeneran con Ada.
- Fixtures de tests unitarios y de componentes (`tests/unit/skills.test.ts`, `home.test.ts`,
  `adorns.test.ts`, `tests/components/base.test.ts`, `sections.test.ts`): los nombres,
  empresas y centros del autor se sustituyen por los de Ada. También el comentario de
  `src/lib/home.ts:46`.

### 3.4 Contenido e imágenes de Ada

- `wiki/public/` = el fixture de §3.2. `wiki/private/` y `raw/` conservan solo su esqueleto
  versionado (sin cambios).
- `wiki/public/profile.jpg`, `public/og-image.png` y `public/favicon.svg`: imágenes genéricas
  (avatar ilustrado o iniciales, nunca una persona real).

### 3.5 Limpieza

- Se borran `docs/superpowers/` y `docs/design/mockups/`.
- `docs/system-design.md`: fuera la URL y el repo del autor (§3.6 y §7). Se añaden la
  topología plantilla/`upstream`, `site`/`base`, `WIKI_DIR` y la estrategia de tests en capas
  (§3.7).
- `CLAUDE.md`: solo lo válido para los dos repos. Fuera la referencia fija a las maquetas; se
  añaden `WIKI_DIR`, el fixture y la regla de que las mejoras se hacen en la plantilla.
- Decisión nueva `docs/decisions/0006-template-and-upstream.md`: dos repos, historial
  compartido y tests sobre fixture.
- Verificación final con el `grep` del criterio de éxito sobre el árbol de la rama.

## 4. Guía de uso

`docs/guide.md` (EN) y `docs/guide.es.md`, enlazadas desde los README:

1. Crear el repo con «Use this template». El nombre decide la URL: `<usuario>.github.io` va a
   la raíz y cualquier otro a `/<repo>/`. Activar Pages con fuente «GitHub Actions».
2. Instalación local (`nvm use`, `pnpm install`, `pnpm dev`), que ya muestra a Ada.
3. Sustituir a Ada: borrar su `wiki/public/`, copiar las fuentes propias (CV, exportación de
   LinkedIn, notas…) a `raw/` y ejecutar `/ingest raw/<archivo>`, revisar con `/lint` y
   cambiar foto, `og-image.png` y `favicon.svg`.
4. Tests: qué cubre cada capa (§3.3), por qué cambiar el contenido no exige tocarlos y cuándo
   sí (cambios de código, `--update-snapshots` si el cambio es visual).
5. Opcional: analítica de Cloudflare (variable `CF_ANALYTICS_TOKEN`).
6. Traer mejoras de la plantilla: remoto `upstream`, `.gitattributes` con `merge=ours` y
   `merge.ours.driver`, y el primer pull con `--allow-unrelated-histories`, necesario porque
   «Use this template» no conserva el historial.

## 5. Documentación y licencia

- `README.md` (EN) y `README.es.md`, con selector de idioma arriba: qué es, enlace a la
  demo, inicio rápido y enlace a la guía. El bloque de alimentar la wiki queda genérico, sin
  `cp ~/Descargas/…`.
- `LICENSE` MIT, © 2026 Álvaro Rubio Segovia, en los dos repos.
- Solo en el repo personal, una nota en los README: el código es MIT; el contenido de
  `wiki/public/` y las imágenes son © del autor y no están bajo esa licencia.
- Reparto de documentos:

| Documento | Plantilla | Repo personal |
| --- | --- | --- |
| `docs/decisions/`, `docs/system-design.md`, `docs/guide*.md` | Sí | Sí, desde `upstream` |
| `docs/superpowers/` existentes, incluido este spec | No | Sí |
| `docs/design/mockups/` | No | Sí |
| Specs y planes futuros | Sí, con datos de Ada | Llegan por el pull |

## 6. Riesgos

- **Un pull de `upstream` pisa contenido personal** si falta el driver `merge=ours` en local.
  Se mitiga documentándolo en la guía y en `docs/system-design.md`, y el primer merge se
  revisa a mano.
- **Rutas absolutas que se escapan de `base`** romperían la demo y los repos con nombre propio.
  Lo vigila el test de `dist/` con `base` (§3.1).
- **Divergencia de archivos compartidos**: un cambio hecho directamente en el repo personal en
  un archivo compartido dará conflictos al hacer pull. La regla de `CLAUDE.md` es que las
  mejoras se hacen en la plantilla.
