-- Lo que escribe la app (ADR 0008): guardar y borrar un gasto o un ingreso con las dos
-- funciones de la base, con las reglas de siempre (R5, R6, R16) y sin tocar lo
-- importado. Cuentas, sobres e importes inventados.
begin;
create extension if not exists pgtap with schema extensions;

select plan(21);

-- Sin `set constraints all immediate`: las funciones comprueban la forma (R5) ellas
-- mismas, que es lo que se prueba aquí.

-- La base local puede tener una carga real del importador: se vacía aquí, y el
-- rollback del final la deja como estaba.
select public.reset_imported_data(include_app_data => true);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'miembro.a@ejemplo.test'),
  ('00000000-0000-4000-8000-00000000000b', 'miembro.b@ejemplo.test'),
  ('00000000-0000-4000-8000-00000000000c', 'ajeno@ejemplo.test');
insert into public.household_members (user_id, display_name) values
  ('00000000-0000-4000-8000-00000000000a', 'Miembro A'),
  ('00000000-0000-4000-8000-00000000000b', 'Miembro B')
on conflict (user_id) do nothing;

insert into public.accounts (id, name, currency, position) values
  ('00000000-0000-4000-a000-0000000000a1', 'Banco A', 'VES', 1),
  ('00000000-0000-4000-a000-0000000000a2', 'Billetera B', 'USD', 2);
insert into public.envelopes (id, name, position) values
  ('00000000-0000-4000-b000-0000000000b1', 'Ahorro', 1),
  ('00000000-0000-4000-b000-0000000000b2', 'Comida', 2);

-- Algo importado del Excel: sin autor. El Banco A abre con Bs 100 en Comida.
insert into public.operations (id, kind, occurred_on, adjustment_reason, created_by) values
  ('00000000-0000-4000-c000-0000000000c0', 'adjustment', '2026-01-01', 'opening', null);
insert into public.entries (operation_id, account_id, envelope_id, amount_cents) values
  ('00000000-0000-4000-c000-0000000000c0', '00000000-0000-4000-a000-0000000000a1',
   '00000000-0000-4000-b000-0000000000b2', 10000);

-- Un asiento en JSON, con nombres cortos: cuenta, sobre, importe y si es comisión.
create function pg_temp.line(account text, envelope text, cents bigint, fee boolean default false)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'account_id', (select id from public.accounts where name = account),
    'envelope_id', (select id from public.envelopes where name = envelope),
    'amount_cents', cents,
    'is_fee', fee
  );
$$;

-- ---------------------------------------------------------------------------
-- Un miembro registra
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';

select lives_ok(
  $$ select public.save_operation(
       '00000000-0000-4000-c000-0000000000c1', 'expense', '2026-01-10', 'Mercado',
       jsonb_build_array(
         pg_temp.line('Banco A', 'Comida', -15000),
         pg_temp.line('Banco A', 'Comida', -100, true)
       )) $$,
  'un miembro registra un gasto con su comisión'
);

select results_eq(
  $$ select kind, description, created_by from public.operations
     where id = '00000000-0000-4000-c000-0000000000c1' $$,
  $$ values ('expense', 'Mercado', '00000000-0000-4000-8000-00000000000a'::uuid) $$,
  'la operación queda con quien la registró'
);

select results_eq(
  $$ select amount_cents, is_fee from public.entries
     where operation_id = '00000000-0000-4000-c000-0000000000c1' order by position $$,
  $$ values (-15000::bigint, false), (-100::bigint, true) $$,
  'R16: la comisión es un asiento aparte de la misma operación'
);

select results_eq(
  $$ select balance_cents from public.cell_balances()
     where account_id = '00000000-0000-4000-a000-0000000000a1'
       and envelope_id = '00000000-0000-4000-b000-0000000000b2' $$,
  $$ values (-5100::bigint) $$,
  'R6: un gasto puede dejar el sobre en descubierto, y se guarda igual'
);

create temporary table first_positions on commit drop as
  select array_agg(position order by position) as positions
  from public.entries where operation_id = '00000000-0000-4000-c000-0000000000c1';

select lives_ok(
  $$ select public.save_operation(
       '00000000-0000-4000-c000-0000000000c1', 'expense', '2026-01-10', 'Mercado y pan',
       jsonb_build_array(
         pg_temp.line('Banco A', 'Comida', -12000),
         pg_temp.line('Banco A', 'Ahorro', -3000),
         pg_temp.line('Banco A', 'Comida', -100, true)
       )) $$,
  'guardar otra vez la misma operación la corrige'
);

select results_eq(
  $$ select count(*)::int, max(description) from public.operations
     where id = '00000000-0000-4000-c000-0000000000c1' $$,
  $$ values (1, 'Mercado y pan') $$,
  'corregir no duplica: sigue siendo una operación'
);

select results_eq(
  $$ select (array_agg(position order by position))[1:2] from public.entries
     where operation_id = '00000000-0000-4000-c000-0000000000c1' $$,
  $$ select positions from first_positions $$,
  'R14: corregir no la mueve dentro del día'
);

select lives_ok(
  $$ select public.save_operation(
       '00000000-0000-4000-c000-0000000000c2', 'income', '2026-01-11', 'Reintegro',
       jsonb_build_array(pg_temp.line('Billetera B', 'Ahorro', 2000))) $$,
  'un miembro registra un ingreso suelto'
);

-- ---------------------------------------------------------------------------
-- Las reglas de siempre
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ select public.save_operation(
       gen_random_uuid(), 'expense', '2026-01-12', 'Dos cuentas',
       jsonb_build_array(
         pg_temp.line('Banco A', 'Comida', -100),
         pg_temp.line('Billetera B', 'Comida', -100)
       )) $$,
  '23514', 'Un gasto sale de una sola cuenta',
  'R5: un gasto sale de una sola cuenta'
);

select throws_ok(
  $$ select public.save_operation(
       gen_random_uuid(), 'expense', '2026-01-12', 'Al revés',
       jsonb_build_array(pg_temp.line('Banco A', 'Comida', 100))) $$,
  '23514', 'En un gasto todos los importes son negativos',
  'R5: en un gasto todo sale'
);

select throws_ok(
  $$ select public.save_operation(
       gen_random_uuid(), 'expense', '2026-01-12', 'Comisión al revés',
       jsonb_build_array(
         pg_temp.line('Banco A', 'Comida', -100),
         pg_temp.line('Banco A', 'Comida', 10, true)
       )) $$,
  '23514', null,
  'R16: una comisión siempre sale'
);

select throws_ok(
  $$ select public.save_operation(
       gen_random_uuid(), 'exchange', '2026-01-12', 'Cambio',
       jsonb_build_array(pg_temp.line('Banco A', 'Comida', -100))) $$,
  '23514', 'La app todavía solo registra gastos e ingresos',
  'por ahora la app solo registra gastos e ingresos'
);

select throws_ok(
  $$ select public.save_operation(gen_random_uuid(), 'expense', '2026-01-12', 'Vacío', '[]') $$,
  '23514', 'Una operación necesita al menos un asiento',
  'una operación sin asientos no se guarda'
);

-- ---------------------------------------------------------------------------
-- Lo importado no se toca
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ select public.save_operation(
       '00000000-0000-4000-c000-0000000000c0', 'expense', '2026-01-01', 'Encima',
       jsonb_build_array(pg_temp.line('Banco A', 'Comida', -100))) $$,
  '42501', 'Lo importado del Excel no se corrige hasta el corte',
  'lo importado no se corrige desde la app'
);

select throws_ok(
  $$ select public.delete_operation('00000000-0000-4000-c000-0000000000c0') $$,
  '42501', 'Lo importado del Excel no se borra hasta el corte',
  'lo importado no se borra desde la app'
);

select throws_ok(
  $$ insert into public.operations (kind, occurred_on) values ('expense', '2026-01-12') $$,
  '42501', null,
  'la app no escribe directo en las tablas'
);

-- ---------------------------------------------------------------------------
-- Borrar
-- ---------------------------------------------------------------------------

-- El otro miembro: lo de la app es del hogar, no de quien lo registró.
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}';

select lives_ok(
  $$ select public.delete_operation('00000000-0000-4000-c000-0000000000c2') $$,
  'un miembro borra lo que registró el otro'
);

select is_empty(
  $$ select 1 from public.entries
     where operation_id = '00000000-0000-4000-c000-0000000000c2' $$,
  'borrar una operación se lleva sus asientos'
);

select lives_ok(
  $$ select public.delete_operation('00000000-0000-4000-c000-0000000000c2') $$,
  'borrar otra vez lo mismo no es un error'
);

-- ---------------------------------------------------------------------------
-- Quien no es del hogar, o no tiene sesión
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000c", "role": "authenticated"}';

select throws_ok(
  $$ select public.save_operation(
       gen_random_uuid(), 'expense', '2026-01-12', 'Ajeno',
       jsonb_build_array(pg_temp.line('Banco A', 'Comida', -100))) $$,
  '42501', 'Solo los miembros del hogar pueden registrar',
  'una cuenta ajena no registra'
);

reset role;
set local role anon;

select throws_ok(
  $$ select public.delete_operation('00000000-0000-4000-c000-0000000000c1') $$,
  '42501', null,
  'sin sesión no se puede borrar'
);

reset role;

select * from finish();
rollback;
