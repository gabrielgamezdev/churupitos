# M11 · Sobres y cuentas

- **Estado:** en curso (desde 2026-10-21). El plan está aprobado; se construye mientras
  M8, M9 y M10 se prueban en los teléfonos, por decisión del autor.
- **Objetivo:** mantener la app limpia de sobres y cuentas que ya no se usan, sin perder
  su historia, y poder crear los nuevos desde la app. Es lo último antes del corte:
  después, nada llega ya del catálogo del importador.

## Lo que hay en el Excel, en la base y en la v2

- **El Excel** tiene una hoja por cuenta y los sobres en la columna «Fuente» y en la
  «Distribución». Uno que deja de usarse desaparece del libro del mes siguiente; uno
  nuevo aparece. Desde abril no ha cambiado ninguno.
- **La base** tiene 25 sobres y 11 cuentas, todos con historia: hoy no hay nada que se
  pueda borrar. Los nombres, los emojis y el orden vienen del catálogo del importador,
  y la app todavía no crea ni cambia ninguno.
- **Con el criterio del autor** (activo es lo que está en los Excels de octubre o
  noviembre):
  - 4 sobres quedarían archivados. Los cuatro están en cero y no se usan desde marzo o
    abril.
  - 2 cuentas no tienen movimientos desde octubre, pero tienen dinero: una cuenta que
    nadie toca no genera movimientos, porque su saldo pasa solo de un mes a otro
    (`R7`). Siguen en el Excel y se quedan activas.
- **«Otro»** es un sobre especial (`R11`): no se archiva ni se borra.

## Decisiones (2026-10-21)

1. **«Sobres y cuentas», en Ajustes:** una pantalla con los sobres, en el orden del
   presupuesto, y las cuentas, por moneda. Al final de cada lista, los archivados,
   plegados. «Agregar sobre» y «Agregar cuenta».
2. **Crear y cambiar:** un sobre con su nombre y su emoji; una cuenta con su nombre y su
   moneda. Lo nuevo va al final: del presupuesto, antes de «Otro», o de su moneda. El
   nombre y el emoji se cambian cuando se quiera; la moneda de una cuenta no, porque
   cada movimiento está en la moneda de su cuenta (`R3`).
3. **Borrar solo lo que no tiene nada:** ni movimientos ni plan en ningún mes. Es para lo
   creado sin querer. Se puede deshacer.
4. **Archivar lo que tiene historia,** solo si está en cero en todas sus celdas: si
   tuviera dinero, ese dinero dejaría de verse y las cuentas ya no cuadrarían con los
   sobres. Un sobre tampoco se archiva si tiene plan en el mes en curso o en uno
   siguiente: primero se deja en $0. La pantalla dice por qué no se puede.
5. **Archivado** no aparece en Registrar, Mover ni Cobrar, ni al planear (ni en
   «Agregar un sobre al plan» ni al copiar el mes), ni en las listas de Sobres y de cada
   moneda, ni en las cuentas que cuenta Inicio. Su historia sigue: los movimientos de
   antes lo nombran igual, su pantalla se abre desde los archivados, y se puede
   reactivar. La base no acepta movimientos nuevos en un sobre o una cuenta archivados.
6. **Hasta el corte,** al recargar desde los Excels se archivan solos los sobres y las
   cuentas que están en cero y no se usaron ni se planearon desde el mes en curso del
   Excel: así la recarga no devuelve los viejos. Lo creado, cambiado o archivado en la app
   cuenta como registrado en la app: hay que pedir que se borre.
7. **En la base:** quién creó o cambió cada sobre y cada cuenta desde la app, y cuándo se
   archivó. Una función guarda un sobre (crearlo, cambiarlo, archivarlo o reactivarlo) y
   otra lo borra; lo mismo para las cuentas. Las reglas de borrar y archivar viven allí.

## Pantallas

| Pantalla | Qué enseña | De dónde sale |
|---|---|---|
| **Sobres y cuentas** | Los sobres y las cuentas, con los archivados plegados al final | Sobres, cuentas y sus saldos |
| **Sobre** y **Cuenta** | Nombre y emoji, o nombre y moneda; «Archivar», «Reactivar» o «Borrar», o por qué no se puede | Lo mismo |

## Hecho cuando

- Los 4 sobres viejos ya no aparecen al registrar ni al planear, y su historia se sigue
  viendo. Un sobre creado de prueba se borra sin dejar rastro.
- `npm run check` en verde, en local y en la CI; la base, también en la nube.

## Pasos

1. [x] **Plan aprobado** por el autor (2026-10-21).
2. [x] **Escribir en la base** (2026-10-21, también en la nube): guardar, archivar y
   borrar sobres y cuentas, con sus pruebas (en cero para archivar, nada para borrar, «Otro»
   intocable, nada nuevo en lo archivado, el candado de la recarga, `R20`).
3. [ ] **El importador:** archiva lo que no está en el Excel del mes en curso.
4. [ ] **Sobres y cuentas:** la lista, crear, cambiar, archivar y borrar, con «Deshacer».
5. [ ] **Lo archivado fuera de las listas:** Registrar, Mover, Cobrar, Planear, Sobres,
   cada moneda e Inicio.
6. [ ] **En los teléfonos.**

Cada paso termina con su commit y con un push, para probarlo en el teléfono.

## Tope de complejidad

- **Pantallas:** 3 nuevas, pequeñas (la lista y los dos formularios).
- **Datos:** el autor y el archivo en dos tablas y cuatro funciones; ninguna tabla nueva.

## Fuera de M11

- Reordenar sobres y cuentas.
- Cambiar la moneda de una cuenta.
- Juntar dos sobres o dos cuentas en uno.
- Elegir el emoji de un ingreso esperado.
