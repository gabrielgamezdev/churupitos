-- Lo que se mueve sin gastarse (M8): entre sobres, entre cuentas y de una moneda a otra,
-- registrado y restaurado desde la app con la forma de cada tipo (R5) y su comisión
-- (R16). Cuentas, sobres e importes inventados.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- La base local puede tener una carga real del importador: se vacía aquí, y el
-- rollback del final la deja como estaba.
select public.reset_imported_data(include_app_data => true);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'miembro.a@ejemplo.test');
insert into public.household_members (user_id, display_name) values
  ('00000000-0000-4000-8000-00000000000a', 'Miembro A')
on conflict (user_id) do nothing;

insert into public.accounts (id, name, currency, position) values
  ('00000000-0000-4000-a000-0000000000a1', 'Banco A', 'VES', 1),
  ('00000000-0000-4000-a000-0000000000a3', 'Banco C', 'VES', 2),
  ('00000000-0000-4000-a000-0000000000a2', 'Billetera B', 'USD', 3);
insert into public.envelopes (id, name, position) values
  ('00000000-0000-4000-b000-0000000000b1', 'Ahorro', 1),
  ('00000000-0000-4000-b000-0000000000b2', 'Comida', 2);

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

-- Lo que hay en una celda, por los nombres.
create function pg_temp.cell(account text, envelope text)
returns bigint
language sql
as $$
  select coalesce(sum(c.balance_cents), 0)::bigint
  from public.cell_balances() c
  join public.accounts a on a.id = c.account_id
  join public.envelopes v on v.id = c.envelope_id
  where a.name = account and v.name = envelope;
$$;

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';

-- ---------------------------------------------------------------------------
-- Entre sobres
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ select public.save_operation(
       '00000000-0000-4000-c000-0000000000c1', 'envelope_transfer', '2026-10-20',
       'Comida le presta a Ahorro',
       jsonb_build_array(pg_temp.line('Banco A', 'Comida', -5000), pg_temp.line('Banco A', 'Ahorro', 5000))) $$,
  'un miembro mueve dinero entre sobres de una cuenta'
);

select results_eq(
  $$ select pg_temp.cell('Banco A', 'Comida'), pg_temp.cell('Banco A', 'Ahorro') $$,
  $$ values (-5000::bigint, 5000::bigint) $$,
  'R6: lo que sale de un sobre entra en el otro, aunque quede en descubierto'
);

select throws_ok(
  $$ select public.save_operation(
       gen_random_uuid(), 'envelope_transfer', '2026-10-20', 'Mal hecho',
       jsonb_build_array(pg_temp.line('Banco A', 'Comida', -5000), pg_temp.line('Banco C', 'Ahorro', 5000))) $$,
  '23514', 'Un movimiento entre sobres tiene que sumar cero en cada cuenta',
  'R5: entre sobres, el dinero no cambia de cuenta'
);

select lives_ok(
  $$ select public.save_operation(
       '00000000-0000-4000-c000-0000000000c1', 'envelope_transfer', '2026-10-20',
       'Comida le presta a Ahorro',
       jsonb_build_array(pg_temp.line('Banco A', 'Comida', -3000), pg_temp.line('Banco A', 'Ahorro', 3000))) $$,
  'se corrige como un gasto, sin duplicarse'
);

-- ---------------------------------------------------------------------------
-- Entre cuentas, con su comisión
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ select public.save_operation(
       '00000000-0000-4000-c000-0000000000c2', 'account_transfer', '2026-10-20', 'Al Banco C',
       jsonb_build_array(
         pg_temp.line('Banco A', 'Ahorro', -10000),
         pg_temp.line('Banco C', 'Comida', 10000),
         pg_temp.line('Banco A', 'Ahorro', -150, true))) $$,
  'un traspaso entre cuentas, que cambia de sobre en el camino, con su comisión'
);

select results_eq(
  $$ select pg_temp.cell('Banco A', 'Ahorro'), pg_temp.cell('Banco C', 'Comida') $$,
  $$ values (-7150::bigint, 10000::bigint) $$,
  'R16: la comisión sale aparte, de la cuenta de origen'
);

select throws_ok(
  $$ select public.save_operation(
       gen_random_uuid(), 'account_transfer', '2026-10-20', 'Mal hecho',
       jsonb_build_array(pg_temp.line('Banco A', 'Ahorro', -100), pg_temp.line('Billetera B', 'Ahorro', 100))) $$,
  '23514', 'Un traspaso entre cuentas es de una sola moneda',
  'R5: un traspaso no cambia de moneda'
);

-- ---------------------------------------------------------------------------
-- Cambio de divisa
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ select public.save_operation(
       '00000000-0000-4000-c000-0000000000c3', 'exchange', '2026-10-20', 'Vender dólares',
       jsonb_build_array(pg_temp.line('Billetera B', 'Ahorro', -1000), pg_temp.line('Banco A', 'Ahorro', 250000))) $$,
  'un cambio de divisa: sale una moneda y entra la otra'
);

select throws_ok(
  $$ select public.save_operation(
       gen_random_uuid(), 'exchange', '2026-10-20', 'Mal hecho',
       jsonb_build_array(pg_temp.line('Banco A', 'Ahorro', -100), pg_temp.line('Banco C', 'Ahorro', 100))) $$,
  '23514', 'Un cambio de divisa tiene que tener las dos monedas',
  'R5: un cambio toca las dos monedas'
);

-- ---------------------------------------------------------------------------
-- Borrar y deshacer, y lo que la app no registra
-- ---------------------------------------------------------------------------

create temporary table snapshots (value jsonb) on commit drop;
insert into snapshots select public.delete_operation('00000000-0000-4000-c000-0000000000c3');

select lives_ok(
  $$ select public.restore_operation((select value from snapshots)) $$,
  'deshacer el borrado de un cambio de divisa lo devuelve'
);

select is(
  pg_temp.cell('Banco A', 'Ahorro'),
  242850::bigint,
  'con sus dos asientos, como estaba'
);

select throws_ok(
  $$ select public.save_operation(
       gen_random_uuid(), 'adjustment', '2026-10-20', 'Ajuste',
       jsonb_build_array(pg_temp.line('Banco A', 'Ahorro', 100))) $$,
  '23514', 'La app no registra ajustes: los trae el Excel',
  'los ajustes solo vienen del Excel'
);

reset role;

select * from finish();
rollback;
