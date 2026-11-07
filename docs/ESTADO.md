# Estado

## Ahora: la app en uso, sin módulo en curso

El **2026-11-01 fue el corte**: octubre se terminó en el Excel, la base se recargó una
última vez (todo hasta octubre, y el presupuesto y las deudas de noviembre), con los 468
saldos iguales al Excel, y desde ese día la fuente es la app. El Excel se jubila: los
libros quedan en `privado/excels/` como histórico. Lo registrado en la app hasta octubre
ya estaba en el Excel; su copia está en `privado/respaldos/`.

Desde el corte, la marca está puesta (la recarga se niega), lo importado se corrige como
lo demás, los meses se cierran solos el día 5 del siguiente (`R21`) y hay copias de la base
en `privado/respaldos/` (ADR 0009).


Cerrados: M0 · Cimientos el 2026-10-14 (`docs/modulos/M0-cimientos.md`), M1 ·
Histórico el 2026-10-15 (`docs/modulos/M1-historico.md`), M2 · Inicio y cuentas el
2026-10-15 (`docs/modulos/M2-inicio-y-cuentas.md`), M3 · Sobres el 2026-10-19
(`docs/modulos/M3-sobres.md`), M4 · Presupuesto el 2026-10-20
(`docs/modulos/M4-presupuesto.md`), M5 · Deudas el 2026-10-20
(`docs/modulos/M5-deudas.md`), M6 · Gastos, ingresos y deudas el 2026-10-20
(`docs/modulos/M6-gastos-ingresos-y-deudas.md`), M7 · Diseño y experiencia el
2026-10-21 (`docs/modulos/M7-diseno-y-experiencia.md`), y M8 · Entre sobres y cuentas,
M9 · Cobros y reparto, M10 · El mes y M11 · Sobres y cuentas el 2026-11-01
(`docs/modulos/M8-entre-sobres-y-cuentas.md`, `M9-cobros-y-reparto.md`, `M10-el-mes.md` y
`M11-sobres-y-cuentas.md`), y M12 · Después del corte el 2026-11-07
(`docs/modulos/M12-despues-del-corte.md`).

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
| M11 | Sobres y cuentas | Crear; borrar lo que no tiene nada; archivar lo que tiene historia y está en cero | Ídem |
| — | **Corte** | El primer día de un mes, la app pasa a ser la fuente y el Excel se jubila | Hecho el 2026-11-01 |
| M12 | Después del corte | La recarga fijada, corregir lo importado, meses cerrados y copias de la base | Corrigen un mes cerrado abriéndolo, y hay una copia que se restauró |

## Decisiones ya tomadas — no volver a preguntarlas

Las del dominio (cómo se traduce el Excel) están en `docs/DOMINIO.md` §6. Aquí, las
del producto:

- **Churupitos es esta versión** (2026-10-20): la oficial, la que sigue creciendo. La v1
  y la v2 se borraron; de la v2 quedan su crítica de diseño y su investigación en
  `privado/investigacion/v2/`.
- **Mobile first, Android.** Los dos usan Android. Desde el corte, el Excel no se usa.
- **Sin conexión = solo lectura**: se ven los últimos datos guardados, se recarga al
  volver la red o al estirar hacia abajo. No hay cola de escrituras.
- **Un solo proyecto de Supabase.** Hasta el corte se vaciaba y se recargaba desde los
  Excels; desde el corte es la fuente y no se recarga.
- **El corte fue el 2026-11-01** (decisión del autor): octubre se cerró en el Excel y
  noviembre se lleva solo en la app. Los Excels fueron el respaldo hasta ese día; desde
  entonces hacen falta copias de la base (M12).
- **Hasta el corte se registró en paralelo** (del 2026-10-20 al 2026-10-31): en el Excel
  y en la app. Desde el corte, lo importado se corrige como lo demás (M12), salvo los
  ajustes del arrastre, y los meses pasados se cierran solos (`R21`).
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
- **Rellenar Registrar desde una captura** (2026-10-21, del autor): sacar la fecha, el
  monto y la cuenta, sin guardar solo. Probado el 2026-11-07 con Tesseract.js en Chrome, en
  el propio dispositivo y sin servicios de pago (regla 7): acertó en las 5 capturas, de 4
  bancos, pasándolas antes a grises. Falta medirlo en un teléfono y probar fotos de
  facturas. El concepto de las capturas no sirve: casi siempre dice «pago».
- **Vibración al guardar**, con un interruptor en Ajustes (fuera de M7).
