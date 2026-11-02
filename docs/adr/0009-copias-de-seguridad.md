# ADR 0009 — Copias de seguridad propias, en la computadora del autor

- **Fecha:** 2026-11-01
- **Estado:** aceptada

## Contexto
Hasta el corte, el respaldo eran los Excels: si la base se rompía, se recargaba entera
desde ellos. Desde el corte (2026-11-01) la base es la fuente y lo registrado en la app
no está en ningún otro sitio. Hace falta una copia que se pueda restaurar.

Lo que se descartó:
- **Las copias de Supabase:** dependen del plan, y no se pueden comprobar ni restaurar a
  voluntad en otra base, como la local.
- **Una copia automática en la CI:** el repositorio es público, y lo que guarda una
  ejecución lo podría descargar cualquiera. Los datos son personales (ADR 0004).
- **Un servicio de copias:** cuesta, o puede llegar a costar (regla 7, ADR 0007).

## Decisión
- **La copia se hace desde la computadora del autor,** con una orden (`README.md`), en
  `privado/respaldos/`, fuera de git. Es la base entera, tabla por tabla, en JSON escrito
  por la base misma: las fechas y los importes salen como ella los guarda.
- **Cada copia trae su manifiesto:** las filas de cada tabla y el saldo de cada cuenta.
- **Otra orden la restaura y la comprueba:** por defecto en la base local, sin la marca
  del corte, para comprobar cada cierto tiempo que las copias sirven. En una emergencia,
  en la nube, pidiéndolo dos veces. Si no cuadra con su manifiesto, no restaura nada.
- **La base anota cuándo se copió,** y desde el corte Inicio pide una copia cuando pasa
  un mes sin ninguna.

## Consecuencias
- Las copias dependen de que alguien las haga: el recordatorio lo pide, pero no lo hace.
- Viven en una sola computadora. Si se pierde, se pierden con ella: conviene guardar de
  vez en cuando alguna fuera de ella, también en privado.
- Una tabla nueva tiene que entrar en el orden de la restauración: la orden se niega si
  encuentra una que no conoce.
