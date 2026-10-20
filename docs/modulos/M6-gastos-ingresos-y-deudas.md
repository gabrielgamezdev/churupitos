# M6 · Gastos, ingresos y deudas

- **Estado:** en curso (desde 2026-10-20). El plan está aprobado.
- **Objetivo:** registrar desde el teléfono un gasto o un ingreso suelto, con su
  comisión si la tiene, y corregirlo o borrarlo, con las reglas del Excel: se puede
  quedar en descubierto (`R6`) y la comisión se apunta a mano (`R16`). Y agregar,
  corregir y borrar deudas y marcar las cuotas pagadas. Es el primer módulo que escribe.

## Lo que hay en la v2 y en la base

- **La v2** tenía un solo formulario para los dos lados: desde una cuenta se elegía el
  sobre, y desde un sobre, la cuenta. Abría en gasto, que es lo de casi siempre; nunca
  impedía guardar por el saldo, solo avisaba; y generaba el identificador del
  movimiento al abrir, para que dos toques en «Guardar» no lo registraran dos veces.
  También cubría un descubierto en el momento y pedía el motivo de cada comisión: eso
  no entra aquí.
- **La base** ya admite lo que registre la app: cada operación guarda quién la
  registró (lo importado va sin autor), y la forma de cada tipo la comprueba ella
  (`R5`). Hoy la app solo lee.

## Decisiones (2026-10-20)

- **Se registra desde un botón «Registrar»** en el inicio, en cada cuenta y en cada
  sobre: desde una cuenta abre con ella elegida, y desde un sobre, con él.
- **Una pantalla, Registrar**: gasto o ingreso; el monto, en la moneda de la cuenta; la
  cuenta; el sobre; el concepto; y la fecha, hoy si no se cambia. Un gasto se puede
  repartir entre varios sobres, cada uno con su parte. Si hubo comisión, su monto y
  su sobre (el del gasto, si no se cambia), y va como un asiento aparte (`R16`).
- **Antes de guardar se ve lo que queda** en cada sobre de esa cuenta. Si alguno queda
  en descubierto, lo dice, y se guarda igual (`R6`).
- **Un ingreso, aquí, es uno suelto**: un reintegro, un regalo. Cobrar un ingreso
  esperado del presupuesto y repartirlo es de M8.
- **Corregir y borrar**, desde el detalle de la operación en el libro, y solo lo
  registrado en la app. Lo importado no se toca hasta el corte: viene del Excel, y la
  siguiente recarga lo devolvería como estaba.
- **Cada operación de la app dice quién la registró.**
- **Sin conexión no se registra**: la app no tiene cola de escrituras
  (`docs/ESTADO.md`), y el botón lo dice.
- **La app escribe con dos funciones de la base**, guardar y borrar una operación, que
  comprueban todo y escriben la operación con sus asientos de una vez. La app sigue
  sin escribir directo en las tablas. Se explica en un ADR nuevo, el 0008.

## Hasta el corte: en paralelo

Registran cada gasto en el Excel y en la app. La app enseña lo de la última recarga más
lo registrado en ella. Al recargar (por ejemplo, al empezar noviembre), lo de la app se
borra a propósito y manda el Excel, que ya lo tiene. Cuanto más haga la app, más se
usará, y el Excel se irá dejando poco a poco.

## Ampliación: las deudas (2026-10-20)

El autor pide registrar también las deudas antes de probar la app en el teléfono: hoy
todas vienen del Excel, y probar unos días sin poder marcar una cuota pagada sería
probar a medias. Se adelanta aquí lo que era M10, y se prueba todo junto.

- **En Deudas, un botón «Agregar»**: lo que deben o lo que les deben, concepto, monto
  con su moneda y fecha límite (opcional).
- **En cuotas**: al agregar, cuántas y cada cuánto (cada 14 días o cada mes), como las
  compras a cuotas del Excel, que van de tres en tres cada dos semanas. Cada cuota es
  una deuda, con su fecha.
- **Al tocar una deuda**: «Marcar pagada» (o «No está pagada», si se marcó por error),
  «Corregir» y «Borrar».
- **Una pagada guarda el día en que se marcó**, y se ve en «Pagadas este mes» durante
  ese mes. Las importadas, con el día de su fecha límite.
- **Marcar pagada no registra el gasto** (`R17`): ofrece «Registrar el pago», que abre
  Registrar con el monto, el concepto y la fecha; la cuenta y el sobre se eligen.
- **Lo importado sí se toca**: a diferencia de los movimientos, las deudas son una lista
  que la recarga reemplaza entera con la del Excel, que también se marca en paralelo.
- **La base**: tres funciones más (guardar, marcar pagada y borrar una deuda), como las
  de los movimientos (ADR 0008), y el candado del corte cuenta también las deudas
  agregadas en la app.

## Pantallas

| Pantalla | Qué enseña | De dónde sale |
|---|---|---|
| **Registrar** | Gasto o ingreso, monto, cuenta, sobres, concepto, fecha y comisión; lo que queda en cada sobre | `account_balances()`, `cell_balances()`, `envelopes` |
| **El libro** (cuenta y sobre) | En el detalle de una operación de la app, quién la registró, «Corregir» y «Borrar» | `operations` |
| **Inicio, una cuenta, un sobre** | El botón «Registrar» | — |
| **Deudas** | El botón «Agregar»; al tocar una deuda, «Marcar pagada», «Corregir», «Borrar» y «Registrar el pago» | `debts` |
| **Agregar una deuda** | Lo que deben o les deben, concepto, monto y moneda, fecha límite y, al agregar, las cuotas | — |

## Hecho cuando

- Durante unos días registran en el teléfono sus gastos e ingresos de verdad, alguno
  con comisión y alguno en descubierto, corrigen y borran alguno, y los saldos cambian
  como en el Excel.
- Agregan alguna deuda en cuotas y marcan pagadas las que pagan, y la lista coincide
  con la del Excel.
- `npm run check` en verde, en local y en la CI.

## Pasos

1. [x] **Plan aprobado** por el autor (2026-10-20).
2. [x] **Escribir en la base** (2026-10-20, también en la nube): el ADR 0008 y las
   funciones de guardar y borrar una operación, con sus permisos y sus pruebas (`R5`,
   `R6`, `R16`, solo lo de la app).
3. [x] **Registrar** (2026-10-20): la pantalla con un sobre, la comisión y el aviso de
   descubierto; el botón en el inicio, en cada cuenta y en cada sobre.
4. [x] **Repartir entre varios sobres** (2026-10-20).
5. [x] **Corregir y borrar** (2026-10-20), y quién registró cada operación.
6. [x] **La recarga que borra lo de la app** (2026-10-20), para registrar en paralelo:
   `--discard-app-data`. Sin pedirlo, el candado del corte no deja recargar.
7. [x] **Escribir deudas en la base** (2026-10-20, también en la nube): el día en que se
   pagó y quién la agregó; las funciones de guardar (también en lote), marcar pagada y
   borrar, con sus pruebas; el candado del corte con las deudas; el importador.
8. [ ] **Agregar y corregir deudas**, con las cuotas en lote.
9. [ ] **Marcar pagada y borrar**, con «Registrar el pago».
10. [ ] **En los teléfonos**: lo usan unos días.

Cada paso termina con su commit; los pasos 9 y 10 terminan además con un push.

## Tope de complejidad

- **Pantallas:** 2 nuevas (Registrar y Agregar una deuda), más las acciones en el
  detalle del libro y en cada deuda.
- **Datos:** cinco funciones y dos columnas; ninguna tabla nueva.

## Fuera de M6

- Cobrar un ingreso esperado y repartirlo (M8).
- Traspasos entre cuentas, préstamos entre sobres y cambios de divisa (M7), y con
  ellos cubrir un descubierto en el momento.
- Comisiones automáticas (`D4`) y el motivo de cada comisión.
- Registrar sin conexión, y corregir lo importado antes del corte.
