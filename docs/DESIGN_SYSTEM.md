# Design system

**La autoridad del diseño de Churupitos**: cómo se ve y cómo habla la app. Si un valor
de aquí no coincide con el CSS de la app (`apps/web/src/styles.css`), es un error. La
**galería** de la app (`/gallery`, enlazada desde el inicio) enseña los colores, los
tipos y los componentes de verdad, con datos inventados y en los dos temas.

Los ejemplos son inventados: «Banco A», sobres genéricos y cifras redondas (regla 1).

---

## Principios

- **Como el Excel, pero sin teclear.** Las mismas palabras (cuenta, sobre, «Otro»,
  restante), los mismos emoji de los sobres y las mismas cifras. La app calcula sola lo
  que el Excel obligaba a teclear.
- **El signo manda, el color acompaña.** Un importe se entiende por su signo; el color
  ayuda a verlo de un vistazo, pero nunca es lo único que lo dice.
- **Cada moneda por su lado.** Bolívares y dólares nunca se suman ni se pintan en una
  sola cifra (DOMINIO.md, `R1`).
- **Un descubierto no es un error.** Un saldo por debajo de cero está pendiente de
  cubrir (`R6`): se marca con calma, sin alarmas.

## Cifras

- Formato venezolano: punto para los miles, coma para los céntimos, siempre dos
  decimales, y el símbolo delante con un espacio: `Bs 12.500,00`, `$ 340,00`. barrido:permitido (cifra inventada)
- **Movimiento:** con signo siempre, el menos tipográfico (`−`, no `-`) y delante del
  símbolo: `+Bs 400,00`, `−Bs 320,00`. Lo que entra, en `money-in`; lo que sale, en el color
  del texto: el signo ya lo dice, el rojo queda para los errores y el ámbar del descubierto
  destaca más (M7).
- **Saldo:** sin signo y en `ink`. Por debajo de cero, en `overdrawn`, con su `−` y la
  etiqueta «Descubierto» donde quepa.
- Toda cifra va con números tabulares, para que los céntimos queden en columna.
- Las cifras salen de céntimos enteros y se pintan con `formatMoney` (`src/lib/money.ts`),
  sin pasar nunca por un decimal (ADR 0002).

## Color

Cada color es un token con su valor en claro y en oscuro. Los componentes solo usan
tokens, así que nunca preguntan en qué tema están.

| Token | Claro | Oscuro | Para qué |
|---|---|---|---|
| `surface` | `#f6f8f6` | `#0d1411` | Fondo de cada pantalla: un verde casi blanco, o casi negro |
| `surface-raised` | `#ffffff` | `#151f1a` | Tarjetas, listas y hojas sobre `surface` |
| `surface-sunken` | `#ecf1ed` | `#0a0f0c` | Campos, la fila tocada y el esqueleto de carga |
| `hairline` | `#dde5df` | `#24302a` | Separadores. Decorativo: nunca lo único que distingue algo |
| `line-strong` | `#7d8f85` | `#62756b` | Bordes de controles |
| `ink` | `#13201a` | `#e7eee9` | Texto principal y saldos |
| `ink-muted` | `#56675e` | `#9fb1a7` | Lo secundario: fechas, sobres, restantes, notas |
| `brand` | `#065f46` | `#3ed69c` | El verde del sobre del icono: acciones, enlaces, foco y la moneda Bs |
| `on-brand` | `#ffffff` | `#05261a` | Texto sobre un relleno `brand` |
| `brand-soft` | `#d7f0e3` | `#0f3628` | Fondo tintado detrás de texto `brand` |
| `coin` | `#fbbf24` | `#fbbf24` | El dorado de la moneda del icono. Solo el icono y la portada |
| `money-in` | `#11743a` | `#4ade80` | Importe de lo que entra, con su `+` |
| `danger` | `#b42318` | `#f87171` | Errores y deudas vencidas. Nunca un importe que sale |
| `overdrawn` | `#a14a07` | `#fbbf24` | Saldo por debajo de cero |
| `overdrawn-soft` | `#fdebd5` | `#3a2a07` | Fondo de la etiqueta «Descubierto» |
| `third-party` | `#5c6470` | `#a7adb8` | El dinero de «Otro», que no es del hogar (`R11`): un gris neutro, siempre con su borde punteado |
| `third-party-soft` | `#eceef1` | `#22262d` | Fondo de la etiqueta de «Otro» |
| `ves` | `#2e5aac` | `#8fa8f5` | Identidad de los bolívares: la etiqueta «Bs», el símbolo del monto y el borde de su tarjeta |
| `ves-soft` | `#e7edf8` | `#1e2a45` | Fondo de la etiqueta «Bs» |
| `usd` | `#6e46b0` | `#c3a6f2` | Identidad de los dólares: la etiqueta «$», el símbolo del monto y el borde de su tarjeta |
| `usd-soft` | `#efe9f8` | `#2c2342` | Fondo de la etiqueta «$» |
| `focus-ring` | = `brand` | = `brand` | Anillo de foco: 2px sólidos, separados 2px del control |
| `scrim` | `ink` al 45 % | negro al 60 % | El velo que oscurece la pantalla detrás de una hoja |

- Entre los importes, `money-in` es **solo para lo que entra**: un saldo positivo y lo
  que sale nunca llevan color.
- **Bs en azul y $ en violeta** (M7), solo en su etiqueta, el símbolo del monto y el
  borde de su tarjeta: nunca en la cifra. Así la moneda se reconoce de un vistazo y ni
  se confunde con la marca (antes Bs era `brand`) ni el $ con el ámbar del descubierto
  (antes era dorado). Medidos: dan al menos 5,5:1 sobre sus fondos en los dos temas.
- Sobre un relleno `brand`, el texto es `on-brand`, nunca un blanco escrito a mano.
- `coin` nunca es texto ni un estado.
- En el código, cada token es una clase de Tailwind: `bg-surface`, `text-ink-muted`,
  `border-hairline`… Los componentes de shadcn usan sus propios nombres (`primary`,
  `muted-foreground`…), que apuntan a estos; el código propio usa los de esta tabla.
  `destructive` es `danger`: el rojo de los errores.

## Temas

La app sigue al teléfono: claro u oscuro según su configuración. El oscuro es un verde
casi negro, no un gris; su `brand` se aclara y el texto sobre él pasa a ser oscuro.
Elegir el tema a mano y los temas propios están apuntados para más adelante
(`docs/ESTADO.md`).

En el CSS, cada color se escribe una vez con sus dos valores (`light-dark()`), y un
contenedor con `data-theme="light"` o `"dark"` fija su tema: lo usa la galería, y
servirá para elegirlo a mano. Por eso los componentes no usan la variante `dark:`.

## Tipografía

Una sola familia: **Geist**, variable, la que ya carga la app (`@fontsource-variable/geist`).

| Estilo | Tamaño / interlineado | Peso | Para qué |
|---|---|---|---|
| `display-amount` | 32 / 38 px, −0,02 em | 650 | La cifra protagonista, una por pantalla: el saldo grande (en el inicio, uno por tarjeta de moneda), el monto en Registrar y el total de un movimiento en su hoja |
| `title` | 20 / 26 px, −0,01 em | 600 | El título de una pantalla |
| `heading` | 16 / 22 px | 600 | Secciones y el nombre de una moneda en su tarjeta |
| `body` | 15 / 22 px | 400 | El concepto de un movimiento y el texto corrido |
| `amount` | 15 / 22 px | 600 | El importe de un movimiento y el saldo de una cuenta en una lista |
| `amount-small` | 13 / 18 px | 500 | El restante después de un movimiento |
| `caption` | 13 / 18 px | 400 | Notas y datos secundarios, en `ink-muted` |
| `label` | 12 / 16 px, +0,02 em | 600 | Etiquetas (Bs, $, Otro, Descubierto, Comisión) y encabezados de día |

Cada estilo es una clase: `text-display-amount`, `text-title`… Toda la app usa números
tabulares.

## Espacio y forma

- **Rejilla de 4 px:** `space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 ·
  `space-5` 20 · `space-6` 24 · `space-8` 32. Es la escala de Tailwind: `p-4` = 16 px.
- Cada pantalla deja `space-4` a los lados y `space-6` entre secciones.
- **`tap` = 48 px:** el alto mínimo de todo lo que se toca. Es una app para el pulgar.
  En el código, `h-tap`, `min-h-tap` y `size-tap`.
- **Radios:** `radius-sm` 6 px en etiquetas; `radius-md` 10 px en botones, campos y el
  selector de mes; `radius-lg` 16 px en tarjetas y bloques de lista; `radius-pill` en
  el aviso de sin conexión. En el código, `rounded-sm`, `-md`, `-lg` y `-full`.
- **Sombra:** solo llevan `shadow-card` las tarjetas de moneda del inicio, el círculo
  del ＋ de la barra, el aviso de abajo y la opción elegida entre Gasto e Ingreso. Nada flota sobre la
  pantalla: un botón flotante tapa la columna de los importes. En
  oscuro es un filo claro, no una sombra. Lo demás son listas: filas separadas por `hairline`
  dentro de un bloque `surface-raised`.

## Componentes

Cada uno lee de la base; ninguno calcula un saldo (`R2`).

Las piezas de base ya están en `apps/web/src/components/`: `Money`, `EnvelopeChip`,
`List` y `ListRow`, `Screen` (el marco de cada pantalla, con `PullToRefresh` para
estirar y recargar), `ScreenHeader`, `Toaster` (el aviso de abajo), `ProgressBar`, `StatusBadge`, `Field` y `AmountInput` (los campos de los
formularios; el monto, escrito como en un cajero) y los estados (`MissingData`, `StaleDataBanner` y,
debajo, `EmptyState`, `ErrorState` y `OfflineBanner`). Las genéricas son de shadcn,
adaptadas a este documento, en `components/ui/`: `Button` (con `destructive`, en
`danger`, solo para lo que no se deshace; hoy nada lo usa: borrar se deshace), `Badge` (las etiquetas), `Skeleton`,
`Collapsible`, `Input`, `Label`, `NativeSelect` (una lista del sistema con el aspecto de
`Input`), `Segmented` (una de pocas opciones a la vista, como Gasto o Ingreso) y `Sheet`
(una hoja que sube desde abajo). Los de cada pantalla viven con ella en `features/` (`CurrencyCard` y
`AccountRow` en `balances/`, `EnvelopeSplit` en `accounts/`, `EnvelopeRow` en
`envelopes/`, `BudgetTotals`, `IncomeRow`, `PlanRow` y `BudgetCheckList` en `budget/`,
`DebtTotals`, `DebtGroupList`, `DebtRow`, `DebtForm` y `DebtActions` en `debts/`, y
`OperationForm`, `MoveForm`, `EnvelopePicker`, `DayField`, `CoverLink`, `AccountSelect` y
`OperationActions` en `operations/`, `ReceiveForm` en `receipts/`, `PlanForm` en `plan/`, y `EnvelopeForm`, `AccountForm` y `RetireActions` en `catalog/`) y los del libro, que comparten
cuentas y sobres, en `features/ledger/` (`LedgerList`, `MonthPicker`, `OperationSheet`,
`RecentOperations`, `OperationRow` y `OperationDetail`), y «Para revisar», en `features/home/`
(`AttentionList`). Todos entran en la galería al construirse, con datos inventados.

La flecha de `ScreenHeader` vuelve a la pantalla anterior, como el atrás de Android; si
se entró directo por la dirección, va a la pantalla de arriba.

| Componente | Qué es |
|---|---|
| **Money** | Pinta un importe: movimiento con signo (lo que entra, en `money-in`), saldo o descubierto |
| **StatusBadge** | Los ✅ y ⏳ del Excel en una pastilla que además lo dice con palabras: «✅ Cobrado», «⏳ Pendiente». Lo hecho, en `brand` sobre `brand-soft`; lo pendiente, en `ink-muted` sobre `surface-sunken` |
| **CurrencyCard** | Una moneda en el inicio, con el borde izquierdo en su color (`ves` o `usd`): lo del hogar (sin «Otro») en grande; debajo, el total con «Otro» si lo hay y cuántas cuentas |
| **AccountRow** | Una cuenta en la lista de su moneda, con su parte de «Otro» si la tiene. Las cuentas en cero siguen, en `ink-muted`. Puede llevar una acción a su derecha, fuera del enlace, como «Cubrir» |
| **EnvelopeChip** | El sobre de un movimiento: su emoji y su nombre. «Otro», sin emoji, en `third-party` y dentro de un borde punteado |
| **EnvelopeSplit** | Los sobres de una cuenta, con los descubiertos marcados; suman el saldo de la cuenta |
| **EnvelopeRow** | Un sobre en la lista de sobres: lo que tiene en cada moneda, una debajo de la otra y sin sumarlas. Los sobres en cero van aparte, plegados |
| **LedgerList** | El libro del mes, por días y con lo más nuevo arriba: concepto, el sobre (en una cuenta) o la cuenta (en un sobre), importe y restante, cada uno en su moneda. Marca las comisiones (`R16`) y las fechas aproximadas (`R15`). Al tocar una fila, su operación se abre en un `OperationSheet`. Lo registrado en la app dice quién: «por Ana», con el «por» porque hay sobres con nombre de persona |
| **Sheet** | Una hoja que sube desde abajo sobre un velo `scrim`, en `surface-raised` y con las esquinas de arriba en `radius-lg`, hasta el 90 % del alto. Siempre con título, y encima, si hace falta, qué es en `label`. Se cierra con la X, tocando fuera o con el atrás de Android (`CloseWatcher`). Ningún campo se enfoca solo, y con la hoja abierta estirar no recarga. Es para mirar algo y actuar sobre ello; un formulario va a pantalla completa |
| **OperationSheet** | Un movimiento entero, desde cualquier lista: qué es y el día, el concepto como título, la cifra en `display-amount` (en un gasto o un ingreso, el total con su signo; en algo que se mueve sin cambiar el total, cuánto pasó, sin signo), sus asientos con cuenta y sobre (en un cobro, también su valor en $, `R9`) y quién lo registró y cuándo. Uno de la app lleva «Corregir» y «Borrar»: borrar no pregunta, cierra la hoja y deja «Deshacer» en el aviso. Uno importado dice que, hasta el corte, se corrige en el Excel |
| **Toaster** | El aviso de abajo, después de guardar: qué pasó, debajo lo que cambió por ello («🍔 Comida queda en Bs X») y, si se puede, «Deshacer» en `brand`. En `surface-raised` con `shadow-card`, justo encima de la barra (en un formulario, pegado al borde). Uno a la vez: el nuevo reemplaza al anterior. Con «Deshacer» dura 10 s, y si no, 5; tocarlo detiene la cuenta, y la X lo cierra. Deshacer deja el aviso «Deshecho», o dice por qué no se pudo |
| **AttentionList** | «Para revisar» en Inicio, sin tono de alarma: los sobres en descubierto (cada uno con su cuenta, su saldo en `overdrawn` y «Descubierto»; lleva al sobre, y al lado, «Cubrir») y lo que deben que venció o vence en 7 días o menos («Por pagar · en 3 días»; vencida, en `danger`; lleva a Deudas). Hasta cinco de cada, y «Y N más». Al final, una sola línea con los ingresos del mes por cobrar y lo que suman en $, que lleva a Presupuesto, y, desde el día 25, «Diciembre 2026 sin preparar» con «Preparar» en `brand`, que abre Planear. Sin nada que revisar, no se ve |
| **CoverLink** | «Cubrir», un botón `outline` junto a un sobre en descubierto (en «Para revisar» y en la pantalla del sobre): abre Mover con el destino puesto y lo que le falta para llegar a cero, en la misma cuenta. Solo queda elegir de qué sobre sale |
| **RecentOperations** | «Últimos registrados» en Inicio: las cinco últimas operaciones registradas en la app, por cuándo se registraron, en `OperationRow`, con «Ver todos» que abre Movimientos. Al tocar una se abre su `OperationSheet` |
| **OperationRow** | Una operación en una lista (Inicio, Movimientos): su concepto, su sobre (o cuántos) y su cuenta; a la derecha, el importe y debajo el día (si la lista no va ya por días) y «por Ana». Un traspaso, que no cambia el total, dice cuánto pasó, sin signo |
| **MonthPicker** | El mes del libro, con el saldo al empezar (`R7`) y al cerrar: una línea por moneda. En el presupuesto va sin saldos, y sus flechas se apagan donde no hay más meses |
| **BudgetTotals** | Las filas «Total» de un bloque del presupuesto, en $ y una al lado de la otra: se espera, cobrado y falta. En los ingresos, debajo, una `ProgressBar` de lo cobrado frente a lo esperado |
| **ProgressBar** | Cuánto va de algo que tiene referencia: una barra fina en `brand` sobre `surface-sunken`, que no pasa de llena. Solo donde hay con qué comparar (lo entregado del plan, lo cobrado de lo esperado), y siempre con la cifra al lado; para el lector de pantalla dice «$ X de $ Y». Nada de tartas |
| **IncomeRow** | Un ingreso esperado: su emoji, lo esperado en $ y su `StatusBadge`, «Cobrado» o «Pendiente». Uno cobrado dice cuándo, en qué cuenta y, en Bs, a qué tasa (`R8`); al tocarlo se despliega su reparto. Uno pendiente lleva al lado «Cobrar», un botón `outline` como «Cubrir», que abre Cobrar |
| **PlanRow** | Un sobre en el plan del mes: lo planeado en $, lo que le llegó en Bs (`R10`) y su `StatusBadge`: «Entregado», «Le llegaron $ X» o «Pendiente» (`R18`); debajo, la fuente de fondos y la acción. Debajo, una `ProgressBar` de lo que le llegó frente a lo planeado (llena si está entregado). Lleva al sobre. Los de $0 van aparte, plegados |
| **DebtTotals** | Lo pendiente: lo que deben y lo que les deben, cada moneda por su lado y sin las pagadas |
| **DebtGroupList** | Lo que deben en un mes de vencimiento (o sin fecha): su nombre y lo que suma arriba, y sus cuotas |
| **DebtRow** | Una deuda: concepto, fecha y cuánto falta («en 26 días»; una vencida, «venció hace 2 días» en `danger`) e importe en su moneda. Una pagada lleva su pastilla «✅ Pagada» y va en `ink-muted`. En Deudas, al tocarla se despliegan sus acciones |
| **DebtActions** | «Marcar pagada» (o «No está pagada»), «Corregir» y «Borrar», que no pregunta: deja «Deshacer» en el aviso. Una pagada ofrece «Registrar el pago» (o «el cobro»), que abre Registrar con el monto, el concepto y solo las cuentas de su moneda |
| **DebtForm** | Agregar o corregir una deuda: quién debe, concepto, moneda, monto y fecha límite. Al agregar, «Agregar en cuotas»: cuántas y cada cuánto, con la lista de las cuotas y sus fechas |
| **OperationForm** | Registrar: Gasto o Ingreso; el monto, protagonista en `display-amount` y ya con el teclado abierto; la cuenta (la de la pantalla de la que se viene o, si no, la última que usó esa persona en ese teléfono); el sobre (`EnvelopePicker`) y, debajo, cómo queda en una línea («🍔 Comida queda en Bs X»), con «Descubierto» si pasa de cero, que se guarda igual (`R6`); el concepto, que con dos letras propone hasta cuatro de los últimos seis meses del mismo tipo, cada uno con su sobre (tocar uno pone los dos); la fecha (`DayField`), y «Agregar comisión» plegada como enlace. «Repartir entre varios sobres» da a cada sobre su parte del monto de arriba, con «Resto aquí» en cada uno y «Falta por repartir» debajo: hasta que no falte nada, no se guarda. «Guardar gasto · Bs X» va pegado abajo, también encima del teclado. Sin red, se apaga y lo dice |
| **MoveForm** | Mover (M8), la tercera opción de Registrar: el monto; «Sale de» y «Llega a», cada uno con su cuenta y su `EnvelopePicker`, y la cuenta de destino igual a la de origen hasta que se cambia. Debajo de la cuenta de destino, qué va a ser: «Entre sobres de la misma cuenta», «Traspaso entre cuentas» o «Cambio de divisa»; en un cambio, «Llega» con su monto y la tasa que resulta. Cómo quedan los dos sobres, con su cuenta si son dos; concepto (sin escribirlo, uno como el del Excel: «De Comida a Ahorro»), fecha y comisión plegada. «Guardar movimiento», «Guardar traspaso» o «Guardar cambio», pegado abajo. Al pasar de Gasto a Mover o al revés se lleva el monto, la cuenta, la fecha y el concepto |
| **ReceiveForm** | Cobrar (M9): arriba, el ingreso (emoji, nombre, mes y lo esperado con su «⏳ Esperado»); la cuenta donde llegó; «Llegó», protagonista; en bolívares, «Dólares que se reconocen», con lo esperado puesto, y la tasa que resulta. El «Reparto en dólares», propuesto desde el plan: cada línea con su sobre, sus dólares, lo que le faltaba según el plan y sus Bs a la tasa (la última se queda con el redondeo, `R9`); «Resto aquí», «Agregar otro sobre» y «Falta por repartir». Debajo, cómo quedan los sobres; fecha, concepto (el nombre del ingreso) y comisión plegada. «Guardar cobro · Bs X» pegado abajo |
| **PlanForm** | Planear un mes (M10), como la hoja PRESUPUESTO: los ingresos esperados, cada uno con su nombre, su $ y «✅ Cobrado» o la X para quitarlo, y «Agregar ingreso»; el plan en el orden del presupuesto, cada sobre con su $ a la vista y, plegadas debajo, su fuente y su acción («Bono · Cambiar a USDT»). Al desplegarlas, los ingresos del mes como botones que se eligen y se sueltan, que añaden o quitan su nombre sin tocar el resto del texto, y las acciones ya usadas. «Agregar un sobre al plan». Pegado abajo, el cuadre («Se espera», «Planeado», «Falta por planear» en `danger`, o «Cuadra») y «Guardar» |
| **PrepareMonth** | Al final del último mes con presupuesto, el siguiente: su nombre, que todavía no tiene presupuesto y que se prepara copiando ese, y «Preparar diciembre», que abre Planear. En un mes sin presupuesto que es el que toca, el mismo botón. Arriba, en cualquier mes con presupuesto, «Editar» (un botón `outline` con su lápiz, como «Agregar» en Deudas) |
| **Sobres y cuentas** | En Ajustes (M11): los sobres en el orden del presupuesto y las cuentas por moneda, cada uno lleva a su formulario; «Agregar sobre» y «Agregar cuenta» (`outline`, con su ＋) junto a cada título. Los archivados, plegados al final de cada lista («Archivados · 4»), en `ink-muted` |
| **EnvelopeForm** y **AccountForm** | Un sobre: nombre y emoji (un campo corto, centrado); «Otro», sin emoji. Una cuenta: nombre y, al crearla, la moneda con `Segmented`; después, una línea que dice que no cambia. «Guardar» pegado abajo, como en los demás formularios |
| **RetireActions** | Debajo del formulario, qué hacer si ya no se usa (`R20`): «Borrar» si no tiene nada; si no, «Archivar», con lo que eso significa, y desactivado con el porqué cuando todavía no se puede («Tiene $ 20,00 en Billetera B: muévelo a otro sobre antes de archivarlo»). Archivado, «En el archivo» y «Reactivar». Todo con «Deshacer» en el aviso |
| **AmountInput** | Un monto escrito como en un cajero, con el teclado numérico del sistema: cada cifra entra por la derecha («0,01 → 0,12 → 1,23») y borrar saca la última; la coma no se escribe nunca y los miles se ponen solos. Pegar un monto lo reemplaza entero. En Registrar va grande (`hero`): sin caja, subrayado, y con el foco el subrayado pasa a `brand` |
| **EnvelopePicker** | El sobre en botones de dos en dos, cada uno con su emoji, su nombre (cortado con «…» si no cabe) y lo que tiene en la cuenta, en `overdrawn` si es negativo. Arriba, los seis más usados en esa cuenta en los últimos 60 días, fijados al abrir para que no salten; «Más sobres (N)» enseña los demás en el orden del presupuesto, con «Otro» al final y su borde punteado. Ninguno viene elegido; el elegido va en `brand-soft` con borde `brand` |
| **DayField** | La fecha en tres botones, «Hoy · Ayer · Otro día»; «Otro día» abre el calendario del teléfono |
| **AmountInput** | Un monto con el símbolo de su moneda delante y el teclado numérico; se lee en céntimos con enteros |
| **BudgetCheckList** | El cuadre del mes (`R12`): ✅ si cuadra o, en `overdrawn` con su icono, por cuánto no. Avisa; nunca impide |
| **ScreenHeader** | Atrás, el título y el saldo de lo que se mira, y a la derecha la acción de la pantalla si la tiene («Agregar» en Deudas, en `outline`). La primera pantalla de una sección va sin flecha; Ajustes, que no tiene pestaña, la lleva |
| **TabBar** | La barra de secciones, abajo y en `surface-raised`: Inicio · Sobres · ＋ Registrar · Presupuesto · Deudas, las cinco del mismo ancho. El ＋ del centro, en un círculo `brand` con `shadow-card`, no es una sección: abre Registrar con la cuenta o el sobre de la pantalla en la que se está. La sección activa va en `brand`; las demás, en `ink-muted`. Ajustes no tiene pestaña: se abre con el engranaje junto al saludo de Inicio. Cada pantalla deja abajo su hueco (`--tab-bar-height`) |
| **States** | Cargando, vacío, error y sin conexión (abajo) |

## Estados

- **Cargando:** el esqueleto de lo que va a venir, en `surface-sunken`. Sin ruedas que giran.
- **Vacío:** qué falta: «Sin movimientos en septiembre».
- **Error:** qué pasó y qué hacer: «No se pudieron cargar los saldos.» y «Reintentar».
- **Sin conexión:** lo último guardado, con el aviso «Sin conexión · datos de las 8:15»
  (si no es de hoy, con el día). Al volver la red se recarga sola, y también al estirar
  hacia abajo.
- **Sin actualizar:** hay red pero la base no respondió. Lo último guardado, con el
  aviso «No se pudo actualizar · datos de las 8:15».

## Voz y textos

- De tú, en español y en frases cortas. Mayúscula solo al principio.
- Las palabras del Excel: cuenta, sobre, «Otro», cobro, descubierto, restante. Nunca
  «categoría», «billetera virtual» ni «balance».
- Sin exclamaciones ni urgencia. Los errores dicen qué pasó y qué hacer, sin disculpas.
- Los emoji son de los sobres y de los ingresos, como en el Excel, y ✅/⏳ dicen lo
  cobrado o entregado y lo pendiente, también como en el Excel. Nunca de adorno en
  títulos, botones ni avisos.
- «Otro» va entre comillas latinas dentro de una frase.
- Un aviso dice qué pasó, corto y en pasado («Gasto guardado», «Deuda borrada»), y lo que
  se acaba de guardar o borrar se arregla con su «Deshacer», no preguntando antes. Solo
  preguntaría algo que borre varias cosas a la vez.

## Iconos

Lucide (`lucide-react`), con trazo de 2 px, en 20 o 24 px y del color del texto que
acompañan: flecha atrás, chevrones del mes, `wifi-off`, `refresh-cw`, los de la barra
(`house`, `mail`, `plus`, `chart-pie` y `hand-coins`), el engranaje de Ajustes
(`settings`) y la `x` que cierra una hoja o un aviso. Un aviso del cuadre lleva
`triangle-alert` en `overdrawn`. El logotipo es el icono de la app
(`apps/web/public/favicon.svg`): un sobre sobre `brand` con la moneda en `coin`. Es
provisional desde M0.

## Accesibilidad

- Cada texto da al menos **4,5:1** sobre los fondos en los que se usa, en los dos temas;
  los bordes de control y el foco, **3:1**.
- Lo que entra y lo que sale no se distinguen solo por el color: el signo lo dice. Las
  monedas, tampoco: su símbolo. Ni «Otro»: va sin emoji y con borde punteado.
- Todo lo que se toca mide al menos `tap`, y el foco de teclado siempre se ve.
- Las animaciones se apagan con `prefers-reduced-motion`.
