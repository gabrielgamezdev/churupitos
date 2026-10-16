# M2 · Inicio y cuentas

- **Estado:** en curso (desde 2026-10-15). El plan y el design system están aprobados.
- **Objetivo:** ver en el teléfono lo que hay hoy en cada moneda, las cuentas de cada
  una y el libro de cada cuenta, mes a mes, y poder compararlo con el Excel.

## Decisiones (2026-10-15)

- **El histórico se recorre dentro de cada cuenta**, como en la v2: el inicio y la lista
  de cuentas muestran hoy, y en una cuenta se pasa de mes en mes.
- **El libro va con lo más nuevo arriba**, y el restante es el que quedó después de
  cada movimiento.
- **La pantalla de una cuenta enseña también sus sobres**: cuánto hay de cada uno en ella.
- **Claro y oscuro, según el teléfono.** Elegirlo a mano y los temas propios llegan
  más adelante (`docs/ESTADO.md`).
- **Los sobres llevan su emoji**, como en el Excel.
- **La parte de «Otro» de cada cuenta se ve**, para que la suma de las cuentas cuadre
  con el total con «Otro».
- **Sin barra de secciones**: en M2 solo existe el inicio. La barra llega en M3.
- **Las pantallas no se dibujan antes**: se diseñan directamente en la app con el design
  system, y lo que haya que mejorar del diseño sale al usarla. Los dos prefieren verla
  funcionando antes que seguir afinando el diseño en papel.

## Pantallas

Todas leen de las funciones de saldos de la base (R2) con la sesión de quien usa el
teléfono, y todas tienen sus estados: cargando, vacío, error y sin conexión (lo último
guardado, con la hora). Se recargan al volver la red y al estirar hacia abajo.

| Pantalla | Qué enseña | De dónde sale |
|---|---|---|
| **Inicio** | El saludo y una tarjeta por moneda: lo vuestro de hoy en grande, el total con «Otro» y cuántas cuentas hay | `currency_totals()` |
| **Una moneda** | Sus cuentas con el saldo de hoy y, si la tienen, su parte de «Otro» | `account_balances()` |
| **Una cuenta** | Su saldo; sus sobres, con los descubiertos marcados; el mes con su saldo al empezar y al cerrar; el libro del mes por días; al tocar un movimiento, su operación entera | `cell_balances()`, `account_balances(fecha)`, `account_ledger` y los asientos de la operación |

## Hecho cuando

- Los dos abren en su teléfono el inicio, las dos monedas, cada cuenta y el libro de un
  par de meses, lo comparan con el Excel y coincide.
- Se ve igual de bien en claro y en oscuro, y sin conexión enseña lo último guardado.
- `npm run check` en verde, en local y en la CI.

## Pasos

1. [x] **Plan y design system aprobados** por los dos (2026-10-15). El design system es
   `docs/DESIGN_SYSTEM.md`; la guía de estilo de solo lectura (un artefacto privado de
   Claude) fue una vista de ese documento hasta el paso 2.
2. [x] **El design system en la app** (2026-10-15): sus tokens en el CSS (claro y oscuro
   según el teléfono), los componentes base (importes, etiquetas, filas y estados) y la
   galería (`/gallery`) con los componentes de verdad, que sustituye a la guía de estilo.
   Los componentes de cada pantalla entran en la galería al construirse.
3. [x] **Los datos que faltan** (2026-10-15): el emoji de cada sobre (columna, catálogo y
   recarga, en local y en la nube) y la parte de «Otro» de cada cuenta en
   `account_balances` (`third_party_cents`).
4. [x] **Inicio** (2026-10-15), con estirar para recargar y el aviso de sin conexión. Lo
   visto se guarda en el teléfono 14 días, y sin red se entra con la sesión guardada.
5. [x] **Una moneda** (2026-10-15): sus cuentas (`/currencies/ves`, `/currencies/usd`), con
   la parte de «Otro» de cada una. Las tarjetas del inicio llevan a ella.
6. [x] **Una cuenta** (2026-10-15): cabecera, sus sobres, el mes y el libro, con el
   detalle de cada operación (`/accounts/<id>?month=2026-09`). Cambiar de mes no deja
   rastro en el historial: el atrás de Android sale de la cuenta.
7. [ ] **En los teléfonos**: los dos lo comparan con el Excel.

Cada paso termina con su commit; los pasos 2, 6 y 7 terminan además con un push.

## Tope de complejidad

- **Pantallas:** 3, más el detalle que se despliega en el libro.
- **Nada se escribe**: ni un formulario. Registrar es de M6 en adelante.
- **Datos:** una columna nueva (el emoji) y una función ampliada; ninguna tabla nueva.

## Fuera de M2

- Los sobres por su cuenta, la vista «cuánto tengo en dónde» completa (M3).
- El presupuesto (M4) y las deudas (M5).
- Registrar y editar movimientos (M6 en adelante).
- Elegir el tema a mano y los temas propios.
