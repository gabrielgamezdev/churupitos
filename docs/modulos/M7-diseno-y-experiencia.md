# M7 · Diseño y experiencia

- **Estado:** en curso (desde 2026-10-20). El plan está aprobado.
- **Objetivo:** que registrar sea rápido y agradable, que corregir o borrar algo no
  obligue a buscarlo, y que la app se sienta cuidada y no una herramienta interna. Es lo
  que pidieron al usar M6: «un formulario más bonito» y «poder borrar y editar alguna
  transacción».

## De dónde sale

De la investigación del 2026-10-20, fuera de git en `privado/investigacion/diseno/`
(`sintesis.md` resume todo): una revisión de la app, las respuestas de cinco IA a un mismo
encargo, una propuesta visual hecha con Claude Design, una investigación de apps de
presupuesto por sobres y de finanzas, y dos verificaciones, una técnica (teclados en
Android, hojas inferiores, el atrás de Android) y otra contra este código.

**Lo que no se toca**, porque todas las fuentes coinciden en que funciona: el modelo de
sobres y celdas, Bs y $ nunca sumados ni convertidos, el libro por día con su restante,
los sobres en cero plegados, «Otro» aparte, el descubierto como algo normal en ámbar, la
comisión como asiento aparte, Geist con números tabulares, el verde de marca, las esquinas
de 16 px y casi sin sombras. La paleta actual ya pasa AA en los dos temas: cambia el uso
del color, no sus valores.

## Decisiones (2026-10-20)

1. **La barra:** Inicio · Sobres · **＋** · Presupuesto · Deudas. El ＋ del centro abre
   Registrar con la cuenta o el sobre de la pantalla en la que se está. Ajustes se abre
   desde Inicio. Desaparecen los botones flotantes, que tapaban la columna de importes:
   «Agregar» pasa a la cabecera de Deudas.
2. **Un movimiento se abre en una hoja**, desde cualquier lista (Inicio, el libro de una
   cuenta o de un sobre, Movimientos): sus asientos, quién lo registró y cuándo, y
   «Corregir» y «Borrar». Lo importado explica que, hasta el corte, se corrige en el
   Excel. El atrás de Android cierra la hoja. Nada de deslizar la fila.
3. **Un aviso con «Deshacer»** después de guardar, corregir, borrar y marcar una deuda
   pagada: «Gasto guardado · Comida queda en Bs X · Deshacer». Uno a la vez, unos 10 s,
   se pausa al tocarlo.
4. **Borrar no pregunta:** se deshace. Para que lo borrado vuelva igual (su autor y su
   sitio en el día, `R14`) la base gana funciones para restaurar. Solo pediría
   confirmación algo que borre varias cosas a la vez; hoy no hay nada así.
5. **Registrar:**
   - **el monto, protagonista**: la cifra más grande, con el **teclado del sistema solo
     con números** y el monto **escrito como en un cajero**: cada dígito entra por la
     derecha («0,00 → 0,01 → 0,12 → 1,23») y borrar lo saca por la derecha. Nunca hace
     falta la coma, y los miles se ponen solos;
   - la **cuenta recordada** (la de la pantalla de la que se viene o la última de esa
     persona); la moneda sale de la cuenta;
   - **los sobres como botones** con su emoji y lo que tienen en esa cuenta (la celda):
     primero los más usados en esa cuenta en los últimos 60 días, fijados al abrir, y
     «Más» con todos en el orden del presupuesto y «Otro» al final. Ninguno viene elegido;
   - la fecha en «Hoy · Ayer · Otro día»; la comisión plegada, sin proponer la última
     (`D4`); al repartir, «Falta por repartir» y «Resto aquí»;
   - lo que queda en la celda, en una línea; «Guardar gasto · Bs X» siempre a la vista,
     también con el teclado abierto.
6. **El color:** los gastos en el color del texto con «−»; solo los ingresos en verde con
   «+». El rojo queda para errores, borrar y deudas vencidas. **Bs en azul y $ en
   violeta**, solo en el símbolo, el chip y el borde de su tarjeta, nunca en la cifra.
   «Otro» pasa a gris neutro con borde punteado (su azul de hoy se confundiría con el de
   Bs). Los ✅ y ⏳ del Excel se quedan, dentro de una pastilla con texto: «✅ Cobrado».
   Todo se cambia primero en `docs/DESIGN_SYSTEM.md` y en los tokens, a la vez.
7. **Inicio:** «Últimos registrados» (los cinco últimos de los dos, con quién los
   registró) y un bloque tranquilo, sin tono de alarma, con los sobres en descubierto y
   las deudas que vencen en 7 días o menos. Los ingresos por cobrar se suman en M9,
   cuando la app cobre: antes darían falsos ⏳.
8. **Presupuesto:** una barra por sobre de lo entregado frente al plan, y otra del mes de
   lo cobrado frente a lo esperado, con la cifra al lado.
9. **Movimientos:** una pantalla con todos los movimientos del mes de todas las cuentas,
   con filtros (moneda, cuenta, sobre, quién) y búsqueda por concepto. Se llega desde
   «Ver todos» en Inicio.

## Pasos

Cada uno se prueba en los teléfonos antes del siguiente.

1. [x] **Plan aprobado** por el autor (2026-10-20).
2. [x] **La barra** (2026-10-20): ＋ al centro con el contexto de la pantalla, Ajustes
   desde Inicio y sin botones flotantes.
3. [x] **La hoja de un movimiento** desde los libros, y **«Últimos registrados»** en Inicio
   (2026-10-20). El ingreso cobrado del Presupuesto sigue desplegando su reparto en la fila.
4. [x] **El aviso con «Deshacer»** al guardar, corregir y marcar o desmarcar una deuda
   (2026-10-20, la base también en la nube), y al agregar o corregir una deuda.
   Deshacer un «No está pagada» la vuelve a pagada con el día que tenía.
5. [x] **Restaurar en la base** (operaciones y deudas) y **borrar sin preguntar**, con
   «Deshacer» (2026-10-20, también en la nube). Borrar devuelve lo que borró, y
   restaurarlo lo deja igual: autor, cuándo se registró y su sitio en el día.
6. [x] **Registrar, primera parte** (2026-10-20): el monto como cajero con el teclado
   numérico (también en Deudas), «Guardar» visible sobre el teclado, la cuenta
   recordada, la fecha en botones y la comisión plegada.
7. [x] **Registrar, segunda parte** (2026-10-20, la base también en la nube): los
   sobres como botones ordenados por uso (`envelope_usage`), lo que queda en la celda en
   una línea, y repartir el monto de arriba con «Resto aquí» y «Falta por repartir».
8. [x] **El color y las pastillas** (2026-10-20): `money-out` pasa a ser `danger`.
9. [x] **Inicio** (2026-10-20): «Para revisar», con los descubiertos y las deudas que
   vencen en 7 días o ya vencieron.
10. [x] **Las barras del Presupuesto** (2026-10-20).
11. [x] **Movimientos** (2026-10-20, la base también en la nube): el mes de todas las
   cuentas, con búsqueda y filtros que quedan en la dirección, y quién registró cada
   movimiento también en los libros.
12. [x] **Sugerencias de concepto** al registrar, con su sobre (2026-10-20, la base también
    en la nube: `concept_usage`).
13. [ ] **En los teléfonos:** lo usan unos días y cuentan los toques de un gasto típico.

Cada paso termina con su commit y con un push, para probarlo en el teléfono.

## Hecho cuando

- Un gasto típico se registra en 3 toques más los números, y un movimiento se corrige o
  se borra en 1 o 2 toques desde Inicio o desde cualquier libro.
- Se ve bien en claro y en oscuro, sin conexión enseña lo último guardado, y a los dos les
  gusta más que antes.
- `npm run check` en verde, en local y en la CI.

## Tope de complejidad

- **Pantallas:** 1 nueva (Movimientos), más la hoja de un movimiento y el aviso.
- **Datos:** funciones para restaurar operaciones y deudas, dos para el uso de los sobres
  y de los conceptos, el día de pago en `set_debt_paid` y quién registró en las vistas del
  libro. Ninguna tabla nueva.

## Fuera de M7

- Las cuotas como «3 de 6»: con el modelo de hoy cada cuota es una deuda suelta, y las
  pagadas de meses anteriores no están en la base. Es un cambio de dominio.
- Mover dinero entre sobres y «Cubrir» un descubierto (M8).
- Cobrar un ingreso esperado, su tasa, y los ingresos por cobrar en Inicio (M9).
- Deslizar para borrar, un teclado propio de la app y proponer la última comisión.
- La vibración al guardar y elegir el tema: más adelante, en Ajustes.
