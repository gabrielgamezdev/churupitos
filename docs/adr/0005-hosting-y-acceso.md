# ADR 0005 — La PWA en Cloudflare y los datos en Supabase

- **Fecha:** 2026-10-12
- **Estado:** aceptada

## Contexto
Un *service worker* solo funciona en un contexto seguro: HTTPS con un certificado de
confianza, o `localhost`. Desde el teléfono, `http://192.168.x.x` no lo es, y sin
eso la PWA no se instala ni guarda nada. En la versión anterior esta decisión se dejó
para el final y fue parte de por qué nunca llegó a usarse.

## Decisión
- **La PWA se publica como archivos estáticos en Cloudflare** (Workers con *static
  assets*, plan gratis), con HTTPS automático y *fallback* de SPA. El hosting solo
  guarda el código de la app, el mismo que está público en GitHub; ningún dato.
- **Los datos están en Supabase**, detrás del login y de RLS. Abrir la URL de la app
  sin cuenta solo muestra la pantalla de inicio de sesión.
- **Registro cerrado**: las dos cuentas se crean a mano desde el panel de Supabase.
- **En el teléfono**: Chrome → «Instalar app». Las versiones nuevas se anuncian dentro
  de la app y se aplican al aceptar.
- **Desarrollo en el teléfono sin publicar**: depuración USB de Chrome con
  *port forwarding*, que hace del `localhost` de la PC un contexto seguro.
- **Scripts como el importador** se conectan directo a Postgres con el *pooler* en
  modo sesión, porque la conexión directa del plan gratis es solo IPv6.

## Alternativas descartadas
- **Servir desde la PC o desde la red de casa**: la PC no está siempre encendida, y
  exigiría certificados propios o una VPN.
- **GitHub Pages**: gratis, pero la app quedaría bajo una subruta y las rutas del
  navegador necesitarían trucos.
- **Cloudflare Access delante de la app**: complica la app instalada (sesiones que
  caducan, el manifest detrás del login) y no protege más los datos, que ya están
  protegidos en Supabase.

## Consecuencias
- No hay VPN, ni certificados propios, ni servidor encendido en casa.
- La «Site URL» de Supabase tiene que apuntar a la URL de la app, o los correos de
  recuperar la contraseña llevan a otro sitio.
