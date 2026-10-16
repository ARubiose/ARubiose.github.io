[English](guide.md) · **Español**

# Cómo usar la plantilla

De «Use this template» a tu propio portfolio en GitHub Pages, y cómo seguir trayendo las
mejoras de la plantilla después.

## 1. Crea tu repo

1. En la página de GitHub de la plantilla, pulsa **Use this template** → *Create a new repository*.
2. El nombre del repo decide la URL:
   - `<usuario>.github.io` se publica en `https://<usuario>.github.io/`.
   - Cualquier otro nombre (por ejemplo `portfolio`) se publica en
     `https://<usuario>.github.io/portfolio/`.

   No hay que editar nada: `site` y `base` se deducen del nombre del repo en Actions
   (`GITHUB_REPOSITORY`, ver `src/lib/site.ts`). Para un dominio propio, crea las variables
   del repo `SITE_URL` (por ejemplo `https://ada.dev`) y, si hace falta, `BASE_PATH`
   (*Settings → Secrets and variables → Actions → Variables*); el workflow ya las lee.
3. En *Settings → Pages*, elige **Source: GitHub Actions**. El siguiente push a `main` pasa
   los tests y despliega.

## 2. Arráncalo en local

```sh
nvm use                                  # Node 24 (.nvmrc)
pnpm install
pnpm exec playwright install chromium    # solo para los tests e2e
pnpm dev                                 # http://localhost:4321
```

Verás a Ada, el perfil ficticio de demostración.

## 3. Cambia a Ada por tu contenido

```sh
git rm -r wiki/public && mkdir -p wiki/public
```

Solo se borra `wiki/public/`. `tests/fixtures/site/` es una copia de Ada que usan los tests:
no la toques.

1. Copia tus fuentes (CV, exportación de LinkedIn, notas…) a `raw/`. Está en `.gitignore`:
   nada de ahí se publica.
2. En Claude Code, ejecuta `/ingest raw/<archivo>` una vez por fuente. El agente escribe
   `wiki/public/` (lo que muestra la web) y `wiki/private/` (todo lo demás, también fuera de
   git), y actualiza `wiki/index.md`. Antes de usar algo sacado de la web te pide que lo
   valides.
3. Ejecuta `/lint` para buscar fugas de datos privados, enlaces rotos y huecos.
4. Imágenes:
   - Tu foto: `wiki/public/profile.jpg` (el campo `photo` de `profile.md`).
   - La imagen que se ve al compartir el enlace: `public/og-image.png`, de 1200×627.
5. Ejecuta `pnpm build`. Si a una página le falta un campo o tiene una fecha mal, los
   esquemas Zod (`src/lib/schemas.ts`) hacen fallar la build y dicen qué archivo y qué campo.
6. Página de detalle de un proyecto (opcional): `/detail <slug>`. El agente propone un
   índice, redacta `wiki/public/projects/<slug>/es.md` y `en.md` y te los enseña antes de
   escribir. La tarjeta del proyecto mostrará «Ver más». La build falla si falta un idioma
   o si el cuerpo lleva HTML, enlaces a la wiki o imágenes de fuera de su carpeta.

## 4. Tests

La suite tiene tres capas, y ninguna depende de tu contenido:

| Capa | Sobre qué corre | Al cambiar tu contenido |
| --- | --- | --- |
| Unitarios y de componentes (`tests/unit`, `tests/components`) | Datos inline y fixtures | No hay que tocar nada |
| E2E y capturas (`tests/e2e`) | Un build de `tests/fixtures/site/` (Ada) | No hay que tocar nada: Ada no cambia |
| Tu contenido | `wiki/public/` y su `dist/` | Se comprueba solo: esquemas Zod en la build, escaneo de privacidad, presupuesto de JS y un smoke genérico (`tests/smoke`) |

Así que, después de `/ingest`, `pnpm test` y `pnpm test:e2e` siguen en verde sin cambios.

Solo tocas tests si cambias **código**: actualiza los tests de lo que cambiaste y, si el
cambio es visual, regenera las capturas con `pnpm test:visual:update` (las capturas dependen
del sistema que las genera: créalas donde se van a comparar).

Para que ciertas cadenas tuyas no se publiquen nunca (un teléfono, una dirección), escríbelas
una por línea en `wiki/private/forbidden-strings.txt`: al pasar los tests en local (el archivo
está fuera de git, así que CI no lo tiene), los tests de privacidad fallan si
aparecen en la web o en el repo.

## 5. Analítica (opcional)

El sitio puede contar visitas con [Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/)
(gratis, sin cookies y sin banner de consentimiento). Viene desactivada.

1. En Cloudflare: *Analytics & Logs → Web Analytics → Add a site*, con tu dominio de GitHub
   Pages. Copia el `token` del fragmento.
2. En GitHub: *Settings → Secrets and variables → Actions → Variables*, crea
   `CF_ANALYTICS_TOKEN` con ese valor (es una variable y no un secreto porque el token acaba
   en el HTML público).
3. El siguiente despliegue carga el script y añade al pie una línea que lo avisa.

Para probarlo en local, copia `.env.example` a `.env`, rellena `PUBLIC_CF_ANALYTICS_TOKEN` y
ejecuta `pnpm build && pnpm preview`, mejor con un token de prueba.

## 6. Trae las mejoras de la plantilla

Tu repo funciona por su cuenta. Para traer las mejoras de la plantilla, añádela una vez como
remoto:

```sh
git remote add upstream https://github.com/ARubiose/llm-wiki-portfolio.git
```

Y después, cada vez:

```sh
pnpm sync:upstream
```

El script (`scripts/sync-upstream.mjs`) hace fetch de `upstream`, fusiona `upstream/main` sin
hacer commit y deja tu contenido exactamente como estaba: `wiki/public/`, `wiki/index.md` y
`public/og-image.png`. Los cambios de la plantilla en Ada se descartan, y también las páginas
que añada (nunca llegan a tu web). La primera vez añade `--allow-unrelated-histories`, porque
*Use this template* crea el repo sin el historial de la plantilla.

Si hay conflictos en archivos de código, resuélvelos (normalmente con la versión de la
plantilla, `git checkout --theirs <ruta>`) y después:

```sh
pnpm test && pnpm test:e2e
git commit
```

No uses un `git pull upstream main` a secas: metería en tu web las páginas nuevas de Ada.

Haz las mejoras de código en la plantilla (o mándalas como pull request), no en tu copia: un
cambio local en un archivo compartido dará conflictos al sincronizar.
