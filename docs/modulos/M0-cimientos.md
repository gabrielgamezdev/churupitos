# M0 · Cimientos

- **Estado:** cerrado el 2026-10-14 (empezó el 2026-10-12). Congelado: lo que siga
  vigente vive en `CLAUDE.md`, `README.md` y los ADR.
- **Objetivo:** que los dos tengan la app instalada en el teléfono e inicien sesión,
  con todo lo que hace falta para construir lo demás sin miedo: privacidad, pruebas,
  base de datos local y en la nube, y despliegue.

## Hecho cuando
- Los dos instalan la PWA desde su URL pública, inician sesión y ven su nombre, que
  sale de una tabla protegida con RLS.
- `npm run check` está en verde en local y en la CI.

## Pasos
1. [x] **Base del repo**: `.gitignore`, `.gitattributes`, `CLAUDE.md`, `README.md`,
   `ESTADO`, `TRAMPAS`, ADR 0001–0005, barrido de privacidad y hooks de git.
2. [x] **Esqueleto de la PWA**: Vite + React + TypeScript + Tailwind + shadcn/ui +
   TanStack Router y Query. `npm run check` = tipos + lint + pruebas + build + barrido.
3. [x] **Supabase local**: `supabase init` y `start`, una primera tabla con RLS y una
   prueba de la base que falla si alguna tabla queda sin RLS.
4. [x] **Login** contra el Supabase local: correo y contraseña, sesión que sobrevive
   al cerrar la app, cerrar sesión.
5. [x] **Instalable**: manifest, iconos, *service worker* y aviso de versión nueva.
   El icono es provisional: un sobre con una moneda, generado desde `public/favicon.svg`.
6. [x] **GitHub**: primeros commits con la identidad pública del autor, repo público
   desde el 2026-10-14 y CI (check en cada push; pruebas de la base cuando cambia
   `supabase/`).
7. [x] **Supabase en la nube**: proyecto, registro cerrado, las dos cuentas y las
   migraciones aplicadas.
8. [x] **Cloudflare**: despliegue automático de `main`, sin previews por rama ni
   Cloudflare Access.
9. [x] **En los teléfonos**: instalada en el del autor, con sesión iniciada, el
   saludo leído con RLS y el aviso de versión nueva probado. El segundo teléfono la
   instala cuando pueda: es el mismo recorrido y no bloquea M1.

## Tope de complejidad
- **Pantallas:** 2. El login y un inicio provisional con el nombre y «Cerrar sesión».
- **Tablas:** 1. Los miembros del hogar, con su nombre visible.
- **Fuera de M0:** cualquier dato financiero, el importador y el diseño visual
  definitivo.
