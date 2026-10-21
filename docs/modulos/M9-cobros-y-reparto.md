# M9 · Cobros y reparto

- **Estado:** en curso (desde 2026-10-21). El plan está aprobado; se construye mientras
  M8 se prueba en los teléfonos, por decisión del autor.
- **Objetivo:** cobrar desde la app un ingreso esperado del presupuesto, en la cuenta
  donde llegó y con su tasa, y repartirlo entre sobres en dólares, como la
  «Distribución» del Excel, con el plan del mes como propuesta. Presupuesto se pone al
  día solo: el ✅, lo que recibió cada sobre y las comprobaciones.

## Lo que hay en el Excel, en la base y en la v2

- **El Excel** tiene en PRESUPUESTO los ingresos esperados del mes, en dólares, con su
  ✅ y la tasa del cobro, y la «Distribución»: el plan de cada sobre, con la fuente de
  los fondos y la acción. El cobro va en la hoja de la cuenta: una fila de título
  («Bono $X = Bs Y») y una fila por sobre («$N de Ahorro»).
- **La base** ya lo tiene todo para leerlo: los ingresos esperados, el plan, el cobro
  como un ingreso enlazado a su línea esperada, con el valor en dólares de cada línea
  (`R9`), un solo cobro por línea, y el ✅ y los Bs de cada sobre calculados (`R10`,
  `R18`). La app todavía no escribe cobros: `save_operation` no los acepta.
- **Lo importado de julio a octubre** dice cómo son:
  - Unos 7 ingresos esperados al mes, y casi todos se cobran.
  - Todos llegan a una cuenta en bolívares y reparten exactamente los dólares esperados.
  - La mayoría van a uno o dos sobres; uno al mes, el grande, se reparte entre 6 y 12.
  - Cada línea del reparto va a un sobre del plan, y en 9 de cada 10 la fuente de fondos
    de ese sobre nombra el ingreso. Unas 6 de cada 10 reparten justo lo planeado; las
    demás, una parte, porque el sobre se llena con varios ingresos.
- **La v2** tenía una etiqueta de texto para la tasa («BCV», «paralelo»). Aquí no hace
  falta: la tasa sale de los dos montos.

## Decisiones (2026-10-21)

1. **«Cobrar» en Presupuesto:** cada ingreso ⏳ lo ofrece, en el mes que se mire, también
   el siguiente si el dinero llega antes. Abre la pantalla Cobrar.
2. **Lo que se pregunta:** la cuenta donde llegó (la última usada para ese ingreso, o la
   que se usa siempre), lo que llegó en su moneda y los dólares que se reconocen, con lo
   esperado ya puesto, como fue en todos los cobros importados. La app enseña la tasa que
   resulta y no la guarda (`R8`). En una cuenta en dólares no hay tasa: lo que llegó ya
   son dólares. Fecha y comisión, como en Registrar.
3. **El reparto, propuesto desde el plan:** los sobres cuya fuente de fondos nombra ese
   ingreso, cada uno con lo que le falta de lo planeado, sin pasar de lo que queda por
   repartir. Primero los que solo dependen de este ingreso y, con lo que sobre, los que
   comparte con otros: en noviembre, dos sobres compartidos y grandes se comían el cobro y
   dejaban sin nada a sobres que no tienen otra fuente. Se enseñan en el orden del
   presupuesto. Se cambia lo que haga falta; «Agregar otro sobre» para los demás; «Falta por
   repartir» y «Resto aquí», como en Registrar. Se reparte en dólares (`R9`).
4. **Los Bs de cada línea** salen de sus dólares a la tasa del cobro, redondeados; la
   última absorbe la diferencia, para que sumen justo lo que llegó (`R9`). Se ven antes
   de guardar.
5. **No se guarda descuadrado:** el reparto suma los dólares que se reconocen.
6. **Un cobro por ingreso esperado,** como ya exige la base. Si una fuente paga en dos
   partes, son dos líneas del presupuesto; crearlas es de M10.
7. **Corregir, borrar y deshacer** un cobro desde su hoja, como lo demás; al borrarlo, el
   ingreso vuelve a ⏳.
8. **En Inicio, «Para revisar»** gana una sola línea: «N ingresos por cobrar este mes», con
   lo que suman en dólares, que lleva a Presupuesto. No una por ingreso, que serían
   siete todo el mes.
9. **En la base:** una función `save_receipt` que guarda el cobro con su enlace y el valor
   en dólares de cada línea, comprueba su forma y que ese ingreso no tenga ya otro cobro.
   Restaurar acepta cobros.

## Pantallas

| Pantalla | Qué enseña | De dónde sale |
|---|---|---|
| **Cobrar** | El ingreso (emoji, nombre y lo esperado); la cuenta, lo que llegó, los dólares y la tasa; la fecha; el reparto con «Falta por repartir» y los Bs de cada línea; la comisión | Ingresos esperados, plan, cuentas y celdas |

Y «Cobrar» en Presupuesto y la línea de lo que falta por cobrar en Inicio.

## Hecho cuando

- Cobran en la app sus ingresos de unos días, en paralelo con el Excel, y el presupuesto
  queda como el del Excel: el ✅ de cada ingreso, lo que recibió cada sobre y las
  comprobaciones (`R12`).
- `npm run check` en verde, en local y en la CI; la base, también en la nube.

## Pasos

1. [x] **Plan aprobado** por el autor (2026-10-21).
2. [x] **Escribir en la base** (2026-10-21, también en la nube): guardar y restaurar un
   cobro, con sus pruebas (`R8`, `R9`, un cobro por ingreso, lo importado intocable).
3. [x] **Cobrar** (2026-10-21): la cuenta, lo que llegó, los dólares y la tasa.
4. [x] **El reparto** (2026-10-21, con el paso 3): propuesto desde el plan, con lo que
   falta y los Bs de cada línea.
5. [x] **Corregir, borrar y deshacer** un cobro (2026-10-21): corregir abre Cobrar como
   estaba, y al borrarlo el ingreso vuelve a ⏳.
6. [ ] **«Cobrar» en Presupuesto** y lo que falta por cobrar en Inicio.
7. [ ] **En los teléfonos:** lo usan unos días.

Cada paso termina con su commit y con un push, para probarlo en el teléfono.

## Tope de complejidad

- **Pantallas:** 1 nueva (Cobrar).
- **Datos:** una función para guardar cobros; ninguna tabla nueva.

## Fuera de M9

- Crear o cambiar los ingresos esperados y el plan del mes (M10).
- Repartir un cobro entre dos cuentas: todos llegan a una.
- Un cobro que no se reparte entero: hoy siempre se reparte todo.
- Una etiqueta para la tasa («BCV», «paralelo»).
