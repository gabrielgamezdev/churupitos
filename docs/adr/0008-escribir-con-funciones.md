# ADR 0008 — La app escribe con funciones de la base

- **Fecha:** 2026-10-20
- **Estado:** aceptada

## Contexto
Hasta M5 la app solo leía: cada tabla tenía permiso de lectura para los miembros del
hogar y ninguno de escritura. En M6 empieza a registrar gastos e ingresos.

Una operación son varias filas: su cabecera y sus asientos, y una comisión es un
asiento más (`R16`). La API de Supabase escribe una tabla por petición, así que, con
permiso directo sobre las tablas, la app tendría que escribir la cabecera y los
asientos en peticiones separadas: si la red se corta a la mitad, queda una operación a
medias. Y cualquiera con la sesión de un miembro podría escribir en cualquier tabla
filas que la app nunca escribiría.

## Decisión
- **La app escribe solo con funciones de la base**, una por cosa que se hace:
  `save_operation` crea o corrige una operación entera, con sus asientos, y
  `delete_operation` la borra. Cada llamada es una transacción: se guarda todo o nada.
- **Las tablas siguen sin permiso de escritura** para la app. Las funciones son
  `security definer` y comprueban ellas mismas que quien llama es del hogar; las
  pruebas de permisos fallan si aparece otra función así sin decirlo.
- **Las funciones aplican las reglas antes de responder**: la forma de cada tipo
  (`R5`), las de la tabla y las suyas. Un descubierto no es un error (`R6`).
- **El identificador lo pone la app** al abrir el formulario: guardar dos veces lo
  mismo corrige la operación en vez de duplicarla.
- **Lo importado no se toca desde la app** hasta el corte: las funciones solo corrigen
  o borran operaciones con autor.

## Consecuencias
- Cada cosa nueva que la app escriba (traspasos, cobros, deudas) llega con su función,
  sus permisos y sus pruebas, en vez de con un permiso sobre una tabla.
- Las reglas viven en un solo sitio (regla 4 de `AGENTS.md`): la app avisa antes, pero
  quien impide es la base.
- Sin conexión no se puede escribir: no hay cola de escrituras (`docs/ESTADO.md`).
