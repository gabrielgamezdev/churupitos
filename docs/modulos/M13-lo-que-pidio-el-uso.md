# M13 · Lo que pidió el uso

- **Estado:** en curso (desde 2026-11-07). El plan está aprobado.
- **Objetivo:** tres cosas que salieron de usar la app de verdad en noviembre: ver lo que
  le falta a cada sobre, registrar una comisión suelta y pagar una deuda en un solo paso.

## Lo que hay

- **El plan** dice cuánto le llegó a un sobre a medias («Le llegaron $100»), pero hay que
  restar para saber cuánto le falta.
- **Las comisiones sueltas:** en la base, una comisión sin gasto al lado ya existe: es un
  gasto cuyos asientos son todos de comisión (`R16`), y hay 73 importados. La app no sabe
  registrarlos: solo ofrece una comisión junto a un gasto. En noviembre se anotaron 4 como
  gastos normales.
- **Corregir** lleva líneas y una sola comisión. Lo importado trae 13 movimientos con
  varias comisiones y 73 solo con comisiones: hoy no abren el formulario, para no perder
  nada. Y al corregir se pierde el concepto propio de cada línea, que tienen 322 líneas.
- **Las deudas:** las 7 pagadas en noviembre tienen su gasto registrado, las 7 en bolívares
  y por el monto exacto. Las 14 pendientes están en dólares. Hoy son tres pasos: cambiar el
  monto de la deuda a bolívares, marcarla pagada y registrar el gasto. Pagarla por otro
  medio, que otro la pague o que se perdone también pasa: ahí no hay gasto.

## Decisiones (2026-11-07)

1. **Lo que falta, en el plan:** un sobre a medias dice debajo de su barra «Le llegaron
   $100 · Faltan $50».
2. **«Es una comisión», en un gasto de Registrar:** marca el gasto entero como comisión,
   con su etiqueta en los libros y sin otra comisión al lado.
3. **Corregir lo lleva todo:** una comisión suelta, varias comisiones y el concepto de cada
   línea. Se corrige lo que se ve, y lo demás se conserva tal cual. Con eso, las 4 de
   noviembre se pueden marcar como comisión.
4. **«Pagar» en cada deuda:** abre Registrar como gasto, con el concepto puesto. Se elige
   la cuenta y se escribe lo que se pagó, en su moneda. Al guardar queda el gasto y la deuda
   pagada, en un solo paso y con «Deshacer».
5. **La deuda conserva su monto:** ya no hay que cambiarla a bolívares. Queda enlazada a su
   gasto, y dice cuánto se pagó y a qué tasa, que sale de los dos montos y no se guarda,
   como en un cobro (`R8`).
6. **«Marcar pagada» sigue,** para lo pagado por otro medio, por otra persona o perdonado.
7. **El gasto manda:** borrarlo devuelve la deuda a pendiente, y corregir su fecha cambia
   el día en que se pagó.
8. **En la base:** el enlace de la deuda con su gasto y una función que guarda los dos a la
   vez. Cambia `R17`: pagar una cuota puede registrar el gasto en el mismo paso.

## Pantallas

Ninguna nueva: cambian Presupuesto, Registrar, Corregir y Deudas.

## Hecho cuando

- Ven lo que le falta a cada sobre sin restar.
- Registran una comisión del banco como comisión, y corrigen las de noviembre.
- Pagan una deuda en dólares con bolívares en un solo paso, y sigue diciendo su monto.
- `npm run check` en verde, en local y en la CI; la base, también en la nube.

## Pasos

1. [x] **Plan aprobado** por el autor (2026-11-07).
2. [x] **Lo que falta, en el plan** (2026-11-07).
3. [x] **Comisiones sueltas y Corregir completo** (2026-11-07): «Es una comisión», varias
   comisiones y el concepto de cada línea. Sin migración: la base ya las aceptaba.
4. [x] **Pagar en la base** (2026-11-07, también en la nube): el enlace y la función, con sus
   pruebas (`R17`).
5. [x] **Pagar en la app** (2026-11-07): «Pagar», lo que se pagó y a qué tasa, y deshacer.
6. [ ] **En los teléfonos.**

Cada paso termina con su commit y con un push, para probarlo en el teléfono.

## Tope de complejidad

- **Pantallas:** ninguna nueva.
- **Datos:** una columna en las deudas y una función.

## Fuera de M13

- Pagar una deuda a medias, o en varias veces.
- Cobrar con un ingreso lo que les deben: hoy no hay ninguna pendiente.
- Rellenar Registrar desde una captura: es M14.
