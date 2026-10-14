# ADR 0001 — PWA en React sobre Supabase

- **Fecha:** 2026-10-12
- **Estado:** aceptada

## Contexto
- No hay homelab todavía, y la PC del autor no puede ser servidor: se apaga y se usa
  para otras cosas.
- Una PWA exige HTTPS con un certificado de confianza para instalarse.
- El repositorio es público y tiene que ser fácil de mantener por una persona.
- La versión anterior (Rails + Postgres + Expo) era sólida pero enorme: 25 tablas,
  84 rutas y 20 *triggers*. Nunca llegó a usarse.

## Decisión
- **Backend: Supabase** (Postgres + Auth + API automática), en su plan gratis para el
  uso real y con su CLI en Docker para desarrollar. Las reglas viven en la base:
  restricciones, funciones, vistas y RLS. No hay un servidor propio que mantener.
- **Frontend: PWA** con React 19, Vite y `vite-plugin-pwa`, Tailwind 4 y shadcn/ui,
  TanStack Router (rutas por archivos) y TanStack Query (caché persistida para ver
  sin conexión). Formularios con React Hook Form y Zod.
- **Importador** del histórico en Node + TypeScript, conectado directo a Postgres.
- **Hosting** de la PWA como estáticos en Cloudflare (ver ADR 0005).

## Alternativas descartadas
- **Reutilizar el backend Rails anterior.** Trae muchas más reglas de las que tiene el
  Excel, dos lenguajes y un contenedor de Ruby, y aun así necesitaría un sitio donde
  alojarse.
- **Firebase.** Es una base de documentos, y estos datos son relacionales: saldos que
  salen de sumar asientos y traspasos que deben cuadrar a cero. Tampoco se puede
  alojar en casa.
- **API propia en un VPS.** Obliga a escribir el login y a mantener el sistema
  operativo, los certificados y las copias. Tiene sentido cuando exista el homelab.

## Consecuencias
- Es Postgres estándar: el día que haya homelab, la base se exporta y se restaura, o
  se aloja Supabase entero, que es de código abierto. Se evitan las piezas exclusivas
  de Supabase (Edge Functions, Storage) mientras no hagan falta.
- El plan gratis pausa el proyecto tras 7 días sin uso y no incluye copias de
  seguridad: las copias son responsabilidad del proyecto (`ops/`).
- Los datos viven en un tercero. La protección está en el login, en RLS y en no
  filtrar claves (ver ADR 0004).
