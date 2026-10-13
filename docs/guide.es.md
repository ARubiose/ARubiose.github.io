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
   del repo `SITE_URL` (por ejemplo `https://ada.dev`) y, si hace falta, `BASE_PATH`, y
   añádelas al `env` del job `test` de `.github/workflows/deploy.yml`.
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

Tu repo funciona por su cuenta. Para traer las mejoras de la plantilla:

```sh
git remote add upstream https://github.com/ARubiose/llm-wiki-portfolio.git
printf 'wiki/public/** merge=ours\nwiki/index.md merge=ours\npublic/og-image.png merge=ours\n' > .gitattributes
git config merge.ours.driver true    # configuración local, no se versiona: repítelo en cada clon
git add .gitattributes && git commit -m "chore: Keep my content on template merges"
git fetch upstream
git merge upstream/main --allow-unrelated-histories   # solo la primera vez
```

`--allow-unrelated-histories` hace falta una vez porque *Use this template* crea el repo sin
el historial de la plantilla. En ese primer merge, resuelve cada conflicto quedándote con tu
versión del contenido (`git checkout --ours <ruta>`) y con la de la plantilla en todo lo
demás (`git checkout --theirs <ruta>`); después, `pnpm test && pnpm test:e2e` y commit.

A partir de ahí basta con:

```sh
git pull upstream main
```

`merge=ours` conserva tu versión de los archivos de contenido cuando los dos lados los han
cambiado. Solo actúa cuando hay algo que fusionar, por eso el primer merge se revisa a mano.

Haz las mejoras de código en la plantilla (o mándalas como pull request), no en tu copia: un
cambio local en un archivo compartido dará conflictos al traer `upstream`.
