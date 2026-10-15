# Seguridad

Churupitos es la app de finanzas de un hogar. El código es público; los datos no
están en este repositorio, sino en una base de Supabase detrás del login y de
permisos por fila.

## Cómo avisar de un fallo

**No abras un issue público.** Usa «Report a vulnerability» en la pestaña
*Security* del repositorio: el aviso llega en privado. Es un proyecto personal, así
que no hay plazos garantizados, pero un aviso de seguridad va antes que lo demás.

## Qué cuenta como fallo

- Leer o escribir datos sin una de las cuentas del hogar: una tabla, vista o función
  que se salte los permisos por fila.
- Un secreto o un dato personal publicado en el repositorio o en su historial.
- Algo que permita generar costos en las cuentas de Cloudflare, Supabase o GitHub.

## Qué no lo es

- **La URL de Supabase y su clave publicable** van dentro de la app a propósito: son
  públicas por diseño. Lo que protege los datos son los permisos por fila, que las
  pruebas de la base comprueban en cada cambio (`AGENTS.md`, regla 5).
- **La pantalla de inicio de sesión es pública**, y el registro está cerrado: las
  cuentas se crean a mano.

## Versiones

Solo la de `main`, que es la publicada.
