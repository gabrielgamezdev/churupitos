# Estado

## Ahora: M7 · Diseño y experiencia (en curso)

Lo que pidieron al usar M6: registrar más rápido y con un formulario más bonito, y
corregir o borrar sin buscar. Sale de una investigación de diseño (sus notas, fuera de
git, en `privado/investigacion/diseno/`); el plan, aprobado, está en
`docs/modulos/M7-diseno-y-experiencia.md`.

Hasta el corte se sigue registrando **en paralelo**, en el Excel y en la app.

Al empezar noviembre de 2026, cuando su Excel tenga el arrastre de verdad, se recarga
la base, borrando lo registrado en la app (`README.md`): hasta entonces noviembre es
solo de planificación y el oráculo no lo compara (`docs/DOMINIO.md` §2).

Cerrados: M0 · Cimientos el 2026-10-14 (`docs/modulos/M0-cimientos.md`), M1 ·
Histórico el 2026-10-15 (`docs/modulos/M1-historico.md`), M2 · Inicio y cuentas el
2026-10-15 (`docs/modulos/M2-inicio-y-cuentas.md`), M3 · Sobres el 2026-10-19
(`docs/modulos/M3-sobres.md`), M4 · Presupuesto el 2026-10-20
(`docs/modulos/M4-presupuesto.md`), M5 · Deudas el 2026-10-20
(`docs/modulos/M5-deudas.md`) y M6 · Gastos, ingresos y deudas el 2026-10-20
(`docs/modulos/M6-gastos-ingresos-y-deudas.md`).

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
