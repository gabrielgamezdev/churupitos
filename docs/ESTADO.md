# Estado

## Ahora: M8 · Entre sobres y cuentas (en curso)

Mover entre sobres, traspasar entre cuentas, cambiar de divisa y cubrir un descubierto
desde la app. El plan, aprobado, está en
`docs/modulos/M8-entre-sobres-y-cuentas.md`.

Hasta el corte se sigue registrando **en paralelo**, en el Excel y en la app.

Al empezar noviembre de 2026, cuando su Excel tenga el arrastre de verdad, se recarga
la base, borrando lo registrado en la app (`README.md`): hasta entonces noviembre es
solo de planificación y el oráculo no lo compara (`docs/DOMINIO.md` §2).

Cerrados: M0 · Cimientos el 2026-10-14 (`docs/modulos/M0-cimientos.md`), M1 ·
Histórico el 2026-10-15 (`docs/modulos/M1-historico.md`), M2 · Inicio y cuentas el
2026-10-15 (`docs/modulos/M2-inicio-y-cuentas.md`), M3 · Sobres el 2026-10-19
(`docs/modulos/M3-sobres.md`), M4 · Presupuesto el 2026-10-20
(`docs/modulos/M4-presupuesto.md`), M5 · Deudas el 2026-10-20
(`docs/modulos/M5-deudas.md`), M6 · Gastos, ingresos y deudas el 2026-10-20
(`docs/modulos/M6-gastos-ingresos-y-deudas.md`) y M7 · Diseño y experiencia el
2026-10-21 (`docs/modulos/M7-diseno-y-experiencia.md`).

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
| M6 | Gastos, ingresos y deudas | Crear, editar y borrar; la comisión, a mano; marcar las cuotas pagadas | Lo usan a diario |
| M7 | Diseño y experiencia | Registrar más rápido, corregir y borrar desde cualquier lista, deshacer, color e Inicio con lo que pide atención | Lo usan a diario y les gusta más |
| M8 | Entre sobres y cuentas | Préstamos entre sobres, traspasos, cambio de divisa | Lo usan a diario |
| M9 | Cobros y reparto | Ingreso esperado → cobro → reparto por sobre | Ídem |
| M10 | El mes | Plan del mes y apertura del siguiente | Ídem |
| — | **Corte** | El primer día de un mes, la app pasa a ser la fuente y el Excel se jubila | — |

## Decisiones ya tomadas — no volver a preguntarlas

Las del dominio (cómo se traduce el Excel) están en `docs/DOMINIO.md` §6. Aquí, las
del producto:

- **Churupitos es esta versión** (2026-10-20): la oficial, la que sigue creciendo. La v1
  y la v2 se borraron; de la v2 quedan su crítica de diseño y su investigación en
  `privado/investigacion/v2/`.
- **Mobile first, Android.** Los dos usan Android. La PC sigue con el Excel mientras
  la app madura.
- **Sin conexión = solo lectura**: se ven los últimos datos guardados, se recarga al
  volver la red o al estirar hacia abajo. No hay cola de escrituras.
- **Un solo proyecto de Supabase.** Hasta el corte, la base se vacía y se recarga
  desde los Excels; un candado impide hacerlo después del corte sin pedirlo.
- **Los Excels son el respaldo hasta el corte**: si algo de la app no convence, se
  compara, se ajusta el importador y se recarga todo.
- **Hasta el corte se registra en paralelo** (2026-10-20): en el Excel y en la app. Al
  recargar, lo registrado en la app se borra a propósito, porque el Excel ya lo tiene, y
  lo importado no se corrige desde la app.
- **El inicio** sigue el de la versión anterior: una tarjeta por moneda → cuentas
  de esa moneda → libro de la cuenta.
- **Claro y oscuro, según el teléfono** (2026-10-15).
- **Repositorio público** en GitHub, como portafolio, con licencia MIT.
- **Costo cero**: planes gratis y sin método de pago en Cloudflare, Supabase y GitHub,
  y Cloudflare solo sirve estáticos (ADR 0007). La app lleva un freno: más de 60
  consultas en un minuto la detienen hasta recargar.

## Pendiente de decidir

- Qué pantallas exactas tienen M8 y los siguientes (antes de cada uno).
- La numeración cambió el 2026-10-20: M7 pasó a ser Diseño y experiencia y los demás se
  corrieron uno. Los planes ya cerrados se ajustaron en esas referencias.

## Más adelante

Ideas del autor que no son de ningún módulo todavía. No son indispensables, pero no se
pierden:

- **Ajustes**: elegir el tema (claro, oscuro o el del teléfono).
- **Temas propios** después: un oscuro con otros colores, por ejemplo.
- **El selector de cuenta de Registrar** (2026-10-21): a una de las dos personas le
  abrumó la lista del sistema, con las cuentas agrupadas por moneda. Opciones: botones
  como los de los sobres, con las más usadas primero, o solo las de la moneda de siempre.
- **Cuotas de montos distintos** (2026-10-21). Hoy cada cuota es una deuda aparte, así
  que una se corrige sola después de agregarlas; faltaría poder cambiar el monto de cada
  una en la lista, antes de guardar. Junto con «3 de 6» (fuera de M7).
- **Rellenar Registrar desde una foto** (2026-10-21, del autor): de un capture, una
  factura o una nota de entrega, sacar la fecha, el monto y el concepto, sin guardar
  solo. Leer texto de una imagen con un servicio de pago choca con la regla 7: tendría
  que ser en el propio teléfono o gratis de verdad, y con su ADR.
- **Vibración al guardar**, con un interruptor en Ajustes (fuera de M7).
