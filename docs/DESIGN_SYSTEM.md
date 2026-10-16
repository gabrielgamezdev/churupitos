# Design system

**La autoridad del diseño de Churupitos**: cómo se ve y cómo habla la app. Si un valor
de aquí no coincide con el CSS de la app (`apps/web/src/styles.css`, desde el paso 3
de M2), es un error. La guía de estilo, un artefacto privado de Claude y de solo
lectura, es una vista de este documento para conversar sobre el diseño; cuando existan
los componentes, la sustituye una pantalla de galería dentro de la app.

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
  símbolo: `+Bs 400,00`, `−Bs 320,00`. Lo que entra en `money-in`; lo que sale en `money-out`.
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
| `money-out` | `#b42318` | `#f87171` | Importe de lo que sale, con su `−` |
| `overdrawn` | `#a14a07` | `#fbbf24` | Saldo por debajo de cero |
| `overdrawn-soft` | `#fdebd5` | `#3a2a07` | Fondo de la etiqueta «Descubierto» |
| `third-party` | `#46597a` | `#a9bddf` | El dinero de «Otro», que no es del hogar (`R11`) |
| `third-party-soft` | `#e5ebf4` | `#1d2636` | Fondo de la etiqueta de «Otro» |
| `ves` | = `brand` | = `brand` | Identidad de los bolívares: la etiqueta «Bs» |
| `ves-soft` | = `brand-soft` | = `brand-soft` | Fondo de la etiqueta «Bs» |
| `usd` | `#855300` | `#f9cf55` | Identidad de los dólares: la etiqueta «$», el dorado oscurecido para leerse |
| `usd-soft` | `#fbefcf` | `#3a2c08` | Fondo de la etiqueta «$» |
| `focus-ring` | = `brand` | = `brand` | Anillo de foco: 2px sólidos, separados 2px del control |

- `money-in` y `money-out` son **solo para movimientos**. Un saldo positivo nunca lleva color.
- Sobre un relleno `brand`, el texto es `on-brand`, nunca un blanco escrito a mano.
- `coin` nunca es texto ni un estado.

## Temas

La app sigue al teléfono: claro u oscuro según su configuración. El oscuro es un verde
casi negro, no un gris; su `brand` se aclara y el texto sobre él pasa a ser oscuro.
Elegir el tema a mano y los temas propios están apuntados para más adelante
(`docs/ESTADO.md`).

## Tipografía

Una sola familia: **Geist**, variable, la que ya carga la app (`@fontsource-variable/geist`).

| Estilo | Tamaño / interlineado | Peso | Para qué |
|---|---|---|---|
| `display-amount` | 32 / 38 px, −0,02 em | 650 | El saldo grande de la pantalla. Una vez por pantalla |
| `title` | 20 / 26 px, −0,01 em | 600 | El título de una pantalla |
| `heading` | 16 / 22 px | 600 | Secciones y el nombre de una moneda en su tarjeta |
| `body` | 15 / 22 px | 400 | El concepto de un movimiento y el texto corrido |
| `amount` | 15 / 22 px | 600 | El importe de un movimiento y el saldo de una cuenta en una lista |
| `amount-small` | 13 / 18 px | 500 | El restante después de un movimiento |
| `caption` | 13 / 18 px | 400 | Notas y datos secundarios, en `ink-muted` |
| `label` | 12 / 16 px, +0,02 em | 600 | Etiquetas (Bs, $, Otro, Descubierto, Comisión) y encabezados de día |

## Espacio y forma

- **Rejilla de 4 px:** `space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 ·
  `space-5` 20 · `space-6` 24 · `space-8` 32.
- Cada pantalla deja `space-4` a los lados y `space-6` entre secciones.
- **`tap` = 48 px:** el alto mínimo de todo lo que se toca. Es una app para el pulgar.
- **Radios:** `radius-sm` 6 px en etiquetas; `radius-md` 10 px en botones, campos y el
  selector de mes; `radius-lg` 16 px en tarjetas y bloques de lista; `radius-pill` en
  el aviso de sin conexión.
- **Sombra:** solo las tarjetas de moneda del inicio llevan `shadow-card`. En oscuro es
  un filo claro, no una sombra. Lo demás son listas: filas separadas por `hairline`
  dentro de un bloque `surface-raised`.

## Componentes

Los de M2. Cada uno lee de la base; ninguno calcula un saldo (`R2`).

| Componente | Qué es |
|---|---|
| **Money** | Pinta un importe: movimiento con signo, saldo o descubierto |
| **CurrencyCard** | Una moneda en el inicio: lo vuestro en grande; el total con «Otro» y cuántas cuentas, debajo |
| **AccountRow** | Una cuenta en la lista de su moneda, con su parte de «Otro» si la tiene. Las cuentas en cero siguen, en `ink-muted` |
| **EnvelopeChip** | El sobre de un movimiento: su emoji y su nombre. «Otro», sin emoji y en `third-party` |
| **EnvelopeSplit** | Los sobres de una cuenta, con los descubiertos marcados; suman el saldo de la cuenta |
| **LedgerList** | El libro del mes, por días y con lo más nuevo arriba: concepto, sobre, importe y restante. Marca las comisiones (`R16`) y las fechas aproximadas (`R15`); al tocar una fila se despliega su operación entera |
| **MonthPicker** | El mes del libro, con el saldo al empezar (`R7`) y al cerrar |
| **ScreenHeader** | Atrás, el título y el saldo de lo que se mira. El inicio no la lleva |
| **States** | Cargando, vacío, error y sin conexión (abajo) |

## Estados

- **Cargando:** el esqueleto de lo que va a venir, en `surface-sunken`. Sin ruedas que giran.
- **Vacío:** qué falta: «Sin movimientos en septiembre».
- **Error:** qué pasó y qué hacer: «No se pudieron cargar los saldos.» y «Reintentar».
- **Sin conexión:** lo último guardado, con el aviso «Sin conexión · datos de las 8:15».
  Al volver la red se recarga sola, y también al estirar hacia abajo.

## Voz y textos

- De tú, en español y en frases cortas. Mayúscula solo al principio.
- Las palabras del Excel: cuenta, sobre, «Otro», cobro, descubierto, restante. Nunca
  «categoría», «billetera virtual» ni «balance».
- Sin exclamaciones ni urgencia. Los errores dicen qué pasó y qué hacer, sin disculpas.
- Los emoji son de los sobres. Nunca de adorno en títulos, botones ni avisos.
- «Otro» va entre comillas latinas dentro de una frase.

## Iconos

Lucide (`lucide-react`), con trazo de 2 px, en 20 o 24 px y del color del texto que
acompañan: flecha atrás, chevrones del mes, `wifi-off`, `refresh-cw`. El logotipo es el
icono de la app (`apps/web/public/favicon.svg`): un sobre sobre `brand` con la moneda en
`coin`. Es provisional desde M0.

## Accesibilidad

- Cada texto da al menos **4,5:1** sobre los fondos en los que se usa, en los dos temas;
  los bordes de control y el foco, **3:1**.
- `money-in` y `money-out` no se distinguen solo por el color: el signo lo dice.
- Todo lo que se toca mide al menos `tap`, y el foco de teclado siempre se ve.
- Las animaciones se apagan con `prefers-reduced-motion`.
