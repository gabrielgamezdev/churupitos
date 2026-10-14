-- Los miembros del hogar: las dos personas que pueden ver y tocar los datos.
--
-- El registro está cerrado, así que en la práctica toda cuenta de Auth es de uno
-- de los dos. Aun así, las políticas no se fían de eso: un usuario autenticado
-- que no esté en esta tabla no ve nada. Es la defensa por si algún día el
-- registro se abre por error.

create table public.household_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 40),
  created_at timestamptz not null default now()
);

alter table public.household_members enable row level security;

-- Sin sesión no hay nada que ver: ni siquiera se puede preguntar.
revoke all on public.household_members from anon;

-- ¿Es del hogar el usuario de esta petición? Es la condición de todas las
-- políticas. `security definer` para que leer esta tabla no dispare su propia
-- política (sería recursivo), y `search_path` vacío para que ningún esquema
-- ajeno pueda suplantar las tablas que consulta.
create function public.is_household_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members
    where user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_household_member() from public, anon;
grant execute on function public.is_household_member() to authenticated;

-- Solo lectura desde la app: los miembros se dan de alta a mano, como las cuentas.
create policy "household members can read members"
  on public.household_members
  for select
  to authenticated
  using (public.is_household_member());
