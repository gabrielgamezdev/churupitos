-- Después del corte (M12): la recarga se niega siempre, lo importado se corrige y se borra
-- como lo demás (salvo los ajustes del arrastre) y los meses pasados se cierran solos el
-- día 5 del siguiente (R21). Antes de la marca del corte, todo sigue como antes. Las fechas
-- son relativas a hoy, para que la prueba no caduque. Cuentas, sobres e importes
-- inventados.
begin;
create extension if not exists pgtap with schema extensions;

select plan(23);

select public.reset_imported_data(include_app_data => true);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'miembro.a@ejemplo.test'),
  ('00000000-0000-4000-8000-00000000000c', 'ajeno@ejemplo.test');
insert into public.household_members (user_id, display_name) values
  ('00000000-0000-4000-8000-00000000000a', 'Miembro A')
on conflict (user_id) do nothing;

insert into public.accounts (id, name, currency, position) values
  ('00000000-0000-4000-a000-0000000000a1', 'Banco A', 'VES', 1);
insert into public.envelopes (id, name, position) values
  ('00000000-0000-4000-b000-0000000000b1', 'Ahorro', 1),
  ('00000000-0000-4000-b000-0000000000b2', 'Comida', 2);

-- El primer día del mes en curso y el de hace dos meses, que ya está cerrado.
create function pg_temp.this_month() returns date language sql as $$
  select date_trunc('month', now() at time zone 'America/Caracas')::date $$;
create function pg_temp.closed_month() returns date language sql as $$
  select (pg_temp.this_month() - interval '2 months')::date $$;
create function pg_temp.line(envelope text, cents bigint) returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
    'account_id', '00000000-0000-4000-a000-0000000000a1',
    'envelope_id', (select id from public.envelopes where name = envelope),
    'amount_cents', cents)) $$;

-- Importado: un gasto de este mes, otro del mes cerrado y un ajuste del arrastre.
insert into public.operations (id, kind, occurred_on, description, adjustment_reason) values
  ('00000000-0000-4000-c000-0000000000c1', 'expense', pg_temp.this_month(), 'Importado', null),
  ('00000000-0000-4000-c000-0000000000c2', 'expense', pg_temp.closed_month(), 'Viejo', null),
  ('00000000-0000-4000-c000-0000000000c3', 'adjustment', pg_temp.this_month(), 'Arrastre', 'correction');
insert into public.entries (operation_id, account_id, envelope_id, amount_cents) values
  ('00000000-0000-4000-c000-0000000000c1', '00000000-0000-4000-a000-0000000000a1',
   '00000000-0000-4000-b000-0000000000b2', -1000),
  ('00000000-0000-4000-c000-0000000000c2', '00000000-0000-4000-a000-0000000000a1',
   '00000000-0000-4000-b000-0000000000b2', -2000),
  ('00000000-0000-4000-c000-0000000000c3', '00000000-0000-4000-a000-0000000000a1',
   '00000000-0000-4000-b000-0000000000b1', 5000);
insert into public.expected_incomes (id, month_start, name, expected_usd_cents) values
  ('00000000-0000-4000-e000-0000000000e1', pg_temp.closed_month(), 'Bono', 10000);

-- ---------------------------------------------------------------------------
-- Antes del corte, como siempre
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';

select throws_ok(
  $$ select public.save_operation('00000000-0000-4000-c000-0000000000c1', 'expense',
       pg_temp.this_month(), 'Corregido', pg_temp.line('Comida', -1500)) $$,
  '42501', 'Lo importado del Excel no se corrige hasta el corte',
  'antes del corte, lo importado no se corrige'
);

select ok(not public.month_is_closed(pg_temp.closed_month()), 'antes del corte, ningún mes se cierra');

reset role;

-- ---------------------------------------------------------------------------
-- El corte
-- ---------------------------------------------------------------------------

insert into public.cutover (cut_on) values ('2026-11-01');

select throws_ok(
  $$ select public.reset_imported_data(include_app_data => true) $$,
  'P0001', 'La base es la fuente desde el corte (2026-11-01): ya no se recarga desde los Excels',
  'desde el corte, la recarga se niega aun pidiéndolo'
);

select ok(public.month_is_closed(pg_temp.closed_month()), 'R21: el mes de hace dos meses está cerrado');
select ok(not public.month_is_closed(pg_temp.this_month()), 'el mes en curso nunca');
select is(
  public.month_is_closed((pg_temp.this_month() - interval '1 month')::date),
  extract(day from now() at time zone 'America/Caracas') >= 5,
  'el anterior, desde el día 5 de este'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';

-- ---------------------------------------------------------------------------
-- Lo importado se corrige como lo demás
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ select public.save_operation('00000000-0000-4000-c000-0000000000c1', 'expense',
       pg_temp.this_month(), 'Corregido', pg_temp.line('Comida', -1500)) $$,
  'desde el corte, un miembro corrige un movimiento importado'
);

select results_eq(
  $$ select description, created_by, updated_by from public.operations
     where id = '00000000-0000-4000-c000-0000000000c1' $$,
  $$ values ('Corregido'::text, null::uuid, '00000000-0000-4000-8000-00000000000a'::uuid) $$,
  'sigue sin autor, y queda quién lo cambió'
);

select lives_ok(
  $$ select public.restore_operation(
       public.delete_operation('00000000-0000-4000-c000-0000000000c1')) $$,
  'se borra, y deshacerlo lo devuelve'
);

select results_eq(
  $$ select o.created_by, sum(e.amount_cents)::bigint from public.operations o
     join public.entries e on e.operation_id = o.id
     where o.id = '00000000-0000-4000-c000-0000000000c1' group by o.id $$,
  $$ values (null::uuid, -1500::bigint) $$,
  'tal cual: importado, con su importe'
);

select throws_ok(
  $$ select public.save_operation('00000000-0000-4000-c000-0000000000c3', 'income',
       pg_temp.this_month(), 'Arrastre', pg_temp.line('Ahorro', 5000)) $$,
  '23514', 'Los ajustes del arrastre no se corrigen',
  'un ajuste del arrastre no se corrige'
);

select throws_ok(
  $$ select public.delete_operation('00000000-0000-4000-c000-0000000000c3') $$,
  '23514', 'Los ajustes del arrastre no se borran',
  'ni se borra'
);

-- ---------------------------------------------------------------------------
-- Meses cerrados (R21)
-- ---------------------------------------------------------------------------

select throws_like(
  $$ select public.save_operation(gen_random_uuid(), 'expense', pg_temp.closed_month(),
       'Tarde', pg_temp.line('Comida', -100)) $$,
  '% está cerrado: se abre para cambiarlo',
  'en un mes cerrado no se registra'
);

select throws_like(
  $$ select public.save_operation('00000000-0000-4000-c000-0000000000c1', 'expense',
       pg_temp.closed_month(), 'Corregido', pg_temp.line('Comida', -1500)) $$,
  '% está cerrado: se abre para cambiarlo',
  'ni se lleva un movimiento a él'
);

select throws_like(
  $$ select public.save_operation('00000000-0000-4000-c000-0000000000c2', 'expense',
       pg_temp.closed_month(), 'Viejo corregido', pg_temp.line('Comida', -2000)) $$,
  '% está cerrado: se abre para cambiarlo',
  'ni se corrige uno suyo'
);

select throws_like(
  $$ select public.delete_operation('00000000-0000-4000-c000-0000000000c2') $$,
  '% está cerrado: se abre para cambiarlo',
  'ni se borra'
);

select throws_like(
  $$ select public.save_month(pg_temp.closed_month(),
       jsonb_build_array(jsonb_build_object('id', '00000000-0000-4000-e000-0000000000e1',
         'name', 'Bono', 'expected_usd_cents', 12000)), '[]') $$,
  '% está cerrado: se abre para cambiarlo',
  'ni se planea'
);

select lives_ok(
  $$ select public.open_month(pg_temp.closed_month()) $$,
  'un miembro lo abre a propósito'
);

select ok(
  (select open_until > now() and open_until <= now() + interval '1 day'
   from public.month_openings where month_start = pg_temp.closed_month()),
  'hasta el fin de hoy, en Caracas'
);

select lives_ok(
  $$ select public.save_operation('00000000-0000-4000-c000-0000000000c2', 'expense',
       pg_temp.closed_month(), 'Viejo corregido', pg_temp.line('Comida', -2000)) $$,
  'abierto, se corrige'
);

select lives_ok(
  $$ select public.close_month(pg_temp.closed_month()) $$,
  'y se vuelve a cerrar'
);

select throws_like(
  $$ select public.delete_operation('00000000-0000-4000-c000-0000000000c2') $$,
  '% está cerrado: se abre para cambiarlo',
  'cerrado otra vez, no se toca'
);

set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000c", "role": "authenticated"}';
select throws_ok(
  $$ select public.open_month(pg_temp.closed_month()) $$,
  '42501', 'Solo los miembros del hogar pueden abrir un mes',
  'alguien de fuera del hogar no abre meses'
);

reset role;

select * from finish();
rollback;
