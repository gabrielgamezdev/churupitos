# M5 · Deudas

- **Estado:** en curso (desde 2026-10-20). El plan está aprobado.
- **Objetivo:** ver en el teléfono lo que deben y lo que les deben, con las cuotas por
  fecha y el total pendiente, como los bloques 📉 Deudas y 🔫 Deudores del Excel. Y
  poder compararlo con el Excel.

## Lo que hay en el Excel, en la base y en la v2

- **El Excel** tiene en la hoja PRESUPUESTO dos listas: 📉 Deudas (fecha límite,
  concepto, cantidad y ✅/⏳ desde octubre de 2026) y 🔫 Deudores (quién y cuánto). Cada
  libro trae las cuotas de su mes; antes de octubre las pagadas se borraban, y desde
  entonces se marcan ✅. Su fila «Total» suma la lista tal cual, pagadas incluidas.
- **La base** guarda la lista vigente (`D9`): lo que no está pagado. Cada deuda con su
  dirección (`payable`, lo que deben; `receivable`, lo que les deben), concepto,
  importe, moneda y fecha límite opcional; `debt_totals` suma lo pendiente por
  dirección y moneda. Las pagadas no se importan.
- **La v2** tenía una lista con dos solapas («Lo que debo» y «Lo que me deben»), el
  total por moneda arriba, cada deuda con su vencimiento y las vencidas en rojo, y una
  ficha por deuda con sus abonos. Los abonos y los préstamos entre sobres como deudas
  propias no existen aquí: pagar una cuota es un gasto (`R17`) y un préstamo entre
  sobres que se quiere recordar es una deuda más (`D7`).

## Decisiones (2026-10-20)

- **Una sola pantalla, Deudas**, con dos partes: lo que deben y lo que les deben. Son
  pocas filas, así que van una debajo de la otra en vez de en solapas.
- **Arriba, lo pendiente**: lo que deben y lo que les deben, cada moneda por su lado y
  nunca sumadas (`R1`). Solo lo pendiente: la fila «Total» del Excel suma también las
  pagadas.
- **Lo que deben, por mes de vencimiento**: «Noviembre», «Diciembre»… con lo que suma
  cada mes, y al final las que no tienen fecha. Cada cuota con su concepto, su importe y
  cuándo vence («15 de noviembre · en 26 días»); una que venció y sigue sin pagar lo
  dice en `overdrawn` («venció hace 2 días»).
- **Las pagadas del mes, plegadas al final** («Pagadas en octubre · 12»), como en el
  Excel desde octubre. Hace falta importarlas: hoy la base solo tiene las pendientes.
  Serían las ✅ del libro del mes en curso; las de meses anteriores no se guardan.
- **Lo que les deben**: cada deudor con su importe.

## Pantallas

| Pantalla | Qué enseña | De dónde sale |
|---|---|---|
| **Deudas** | Lo pendiente por moneda; lo que deben por mes de vencimiento, con las pagadas del mes plegadas; lo que les deben | `debts` y `debt_totals` |

Con los estados de M2: cargando, vacío, error, sin conexión y estirar para recargar.

## Hecho cuando

- La lista coincide con el Excel en el teléfono: las cuotas pendientes de noviembre y
  las pagadas de octubre, con sus importes, fechas y totales.
- `npm run check` en verde, en local y en la CI.

## Pasos

1. [x] **Plan aprobado** por el autor (2026-10-20).
2. [x] **Las pagadas del mes en la base** (2026-10-20, también en la nube): una columna
   que diga si está pagada, `debt_totals` sin ellas, el importador (`D9` revisada) y la
   recarga, en local y en la nube.
3. [ ] **Deudas**: lo pendiente, lo que deben por mes con sus vencimientos, las pagadas
   plegadas y lo que les deben.
4. [ ] **En los teléfonos**: lo comparan con el Excel.

Cada paso termina con su commit; los pasos 3 y 4 terminan además con un push.

## Tope de complejidad

- **Pantallas:** 1 (Deudas), que sustituye a la de «en construcción».
- **Nada se escribe**: ni un formulario. Crear una deuda, pagar una cuota y quitarla es
  de M10.
- **Datos:** una columna nueva; ninguna tabla nueva.

## Fuera de M5

- Crear, pagar y quitar deudas (M10).
- Abonos parciales y una ficha por deuda, como en la v2: aquí una cuota se paga entera.
- Las pagadas de meses anteriores: el Excel las borraba hasta septiembre.
- Avisos de vencimiento y deudas en el inicio.
