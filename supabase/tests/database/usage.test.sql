-- Cuánto se usa cada sobre en cada cuenta, para ordenar los sobres en Registrar (M7).
-- Cuentas, sobres e importes inventados.
begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

-- La base local puede tener una carga real del importador: se vacía aquí, y el
-- rollback del final la deja como estaba.
select public.reset_imported_data(include_app_data => true);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'miembro.a@ejemplo.test'),
  ('00000000-0000-4000-8000-00000000000c', 'ajeno@ejemplo.test');
insert into public.household_members (user_id, display_name) values
  ('00000000-0000-4000-8000-00000000000a', 'Miembro A')
on conflict (user_id) do nothing;

insert into public.accounts (id, name, currency, position) values
  ('00000000-0000-4000-a000-0000000000a1', 'Banco A', 'VES', 1),
  ('00000000-0000-4000-a000-0000000000a2', 'Banco B', 'VES', 2);
insert into public.envelopes (id, name, position) values
  ('00000000-0000-4000-b000-0000000000b1', 'Comida', 1),
  ('00000000-0000-4000-b000-0000000000b2', 'Casa', 2);

-- En el Banco A: dos gastos de Comida, uno con comisión de Casa; un gasto viejo de Casa;
-- y un traspaso entre los dos sobres. En el Banco B, un gasto de Casa.
insert into public.operations (id, kind, occurred_on, created_by) values
  ('00000000-0000-4000-c000-0000000000c1', 'expense', '2026-10-10', null),
  ('00000000-0000-4000-c000-0000000000c2', 'expense', '2026-10-12', null),
  ('00000000-0000-4000-c000-0000000000c3', 'expense', '2026-07-01', null),
  ('00000000-0000-4000-c000-0000000000c4', 'envelope_transfer', '2026-10-12', null),
  ('00000000-0000-4000-c000-0000000000c5', 'expense', '2026-10-13', null);
insert into public.entries (operation_id, account_id, envelope_id, amount_cents, is_fee) values
  ('00000000-0000-4000-c000-0000000000c1', '00000000-0000-4000-a000-0000000000a1',
   '00000000-0000-4000-b000-0000000000b1', -1000, false),
  ('00000000-0000-4000-c000-0000000000c2', '00000000-0000-4000-a000-0000000000a1',
   '00000000-0000-4000-b000-0000000000b1', -2000, false),
  ('00000000-0000-4000-c000-0000000000c2', '00000000-0000-4000-a000-0000000000a1',
   '00000000-0000-4000-b000-0000000000b2', -100, true),
  ('00000000-0000-4000-c000-0000000000c3', '00000000-0000-4000-a000-0000000000a1',
   '00000000-0000-4000-b000-0000000000b2', -500, false),
  ('00000000-0000-4000-c000-0000000000c4', '00000000-0000-4000-a000-0000000000a1',
   '00000000-0000-4000-b000-0000000000b1', -300, false),
  ('00000000-0000-4000-c000-0000000000c4', '00000000-0000-4000-a000-0000000000a1',
   '00000000-0000-4000-b000-0000000000b2', 300, false),
  ('00000000-0000-4000-c000-0000000000c5', '00000000-0000-4000-a000-0000000000a2',
   '00000000-0000-4000-b000-0000000000b2', -700, false);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select a.name, v.name, u.uses::int
     from public.envelope_usage('2026-09-01') u
     join public.accounts a on a.id = u.account_id
     join public.envelopes v on v.id = u.envelope_id
     order by a.name, v.name $$,
  $$ values ('Banco A', 'Comida', 2), ('Banco B', 'Casa', 1) $$,
  'cuenta los gastos de cada celda desde el día, sin comisiones ni traspasos'
);

select is(
  (select uses::int from public.envelope_usage('2026-06-01')
   where envelope_id = '00000000-0000-4000-b000-0000000000b2'
     and account_id = '00000000-0000-4000-a000-0000000000a1'),
  1,
  'lo de antes del día solo cuenta si el día es anterior'
);

select is_empty(
  $$ select 1 from public.envelope_usage('2026-10-14') $$,
  'sin gastos desde el día, nada'
);

-- Quien no es del hogar no ve nada: el RLS de las tablas manda.
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000c", "role": "authenticated"}';

select is_empty(
  $$ select 1 from public.envelope_usage('2026-01-01') $$,
  'una cuenta ajena no ve cuánto se usa nada'
);

reset role;

select * from finish();
rollback;
