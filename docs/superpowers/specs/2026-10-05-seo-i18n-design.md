# Diseño: fase 6b, SEO e i18n del despliegue

- Fecha: 2026-10-05
- Estado: aprobada en conversación; pendiente de revisión escrita
- Alcance: issue [#1](https://github.com/ARubiose/ARubiose.github.io/issues/1). Completa el
  despliegue de la fase 6 ([system-design.md](../../system-design.md) §3.6) con lo que necesitan
  los buscadores para indexar bien las dos versiones de la portada.

## 1. Objetivo

Que una búsqueda del nombre del autor lleve a la portada en el idioma adecuado y que los
buscadores (y los asistentes de IA que los usan) entiendan quién es y lo enlacen con sus
perfiles de LinkedIn y GitHub.

**Criterios de éxito:**

- `/` y `/en/` declaran su `canonical` y sus alternativas `hreflang` (`es-ES`, `en-US` y
  `x-default`), con URLs absolutas y recíprocas.
- La build genera `sitemap-index.xml` y `sitemap-0.xml` con las dos URLs y sus alternativas, y
  `robots.txt` que apunta al índice.
- Cada página incluye un JSON-LD `Person` válido (schema.org y prueba de resultados enriquecidos
  de Google), en el idioma de la página.
- Todo sale de `site` y de `wiki/public/`: quien use el repo como plantilla obtiene su propio
  SEO cambiando solo su wiki y `site`.
- Ningún dato privado nuevo en `dist/` (lo vigila el test de privacidad existente).

**Fuera de alcance:**

- Imagen al compartir por idioma: `og-image.png` sigue siendo única (y en inglés). Se abre un
  issue aparte para generarla por idioma desde una plantilla.
- Cambios visibles en la sección de formación: `kind` solo se usa en el JSON-LD.
- `email` en el JSON-LD: ya es público en la página, pero no se expone a rastreadores en datos
  estructurados.

## 2. Arquitectura

| Pieza | Cambio |
| --- | --- |
| `astro.config.mjs` | Integración oficial `@astrojs/sitemap` con `i18n` (`defaultLocale: "es"`, `locales: { es: "es-ES", en: "en-US" }`), importando el mapa de idiomas de `@i18n/ui` |
| `src/i18n/ui.ts` | Mapa `localeTags: Record<Locale, string>` (`es` → `es-ES`, `en` → `en-US`); única fuente de los códigos BCP 47 |
| `src/lib/seo.ts` (nuevo) | Funciones puras: `alternateLinks`, `personJsonLd`, `jsonLdScript` |
| `src/lib/schemas.ts` | `education.kind`: `"degree" \| "certificate"`, opcional, por defecto `"degree"` |
| `src/layouts/Layout.astro` | Props opcionales `alternates` y `jsonLd`; escribe `canonical`, `alternate hreflang` y el `<script type="application/ld+json">` |
| `src/layouts/HomePage.astro` | Calcula la URL absoluta de la foto optimizada con `getImage` y pasa `alternates` y `jsonLd` al layout |
| `src/pages/robots.txt.ts` (nuevo) | Endpoint estático: `User-agent: *`, `Allow: /`, `Sitemap: <site>/sitemap-index.xml` |
| `wiki/public/education/` | `kind: certificate` en las páginas del IELTS y del CCNA |
| `.claude/rules/wiki.md` | `kind?` en los campos de `education` |

Se elige la integración oficial frente a un endpoint propio porque crecerá con el proyecto
(cualquier página nueva entra sola) y trae opciones (`filter`, `serialize`, `lastmod`) que pueden
hacer falta más adelante. El precio son dos dependencias (`sitemap`, `zod` 4) y que las
alternativas se declaran en la integración y en el layout; las dos leen el mismo `localeTags`,
y los tests e2e comprueban que coinciden.

Los componentes no conocen la fuente de datos: `HomePage` sigue siendo el único que lee las
colecciones, y el layout solo recibe props.

## 3. Datos del JSON-LD `Person`

| Campo | Origen | Idioma |
| --- | --- | --- |
| `name` | `profile.name` | igual |
| `jobTitle` | `profile.headline` | traducido |
| `description` | `profile.summary` | traducido |
| `url` | URL canónica de la página | `/` o `/en/` |
| `image` | `profile.photo`, optimizada a WebP de 400 px, URL absoluta | igual |
| `address` | `PostalAddress` con `addressLocality: profile.location` | igual |
| `sameAs` | `links.linkedin`, `links.github` (no `links.source`, que es el repo) | igual |
| `worksFor` | experiencias con `end: null` → `Organization { name: company }` | igual |
| `alumniOf` | instituciones de `education` con `kind: degree`, sin duplicados → `CollegeOrUniversity { name }` | igual |
| `hasCredential` | `education` con `kind: certificate` → `EducationalOccupationalCredential { name: degree, recognizedBy: Organization { name: institution } }` | traducido |
| `knowsAbout` | nombres de las habilidades | igual |

El `<script>` lleva `inLanguage` con el código del idioma de la página. Los campos sin datos
(sin puesto actual, sin certificaciones, sin habilidades) se omiten, nunca se inventan ni se
dejan vacíos.

`personJsonLd` recibe la vista ya localizada de `buildHomeView` (más las entradas de formación
con su `kind`) y la URL de la página y de la imagen; no lee colecciones ni conoce Astro.

## 4. Errores

Todo ocurre en build; no hay JavaScript de cliente nuevo.

- `kind` con un valor distinto de `degree` o `certificate`: Zod rechaza la página y la build
  falla con el nombre del archivo, como el resto del contrato.
- Sin `site` en la configuración: la build falla con un mensaje claro en lugar de generar URLs
  relativas (el sitemap también lo exige).
- `jsonLdScript` escapa `<` (como `SkillBuilder`), así que ningún texto de la wiki puede cerrar el
  `<script>`.

## 5. Tests

Con TDD, según [system-design.md](../../system-design.md) §3.7.

- **Unitarios (`tests/unit/seo.test.ts`):**
  - `alternateLinks`: `es-ES`, `en-US` y `x-default` (→ `/`), URLs absolutas.
  - `personJsonLd`: campos por idioma; `worksFor` solo con `end: null` y omitido si no hay;
    `alumniOf` sin duplicados ni certificaciones; `hasCredential` con las certificaciones;
    `sameAs` sin `source`; sin `email`.
  - `jsonLdScript`: un texto con `</script>` no cierra la etiqueta.
- **Contrato:** `kind` acepta `degree` y `certificate`, vale `degree` por defecto y rechaza
  otros valores.
- **E2E (`tests/e2e/home.spec.ts`), en `/` y `/en/`:** `canonical` correcto; las tres
  alternativas `hreflang`, recíprocas; el JSON-LD se parsea, es `Person` y su `jobTitle` está en
  el idioma de la página.
- **E2E (nuevo, `tests/e2e/seo.spec.ts`):** `/robots.txt` apunta a `/sitemap-index.xml` con el
  dominio de `site`; el sitemap contiene las dos URLs con sus `xhtml:link` alternativas, con los
  mismos códigos que el `<head>`.
- **Privacidad:** sin cambios; el test existente ya escanea `dist/`, JSON-LD incluido.

## 6. Documentación

- [system-design.md](../../system-design.md): nueva subsección de SEO en §3 (canonical,
  hreflang, sitemap, robots y JSON-LD, con su origen de datos) y la integración en §3.1.
- `.claude/rules/wiki.md`: `kind?` en `education`.
- Issue nuevo: imagen al compartir por idioma.
- El commit o la PR que lo cierre lleva `Closes #1`.
