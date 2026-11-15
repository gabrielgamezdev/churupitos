# M14 · Lo que pidió el uso, II

- **Estado:** en curso (desde 2026-11-15). El plan está aprobado.
- **Objetivo:** lo que salió de dos semanas de uso: mover todo lo de un sobre sin escribir
  la cifra, que el teclado no se abra solo al volver a la app, que la fuente de fondos no
  ignore un ingreso sin avisar, que las acciones del plan no salten al elegir una, y que
  Cobrar sepa cuánto pone cada fuente en un sobre que tiene dos.

## Lo que hay

- **Mover:** 7 de los 38 movimientos de noviembre dejaron su sobre de origen en cero: la
  cifra exacta se escribió a mano.
- **El teclado:** al ir al banco a revisar y volver, el teclado se abre otra vez, aunque
  solo se quería mirar. El campo del monto sigue elegido, y Android lo reabre.
- **La fuente de fondos** es texto, y Cobrar busca en él el nombre de cada ingreso. Lo que
  no es un nombre se ignora sin avisar: las abreviaturas que venían del Excel, y el nombre
  viejo de un ingreso renombrado, que se quedó en un sobre.
- **Las acciones** son texto y se eligen entre las que ya tiene el plan, ordenadas por uso:
  al elegir una cambia el uso, y saltan de sitio. Dos dicen lo mismo: «Enviar de inmediato»
  y «Pagar de inmediato».
- **Un sobre con dos fuentes:** Cobrar le da lo que le falta del ingreso que llega, sin
  saber que una parte vendrá de la otra fuente. Al cobrar el Bono, un sobre compartido se
  llevó también lo que iba a poner su otra fuente, y otro se quedó corto. Se corrigió a
  mano.
- **Esa parte se puede deducir del plan.** Probado con todos los planes desde marzo:
  siempre se pudo, y en noviembre da justo lo que se corrigió a mano.

## Decisiones (2026-11-15)

1. **«Todo» en Mover:** bajo el monto, cuando ya se eligió de qué sobre sale y tiene algo,
   rellena el monto con lo que tiene ese sobre en esa cuenta. Al corregir no sale.
2. **Al salir de la app se suelta el campo elegido,** en toda la app: al volver, lo escrito
   sigue ahí y sin teclado. Para escribir, se toca el campo.
3. **La fuente avisa:** lo que no es el nombre de ningún ingreso del mes sale marcado debajo
   («Tarjeta no es ningún ingreso de noviembre»). No impide guardar.
4. **Renombrar un ingreso corrige las fuentes:** al guardar, el nombre nuevo sustituye al
   viejo en la fuente de los sobres de ese mes.
5. **Las acciones no saltan:** su orden se fija al abrir el plan, y una nueva va al final.
   En el plan de noviembre, que es el que se copia, «enviar de inmediato» pasa a ser «pagar
   de inmediato»; los meses pasados se quedan como estaban.
6. **La parte de cada fuente se deduce, no se guarda:** un sobre con una sola fuente sin
   fijar se lleva lo que le falta de ella; un ingreso con un solo sobre sin fijar le da lo
   que le queda; y así hasta fijarlas todas. Si el plan no suma lo esperado, o dos ingresos
   llenan los mismos dos sobres, no se deduce y Cobrar propone como hasta ahora.
7. **Cobrar propone con esa parte:** a cada sobre, su parte del ingreso que llega, sin pasar
   de lo que le falta ni de lo cobrado.
8. **El plan la enseña:** un sobre con dos fuentes dice cuánto pone cada una («Bono $50 ·
   Tarjeta $70»).
9. **En la base, nada.** Cambia el dominio: la regla `R22` y lo que la app no hace (§7).

## Pantallas

Ninguna nueva: cambian Mover, el plan (Presupuesto y su edición) y Cobrar.

## Hecho cuando

- Mueven todo lo de un sobre sin escribir la cifra.
- Vuelven a la app desde el banco y el teclado no se abre.
- Una fuente que no nombra un ingreso se ve, y renombrar uno no deja ninguna atrás.
- Al cobrar, la propuesta trae para cada sobre compartido lo que antes se corregía a mano.
- `npm run check` en verde, en local y en la CI.

## Pasos

1. [x] **Plan aprobado** por el autor (2026-11-15).
2. [ ] **«Todo» en Mover.**
3. [ ] **El teclado al volver.**
4. [ ] **Fuentes y acciones del plan:** el aviso, renombrar, el orden fijo y una sola «pagar
   de inmediato».
5. [ ] **La parte de cada fuente:** deducirla, enseñarla en el plan y usarla en Cobrar
   (`R22`).
6. [ ] **En los teléfonos.**

Cada paso termina con su commit y con un push, para probarlo en el teléfono.

## Tope de complejidad

- **Pantallas:** ninguna nueva.
- **Datos:** nada en la base; un cambio de texto en las acciones del plan de noviembre.

## Fuera de M14

- Escribir a mano la parte de cada fuente, guardarla y copiarla a los meses siguientes
  hasta que se cambie: está en «Más adelante» de `docs/ESTADO.md`, por si la deducción no
  basta.
- Rellenar Registrar desde una captura: es M15.
