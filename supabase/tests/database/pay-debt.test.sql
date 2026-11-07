-- Pagar una deuda en un solo paso (M13, R17): el gasto y la deuda pagada a la vez, el monto
-- de la deuda intacto, y el gasto manda: corregir su fecha cambia el día del pago y borrarlo
-- devuelve la deuda a pendiente. Cuentas, sobres e importes inventados.
begin;
create extension if not exists pgtap with schema extensions;

-- La nube lleva la marca del corte, que impide vaciar la base y cierra los meses pasados
-- (M12): se quita dentro de la prueba, y el rollback del final la devuelve.
delete from public.cutover;

select plan(17);

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
  ('00000000-0000-4000-b000-0000000000b1', 'Ahorro', 1);

-- Se deben $50 y $20; a nosotros nos deben $10.
insert into public.debts (id, direction, description, amount_cents, currency, position) values
  ('00000000-0000-4000-d000-0000000000d1', 'payable', 'Cuota', 5000, 'USD', 1),
  ('00000000-0000-4000-d000-0000000000d2', 'payable', 'Otra cuota', 2000, 'USD', 2),
  ('00000000-0000-4000-d000-0000000000d3', 'receivable', 'Nos deben', 1000, 'USD', 3);

-- Un gasto en bolívares, con su comisión: lo que manda `pay_debt`.
create function pg_temp.payment(cents bigint) returns jsonb language sql as $$
  select jsonb_build_array(
    jsonb_build_object(
      'account_id', '00000000-0000-4000-a000-0000000000a1',
      'envelope_id', '00000000-0000-4000-b000-0000000000b1',
      'amount_cents', cents),
    jsonb_build_object(
      'account_id', '00000000-0000-4000-a000-0000000000a1',
      'envelope_id', '00000000-0000-4000-b000-0000000000b1',
      'amount_cents', -100, 'is_fee', true, 'description', 'Comisión')) $$;

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000c", "role": "authenticated"}';

select throws_ok(
  $$ select public.pay_debt('00000000-0000-4000-d000-0000000000d1',
       '00000000-0000-4000-c000-0000000000c1', '2026-11-05', 'Cuota', pg_temp.payment(-2000000)) $$,
  '42501', 'Solo los miembros del hogar pueden pagar deudas',
  'alguien de fuera del hogar no paga deudas'
);

set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';

-- ---------------------------------------------------------------------------
-- Pagar
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ select public.pay_debt('00000000-0000-4000-d000-0000000000d1',
       '00000000-0000-4000-c000-0000000000c1', '2026-11-05', 'Cuota', pg_temp.payment(-2000000)) $$,
  'R17: un miembro paga una deuda en dólares con bolívares, en un solo paso'
);

select results_eq(
  $$ select amount_cents, currency, paid_on, paid_operation_id from public.debts
     where id = '00000000-0000-4000-d000-0000000000d1' $$,
  $$ values (5000::bigint, 'USD'::text, '2026-11-05'::date,
             '00000000-0000-4000-c000-0000000000c1'::uuid) $$,
  'la deuda queda pagada ese día, enlazada al gasto y con su monto intacto'
);

select results_eq(
  $$ select kind, created_by from public.operations
     where id = '00000000-0000-4000-c000-0000000000c1' $$,
  $$ values ('expense'::text, '00000000-0000-4000-8000-00000000000a'::uuid) $$,
  'el gasto queda registrado, con quien lo pagó'
);

select results_eq(
  $$ select currency, paid_cents from public.debt_payments
     where debt_id = '00000000-0000-4000-d000-0000000000d1' $$,
  $$ values ('VES'::text, 2000000::bigint) $$,
  'lo pagado sale del gasto, sin la comisión'
);

select is(
  (select total_cents from public.debt_totals where direction = 'payable' and currency = 'USD'),
  2000::bigint,
  'y ya no suma en lo que se debe'
);

select lives_ok(
  $$ select public.pay_debt('00000000-0000-4000-d000-0000000000d1',
       '00000000-0000-4000-c000-0000000000c1', '2026-11-05', 'Cuota', pg_temp.payment(-2000000)) $$,
  'repetir el mismo pago no falla: un reintento no duplica'
);

select throws_ok(
  $$ select public.pay_debt('00000000-0000-4000-d000-0000000000d1',
       '00000000-0000-4000-c000-0000000000c2', '2026-11-06', 'Otra vez', pg_temp.payment(-100000)) $$,
  '23514', 'Esa deuda ya está pagada',
  'una deuda pagada no se paga con otro gasto'
);

select throws_ok(
  $$ select public.pay_debt('00000000-0000-4000-d000-0000000000d3',
       '00000000-0000-4000-c000-0000000000c3', '2026-11-06', 'Nos deben', pg_temp.payment(-100000)) $$,
  '23514', 'Solo se paga lo que se debe',
  'lo que nos deben no se paga con un gasto'
);

select throws_ok(
  $$ select public.set_debt_paid('00000000-0000-4000-d000-0000000000d1', false) $$,
  '23514', 'Esa deuda se pagó con un gasto: se borra el gasto para deshacerlo',
  'desmarcarla dejaría el gasto hecho: lo que se deshace es el gasto'
);

-- ---------------------------------------------------------------------------
-- El gasto manda
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ select public.save_operation('00000000-0000-4000-c000-0000000000c1', 'expense',
       '2026-11-07', 'Cuota', pg_temp.payment(-2100000)) $$,
  'se corrige el gasto: otro día y otro monto'
);

select is(
  (select paid_on from public.debts where id = '00000000-0000-4000-d000-0000000000d1'),
  '2026-11-07'::date,
  'el día del pago sigue al gasto'
);

select lives_ok(
  $$ select public.restore_operation(
       public.delete_operation('00000000-0000-4000-c000-0000000000c1')) $$,
  'borrar el gasto y deshacerlo'
);

select results_eq(
  $$ select paid_on, paid_operation_id from public.debts
     where id = '00000000-0000-4000-d000-0000000000d1' $$,
  $$ values ('2026-11-07'::date, '00000000-0000-4000-c000-0000000000c1'::uuid) $$,
  'deshacerlo deja la deuda como estaba, pagada con él'
);

select lives_ok(
  $$ select public.restore_debt(public.delete_debt('00000000-0000-4000-d000-0000000000d1')) $$,
  'borrar la deuda y deshacerlo'
);

select lives_ok(
  $$ select public.delete_operation('00000000-0000-4000-c000-0000000000c1') $$,
  'borrar el gasto'
);

select results_eq(
  $$ select paid_on, paid_operation_id from public.debts
     where id = '00000000-0000-4000-d000-0000000000d1' $$,
  $$ values (null::date, null::uuid) $$,
  'R17: sin el gasto, la deuda vuelve a pendiente'
);

reset role;

select * from finish();
rollback;
