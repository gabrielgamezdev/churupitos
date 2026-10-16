# Churupitos

[![CI](https://github.com/gabrielgamezdev/churupitos/actions/workflows/ci.yml/badge.svg)](https://github.com/gabrielgamezdev/churupitos/actions/workflows/ci.yml)

App de finanzas del hogar para una pareja en Venezuela: **bolívares y dólares,
presupuesto por sobres y varias cuentas**. Es una PWA pensada para el teléfono, que
sustituye unos Excels mensuales donde cada sobre tiene dinero repartido entre varios
bancos, y cada ingreso llega con su propia tasa de cambio.

> **Estado:** en construcción, módulo **M3 · Sobres**. El plan completo está en
> [`docs/ESTADO.md`](docs/ESTADO.md).

## Qué la hace distinta

- **La unidad de saldo es la celda cuenta × sobre**: no basta con saber cuánto tiene
  «Ahorro», hay que saber en qué banco está, porque no se paga desde un banco con
  dinero que está en otro.
- **Dos monedas que nunca se mezclan**, y una tasa por ingreso en lugar de una tasa del día.
- **Ningún saldo se guarda**: todos se calculan a partir de los asientos, y el dinero
  son enteros de céntimos ([ADR 0002](docs/adr/0002-dinero-enteros.md),
  [ADR 0003](docs/adr/0003-saldos-derivados.md)).
- **Repositorio público sin un solo dato personal**, con un barrido de privacidad en
  cada commit y en cada push ([ADR 0004](docs/adr/0004-privacidad.md)).

## Stack

| Pieza | Tecnología |
|---|---|
| App | React 19, Vite, `vite-plugin-pwa`, Tailwind 4, shadcn/ui, TanStack Router y Query |
| Datos y login | Supabase: Postgres, Auth y RLS |
| Hosting | Cloudflare (estáticos) + Supabase Cloud |

Por qué este stack: [ADR 0001](docs/adr/0001-stack.md) y
[ADR 0005](docs/adr/0005-hosting-y-acceso.md).

## Estructura

```
apps/web/      la PWA
supabase/      migraciones, pruebas de la base y datos inventados para desarrollar
tools/importer el importador: de los Excels a la base, sin un solo dato dentro
ops/           barrido de privacidad
.githooks/     hooks de git: barrido y Conventional Commits
.github/       CI: el check en cada push y las pruebas de la base cuando cambia
docs/          estado, módulos, trampas y decisiones de arquitectura
```

## Cómo correrlo

Requisitos: Node 24, y Docker Desktop encendido para la base de datos local.

La primera vez, copia `apps/web/.env.example` como `apps/web/.env.local` y pon la
clave publicable que muestra `npx supabase status`.

```bash
npm install          # instala todo y activa los hooks de git
npm run db:start     # levanta Supabase en Docker (la primera vez descarga las imágenes)
npm run dev          # la app en http://localhost:5173, con recarga en caliente
npm run build        # la app construida, con su service worker
npm run preview      # sirve lo construido en http://localhost:4173: así se prueba la PWA
npm run check        # tipos, lint, pruebas, build y barrido de privacidad
npm run db:test      # pruebas de la base: permisos por fila incluidos
npm run db:reset     # borra la base local y la rehace: migraciones + datos inventados
npm run db:types     # regenera los tipos de TypeScript desde la base local
npm run db:stop      # apaga Supabase y libera la PC
npm run privacy:scan # solo el barrido de privacidad, sobre todo el repositorio
npm run costs:check  # comprueba que Cloudflare solo sirve estáticos (nada que cobre por uso)
```

**El importador** lee los Excels de `privado/excels/` con el catálogo de
`privado/import/catalogo.yml`, que dice qué hoja es cada cuenta, a qué sobre
corresponde cada texto y con qué emoji se pinta cada sobre. Lo que imprime lleva datos reales: solo se corre en local.

```bash
npm run import:read     # lee todos los meses y resume lo que encontró, con sus avisos
npm run import:dry-run  # lo carga en el Supabase local, lo compara con el Excel y lo deshace;
                        # el informe, con cada decisión por defecto, queda en privado/import/informe.md
npm run import:load     # lo mismo, pero vacía la base local y se queda escrito
```

La base solo se vacía con `reset_imported_data()`, que se niega si hay operaciones
registradas desde la app: esas no están en ningún Excel (el candado del corte).

Con Supabase levantado, el panel local está en http://localhost:54323 y los correos
que enviaría el login se ven en http://localhost:54324. Las cuentas de prueba, con
datos inventados, son `ana@ejemplo.test` y `beto@ejemplo.test`, con la contraseña
`churupitos-dev-1`.

El *service worker* solo existe en lo construido: para probar la instalación o el
aviso de versión nueva, `npm run build` y `npm run preview`, no `npm run dev`.

Para el barrido completo hace falta la lista de nombres privada: copia
`ops/barrido-nombres.example.txt` como `privado/barrido-nombres.txt` y rellénala.

## En la nube

**La base.** Una sola vez, en una terminal propia (los dos comandos son interactivos):
`npx supabase login` y `npx supabase link --project-ref <id del proyecto>`. Después:

```bash
npm run db:push -- --dry-run   # qué migraciones se aplicarían, sin tocar nada
npm run db:push                # las aplica en la base de la nube (pide confirmación)
npm run db:test:cloud          # las pruebas de la base, contra la nube y sin dejar nada
```

`db:push` nunca sube `supabase/seed.sql`: las cuentas inventadas solo existen en local.
Las cuentas reales se crean a mano en el panel de Supabase.

**Los datos.** El importador entra en la base de la nube con el servidor que dejó
`supabase link` y con la contraseña de la base, que el autor escribe en `privado/.env`
(`CLOUD_DATABASE_PASSWORD=`) y que no pasa por ningún otro sitio:

```bash
npm run import:dry-run:cloud   # lo carga en la nube, lo compara con el Excel y lo deshace
npm run import:load:cloud      # lo mismo, y se queda escrito solo si todo coincide
```

**La app.** Cloudflare la construye y la publica sola en cada push a `main`, según
`wrangler.jsonc`. El resto de su configuración vive en el panel de Cloudflare
(Workers → el proyecto → *Settings* → *Build*), y es esta, por si hubiera que rehacerla:

| Qué | Valor |
|---|---|
| Build / deploy | `npm run build` / `npx wrangler deploy` |
| Variables, sin cifrar porque son públicas | `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (Supabase → *Project Settings* → *API*), `NODE_VERSION=24` |
| Rutas que disparan un build | `apps/web/*`, `package.json`, `package-lock.json`, `wrangler.jsonc` |
| Previews por rama, Cloudflare Access | Apagados |

En la base de la nube, la *Site URL* de Supabase Auth es la URL de la app (ADR 0005).
Ningún secreto va en Cloudflare ni en el repositorio: la clave secreta de Supabase y
la contraseña de la base no las usa la app.

## Licencia

[MIT](LICENSE).
