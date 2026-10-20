-- El libro: la forma de cada operación (R5) y los saldos que salen de los asientos
-- (R2, R6, R7, R11, R14). Cuentas, sobres e importes inventados.
begin;
create extension if not exists pgtap with schema extensions;

select plan(46);

-- Las comprobaciones de forma son diferidas: se harían al confirmar, y esta prueba
-- nunca confirma. Inmediatas, se hacen al final de cada sentencia.
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
  ('Banco C', 'VES', 2),
  ('Billetera B', 'USD', 3);
insert into public.envelopes (name, is_third_party, position) values
  ('Ahorro', false, 1),
  ('Comida', false, 2),
  ('Transporte', false, 3),
  ('Otro', true, 4);

-- Registra una operación con sus asientos en una sola sentencia, para que su forma
-- se compruebe entera. Cada asiento es [cuenta, sobre, céntimos], con un cuarto
-- elemento `true` si es comisión. Los asientos toman su posición en ese orden.
create function pg_temp.post_operation(op_kind text, day date, lines jsonb, reason text default null)
returns uuid
language sql
as $$
  with op as (
    insert into public.operations (kind, occurred_on, adjustment_reason)
    values (op_kind, day, reason)
    returning id
  ), inserted as (
    insert into public.entries (operation_id, account_id, envelope_id, amount_cents, is_fee)
    select op.id, a.id, v.id, (l.line ->> 2)::bigint, coalesce((l.line ->> 3)::boolean, false)
    from op
    cross join jsonb_array_elements(lines) with ordinality as l (line, n)
    join public.accounts a on a.name = l.line ->> 0
    join public.envelopes v on v.name = l.line ->> 1
    order by l.n
    returning 1
  )
  select id from op;
$$;

-- ---------------------------------------------------------------------------
-- Un mes inventado, en orden. Cifras en céntimos: 100000 son mil bolívares.
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ select pg_temp.post_operation('adjustment', '2026-01-01', '[
       ["Banco A", "Ahorro", 100000], ["Banco A", "Comida", 50000],
       ["Banco C", "Comida", 20000],
       ["Billetera B", "Ahorro", 20000], ["Billetera B", "Otro", 10000]
     ]', 'opening') $$,
  'los saldos iniciales entran como un ajuste de apertura'
);

select lives_ok(
  $$ select pg_temp.post_operation('income', '2026-01-10', '[
       ["Banco A", "Ahorro", 40000], ["Banco A", "Comida", 40000]
     ]') $$,
  'un cobro entra en una cuenta, repartido entre sobres'
);

select lives_ok(
  $$ select pg_temp.post_operation('expense', '2026-01-15', '[
       ["Banco A", "Comida", -30000], ["Banco A", "Transporte", -10000]
     ]') $$,
  'R6: un gasto que deja una celda en negativo se guarda'
);

select results_eq(
  $$ select c.balance_cents from public.cell_balances() c
     join public.accounts a on a.id = c.account_id
     join public.envelopes v on v.id = c.envelope_id
     where a.name = 'Banco A' and v.name = 'Transporte' $$,
  $$ values (-10000::bigint) $$,
  'R6: la celda queda en descubierto'
);

select lives_ok(
  $$ select pg_temp.post_operation('envelope_transfer', '2026-01-20', '[
       ["Banco A", "Ahorro", -10000], ["Banco A", "Transporte", 10000]
     ]') $$,
  'un sobre le presta a otro dentro de la misma cuenta'
);

select lives_ok(
  $$ select pg_temp.post_operation('account_transfer', '2026-01-25', '[
       ["Banco A", "Comida", -20000], ["Banco C", "Comida", 20000],
       ["Banco A", "Comida", -100, true]
     ]') $$,
  'un traspaso entre cuentas suma cero sin contar su comisión'
);

select lives_ok(
  $$ select pg_temp.post_operation('exchange', '2026-01-28', '[
       ["Banco A", "Ahorro", -40000], ["Billetera B", "Ahorro", 1000]
     ]') $$,
  'un cambio de divisa: salen bolívares y entran dólares'
);

select lives_ok(
  $$ select pg_temp.post_operation('expense', '2026-02-03', '[["Billetera B", "Comida", -500]]') $$,
  'un gasto del mes siguiente'
);

-- ---------------------------------------------------------------------------
-- R5: lo que no cumple la forma de su tipo se rechaza
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into public.operations (kind, occurred_on) values ('expense', '2026-01-02') $$,
  '23514', 'Una operación necesita al menos un asiento',
  'una operación sin asientos se rechaza'
);

select throws_ok(
  $$ delete from public.entries where amount_cents = -500 $$,
  '23514', 'Una operación necesita al menos un asiento',
  'no se puede dejar una operación sin asientos'
);

select throws_ok(
  $$ select pg_temp.post_operation('expense', '2026-01-02', '[
       ["Banco A", "Comida", -100], ["Banco C", "Comida", -100]
     ]') $$,
  '23514', 'Un gasto sale de una sola cuenta',
  'un gasto en dos cuentas se rechaza'
);

select throws_ok(
  $$ select pg_temp.post_operation('expense', '2026-01-02', '[
       ["Banco A", "Comida", -100], ["Banco A", "Ahorro", 100]
     ]') $$,
  '23514', 'En un gasto todos los importes son negativos',
  'un gasto con un importe positivo se rechaza'
);

select throws_ok(
  $$ select pg_temp.post_operation('income', '2026-01-02', '[
       ["Banco A", "Comida", 100], ["Banco C", "Comida", 100]
     ]') $$,
  '23514', 'Un ingreso entra en una sola cuenta',
  'un ingreso en dos cuentas se rechaza'
);

select throws_ok(
  $$ select pg_temp.post_operation('income', '2026-01-02', '[
       ["Banco A", "Comida", 100], ["Banco A", "Ahorro", -50]
     ]') $$,
  '23514', 'En un ingreso todos los importes son positivos',
  'un ingreso con un importe negativo que no es comisión se rechaza'
);

select throws_ok(
  $$ select pg_temp.post_operation('income', '2026-01-02', '[["Banco A", "Comida", -50, true]]') $$,
  '23514', 'Un ingreso necesita al menos un importe que no sea comisión',
  'un ingreso que solo tiene la comisión se rechaza'
);

select throws_ok(
  $$ select pg_temp.post_operation('envelope_transfer', '2026-01-02', '[
       ["Banco A", "Ahorro", -100], ["Banco C", "Comida", 100]
     ]') $$,
  '23514', 'Un movimiento entre sobres tiene que sumar cero en cada cuenta',
  'un movimiento entre sobres que cambia de cuenta se rechaza, aunque sume cero'
);

select throws_ok(
  $$ select pg_temp.post_operation('account_transfer', '2026-01-02', '[
       ["Banco A", "Comida", -20000], ["Banco C", "Comida", 19000]
     ]') $$,
  '23514', 'Un traspaso entre cuentas tiene que sumar cero',
  'un traspaso que no suma cero se rechaza'
);

select throws_ok(
  $$ select pg_temp.post_operation('account_transfer', '2026-01-02', '[
       ["Banco A", "Comida", -100], ["Billetera B", "Comida", 100]
     ]') $$,
  '23514', 'Un traspaso entre cuentas es de una sola moneda',
  'un traspaso entre monedas distintas se rechaza: es un cambio de divisa'
);

select throws_ok(
  $$ select pg_temp.post_operation('account_transfer', '2026-01-02', '[
       ["Banco A", "Comida", -100], ["Banco A", "Ahorro", 100]
     ]') $$,
  '23514', 'Un traspaso entre cuentas necesita al menos dos cuentas',
  'un traspaso dentro de una sola cuenta se rechaza: es un movimiento entre sobres'
);

select throws_ok(
  $$ select pg_temp.post_operation('exchange', '2026-01-02', '[
       ["Banco A", "Ahorro", -100], ["Banco C", "Ahorro", 100]
     ]') $$,
  '23514', 'Un cambio de divisa tiene que tener las dos monedas',
  'un cambio de divisa en una sola moneda se rechaza'
);

select throws_ok(
  $$ select pg_temp.post_operation('exchange', '2026-01-02', '[
       ["Banco A", "Ahorro", -40000], ["Billetera B", "Ahorro", -1000]
     ]') $$,
  '23514', 'En un cambio de divisa sale una moneda y entra la otra',
  'un cambio de divisa en el que solo sale dinero se rechaza'
);

select throws_ok(
  $$ select pg_temp.post_operation('adjustment', '2026-01-02', '[["Banco A", "Comida", 100]]') $$,
  '23514', null,
  'un ajuste sin motivo se rechaza'
);

select throws_ok(
  $$ select pg_temp.post_operation('expense', '2026-01-02', '[["Banco A", "Comida", -100]]', 'correction') $$,
  '23514', null,
  'solo un ajuste lleva motivo'
);

select throws_ok(
  $$ select pg_temp.post_operation('expense', '2026-01-02', '[["Banco A", "Comida", 0]]') $$,
  '23514', null,
  'R4: no hay asientos de importe cero'
);

select throws_ok(
  $$ select pg_temp.post_operation('income', '2026-01-02', '[
       ["Banco A", "Comida", 100], ["Banco A", "Comida", 5, true]
     ]') $$,
  '23514', null,
  'R16: una comisión siempre sale'
);

select throws_ok(
  $$ insert into public.envelopes (name, is_third_party) values ('Otro más', true) $$,
  '23505', null,
  'D6: solo hay un sobre «Otro»'
);

select lives_ok(
  $$ update public.envelopes set emoji = '🏦' where name = 'Ahorro' $$,
  'un sobre lleva su emoji, como en el Excel'
);

select throws_ok(
  $$ update public.envelopes set emoji = '' where name = 'Comida' $$,
  '23514', null,
  'un emoji vacío no es un emoji'
);

-- ---------------------------------------------------------------------------
-- Los saldos, leídos con la sesión de un miembro: así se prueba también que el
-- RLS los deja pasar
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select a.name, v.name, c.currency, c.balance_cents
     from public.cell_balances() c
     join public.accounts a on a.id = c.account_id
     join public.envelopes v on v.id = c.envelope_id
     order by a.position, v.position $$,
  $$ values
       ('Banco A', 'Ahorro', 'VES', 90000::bigint),
       ('Banco A', 'Comida', 'VES', 39900::bigint),
       ('Banco A', 'Transporte', 'VES', 0::bigint),
       ('Banco C', 'Comida', 'VES', 40000::bigint),
       ('Billetera B', 'Ahorro', 'USD', 21000::bigint),
       ('Billetera B', 'Comida', 'USD', -500::bigint),
       ('Billetera B', 'Otro', 'USD', 10000::bigint) $$,
  'R2: cada celda es la suma de sus asientos'
);

select results_eq(
  $$ select name, currency, balance_cents from public.account_balances() order by position $$,
  $$ values
       ('Banco A', 'VES', 129900::bigint),
       ('Banco C', 'VES', 40000::bigint),
       ('Billetera B', 'USD', 30500::bigint) $$,
  'R2: cada cuenta es la suma de sus celdas'
);

select results_eq(
  $$ select name, third_party_cents from public.account_balances() order by position $$,
  $$ values
       ('Banco A', 0::bigint),
       ('Banco C', 0::bigint),
       ('Billetera B', 10000::bigint) $$,
  'R11: cada cuenta dice cuánto de su saldo es «Otro»'
);

select is_empty(
  $$ select t.currency
     from public.currency_totals() t
     join (select currency, sum(third_party_cents) as third_party
           from public.account_balances() group by currency) a using (currency)
     where a.third_party <> t.third_party_cents $$,
  'R11: la parte de «Otro» de las cuentas suma la de su moneda'
);

select results_eq(
  $$ select v.name, b.currency, b.balance_cents
     from public.envelope_balances() b
     join public.envelopes v on v.id = b.envelope_id
     order by v.position, b.currency desc $$,
  $$ values
       ('Ahorro', 'VES', 90000::bigint),
       ('Ahorro', 'USD', 21000::bigint),
       ('Comida', 'VES', 79900::bigint),
       ('Comida', 'USD', -500::bigint),
       ('Transporte', 'VES', 0::bigint),
       ('Otro', 'USD', 10000::bigint) $$,
  'R2: un sobre suma sus celdas de todas las cuentas, por moneda'
);

select results_eq(
  $$ select currency, total_cents, third_party_cents, own_cents
     from public.currency_totals() order by currency desc $$,
  $$ values
       ('VES', 169900::bigint, 0::bigint, 169900::bigint),
       ('USD', 30500::bigint, 10000::bigint, 20500::bigint) $$,
  'R11: el total sin «Otro» le resta el dinero ajeno'
);

select is_empty(
  $$ select coalesce(a.currency, v.currency)
     from (select currency, sum(balance_cents) as total
           from public.account_balances() group by currency) a
     full join (select currency, sum(balance_cents) as total
                from public.envelope_balances() group by currency) v
       on v.currency = a.currency
     where a.total is distinct from v.total $$,
  'el invariante de cuadre: en cada moneda, las cuentas suman lo mismo que los sobres'
);

-- R7: el arrastre no existe como dato. Febrero abre con lo que cerró enero.
select results_eq(
  $$ select name, balance_cents from public.account_balances('2026-01-31') order by position $$,
  $$ values
       ('Banco A', 129900::bigint),
       ('Banco C', 40000::bigint),
       ('Billetera B', 31000::bigint) $$,
  'R7: el saldo al cierre de enero no cuenta lo de febrero'
);

select results_eq(
  $$ select c.balance_cents from public.cell_balances('2026-01-14') c
     join public.accounts a on a.id = c.account_id
     join public.envelopes v on v.id = c.envelope_id
     where a.name = 'Banco A' and v.name = 'Comida' $$,
  $$ values (90000::bigint) $$,
  'R7: el saldo de una celda a un día cuenta solo lo anterior'
);

-- R14: el libro de una cuenta, con el restante corrido después de cada asiento.
select results_eq(
  $$ select l.occurred_on, l.amount_cents, l.running_balance_cents
     from public.account_ledger l
     join public.accounts a on a.id = l.account_id
     where a.name = 'Billetera B'
     order by l.occurred_on, l.position $$,
  $$ values
       ('2026-01-01'::date, 20000::bigint, 20000::bigint),
       ('2026-01-01'::date, 10000::bigint, 30000::bigint),
       ('2026-01-28'::date, 1000::bigint, 31000::bigint),
       ('2026-02-03'::date, -500::bigint, 30500::bigint) $$,
  'R14: el libro lleva el restante corrido, en orden de fecha y posición'
);

select is_empty(
  $$ select b.account_id
     from public.account_balances() b
     left join lateral (
       select l.running_balance_cents
       from public.account_ledger l
       where l.account_id = b.account_id
       order by l.occurred_on desc, l.position desc, l.entry_id desc
       limit 1
     ) final_row on true
     where coalesce(final_row.running_balance_cents, 0) <> b.balance_cents $$,
  'el último restante del libro de cada cuenta es su saldo'
);

-- El libro de un sobre: sus asientos de todas las cuentas, con su restante en cada
-- moneda, que nunca se mezclan.
select results_eq(
  $$ select l.currency, l.occurred_on, a.name, l.amount_cents, l.running_balance_cents
     from public.envelope_ledger l
     join public.accounts a on a.id = l.account_id
     join public.envelopes v on v.id = l.envelope_id
     where v.name = 'Ahorro'
     order by l.currency desc, l.occurred_on, l.position $$,
  $$ values
       ('VES', '2026-01-01'::date, 'Banco A', 100000::bigint, 100000::bigint),
       ('VES', '2026-01-10'::date, 'Banco A', 40000::bigint, 140000::bigint),
       ('VES', '2026-01-20'::date, 'Banco A', -10000::bigint, 130000::bigint),
       ('VES', '2026-01-28'::date, 'Banco A', -40000::bigint, 90000::bigint),
       ('USD', '2026-01-01'::date, 'Billetera B', 20000::bigint, 20000::bigint),
       ('USD', '2026-01-28'::date, 'Billetera B', 1000::bigint, 21000::bigint) $$,
  'R14: el libro de un sobre lleva su restante en cada moneda, de todas sus cuentas'
);

select is_empty(
  $$ select b.envelope_id
     from public.envelope_balances() b
     left join lateral (
       select l.running_balance_cents
       from public.envelope_ledger l
       where l.envelope_id = b.envelope_id and l.currency = b.currency
       order by l.occurred_on desc, l.position desc, l.entry_id desc
       limit 1
     ) final_row on true
     where coalesce(final_row.running_balance_cents, 0) <> b.balance_cents $$,
  'el último restante del libro de cada sobre, en cada moneda, es su saldo'
);

select throws_ok(
  $$ insert into public.operations (kind, occurred_on) values ('expense', '2026-01-02') $$,
  '42501', null,
  'en M1 la app no escribe en el libro'
);

reset role;

-- ---------------------------------------------------------------------------
-- Quien no es del hogar no ve nada
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000c", "role": "authenticated"}';

select is_empty('select * from public.entries', 'una cuenta ajena no ve asientos');
select is_empty('select * from public.account_ledger', 'una cuenta ajena no ve el libro');
select is_empty('select * from public.currency_totals()', 'una cuenta ajena no ve los totales');

reset role;

set local role anon;
select throws_ok(
  'select * from public.currency_totals()',
  '42501', null,
  'sin sesión no se pueden pedir los saldos'
);
reset role;

select * from finish();
rollback;
