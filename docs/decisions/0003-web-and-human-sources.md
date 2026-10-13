# 0003 Fuentes web y declaraciones del humano, con validación

- Estado: aceptada
- Fecha: 2026-10-02

## Contexto
Hasta ahora todo dato de la wiki debía salir de un archivo de `raw/`. En la práctica hay
información útil que no está ahí: perfiles públicos (GitHub, webs personales) y lo que el
humano cuenta en la conversación. Obligar a copiarlo todo a `raw/` añade fricción, y el
agente no puede escribir en `raw/`.

## Decisión
Se admiten tres tipos de fuente:

- **`raw/`**: sigue siendo la preferente.
- **URLs públicas**: el agente presenta la URL y lo que extrae, y solo lo usa si el humano lo
  valida de forma explícita. Se citan como `"<URL> (AAAA-MM-DD)"` y el log anota la
  validación. No se intentan saltar muros de login; esas páginas se guardan en `raw/`.
- **Declaraciones del humano** en la conversación: se citan como `humano (AAAA-MM-DD)`.

La regla de privacidad se aplica igual a todas: que un dato sea público en internet no lo
hace publicable en la wiki.

## Consecuencias
- Menos fricción para incorporar información, sin perder la trazabilidad.
- Las fuentes web cambian o desaparecen; `lint` no las comprueba. Para lo importante se
  recomienda guardar una copia en `raw/`.
- Las declaraciones del humano no tienen respaldo en un archivo; si son extensas, conviene
  guardarlas como nota en `raw/`.
