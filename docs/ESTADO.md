# Estado

## Ahora: M1 · Histórico (por planificar)

El esquema completo de la base y el importador de todos los Excels, comprobado celda
a celda. Antes de escribir código se acuerda su plan en `docs/modulos/M1-historico.md`
y nace `docs/DOMINIO.md`.

M0 · Cimientos quedó cerrado el 2026-10-14: `docs/modulos/M0-cimientos.md`.

## Cómo se publica

Commits pequeños en local; **push** cuando hay algo que probar en el teléfono o al
cerrar un paso con el check en verde. Un push sube todos los commits pendientes y
dispara una sola CI y un solo despliegue. Las migraciones van a la nube a mano
(`db:push`), al final de cada paso y ya probadas en local.

## Los módulos

| # | Módulo | Qué hace | Hecho cuando |
|---|---|---|---|
| M0 | Cimientos | Repo, docs, privacidad, Supabase, PWA mínima con login | Los dos tienen la app instalada e inician sesión |
| M1 | Histórico | Esquema completo + importador de todos los meses, comprobado celda a celda contra el Excel | Cero diferencias y los datos en la nube |
| M2 | Inicio y cuentas | Tarjetas por moneda → cuentas de esa moneda → libro de la cuenta | Lo comparan con el Excel desde el teléfono |
| M3 | Sobres | Cuánto tiene cada sobre y en qué cuenta | Ídem |
| M4 | Presupuesto | Ingresos esperados y cobrados, plan por sobre, reglas de cuadre | Ídem |
| M5 | Deudas | Cuotas por fecha y total pendiente | Ídem |
| M6 | Gastos e ingresos | Crear, editar y borrar; la comisión, a mano | Lo usan a diario |
| M7 | Entre sobres y cuentas | Préstamos entre sobres, traspasos, cambio de divisa | Ídem |
| M8 | Cobros y reparto | Ingreso esperado → cobro → reparto por sobre | Ídem |
| M9 | El mes | Plan del mes y apertura del siguiente | Ídem |
| M10 | Deudas | Crear, pagar una cuota, quitarla | Ídem |
| — | **Corte** | El primer día de un mes, la app pasa a ser la fuente y el Excel se jubila | — |

## Decisiones ya tomadas — no volver a preguntarlas

Del producto (las de dominio se mudan a `docs/DOMINIO.md` cuando nazca, en M1):

- **Las mismas reglas que el Excel.** «Más simple» significa menos piezas técnicas,
  no menos reglas. Lo que la versión anterior añadió y el Excel no tiene es opcional.
- **Mobile first, Android.** Los dos usan Android. La PC sigue con el Excel mientras
  la app madura.
- **Sin conexión = solo lectura**: se ven los últimos datos guardados, se recarga al
  volver la red o al estirar hacia abajo. No hay cola de escrituras.
- **La celda cuenta × sobre es imprescindible**: hay que ver cuánto queda en cada
  banco y de qué sobre.
- **Todo el histórico antes de usar la app**, y que se vea tal cual el Excel.
- **Un solo proyecto de Supabase.** Hasta el corte, la base se vacía y se recarga
  desde los Excels; un candado impide hacerlo después del corte sin pedirlo.
- **Las comisiones se registran a mano** por ahora; nada automático.
- **El inicio** sigue el de la versión anterior: una tarjeta por moneda → cuentas
  de esa moneda → libro de la cuenta.
- **Repositorio público** en GitHub, como portafolio, con licencia MIT.
- **Costo cero**: planes gratis y sin método de pago en Cloudflare, Supabase y GitHub,
  y Cloudflare solo sirve estáticos (ADR 0007). La app lleva un freno: más de 60
  consultas en un minuto la detienen hasta recargar.

## Pendiente de decidir

- Qué pantallas exactas tiene cada módulo de «ver» y qué mostrar de las deudas (antes de M2).
