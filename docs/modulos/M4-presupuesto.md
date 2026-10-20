# M4 · Presupuesto

- **Estado:** en curso (desde 2026-10-19). El plan está aprobado.
- **Objetivo:** ver en el teléfono el presupuesto de cada mes, como la hoja PRESUPUESTO
  del Excel: qué ingresos se esperan y cuáles ya se cobraron, cuánto le toca a cada sobre
  y si ya lo recibió, y si el mes cuadra. Y poder compararlo con el Excel.

## Lo que hay en el Excel y en la v2

La hoja PRESUPUESTO tiene cinco bloques. Dos son de este módulo y los otros tres ya
tienen su sitio:

| Bloque del Excel | En la app |
|---|---|
| 🧾 Ingresos esperados: fuente, $, Bs, fecha, tasa y ✅/⏳ | **M4** |
| 📦 Distribución de los ingresos: sobre, $, Bs, restante, fuente de fondos, acción y ✅/⏳ | **M4**, salvo el restante, que ya está en Sobres (M3) |
| 💹 Restante en las cuentas | El inicio y cada moneda (M2) |
| 📉 Deudas y 🔫 Deudores | M5 |
| La zona libre | No se importa (D11) |

La base ya lo calcula todo desde M1: `expected_income_summary` (cada ingreso con su
cobro), `budget_summary` (el plan de cada sobre con lo que recibió, `R10`, `R18`) y
`budget_checks` (`R12`). M4 no necesita vistas nuevas.

La v2 tenía una pantalla del mes con dos tarjetas (lo que se espera y ha entrado; lo
planeado y lo que ya les llegó a los sobres), los ingresos y el plan por sobre. Lo que
escribía (cobrar, editar el plan, abrir y cerrar el mes) es de M8 y M9.

## Decisiones (2026-10-19)

- **La barra queda completa**: Sobres · Deudas · Inicio · Presupuesto · Ajustes, con
  Inicio en el centro. Deudas entra ya, con una pantalla que dice que está en
  construcción, para que la barra no cambie de forma en M5.
- **Una sola pantalla, la del mes.** Abre en el mes en curso y se recorre hacia atrás
  hasta el primer mes importado. **Hacia delante llega al mes siguiente si ya tiene
  presupuesto**, porque se planifica antes de que empiece (`docs/DOMINIO.md` §2); ese
  mes dice que todavía es planificación. Escribir el plan llega en M8.
- **Primero los ingresos del mes**: lo que se espera, lo cobrado y lo que falta, en $,
  con las mismas cuentas que el Excel (lo cobrado es la suma de los ✅; lo que falta, la
  de los ⏳). Debajo, cada ingreso con su emoji, lo esperado y ✅/⏳. Uno cobrado dice
  además cuándo, en qué cuenta, cuánto llegó y a qué tasa. Al tocarlo se despliega su
  cobro con el reparto por sobre, como una operación del libro.
- **Después el plan**: cada sobre en el orden del presupuesto, con lo planeado en $,
  ✅/⏳ y, si llegó algo en bolívares, cuántos (`R10`). Debajo, la fuente de fondos y la
  acción tal cual se escribieron («💰 Bono · Cambiar a USDT»). Si a uno le llegó solo
  una parte, lo dice. Arriba, lo entregado, lo que falta y el total, como en el Excel.
  Cada sobre lleva a su pantalla, donde está su restante. Los sobres con el plan en $0
  van al final, plegados, como los sobres en cero.
- **El cuadre (`R12`)**: si el plan reparte justo lo que se espera y los Bs repartidos
  suman los cobrados, una línea lo dice; si no, un aviso dice por cuánto. Nunca impide
  nada. Las comprobaciones (c) y (d) no se enseñan: se cumplen solas (`R2`).
- **Los ingresos llevan su emoji**, como en el Excel y como los sobres. Va en el
  catálogo del importador y en una columna nueva.

## Pantallas

| Pantalla | Qué enseña | De dónde sale |
|---|---|---|
| **Presupuesto** | El mes; los ingresos con sus totales y su cobro; el plan por sobre con sus totales; el cuadre | `expected_income_summary`, `budget_summary`, `budget_checks` y `envelopes` |
| **Deudas** | Que está en construcción y llega en su módulo | — |

Con los estados de M2: cargando, vacío, error, sin conexión y estirar para recargar.

## Hecho cuando

- El presupuesto de octubre, el de noviembre (planificación) y el de un par de meses
  pasados coinciden con el Excel en el teléfono: los ✅/⏳, los totales, los Bs de cada
  sobre y el cuadre. En dos meses del histórico la app y el Excel ya se sabe que
  difieren; el informe del importador lo anota.
- `npm run check` en verde, en local y en la CI.

## Pasos

1. [x] **Plan aprobado** por el autor (2026-10-19).
2. [ ] **El emoji de los ingresos**: la columna, el catálogo y la recarga, en local y en
   la nube.
3. [ ] **Las secciones y el mes**: Deudas (en construcción) y Presupuesto en la barra;
   `/budget?month=2026-09`, con el mes siguiente si ya tiene presupuesto.
4. [ ] **Los ingresos del mes**: sus totales, cada ingreso y su cobro desplegable.
5. [ ] **El plan**: sus totales, cada sobre con su enlace, los de $0 plegados y el cuadre.
6. [ ] **En los teléfonos**: lo comparan con el Excel.

Cada paso termina con su commit; los pasos 3, 5 y 6 terminan además con un push.

## Tope de complejidad

- **Pantallas:** 1 (Presupuesto), más el cobro que se despliega y el aviso de Deudas.
- **Nada se escribe**: ni un formulario.
- **Datos:** una columna nueva (el emoji de los ingresos); ninguna tabla ni vista nueva.

## Fuera de M4

- Cobrar un ingreso, repartirlo y editar el plan (M8), y abrir el mes siguiente (M9).
- Las deudas y los deudores (M5): en M4 su sección solo dice que está en construcción.
- El restante de cada sobre en la fila del plan: está a un toque, en su pantalla.
- La tasa del día o del mes: solo existe la de cada cobro (`R8`).
