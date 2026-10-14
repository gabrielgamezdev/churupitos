# M0 · Cimientos

- **Estado:** en curso (desde 2026-10-12)
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
4. [ ] **Login** contra el Supabase local: correo y contraseña, sesión que sobrevive
   al cerrar la app, cerrar sesión.
5. [ ] **Instalable**: manifest, iconos, *service worker* y aviso de versión nueva.
6. [ ] **GitHub**: primer commit con el correo `noreply`, repo público y CI con el
   secreto del barrido.
7. [ ] **Supabase en la nube**: proyecto, registro cerrado, las dos cuentas y las
   migraciones aplicadas.
8. [ ] **Cloudflare**: despliegue automático de `main`.
9. [ ] **En los teléfonos**: instalada en los dos y con sesión iniciada.

## Tope de complejidad
- **Pantallas:** 2. El login y un inicio provisional con el nombre y «Cerrar sesión».
- **Tablas:** 1. Los miembros del hogar, con su nombre visible.
- **Fuera de M0:** cualquier dato financiero, el importador y el diseño visual
  definitivo.
