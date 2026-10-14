# ADR 0002 — El dinero se guarda como enteros en céntimos

- **Fecha:** 2026-10-12 (heredada de la versión anterior, donde se aceptó el 2026-08-20)
- **Estado:** aceptada

## Contexto
El Excel acumuló meses de parches con `ROUND`, y la primera versión de la app
comparaba importes con tolerancias de `0,001`, `0,005` y `0,01`. Las dos cosas son
síntomas de lo mismo: un número de coma flotante no representa `0,1` ni `0,003` de
forma exacta.

```
0.1 + 0.2     = 0.30000000000000004
1500 * 0.003  = 4.500000000000001      (una comisión del 0,3 %, la más frecuente)
```

Lo peligroso es que falla de forma intermitente: las pruebas pasan, y meses después
un saldo deriva.

## Decisión
Todo importe se guarda como **entero en la unidad menor** (`bigint` en Postgres),
junto a su moneda. `Bs 19,85` es `1985`. Prohibido `float`, `double`, `real` y
`numeric` para dinero.

En TypeScript, un importe es un `number` **entero**: los céntimos de este hogar están
lejísimos de `Number.MAX_SAFE_INTEGER`, y cada entrada se valida con
`Number.isSafeInteger`. La conversión a decimal ocurre **solo al pintar**.

Al repartir, la última parte absorbe el resto, así que las partes suman exactamente
el total: `100,00 / 3 = 33,33 + 33,33 + 33,34`.

## Consecuencias
- No hay ninguna constante de tolerancia en el código. Las comparaciones son exactas.
- El invariante de cuadre da cero o hay un bug, sin zona gris.
