-- El presupuesto y las deudas: cobros con su reparto en dólares (R8, R9), lo que
-- recibe cada sobre (R10), las comprobaciones del mes (R12) y la lista de deudas
-- (R17). Cuentas, sobres e importes inventados.
begin;
create extension if not exists pgtap with schema extensions;

select plan(25);

-- Ver docs/TRAMPAS.md: sin esto, las comprobaciones diferidas no corren.
set constraints all immediate;

-- La base local puede tener una carga real del importador: se vacía aquí, y el
-- rollback del final la deja como estaba.
select public.reset_imported_data(include_app_data => true);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'miembro.a@ejemplo.test'),
  ('00000000-0000-4000-8000-00000000000c', 'ajeno@ejemplo.test');
insert into public.household_members (user_id, display_name) values
  ('00000000-0000-4000-8000-00000000000a', 'Miembro A');

insert into public.accounts (name, currency, position) values
  ('Banco A', 'VES', 1),
  ('Billetera B', 'USD', 2);
insert into public.envelopes (name, position) values
  ('Ahorro', 1),
  ('Comida', 2),
  ('Transporte', 3);

-- En céntimos: 100000 son mil dólares.
insert into public.expected_incomes (month_start, name, emoji, expected_usd_cents, position) values
  ('2026-01-01', 'Bono', '💰', 100000, 1),
  ('2026-01-01', 'Quincena', null, 10000, 2),
  ('2026-01-01', 'Extra', null, 5000, 3),
  ('2026-02-01', 'Bono', '💰', 50000, 1);

select throws_ok(
  $$ update public.expected_incomes set emoji = ' ' where name = 'Quincena' $$,
  '23514', null,
  'el emoji de un ingreso no puede venir en blanco'
);

insert into public.budget_lines (month_start, envelope_id, planned_usd_cents, funding_note)
select b.month_start::date, v.id, b.planned, b.note
from (values
  ('2026-01-01', 'Ahorro', 65000, 'Bono, Extra'),
  ('2026-01-01', 'Comida', 40000, 'Bono'),
  ('2026-01-01', 'Transporte', 10000, 'Quincena'),
  ('2026-02-01', 'Ahorro', 40000, 'Bono')
) as b (month_start, envelope, planned, note)
join public.envelopes v on v.name = b.envelope;

insert into public.debts (direction, description, amount_cents, currency, due_on, position) values
  ('payable', 'Cuota de la tienda', 2000, 'USD', '2026-02-15', 1),
  ('payable', 'Tarjeta', 3000, 'USD', null, 2),
  ('receivable', 'Un amigo', 500000, 'VES', null, 1);

-- Una cuota pagada del mes en curso: se sigue viendo, pero ya no se debe (D9).
insert into public.debts (direction, description, amount_cents, currency, due_on, position, paid_on)
values ('payable', 'Cuota de enero', 4000, 'USD', '2026-01-15', 3, '2026-01-14');

-- Como en ledger.test.sql, pero cada asiento admite un quinto elemento: su valor en
-- dólares. Y la operación, el ingreso esperado que cobra.
create function pg_temp.post_operation(op_kind text, day date, lines jsonb, income uuid default null)
returns uuid
language sql
as $$
  with op as (
    insert into public.operations (kind, occurred_on, income_id)
    values (op_kind, day, income)
    returning id
  ), inserted as (
    insert into public.entries
      (operation_id, account_id, envelope_id, amount_cents, is_fee, usd_value_cents)
    select op.id, a.id, v.id, (l.line ->> 2)::bigint,
      coalesce((l.line ->> 3)::boolean, false), (l.line ->> 4)::bigint
    from op
    cross join jsonb_array_elements(lines) with ordinality as l (line, n)
    join public.accounts a on a.name = l.line ->> 0
    join public.envelopes v on v.name = l.line ->> 1
    order by l.n
    returning 1
  )
  select id from op;
$$;

create function pg_temp.income(month_of date, income_name text)
returns uuid
language sql
as $$
  select id from public.expected_incomes where month_start = month_of and name = income_name;
$$;

-- ---------------------------------------------------------------------------
-- Los cobros
-- ---------------------------------------------------------------------------

-- Mil dólares a una tasa de 400: 600 para Ahorro y 400 para Comida, con la comisión
-- del banco aparte.
select lives_ok(
  $$ select pg_temp.post_operation('income', '2026-01-10', '[
       ["Banco A", "Ahorro", 24000000, false, 60000],
       ["Banco A", "Comida", 16000000, false, 40000],
       ["Banco A", "Comida", -10000, true]
     ]', pg_temp.income('2026-01-01', 'Bono')) $$,
  'R9: un cobro en bolívares se reparte entre sobres en dólares'
);

select lives_ok(
  $$ select pg_temp.post_operation('income', '2026-01-12', '[["Billetera B", "Ahorro", 5000]]',
       pg_temp.income('2026-01-01', 'Extra')) $$,
  'un cobro en una cuenta en dólares no necesita el valor aparte'
);

select throws_ok(
  $$ select pg_temp.post_operation('income', '2026-01-20', '[["Banco A", "Ahorro", 400, false, 1]]',
       pg_temp.income('2026-01-01', 'Bono')) $$,
  '23505', null,
  'una línea esperada se cobra una sola vez: otro pago es otra línea'
);

select throws_ok(
  $$ select pg_temp.post_operation('income', '2026-01-03', '[
       ["Banco A", "Ahorro", 4000000, false, 10000], ["Banco A", "Comida", 400000]
     ]', pg_temp.income('2026-01-01', 'Quincena')) $$,
  '23514', 'En un cobro en bolívares, cada línea del reparto lleva su valor en dólares',
  'R9: un cobro en bolívares con una línea sin su valor en dólares se rechaza'
);

select throws_ok(
  $$ select pg_temp.post_operation('expense', '2026-01-03', '[["Banco A", "Comida", -400, false, 1]]') $$,
  '23514', 'Solo las líneas del reparto de un ingreso en bolívares llevan su valor en dólares',
  'un gasto no lleva valor en dólares'
);

select throws_ok(
  $$ select pg_temp.post_operation('income', '2026-01-03', '[["Billetera B", "Ahorro", 100, false, 100]]') $$,
  '23514', 'Solo las líneas del reparto de un ingreso en bolívares llevan su valor en dólares',
  'en una cuenta en dólares el importe ya está en dólares'
);

select throws_ok(
  $$ select pg_temp.post_operation('income', '2026-01-03', '[
       ["Banco A", "Ahorro", 400, false, 1], ["Banco A", "Ahorro", -400, true, 1]
     ]') $$,
  '23514', 'Solo las líneas del reparto de un ingreso en bolívares llevan su valor en dólares',
  'una comisión no forma parte del reparto'
);

select throws_ok(
  $$ select pg_temp.post_operation('expense', '2026-01-03', '[["Banco A", "Comida", -400]]',
       pg_temp.income('2026-01-01', 'Quincena')) $$,
  '23514', null,
  'solo un ingreso puede cobrar una línea esperada'
);

select throws_ok(
  $$ insert into public.budget_lines (month_start, envelope_id, planned_usd_cents)
     select '2026-01-01', id, 100 from public.envelopes where name = 'Ahorro' $$,
  '23505', null,
  'un sobre tiene un solo plan por mes'
);

select throws_ok(
  $$ insert into public.budget_lines (month_start, envelope_id, planned_usd_cents)
     select '2026-03-15', id, 100 from public.envelopes where name = 'Ahorro' $$,
  '23514', null,
  'el mes de un plan es su primer día'
);

select throws_ok(
  $$ insert into public.debts (direction, description, amount_cents, currency)
     values ('payable', 'Nada', 0, 'USD') $$,
  '23514', null,
  'una deuda de importe cero se rechaza'
);

-- ---------------------------------------------------------------------------
-- Lo que se calcula, leído con la sesión de un miembro
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select name, expected_usd_cents, received_cents, received_usd_cents, currency, is_received
     from public.expected_income_summary
     where month_start = '2026-01-01'
     order by position $$,
  $$ values
       ('Bono', 100000::bigint, 40000000::bigint, 100000::bigint, 'VES', true),
       ('Quincena', 10000::bigint, null::bigint, null::bigint, null::text, false),
       ('Extra', 5000::bigint, 5000::bigint, 5000::bigint, 'USD', true) $$,
  'cada línea esperada con lo que trajo su cobro, sin contar la comisión'
);

select results_eq(
  $$ select received_cents / received_usd_cents
     from public.expected_income_summary
     where month_start = '2026-01-01' and name = 'Bono' $$,
  $$ values (400::bigint) $$,
  'R8: la tasa sale de los dos importes del cobro'
);

select results_eq(
  $$ select name, emoji from public.expected_income_summary
     where month_start = '2026-01-01' order by position $$,
  $$ values ('Bono', '💰'), ('Quincena', null), ('Extra', null) $$,
  'cada ingreso lleva su emoji, como en el Excel'
);

select results_eq(
  $$ select v.name, s.planned_usd_cents, s.allocated_usd_cents, s.allocated_ves_cents, s.is_delivered
     from public.budget_summary s
     join public.envelopes v on v.id = s.envelope_id
     where s.month_start = '2026-01-01'
     order by v.position $$,
  $$ values
       ('Ahorro', 65000::bigint, 65000::bigint, 24000000::bigint, true),
       ('Comida', 40000::bigint, 40000::bigint, 16000000::bigint, true),
       ('Transporte', 10000::bigint, 0::bigint, 0::bigint, false) $$,
  'R10: lo que recibe cada sobre sale del reparto, y está entregado si cubre el plan'
);

select results_eq(
  $$ select month_start, expected_usd_cents, planned_usd_cents, received_ves_cents, allocated_ves_cents
     from public.budget_checks
     order by month_start $$,
  $$ values
       ('2026-01-01'::date, 115000::bigint, 115000::bigint, 40000000::bigint, 40000000::bigint),
       ('2026-02-01'::date, 50000::bigint, 40000::bigint, 0::bigint, 0::bigint) $$,
  'R12: enero cuadra; en febrero el plan no reparte todo lo esperado'
);

select results_eq(
  $$ select v.name, a.currency, a.balance_cents
     from public.cell_balances() a
     join public.envelopes v on v.id = a.envelope_id
     order by v.position, a.currency desc $$,
  $$ values
       ('Ahorro', 'VES', 24000000::bigint),
       ('Ahorro', 'USD', 5000::bigint),
       ('Comida', 'VES', 15990000::bigint) $$,
  'un cobro mueve los saldos como cualquier ingreso'
);

select results_eq(
  $$ select direction, currency, total_cents from public.debt_totals
     order by direction, currency $$,
  $$ values
       ('payable', 'USD', 5000::bigint),
       ('receivable', 'VES', 500000::bigint) $$,
  'R17: lo pendiente de las deudas y de los deudores, por moneda, sin las pagadas'
);

select results_eq(
  $$ select description from public.debts where is_paid $$,
  $$ values ('Cuota de enero') $$,
  'D9: una cuota pagada del mes se sigue viendo'
);

select throws_ok(
  $$ insert into public.debts (direction, description, amount_cents, currency)
     values ('payable', 'Otra', 100, 'USD') $$,
  '42501', null,
  'en M1 la app no escribe en las deudas'
);

reset role;

-- ---------------------------------------------------------------------------
-- Quien no es del hogar no ve nada
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000c", "role": "authenticated"}';

select is_empty('select * from public.expected_income_summary', 'una cuenta ajena no ve los ingresos');
select is_empty('select * from public.budget_summary', 'una cuenta ajena no ve el plan');
select is_empty('select * from public.debts', 'una cuenta ajena no ve las deudas');

reset role;

set local role anon;
select throws_ok(
  'select * from public.budget_checks',
  '42501', null,
  'sin sesión no se puede leer el presupuesto'
);
reset role;

select * from finish();
rollback;
