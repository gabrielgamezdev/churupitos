# ADR 0007 — Costo cero por diseño, y que no dependa de que alguien se dé cuenta

- **Fecha:** 2026-10-15
- **Estado:** aceptada

## Contexto
Hay casos públicos de facturas de miles de dólares en plataformas en la nube por un
proceso mal hecho: un bucle que llama a un Worker, un almacén que se lee sin parar o
un ataque que hace millones de peticiones. Pasan cuando la cuenta tiene un método de
pago y un plan que cobra por uso, y nadie revisa a tiempo lo que se configuró, ni
la persona ni el asistente que escribió el código. El autor no puede asumir una
factura así.

Lo que dicen las plataformas (comprobado el 2026-10-15 en su documentación):

- **Cloudflare:** las peticiones a archivos estáticos son gratis y sin límite. El
  plan gratis de Workers no tiene cobros por exceso: pasado el límite diario,
  responde con un error. Workers Builds incluye 3.000 minutos de construcción al mes.
- **Supabase:** el plan gratis no se factura; al pasar un límite, restringe el proyecto.
- **GitHub Actions:** gratis en repositorios públicos. Sin método de pago, al agotar
  la cuota se bloquea, no se cobra.

## Decisión
- **Ninguna de las tres cuentas tiene método de pago**, y todas se quedan en el plan
  gratis. Si una plataforma pide una tarjeta para activar algo, se para ahí.
- **Cloudflare solo sirve estáticos:** sin script de Worker, sin almacenes, sin
  cron, sin caché de Workers y sin `run_worker_first`. Toda petición es a un archivo.
- **`ops/guardia-costos.mjs`** falla el check y la CI si `wrangler.jsonc` tiene una
  clave fuera de una lista cerrada. No avisa: bloquea.
- **La CI tiene topes duros de tiempo** y cancela las corridas viejas (ver
  `.github/workflows/`).
- Activar cualquier cosa que se pague por uso exige un ADR nuevo que lo justifique,
  y además añadir la clave a la lista de la guardia.

## Consecuencias
- El peor caso de un error es que algo deje de funcionar hasta el mes siguiente, no
  una factura.
- Funciones de servidor en Cloudflare, si algún día hacen falta, requieren revisar
  esta decisión primero.
