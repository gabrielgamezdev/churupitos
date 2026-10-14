# ADR 0003 — Ningún saldo se almacena

- **Fecha:** 2026-10-12 (heredada de la versión anterior, donde se aceptó el 2026-08-20)
- **Estado:** aceptada

## Contexto
La primera versión guardaba un saldo corriente en cada fila, el pendiente de cada
deuda y una clave de orden calculada. Los tres se rompieron:

- El saldo corriente se calculaba con dos fórmulas distintas y nunca se recalculaba:
  cualquier movimiento con fecha retroactiva lo corrompía.
- La clave de orden dejaba 100 huecos por cuenta y mes, y una cuenta llegó a 155
  movimientos en 19 días.
- El pendiente de las deudas recortaba los sobrepagos a cero y perdía información.

El Excel tiene el mismo problema en pequeño: su columna «Restante» es una fórmula que
apunta a la fila anterior, y al mover o copiar filas queda apuntando a otra.

## Decisión
Todos los saldos son **derivados** de los asientos, con vistas de Postgres y
funciones de ventana. El saldo corriente de un libro se ordena por
`(fecha, posición, id)`.

## Consecuencias
- Editar o borrar un movimiento actualiza todos los saldos afectados, sin ningún
  proceso adicional.
- Las consultas son algo más caras, pero el volumen es de unos 400 movimientos al
  mes: irrelevante para Postgres.
