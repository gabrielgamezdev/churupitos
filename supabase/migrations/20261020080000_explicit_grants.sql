-- Desde el 2026-10-30, Supabase ya no da permisos automáticos a las tablas nuevas de
-- `public`, tampoco al recrear la base desde las migraciones (local o un proyecto nuevo).
-- Todas las tablas y vistas de la app ya los dan explícitamente, salvo `household_members`,
-- que tomaba los automáticos: todos, aunque el RLS solo deja leer. Se dejan explícitos y
-- justos, como en las demás: solo leer, y para nadie sin sesión.
revoke all on public.household_members from anon, authenticated;
grant select on public.household_members to authenticated;
