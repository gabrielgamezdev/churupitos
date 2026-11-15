# M15 · Registrar desde una captura

- **Estado:** en curso (desde 2026-11-15). El plan está aprobado.
- **Objetivo:** registrar un gasto desde la captura del pago sin copiar a mano lo que ya
  dice: la app lee la imagen en el propio teléfono y rellena Registrar; la persona revisa,
  elige el sobre y guarda.

## Lo que hay

- **Registrar es copiar la captura:** el monto, la fecha y la cuenta del pago ya están en
  ella, y se escriben otra vez a mano.
- **La prueba del 2026-11-07:** Tesseract.js en Chrome, sin que la imagen saliera del
  dispositivo, sacó bien el monto y la fecha de 5 capturas de 4 bancos, pasándolas antes
  a grises y subiendo el contraste. En una computadora tardó menos de un segundo; en un
  teléfono no se midió.
- **La cuenta no sale del nombre del banco:** hay dos cuentas del mismo banco, y uno no
  pone número de cuenta en su captura. Los otros tres ponen los últimos dígitos de la de
  origen, que sale antes que la de destino.
- **El concepto casi siempre dice «pago»,** pero la persona que paga puede escribir uno
  que sirva.

## Decisiones (2026-11-15)

1. **«Leer una captura» en Registrar:** abre la galería del teléfono; la app lee la imagen y
   rellena el monto, la fecha, la cuenta y el concepto. El sobre lo elige la persona, y
   nunca se guarda solo.
2. **Se lee en el teléfono, sin servicios:** la captura no sale de él, por privacidad y
   por la regla 7 (ADR 0010). Tampoco se guarda: solo existe mientras se registra.
3. **El lector se baja la primera vez que se usa** (unos 5 MB), no al instalar la app ni
   con cada versión nueva, y queda guardado en el teléfono.
4. **Lo que no se encuentra no se inventa:** se dice («No se encontró la fecha») y el campo
   queda como estaba. La captura se ve en pequeño arriba, para comparar.
5. **La cuenta, por lo que dice su captura:** cada cuenta guarda en la base lo que la
   delata (sus últimos dígitos o una palabra), y gana la primera que aparezca. Si no se
   reconoce ninguna, queda la que Registrar pone siempre. Se mejora poco a poco: si una
   captura elige mal, se ajustan las palabras de esa cuenta desde Ajustes, sin tocar el
   código.
6. **El concepto, si dice algo más que «pago».** Si solo dice eso, se deja vacío.
7. **Compartir → Churupitos:** la app aparece en la lista de Compartir de Android, y
   desde el banco, desde WhatsApp o desde la galería abre Registrar con la captura leída.

## Pantallas

Ninguna nueva: cambian Registrar y la ficha de cada cuenta en Ajustes.

## Hecho cuando

- Registran un gasto desde una captura sin escribir el monto, la fecha ni la cuenta, ni
  el concepto si la captura lo trae.
- En los teléfonos tarda poco: si pasa de unos 5 segundos, se para y se habla.
- Una captura de un formato nuevo se reconoce añadiendo una palabra a su cuenta.
- `npm run check` en verde, en local y en la CI.

## Pasos

1. [x] **Plan aprobado** por el autor (2026-11-15).
2. [x] **El lector en Registrar** (2026-11-15): el monto, la fecha y el concepto. Con las
   capturas de la prueba, en Chrome, acertó el monto y la fecha de todas, en menos de un
   segundo cada una; falta medirlo en los dos teléfonos.
3. [ ] **La cuenta de cada captura.**
4. [ ] **Compartir → Churupitos.**
5. [ ] **En los teléfonos.**

Cada paso termina con su commit y con un push, para probarlo en el teléfono.

## Tope de complejidad

- **Pantallas:** ninguna nueva.
- **Datos:** un campo en las cuentas.
- **Dependencias:** el lector (Tesseract.js) y sus datos del español, servidos desde la
  propia app.

## Fuera de M15

- **Fotos de facturas en papel:** son el siguiente paso de la idea; sin muestras no se
  prueban. En ellas la cuenta no se preselecciona, porque no dicen con qué se pagó.
- Mover entre cuentas propias y los cobros desde una captura.
- Proponer la comisión del 0,3 %: está en «Más adelante» de `docs/ESTADO.md`.
