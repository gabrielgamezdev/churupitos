# M12 · Después del corte

- **Estado:** cerrado el 2026-11-07 (empezó el 2026-11-01). Congelado: lo que siga vigente
  vive en `docs/DOMINIO.md`, `docs/DESIGN_SYSTEM.md`, el ADR 0009, el código y las
  migraciones.
- **Resultado:** está en la nube y en los teléfonos desde el corte. En su primera semana no
  hizo falta abrir un mes ni corregir nada importado, así que eso sigue sin usarse de
  verdad: lo que aparezca al usarlo se trata como una incidencia.
- **Objetivo:** desde el corte la base es la fuente y no hay Excel detrás. Que nada la
  pueda vaciar por accidente, que también lo importado se pueda corregir, que los meses
  pasados no se toquen sin querer y que haya copias para recuperarla.

## Lo que hay

- **La recarga desde los Excels** se niega si hay datos escritos desde la app, pero se
  puede pedir igual (`--discard-app-data`). Hasta el corte era lo correcto; ahora, en la
  nube, borraría noviembre.
- **Lo importado no se corrige ni se borra desde la app** («hasta el corte vive allí»):
  `save_operation`, `save_receipt`, `delete_operation` y `restore_operation` lo niegan. El
  presupuesto (M10), las deudas (M6) y los sobres y cuentas (M11) ya se cambian.
- **Ningún mes está cerrado:** cualquier movimiento de cualquier fecha se registra,
  corrige o borra. El 2026-11-01 hubo que corregir septiembre y octubre a propósito; un
  toque equivocado podría cambiar un mes ya cuadrado sin que nadie lo note.
- **Sin copias:** hasta el corte, el respaldo eran los Excels. El primer día del corte se
  hizo una copia a mano, solo de lo registrado en la app.

## Decisiones (2026-11-01)

1. **El corte, fijo en la base:** una marca con su fecha, que se pone una sola vez en la
   nube. Con ella, la recarga se niega siempre, también pidiéndolo. La base local no la
   lleva: se sigue recargando para desarrollar.
2. **Lo importado se corrige y se borra como lo demás,** desde las mismas pantallas y
   con «Deshacer». Queda quién lo cambió. Los ajustes del arrastre siguen sin tocarse:
   la app no registra ajustes.
3. **Meses cerrados** (`R21`, en la base):
   - Un mes se cierra solo el **día 5 del mes siguiente**, en hora de Caracas (`R13`):
     quedan unos días para lo que se anota tarde.
   - En un mes cerrado no se registra, corrige, borra ni deshace un movimiento, no se
     cobra y no se planea. Mover un movimiento de fecha pide abiertos los dos meses.
   - **«Abrir octubre»** lo abre para corregir algo a propósito. Se vuelve a cerrar solo
     al terminar ese día, o antes con «Cerrar».
   - Las deudas no son de un mes, y archivar un sobre o una cuenta tampoco: no se cierran.
4. **En la app:** lo que está en un mes cerrado lo dice («Octubre está cerrado») en vez de
   ofrecer Corregir o Borrar, con «Abrir octubre» al lado. Mientras un mes esté abierto
   a propósito, Inicio lo recuerda en «Para revisar».
5. **Copias de seguridad,** propias:
   - Una orden copia la nube entera, tabla por tabla, en `privado/respaldos/`, fuera de
     git. Otra la restaura en la base local, para comprobar que sirve; la misma, en una
     emergencia, la devolvería a la nube.
   - La base guarda cuándo fue la última copia, y Inicio la pide cuando pasa un mes.
   - Con su ADR: por qué propias, en la computadora del autor, y no en la CI.

## Pantallas

Ninguna nueva: «Abrir octubre» y «Cerrar» van donde se topa con el mes cerrado (la hoja
de un movimiento, Registrar y Presupuesto), y los recordatorios, en «Para revisar».

## Hecho cuando

- Corrigen algo de un mes cerrado abriéndolo, y se vuelve a cerrar solo.
- Corrigen un movimiento importado desde la app.
- La recarga de la nube se niega, aun pidiéndolo.
- Hay una copia de la nube en `privado/respaldos/` que se restauró en local y cuadra.
- `npm run check` en verde, en local y en la CI; la base, también en la nube.

## Pasos

1. [x] **Plan aprobado** por el autor (2026-11-01).
2. [x] **El corte en la base** (2026-11-01): la marca, la recarga que se niega, y lo
   importado que se corrige como lo demás, con sus pruebas.
3. [x] **Meses cerrados en la base** (2026-11-01, con el paso 2; `R21`): el cierre del día
   5, abrir y cerrar, y cada escritura que lo respeta, con disparadores sobre los
   movimientos y el presupuesto, que lo cumplen vengan de la función que vengan.
4. [x] **Meses cerrados en la app** (2026-11-01): lo que no se puede tocar lo dice,
   «Abrir octubre» y el recordatorio en Inicio. Desde el corte, la hoja de lo importado
   ofrece Corregir y Borrar.
5. [x] **Copias de seguridad** (2026-11-01): copiar, restaurar en local, el recordatorio y su
   ADR (0009). La primera copia de la nube se restauró en local y cuadró: las filas de
   cada tabla y el saldo de cada cuenta.
6. [x] **En los teléfonos** (2026-11-07, por decisión del autor). Todo está en la nube desde
   el 2026-11-01: las migraciones,
   la marca del corte (`npm run db:cutover`) y una copia anotada en la base.

Cada paso termina con su commit y con un push, para probarlo en el teléfono.

## Tope de complejidad

- **Pantallas:** ninguna nueva.
- **Datos:** la marca del corte, los meses abiertos a propósito y la fecha de la última
  copia; quién cambió cada movimiento.

## Fuera de M12

- Copias automáticas en la nube: en un repositorio público, las de la CI las podría
  descargar cualquiera, y un servicio aparte choca con la regla 7.
- Cerrar un mes a mano antes del día 5.
- Un historial de cada cambio, con lo que había antes.
