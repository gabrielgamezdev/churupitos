# Estado

## Ahora: M0 · Cimientos

Repo, documentación, barrido de privacidad, PWA mínima con login y Supabase local
y en la nube. Plan y casillas en `docs/modulos/M0-cimientos.md`.

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
- **Repositorio público** en GitHub, como portafolio.

## Pendiente de decidir

- Antes del primer commit (paso 6 de M0):
  - en qué cuenta de GitHub vive el repositorio;
  - su correo `noreply`;
  - revisar la lista privada de nombres del barrido;
  - la licencia (propuesta: MIT).
- Qué pantallas exactas tiene cada módulo de «ver» y qué mostrar de las deudas (antes de M2).
