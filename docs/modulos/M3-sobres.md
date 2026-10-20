# M3 · Sobres

- **Estado:** en curso (desde 2026-10-19). El plan está aprobado.
- **Objetivo:** ver en el teléfono cuánto tiene cada sobre, en qué cuentas está ese
  dinero y en qué se ha ido mes a mes, y poder compararlo con el Excel. Y moverse por
  la app con una barra de secciones, como en la v2.

## Decisiones (2026-10-19)

- **La barra de secciones abajo, como la de la v2**: Inicio en el centro, con su botón
  propio. En M3 lleva Sobres · Inicio · Ajustes; Deudas y Presupuesto entran en su sitio
  (Sobres · Deudas · Inicio · Presupuesto · Ajustes) cuando lleguen sus módulos.
- **Ajustes** es la sección de lo que no es dinero: quién tiene la sesión, cerrar
  sesión, la galería y la versión, que salen del pie del inicio. Elegir el tema llegará
  ahí más adelante (`docs/ESTADO.md`).
- **Un sobre enseña su libro mes a mes**: sus movimientos de todas las cuentas, como
  en la v2. Primero lo que tiene en cada moneda y en qué cuentas está, y después el
  libro.
- **La lista de sobres** va en el orden del presupuesto, con lo que tiene cada uno en
  Bs y en $ por separado; «Otro» al final. Los sobres en cero (ya gastados este mes, o
  de meses pasados que no se usan) van al final, juntos y plegados, para que no estorben.
- **El libro de un sobre** mezcla las dos monedas por fecha, cada movimiento con su
  cuenta y el restante del sobre en su moneda. El selector de mes enseña el saldo al
  empezar y al cerrar de cada moneda que tenga. Un filtro por moneda, como el de la v2,
  solo si hace falta al usarlo.
- **Todo se enlaza**: en una cuenta, cada sobre lleva a ese sobre; en un sobre, cada
  cuenta lleva a esa cuenta.

## Pantallas

| Pantalla | Qué enseña | De dónde sale |
|---|---|---|
| **Sobres** | Cada sobre con su emoji, lo que tiene en Bs y en $, y los descubiertos marcados | `envelope_balances()` y `envelopes` |
| **Un sobre** | Lo que tiene en cada moneda; en qué cuentas está; el mes con su saldo al empezar y al cerrar; su libro por días, con el detalle de cada operación | `cell_balances()`, `envelope_balances(fecha)` y una vista nueva, `envelope_ledger` |
| **Ajustes** | Quién tiene la sesión, cerrar sesión, la galería y la versión | La sesión |

Todas con los estados de M2: cargando, vacío, error, sin conexión y estirar para recargar.

## Hecho cuando

- Los sobres y el libro de un par de sobres, en un par de meses, coinciden con el Excel
  en el teléfono.
- La barra lleva a cada sección, y el atrás de Android hace lo esperado.
- `npm run check` en verde, en local y en la CI.

## Pasos

1. [x] **Plan aprobado** por el autor (2026-10-19).
2. [x] **La barra de secciones y Ajustes** (2026-10-19): Inicio al centro; tocar la sección en la que
   se está vuelve a su primera pantalla; el atrás de Android vuelve a Inicio desde la
   primera pantalla de cualquier sección.
3. [x] **El libro del sobre en la base** (2026-10-19, también en la nube): la vista `envelope_ledger`, con el restante del
   sobre en cada moneda después de cada asiento (R2, R14), sus permisos y sus pruebas.
4. [x] **Sobres**: la lista (2026-10-19).
5. [ ] **Un sobre**: lo que tiene, en qué cuentas, el mes y el libro; los enlaces entre
   cuentas y sobres.
6. [ ] **En los teléfonos**: lo comparan con el Excel.

Cada paso termina con su commit; los pasos 2, 5 y 6 terminan además con un push.

## Tope de complejidad

- **Pantallas:** 3 (Sobres, un sobre y Ajustes), más la barra.
- **Nada se escribe**: ni un formulario.
- **Datos:** una vista nueva; ninguna tabla nueva.

## Fuera de M3

- El presupuesto (M4) y las deudas (M5), aunque su sitio en la barra ya esté pensado.
- El punto rojo de descubiertos sobre Inicio que tenía la v2.
- Que cada sección recuerde en qué pantalla se quedó al cambiar de sección.
- Registrar y editar (M6 en adelante), y elegir el tema.
