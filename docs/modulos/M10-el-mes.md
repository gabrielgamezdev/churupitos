# M10 · El mes

- **Estado:** en curso (desde 2026-10-21). El plan está aprobado; se construye mientras
  M8 y M9 se prueban en los teléfonos, por decisión del autor.
- **Objetivo:** preparar desde la app el presupuesto del mes siguiente, a partir del
  último, y cambiar el de cualquier mes: los ingresos esperados y el plan de cada sobre,
  con el cuadre a la vista. Es el último módulo antes del corte: el primer
  mes de la app se prepara así.

## Lo que hay en el Excel, en la base y en la v2

- **El Excel** prepara el libro del mes siguiente antes de que empiece, para planificarlo:
  copia el anterior y cambia lo que haga falta. Suele ser hacia el día 25; empezado el
  mes, casi nunca se cambia. El presupuesto tiene los ingresos
  esperados (nombre y $) y la «Distribución»: lo planeado en $ para cada sobre, la fuente
  de los fondos y la acción.
- **La base** ya tiene dónde guardarlo (ingresos esperados y líneas del plan, un sobre por
  línea y mes) y lo calcula todo lo demás: el ✅, los Bs de cada sobre y el cuadre
  (`R10`, `R12`, `R18`). La app todavía no escribe ninguno de los dos.
- **Lo importado de enero a noviembre** dice cómo cambia un mes:
  - Entre 6 y 8 ingresos esperados, siempre con los mismos nombres: ninguno desaparece de
    un mes a otro. Desde junio cambian uno o dos al mes (el monto, o un pago de más).
  - El plan tiene 20 de los 25 sobres, los mismos desde abril. Cada mes repite el monto
    en la mitad o más de las líneas (en noviembre, 18 de 20), y casi todas su fuente y su
    acción, tal cual. Los sobres a $0 se quedan en el plan: hasta 5 al mes.
  - Desde febrero, el plan suma justo lo esperado todos los meses (`R12` a).
  - La fuente de fondos son nombres de ingresos del mes en 9 de cada 10 líneas, a veces
    varios. Las acciones son 7 en todo el histórico, y una sola es casi la mitad.
- **Las deudas y los saldos no se abren**: las deudas son una lista seguida (`D9`) y cada
  celda arrastra sola su saldo (`R7`). Abrir un mes es solo preparar su presupuesto.

## Decisiones (2026-10-21)

1. **«Preparar diciembre»:** en Presupuesto, en el último mes que tiene presupuesto, un
   botón abre «Planear» con una copia de ese mes: los ingresos (nombre, emoji, monto y
   orden) y el plan (sobre, monto, fuente y acción), todo ⏳. No guarda nada hasta
   «Guardar». Solo el mes siguiente al último: no se saltan meses.
2. **El presupuesto que trae el Excel también se cambia desde la app** (decisión del
   autor): cualquier mes, importado o no. Los movimientos importados siguen sin
   corregirse. Hasta el corte se hace en paralelo con el Excel, y al recargar manda el
   Excel: lo cambiado en la app se pierde, como lo registrado.
3. **«Planear», una pantalla para el mes entero,** como se edita la hoja del Excel: arriba
   los ingresos, debajo el plan en el orden del presupuesto, y pegado abajo el cuadre y
   «Guardar». Se guarda todo junto, y se puede deshacer. En cualquier mes, Presupuesto
   ofrece «Editar» y abre la misma pantalla.
4. **Los ingresos:** nombre y $ de cada uno; «Agregar ingreso» al final; quitar uno que
   siga ⏳. Uno cobrado se puede cambiar, no quitar: su cobro se borra antes.
5. **El plan:** el $ de cada sobre, que es lo que cambia cada mes, a la vista. La fuente y
   la acción, plegadas debajo («Bono · Cambiar a USDT»), porque casi nunca cambian: la
   fuente, con los ingresos del mes como botones para añadirlos o quitarlos, que es lo
   que lee la propuesta de Cobrar; la acción, entre las ya usadas o escrita. «Agregar
   sobre» para los que no están; quitar uno es dejarlo en $0, como hace el Excel.
6. **El cuadre mientras se planea:** lo que se espera, lo planeado y «Falta por planear»
   (o «Planeado de más»), en $, como «Falta por repartir» en Cobrar. Es un aviso: se
   puede guardar descuadrado, porque un mes se planifica en varios ratos (`R12`).
7. **En Inicio,** desde el día 25, si el mes siguiente no tiene presupuesto, «Para
   revisar» dice «Diciembre sin preparar» y lleva a Presupuesto.
8. **En la base:** quién escribió cada ingreso esperado y cada línea del plan desde la
   app, también al cambiar uno importado. Una función guarda un mes entero: se niega a
   saltar meses y a quitar un ingreso cobrado. Otra borra un mes preparado, para
   deshacerlo: se niega si trae algo del Excel o ya tiene cobros. La recarga desde los
   Excels cuenta todo eso como registrado en la app: hay que pedir que se borre.

## Pantallas

| Pantalla | Qué enseña | De dónde sale |
|---|---|---|
| **Planear** | Los ingresos del mes (nombre y $); el plan de cada sobre ($, fuente y acción, plegadas); el cuadre y «Guardar» | Ingresos esperados, plan y sobres |

Y en Presupuesto, «Preparar diciembre» o «Editar»; en Inicio, el mes sin preparar.

## Hecho cuando

- Preparan en la app el mes siguiente, en paralelo con el Excel, y queda como el del
  Excel: los mismos ingresos y el mismo plan, cuadrado (`R12` a). Lo cobran con M9.
- `npm run check` en verde, en local y en la CI; la base, también en la nube.

## Pasos

1. [x] **Plan aprobado** por el autor (2026-10-21).
2. [x] **Escribir en la base** (2026-10-21, también en la nube): guardar un mes y borrar
   uno preparado, con sus pruebas (sin meses saltados, un ingreso cobrado no se quita, el
   candado de la recarga, `R19`).
3. [x] **Planear** (2026-10-21): los ingresos, el plan y el cuadre, y guardar, con
   «Deshacer». Tocar un ingreso en la fuente solo añade o quita su nombre: hay fuentes con
   abreviaturas y emojis que no son el nombre de ningún ingreso.
4. [x] **Preparar y editar** desde Presupuesto (2026-10-21): «Editar» en cada mes y, al
   final del último, «Preparar diciembre».
5. [x] **Inicio:** el mes siguiente sin preparar (2026-10-21), desde el 25, o enseguida si
   el mes en curso no tiene presupuesto. Lleva directo a Planear.
6. [ ] **En los teléfonos:** preparan el mes siguiente.

Cada paso termina con su commit y con un push, para probarlo en el teléfono.

## Tope de complejidad

- **Pantallas:** 1 nueva (Planear).
- **Datos:** el autor en dos tablas y dos funciones; ninguna tabla nueva.

## Fuera de M10

- Crear, archivar y borrar sobres y cuentas: es M11, antes del corte.
- Reordenar los ingresos o los sobres del plan, y elegir el emoji de un ingreso nuevo.
- Un plan «tipo» aparte del mes anterior, o proponer el plan desde los ingresos.
