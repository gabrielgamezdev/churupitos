# M8 · Entre sobres y cuentas

- **Estado:** en planificación (desde 2026-10-21). Falta que el autor apruebe las
  decisiones.
- **Objetivo:** registrar desde la app los tres movimientos que todavía solo se hacen en
  el Excel (mover entre sobres, traspasar entre cuentas y cambiar de divisa) y cubrir un
  descubierto en dos toques. Con esto, todo lo del día a día se registra en la app; solo
  faltan los cobros (M9) y el mes (M10).

## Lo que hay en el Excel, en la base y en la v2

- **El Excel** los apunta como filas que van juntas: «X le presta a Y» o «sobrante de X
  a Y» en la hoja de una cuenta; un traspaso, una fila en la hoja de cada banco; un
  cambio, lo que sale en una y lo que entra en otra.
- **La base** ya tiene los tres tipos, con su forma (`docs/DOMINIO.md` §3, `R5`), y el
  importador los reconoce. La app todavía no los escribe: `save_operation` solo acepta
  gastos e ingresos (ADR 0008).
- **Lo importado de este año** dice cómo son: casi todos llevan **una salida y una
  entrada**.
  - Entre sobres: 327, siempre dentro de una cuenta; solo 3 con comisión.
  - Entre cuentas: 104; 91 con comisión, y en 64 cambia también el sobre.
  - Cambios de divisa: 11; 8 de un sobre a otro, y 3 repartidos entre dos a cuatro.
- **La v2** tenía «cubrir ahora» con lo que faltaba, que aquí se recupera. Su canje entre
  sobres en dos monedas sin mover cuentas no existe en el Excel, y no entra.

## Decisiones (propuestas)

1. **Un solo formulario, «Mover»**, como tercera opción de Registrar: «Gasto · Ingreso ·
   Mover». Se dice de dónde sale (cuenta y sobre) y adónde llega (cuenta y sobre), y el
   tipo lo deduce la app: la misma cuenta es entre sobres; otra de la misma moneda,
   entre cuentas; otra moneda, un cambio. No hace falta saber cómo se llama cada cosa.
2. **La cuenta de destino empieza siendo la de origen**, porque mover entre sobres de
   una cuenta es lo más frecuente; se cambia para un traspaso o un cambio. Los sobres no
   vienen elegidos, como en Registrar: los dos se eligen con sus botones, con lo que
   tiene cada uno en su cuenta.
3. **Una salida y una entrada**, que es lo que tienen casi todos. Un cambio repartido
   entre varios sobres se registra como varios cambios, o como uno y después un
   movimiento entre sobres.
4. **El cambio de divisa:** se escriben los dos montos, lo que sale y lo que llega, como
   en el Excel. La app enseña la tasa que resulta («tasa 245,50») y no la guarda: sale de
   los dos montos, como la de un cobro (`R8`).
5. **La comisión**, plegada como en Registrar: sale de la cuenta de origen y, si no se
   cambia, de su sobre (`R16`, `D4`).
6. **«Cubrir» un descubierto:** cada sobre en descubierto, en «Para revisar» y en la
   pantalla del sobre, ofrece «Cubrir». Abre Mover con el destino y el monto puestos (lo
   que falta para llegar a cero) y el origen en la misma cuenta, para elegir de qué sobre
   sale.
7. **Corregir, borrar y deshacer** también estos tres, desde su hoja y con el aviso,
   como los gastos y los ingresos. Lo importado, hasta el corte, no.
8. **Los préstamos que se quieren recordar** siguen siendo un movimiento simple (`D7`):
   si hace falta, la deuda se agrega aparte. Nada nuevo aquí.
9. **Las reglas, en la base:** `save_operation` y `restore_operation` aceptan los tres
   tipos, y la forma de cada uno la comprueba `assert_operation_shape`, como al importar.

## Pantallas

| Pantalla | Qué enseña | De dónde sale |
|---|---|---|
| **Registrar · Mover** | Monto; desde (cuenta y sobre) y hacia (cuenta y sobre), con lo que tiene cada sobre; en un cambio, lo que llega y la tasa; concepto, fecha y comisión; cómo quedan los dos sobres | Cuentas, celdas y `envelope_usage` |

Y «Cubrir» en «Para revisar» y en la pantalla de un sobre.

## Hecho cuando

- Registran en la app sus movimientos entre sobres, traspasos y cambios durante unos
  días, en paralelo con el Excel, y los saldos coinciden.
- Un descubierto se cubre en dos toques desde Inicio.
- `npm run check` en verde, en local y en la CI; la base, también en la nube.

## Pasos

1. [ ] **Plan aprobado** por el autor.
2. [ ] **Escribir en la base:** guardar y restaurar los tres tipos, con sus pruebas (la
   forma de cada uno y lo importado intocable). En local y en la nube.
3. [ ] **Mover:** el formulario, con el tipo deducido, la comisión y cómo quedan.
4. [ ] **El cambio de divisa:** lo que llega y la tasa.
5. [ ] **Corregir, borrar y deshacer** los tres.
6. [ ] **«Cubrir»**, en «Para revisar» y en el sobre.
7. [ ] **En los teléfonos:** lo usan unos días.

Cada paso termina con su commit y con un push, para probarlo en el teléfono.

## Tope de complejidad

- **Pantallas:** ninguna nueva; Registrar gana «Mover».
- **Datos:** ninguna tabla nueva; las funciones que escriben aceptan tres tipos más.

## Fuera de M8

- Un cambio repartido entre varios sobres en una sola operación.
- Llevar la cuenta de los préstamos entre sobres (`D7`).
- Cobrar y repartir un ingreso (M9) y el mes (M10).
- El canje entre sobres en dos monedas sin mover cuentas de la v2.
