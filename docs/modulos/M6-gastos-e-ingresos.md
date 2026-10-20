# M6 · Gastos e ingresos

- **Estado:** en curso (desde 2026-10-20). El plan está aprobado.
- **Objetivo:** registrar desde el teléfono un gasto o un ingreso suelto, con su
  comisión si la tiene, y corregirlo o borrarlo, con las reglas del Excel: se puede
  quedar en descubierto (`R6`) y la comisión se apunta a mano (`R16`). Es el primer
  módulo que escribe.

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

## Pantallas

| Pantalla | Qué enseña | De dónde sale |
|---|---|---|
| **Registrar** | Gasto o ingreso, monto, cuenta, sobres, concepto, fecha y comisión; lo que queda en cada sobre | `account_balances()`, `cell_balances()`, `envelopes` |
| **El libro** (cuenta y sobre) | En el detalle de una operación de la app, quién la registró, «Corregir» y «Borrar» | `operations` |
| **Inicio, una cuenta, un sobre** | El botón «Registrar» | — |

## Hecho cuando

- Durante unos días registran en el teléfono sus gastos e ingresos de verdad, alguno
  con comisión y alguno en descubierto, corrigen y borran alguno, y los saldos cambian
  como en el Excel.
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
7. [ ] **En los teléfonos**: lo usan unos días.

Cada paso termina con su commit; los pasos 3, 5 y 7 terminan además con un push.

## Tope de complejidad

- **Pantallas:** 1 nueva (Registrar), más corregir y borrar en el detalle del libro.
- **Datos:** dos funciones; ninguna tabla nueva.

## Fuera de M6

- Cobrar un ingreso esperado y repartirlo (M8).
- Traspasos entre cuentas, préstamos entre sobres y cambios de divisa (M7), y con
  ellos cubrir un descubierto en el momento.
- Comisiones automáticas (`D4`) y el motivo de cada comisión.
- Registrar sin conexión, y corregir lo importado antes del corte.
