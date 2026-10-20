# Dominio — el método del Excel

**Autoridad viva.** Lo que dice aquí manda sobre el código: si una regla cambia, se
cambia aquí primero y luego en la base. Está escrito **sin datos reales**: los
ejemplos usan cuentas, personas y cifras inventadas («Banco A», «Billetera B»,
importes redondos). Los nombres reales solo existen en `privado/`.

Las reglas tienen identificador estable (`R1`, `R2`…) para citarlas desde las
pruebas y las migraciones. Una regla que deja de valer se marca como retirada, no se
borra ni se renumera.

---

## 1. El método en una página

El hogar llevaba sus finanzas en un Excel por mes. Cada libro tiene:

- **Una hoja por cuenta** (un banco, una tarjeta, una billetera de dólares, el
  efectivo), con las columnas `Fecha | Sobre | Concepto | Monto | Restante`. Cada
  fila es un movimiento con signo: negativo sale, positivo entra.
- **Una hoja de presupuesto** con los ingresos esperados del mes y su tasa, el plan
  en dólares para cada sobre, lo que queda en cada cuenta, las deudas y los deudores.

La idea central es que **el dinero de un sobre vive repartido entre varias cuentas**:
«Ahorro» puede tener una parte en el Banco A, en bolívares, y otra en la Billetera
B, en dólares. La app hace lo mismo que el Excel, con las mismas reglas, pero
calcula sola lo que el Excel obligaba a teclear o a vigilar.

---

## 2. Conceptos

**Moneda.** Dos: bolívares (`VES`, «Bs») y dólares (`USD`, «$»). Los USDT se tratan
como dólares en una cuenta de dólares. Nunca se suman dos monedas, salvo al valorar
un cobro o en un cambio de divisa.

**Cuenta.** Donde está el dinero físicamente: un banco, una tarjeta de beneficio, una
billetera o el efectivo. Tiene **una sola moneda**. Es una hoja del Excel.

**Sobre.** Un propósito para el dinero: Ahorro, Alimentación, Transporte, Salidas, el
Pote… Cruza todas las cuentas y puede tener saldo en las dos monedas. Es la columna
«Fuente» de cada hoja (ojo: **ahí «Fuente» significa sobre**, no fuente de ingreso).
«Otro» es un sobre más (`R11`).

**Celda.** La intersección de una cuenta y un sobre. **Es la unidad de saldo**: no se
puede pagar desde el Banco A con dinero que está en la Billetera B, aunque los dos
sean del mismo sobre. Es lo que el Excel mostraba como «Restante diversificado».

**Operación y asiento.** Una operación es un hecho: un gasto, un cobro, un traspaso…
Tiene fecha, descripción y autor. Agrupa uno o más **asientos**, cada uno con
`(cuenta, sobre, importe con signo)`. En el Excel, un asiento es una fila; una
operación son las filas que van juntas (las dos de «X le presta a Y», un cobro y su
reparto, las dos patas de una compra de USDT).

**Libro de una cuenta.** Sus asientos en orden, con el restante corrido después de
cada uno, como la hoja del Excel. El restante **se calcula al leer** (`R2`, `R14`).

**Comisión.** Un asiento propio dentro de la operación que la genera, marcado como
comisión, en el sobre que se elija. Por ahora se registran a mano (`R16`).

**Ingreso esperado.** Lo que se espera cobrar en el mes de una fuente (Quincena, Bono,
Tarjeta de alimentación…), en dólares, con su estado ✅ cobrado / ⏳ pendiente. Una
misma fuente puede llegar en varios pagos, cada uno con su línea, y cada línea se
cobra una sola vez.

**Cobro y reparto.** Cuando el dinero llega: una operación de ingreso en la cuenta
donde cayó, enlazada a su ingreso esperado y repartida entre sobres **en dólares**
(`$100 de Ahorro`, `$50 del Pote`…). Cada línea del reparto es un asiento en la
moneda de la cuenta que guarda además su valor en dólares; en una cuenta en dólares,
ese valor es el propio importe.

**Tasa.** La de **cada cobro**: Bs recibidos ÷ $ reconocidos. Nunca «la tasa del día»
ni «del mes»: en un mismo mes conviven varias, y dos el mismo día (`R8`).

**Plan del mes.** Cuánto se decide dar a cada sobre, en dólares, con la fuente de los
fondos, la **acción** (qué hacer con ese dinero: cambiar a USDT, enviar de inmediato,
mantener en bolívares…) y si ya se entregó (✅/⏳).

**Deudas y deudores.** Lo que el hogar debe (cuotas, tarjetas) y lo que le deben, con
fecha límite opcional, concepto, monto y moneda. Es una lista aparte del libro: pagar
una cuota es un gasto normal (`R17`). Cada mes lleva la lista de las cuotas de ese mes;
desde octubre de 2026, cada una con ✅ si ya se pagó o ⏳ si no, en vez de borrar las
pagadas.

**Mes y arrastre.** El mes de una operación lo da su fecha. Cada celda abre el mes con
lo que cerró el anterior, sin teclear nada (`R7`).

**El libro del mes siguiente, antes de tiempo.** Se prepara antes de que empiece el mes,
para planificarlo: trae su presupuesto y sus deudas, y en cada cuenta solo la plantilla,
un «Lo que tenía antes» a cero que no dice nada. El arrastre de verdad se escribe al
empezar el mes.

---

## 3. Tipos de operación

Los invariantes se comprueban sin contar los asientos de comisión.

| Tipo | Qué es | Invariante |
|---|---|---|
| `expense` | Gasto, repartido entre uno o varios sobres | Una sola cuenta; todos los asientos negativos |
| `income` | Ingreso: un cobro con su reparto, o un ingreso extraordinario | Una sola cuenta; todos positivos |
| `envelope_transfer` | Dinero que pasa de un sobre a otro sin moverse de cuenta («X le presta a Y», «sobrante de X a Y») | En **cada cuenta**, la suma es cero |
| `account_transfer` | Dinero que pasa de una cuenta a otra de la misma moneda; puede cambiar de sobre en el camino | Una sola moneda; la suma es cero |
| `exchange` | Cambio de divisa: Bs → $ o al revés | Dos monedas: en una sale y en la otra entra |
| `adjustment` | Dinero que aparece o desaparece sin contraparte | Ninguno, pero el **motivo** es obligatorio |

Motivos de un ajuste: `opening` (saldos iniciales del primer mes importado),
`carry_reassignment` (una reasignación que el Excel hizo al copiar el arrastre),
`interest`, `correction`.

Ejemplo: «Salidas le presta 50 a Transporte» en el Banco A son dos asientos de una
operación `envelope_transfer`: `(Banco A, Salidas, −50)` y `(Banco A, Transporte, +50)`.

---

## 4. Reglas

- **R1 — Dinero en enteros de céntimos**, con su moneda aparte. Nunca decimales ni
  tolerancias (ADR 0002).
- **R2 — Ningún saldo se guarda.** Celda = suma de sus asientos; cuenta = suma de sus
  celdas; sobre = suma de sus celdas, por moneda (ADR 0003).
- **R3 — La moneda de un asiento es la de su cuenta.**
- **R4 — No hay asientos de importe cero.** Las filas de importe 0 que el Excel usa
  como título («Bono $1000 = Bs…») son la descripción de la operación que encabezan.
- **R5 — Cada operación cumple el invariante de su tipo** (sección 3).
- **R6 — Se puede quedar en descubierto.** Una celda puede quedar negativa: se avisa,
  nunca se rechaza. Así funciona el método: se gasta y luego se cubre en bloque.
- **R7 — Arrastre automático.** El saldo de apertura de una celda en un mes es su
  saldo de cierre en el anterior. Nada se teclea ni se copia.
- **R8 — La tasa es del cobro** y se deriva de sus dos importes; no se guarda.
- **R9 — El reparto se decide en dólares.** La suma en dólares del reparto es la del
  cobro. Al pasar cada línea a bolívares se redondea, y la última absorbe la
  diferencia para que la suma sea exacta.
- **R10 — Los Bs que recibe un sobre en el mes** son la suma de sus líneas de reparto.
  Se calculan; no se copian de una fórmula. El mes de un reparto es el de su ingreso
  esperado, no la fecha del cobro.
- **R11 — «Otro» es un sobre.** «Total sin Otro» = total de las cuentas − lo que hay en
  «Otro», por moneda.
- **R12 — Las cuatro comprobaciones del presupuesto**, las del formato condicional del
  Excel: (a) el plan en $ suma lo esperado en $; (b) los Bs repartidos suman los Bs
  cobrados; (c) y (d) los restantes de los sobres sin «Otro» suman el total de las
  cuentas sin «Otro», en Bs y en $. La (c) y la (d) se cumplen solas por `R2`; la (a)
  y la (b) son avisos.
- **R13 — Fechas en hora de Caracas.** Un gasto a las 23:00 del día 31 es de ese mes.
- **R14 — Orden del libro**: fecha y, dentro del día, la posición (la fila del Excel o
  el orden de registro).
- **R15 — Fecha aproximada.** Un asiento sin fecha toma la de la fila anterior de su
  hoja y queda marcado como aproximado.
- **R16 — Las comisiones se registran a mano**, como asiento de comisión, que
  siempre es una salida: importe negativo.
- **R17 — Las deudas son una lista aparte del libro.** Pagar una cuota es un gasto;
  la cuota pagada sale de la lista vigente (en el Excel se borra o se marca ✅).
- **R18 — Los ✅/⏳ se calculan.** Un ingreso esperado está cobrado cuando tiene su
  cobro. El plan de un sobre está entregado cuando lo que recibió del reparto del
  mes, en dólares, cubre lo planeado.

---

## 5. Del Excel a la app

| En el Excel | En la app |
|---|---|
| Una hoja | Una cuenta |
| La columna «Fuente» | El sobre del asiento |
| Una fila con importe | Un asiento |
| Filas que van juntas | Una operación |
| Una fila de importe 0 que hace de título | La descripción de su operación (`R4`) |
| «Lo que tenía antes» | Nada: es el arrastre (`R7`); en el primer mes de cada cuenta, un ajuste `opening` el día 1. A cero, es la plantilla de un mes que aún no empieza, y no declara nada |
| Un cambio de sobre al copiar el arrastre | Un ajuste `carry_reassignment` el día 1 |
| Unos céntimos de diferencia en el arrastre (hasta 5) | Un ajuste `correction` el último día del mes anterior, para que su cierre dé lo del Excel |
| Una fila de comisión («Comisión pago móvil», «Mantenimiento de cuenta»…) | Un asiento de comisión en la operación del movimiento de justo antes, o un gasto si va sola |
| Filas que van juntas sin título (un préstamo entre sobres, un traspaso entre bancos) | Una operación, solo si no hay otra pareja posible; si no, cada fila queda sola |
| El «$N de…» de cada línea de un cobro | Su valor en dólares, si cuadra con los Bs de la línea; si no, se reparte en proporción a los Bs (`R9`) |
| Un ingreso ✅ del presupuesto | Enlazado al cobro que suma lo que llegó en fechas cercanas, aunque esté en el libro del mes anterior |
| Un deudor sin moneda | En Bs si pasa de 1.000; si no, en $. Queda anotado |
| La columna «Restante» | Calculada (`R2`, `R14`) |
| Ingresos esperados del PRESUPUESTO | Ingresos esperados del mes; los Bs, la fecha, la tasa y el ✅, del cobro (`R8`, `R18`) |
| Distribución del PRESUPUESTO | El plan del mes; los Bs y el ✅, calculados (`R10`, `R18`) |
| Restante en las cuentas | Calculado |
| Deudas y deudores | La lista vigente (`D9`): lo no pagado del último libro y las cuotas con fecha del anterior que siguen en ⏳. Una deuda sin fecha que no pasó al último libro se dejó de pagar: no entra |
| El libro de un mes que aún no empieza | Su presupuesto y sus deudas. Sus saldos no se comparan con los de la app hasta que empieza |
| Zona libre (borradores) | No se importa |

El catálogo que dice qué hoja es qué cuenta, cómo se llama cada sobre en cada mes y
con qué emoji lo pinta la app vive en `privado/import/catalogo.yml`, porque lleva los nombres reales.

---

## 6. Decisiones cerradas — no volver a preguntarlas

| # | Decisión | Fecha |
|---|---|---|
| D1 | Las mismas reglas que el Excel. «Más simple» es menos piezas técnicas, no menos reglas | 2026-10-11 |
| D2 | La celda cuenta × sobre es imprescindible | 2026-10-11 |
| D3 | Se importa todo el histórico, y se ve tal cual el Excel | 2026-10-12 |
| D4 | Comisiones a mano, sin automatizar | 2026-10-12 |
| D5 | Arrastre automático celda a celda; las reasignaciones del pasado, como ajustes con fecha | 2026-10-14 |
| D6 | «Otro» es un solo sobre, como en el Excel | 2026-10-14 |
| D7 | Los préstamos entre sobres son movimientos simples; los que se quieren recordar van a Deudas | 2026-10-14 |
| D8 | El Pote es un sobre | 2026-10-14 |
| D9 | De Deudas y Deudores se importa solo la lista vigente, con ✅/⏳ desde octubre de 2026 (§5) | 2026-10-14, revisada el 2026-10-19 |
| D10 | El presupuesto se importa tal cual, con los Bs de cada sobre calculados del reparto | 2026-10-14 |
| D11 | La zona libre del presupuesto no se importa | 2026-10-14 |
| D12 | Las filas raras entran marcadas y ordenadas: fecha aproximada, concepto vacío, títulos como descripción | 2026-10-14 |
| D13 | Un gasto puede dejar una celda en negativo (`R6`) | 2026-10-11 |

---

## 7. Lo que la app no hace (por ahora)

- Seguimiento de préstamos entre sobres (quién le debe a quién, devoluciones): D7.
- Comisiones automáticas: D4.
- Cierre de mes con pasos obligatorios: el mes se cierra solo al empezar el siguiente (`R7`).
- Planificar qué ingreso financia qué sobre antes de cobrarlo: los Bs salen del reparto real (`R10`).
- Notas libres o borradores: D11.
