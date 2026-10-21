-- Cobrar un ingreso esperado y repartirlo desde la app (M9): enlazado a su línea, con el
-- valor en dólares de cada línea en bolívares (R8, R9), un solo cobro por línea, y el ✅ y
-- lo que recibe cada sobre calculados (R10, R18). Cuentas, sobres e importes inventados.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

-- La base local puede tener una carga real y, en la nube, lo registrado de verdad en la
-- app: se vacía todo, y el rollback del final lo deja como estaba.
select public.reset_imported_data(include_app_data => true);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'miembro.a@ejemplo.test'),
  ('00000000-0000-4000-8000-00000000000c', 'ajeno@ejemplo.test');
insert into public.household_members (user_id, display_name) values
  ('00000000-0000-4000-8000-00000000000a', 'Miembro A')
on conflict (user_id) do nothing;

insert into public.accounts (id, name, currency, position) values
  ('00000000-0000-4000-a000-0000000000a1', 'Banco A', 'VES', 1),
  ('00000000-0000-4000-a000-0000000000a2', 'Billetera B', 'USD', 2);
insert into public.envelopes (id, name, position) values
  ('00000000-0000-4000-b000-0000000000b1', 'Ahorro', 1),
  ('00000000-0000-4000-b000-0000000000b2', 'Comida', 2);

-- Octubre: un bono de $100, una quincena de $50 y un extra importado y ya cobrado.
insert into public.expected_incomes (id, month_start, name, expected_usd_cents, position) values
  ('00000000-0000-4000-e000-0000000000e1', '2026-10-01', 'Bono', 10000, 1),
  ('00000000-0000-4000-e000-0000000000e2', '2026-10-01', 'Quincena', 5000, 2),
  ('00000000-0000-4000-e000-0000000000e3', '2026-10-01', 'Extra', 2000, 3);
insert into public.budget_lines (month_start, envelope_id, planned_usd_cents, funding_note) values
  ('2026-10-01', '00000000-0000-4000-b000-0000000000b1', 6000, 'Bono'),
  ('2026-10-01', '00000000-0000-4000-b000-0000000000b2', 4000, 'Bono');
insert into public.operations (id, kind, occurred_on, income_id, created_by) values
  ('00000000-0000-4000-c000-0000000000c0', 'income', '2026-10-02',
   '00000000-0000-4000-e000-0000000000e3', null);
insert into public.entries (operation_id, account_id, envelope_id, amount_cents, usd_value_cents) values
  ('00000000-0000-4000-c000-0000000000c0', '00000000-0000-4000-a000-0000000000a1',
   '00000000-0000-4000-b000-0000000000b1', 800000, 2000);

-- Una línea del reparto en JSON: cuenta, sobre, importe y su valor en dólares.
create function pg_temp.line(account text, envelope text, cents bigint, usd bigint)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'account_id', (select id from public.accounts where name = account),
    'envelope_id', (select id from public.envelopes where name = envelope),
    'amount_cents', cents,
    'usd_value_cents', usd
  );
$$;

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';

-- ---------------------------------------------------------------------------
-- Cobrar y repartir
-- ---------------------------------------------------------------------------

-- Bs 40.000 por $100: tasa 400. $60 de Ahorro y $40 de Comida.
select lives_ok(
  $$ select public.save_receipt(
       '00000000-0000-4000-c000-0000000000c1', '00000000-0000-4000-e000-0000000000e1',
       '2026-10-15', 'Bono',
       jsonb_build_array(
         pg_temp.line('Banco A', 'Ahorro', 2400000, 6000),
         pg_temp.line('Banco A', 'Comida', 1600000, 4000))) $$,
  'un miembro cobra un ingreso esperado y lo reparte en dólares'
);

select results_eq(
  $$ select o.kind, o.income_id, o.created_by from public.operations o
     where o.id = '00000000-0000-4000-c000-0000000000c1' $$,
  $$ values ('income'::text, '00000000-0000-4000-e000-0000000000e1'::uuid,
             '00000000-0000-4000-8000-00000000000a'::uuid) $$,
  'es un ingreso enlazado a su línea esperada, con quien lo cobró'
);

select results_eq(
  $$ select is_delivered from public.budget_summary
     where month_start = '2026-10-01' order by envelope_id $$,
  $$ values (true), (true) $$,
  'R18: el plan de los sobres queda entregado'
);

select throws_ok(
  $$ select public.save_receipt(
       gen_random_uuid(), '00000000-0000-4000-e000-0000000000e1', '2026-10-16', 'Otra vez',
       jsonb_build_array(pg_temp.line('Banco A', 'Ahorro', 100, 1))) $$,
  '23514', 'Ese ingreso ya está cobrado',
  'una línea esperada se cobra una sola vez'
);

select lives_ok(
  $$ select public.save_receipt(
       '00000000-0000-4000-c000-0000000000c1', '00000000-0000-4000-e000-0000000000e1',
       '2026-10-15', 'Bono',
       jsonb_build_array(
         pg_temp.line('Banco A', 'Ahorro', 2000000, 5000),
         pg_temp.line('Banco A', 'Comida', 2000000, 5000))) $$,
  'se corrige como un gasto'
);

select is(
  (select count(*)::int from public.entries
   where operation_id = '00000000-0000-4000-c000-0000000000c1'),
  2,
  'sin duplicar sus líneas'
);

select throws_ok(
  $$ select public.save_receipt(
       gen_random_uuid(), '00000000-0000-4000-e000-0000000000e2', '2026-10-16', 'Quincena',
       jsonb_build_array(pg_temp.line('Banco A', 'Ahorro', 2000000, null))) $$,
  '23514', 'En un cobro en bolívares, cada línea del reparto lleva su valor en dólares',
  'R9: en bolívares, cada línea dice cuántos dólares son'
);

select lives_ok(
  $$ select public.save_receipt(
       '00000000-0000-4000-c000-0000000000c2', '00000000-0000-4000-e000-0000000000e2',
       '2026-10-16', 'Quincena',
       jsonb_build_array(pg_temp.line('Billetera B', 'Comida', 5000, null))) $$,
  'en dólares, el importe ya son los dólares'
);

select throws_ok(
  $$ select public.save_receipt(
       '00000000-0000-4000-c000-0000000000c0', '00000000-0000-4000-e000-0000000000e3',
       '2026-10-02', 'Extra',
       jsonb_build_array(pg_temp.line('Banco A', 'Ahorro', 800000, 2000))) $$,
  '42501', 'Lo importado del Excel no se corrige hasta el corte',
  'un cobro importado no se corrige desde la app'
);

select throws_ok(
  $$ select public.save_receipt(
       gen_random_uuid(), gen_random_uuid(), '2026-10-16', 'Nada',
       jsonb_build_array(pg_temp.line('Banco A', 'Ahorro', 100, 1))) $$,
  '23514', 'Ese ingreso esperado no existe',
  'no se cobra un ingreso que no está en el presupuesto'
);

-- ---------------------------------------------------------------------------
-- Borrar y deshacer
-- ---------------------------------------------------------------------------

create temporary table snapshots (value jsonb) on commit drop;
insert into snapshots select public.delete_operation('00000000-0000-4000-c000-0000000000c1');

select is_empty(
  $$ select 1 from public.operations where income_id = '00000000-0000-4000-e000-0000000000e1' $$,
  'borrar el cobro deja el ingreso por cobrar'
);

select lives_ok(
  $$ select public.restore_operation((select value from snapshots)) $$,
  'deshacer el borrado lo devuelve'
);

select results_eq(
  $$ select o.income_id, sum(e.usd_value_cents)::bigint
     from public.operations o join public.entries e on e.operation_id = o.id
     where o.id = '00000000-0000-4000-c000-0000000000c1' group by o.income_id $$,
  $$ values ('00000000-0000-4000-e000-0000000000e1'::uuid, 10000::bigint) $$,
  'con su enlace y el valor en dólares de cada línea'
);

-- ---------------------------------------------------------------------------
-- Quien no es del hogar
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000c", "role": "authenticated"}';

select throws_ok(
  $$ select public.save_receipt(
       gen_random_uuid(), '00000000-0000-4000-e000-0000000000e2', '2026-10-16', 'Ajeno',
       jsonb_build_array(pg_temp.line('Banco A', 'Ahorro', 100, 1))) $$,
  '42501', 'Solo los miembros del hogar pueden cobrar',
  'una cuenta ajena no cobra'
);

reset role;

select * from finish();
rollback;
