-- Permisos por fila: la regla 5 de AGENTS.md, comprobada.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

-- Una tabla sin RLS es pública para cualquiera con la URL de la app. Esta prueba
-- falla en cuanto una migración nueva olvide activarlo.
select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  $$,
  'todas las tablas de public tienen RLS activado'
);

-- Desde el 2026-10-30, Supabase no da permisos automáticos a las tablas nuevas: cada
-- tabla y cada vista da los suyos en su migración. La app solo lee de ellas (escribe con
-- funciones, ADR 0008), y sin sesión no se lee nada. Falla si una tabla nueva olvida su
-- `grant` o si alguna conserva permisos de más.
select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p', 'v', 'm')
      and not has_table_privilege('authenticated', c.oid, 'select')
  $$,
  'la app puede leer todas las tablas y vistas de public, con su permiso explícito'
);

select is_empty(
  $$
    select g.table_name || ' ' || g.grantee || ' ' || g.privilege_type
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and (g.grantee = 'anon' or (g.grantee = 'authenticated' and g.privilege_type <> 'SELECT'))
  $$,
  'ni permisos sin sesión ni permisos de escritura sobre ninguna tabla'
);

-- Una vista lee, por defecto, con los permisos de su dueño, y así se salta el RLS
-- de las tablas que consulta. Una vista materializada, además, guarda los datos.
select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('v', 'm')
      and not exists (
        select 1 from unnest(c.reloptions) o
        where o in ('security_invoker=true', 'security_invoker=on', 'security_invoker=1')
      )
  $$,
  'todas las vistas de public leen con los permisos de quien pregunta'
);

-- Lo mismo con las funciones: `security definer` corre como su dueño. Las de
-- disparador no cuentan, porque nadie puede llamarlas: solo las lanza la base. En la
-- nube, Supabase tiene una así para activar el RLS en cada tabla nueva. Además de la que
-- dice si eres del hogar, solo las que escribe la app (ADR 0008), que comprueban ellas
-- mismas quién llama.
select results_eq(
  $$
    select p.proname::text collate "default"
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and p.prorettype not in ('trigger'::regtype, 'event_trigger'::regtype)
    order by 1
  $$,
  $$ values ('delete_debt'), ('delete_month'), ('delete_operation'),
            ('is_household_member'), ('restore_debt'), ('restore_operation'),
            ('save_debts'), ('save_month'), ('save_operation'), ('save_receipt'),
            ('set_debt_paid') $$,
  'solo saltan el RLS la función que dice si eres del hogar y las que escribe la app'
);

-- La base local trae las cuentas de seed.sql: se vacía para que la prueba no
-- dependa de ellas. Antes, lo registrado en la app, que guarda quién lo registró: en la
-- nube, con uso de verdad, no dejaría borrar a sus miembros. Todo vuelve atrás con el
-- rollback del final.
select public.reset_imported_data(include_app_data => true);
delete from public.household_members;

-- Tres cuentas: dos del hogar y una que no lo es.
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'miembro.a@ejemplo.test'),
  ('00000000-0000-4000-8000-00000000000b', 'miembro.b@ejemplo.test'),
  ('00000000-0000-4000-8000-00000000000c', 'ajeno@ejemplo.test');

insert into public.household_members (user_id, display_name) values
  ('00000000-0000-4000-8000-00000000000a', 'Miembro A'),
  ('00000000-0000-4000-8000-00000000000b', 'Miembro B');

-- Sin sesión.
set local role anon;
select throws_ok(
  'select * from public.household_members',
  '42501',
  null,
  'sin sesión no se puede leer a los miembros'
);
reset role;

-- Con la sesión de un miembro.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';
select results_eq(
  'select display_name from public.household_members order by display_name',
  $$ values ('Miembro A'), ('Miembro B') $$,
  'un miembro ve a los dos miembros del hogar'
);
select throws_ok(
  $$ insert into public.household_members (user_id, display_name)
     values ('00000000-0000-4000-8000-00000000000c', 'Intruso') $$,
  '42501',
  null,
  'un miembro no puede dar de alta a otros desde la app'
);
reset role;

-- Con la sesión de una cuenta que no es del hogar.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000c", "role": "authenticated"}';
select is_empty(
  'select * from public.household_members',
  'una cuenta ajena al hogar no ve nada'
);
reset role;

select * from finish();
rollback;
