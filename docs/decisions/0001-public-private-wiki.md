# 0001 Wiki dividida en parte pública y privada en un solo repo

- Estado: aceptada
- Fecha: 2026-10-01

## Contexto
El repositorio debe ser público: se despliega en GitHub Pages (plan Free, que exige repo
público) y sirve como plantilla reutilizable. La LLM Wiki contiene, sin embargo, información
personal que no debe publicarse.

Se descartó usar varios repos (plantilla pública + instancia privada + repo de salida para
Pages) por su complejidad.

## Decisión
Un único repo público con tres niveles de visibilidad:

- `raw/`: fuentes; contenido en `.gitignore`.
- `wiki/private/`: notas personales, síntesis y log; contenido en `.gitignore`.
- `wiki/public/` y `docs/`: versionados; es lo que muestra la web.

El agente clasifica cada dato y, ante la duda, lo deja en privado.

## Consecuencias
- La build de GitHub Pages solo necesita `wiki/public/`, que está en el repo.
- `raw/` y `wiki/private/` no tienen historial ni copia en git: el respaldo es manual.
- Las páginas públicas citan en `sources` archivos de `raw/` que no existen en un clon
  limpio; `lint` lo trata como aviso, no como error.
- Quien use la plantilla debe sustituir el contenido de `wiki/public/` por el suyo.
