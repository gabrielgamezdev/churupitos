-- Lo que escribe la app en las deudas (ADR 0008): agregarlas, también en cuotas,
-- corregirlas, marcarlas pagadas, borrarlas y deshacer el borrado (R17, D9). Conceptos e importes inventados.
begin;
create extension if not exists pgtap with schema extensions;

select plan(21);

-- La base local puede tener una carga real del importador: se vacía aquí, y el
-- rollback del final la deja como estaba.
select public.reset_imported_data(include_app_data => true);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'miembro.a@ejemplo.test'),
  ('00000000-0000-4000-8000-00000000000c', 'ajeno@ejemplo.test');
insert into public.household_members (user_id, display_name) values
  ('00000000-0000-4000-8000-00000000000a', 'Miembro A')
on conflict (user_id) do nothing;

-- Una importada del Excel: sin autor.
insert into public.debts (id, direction, description, amount_cents, currency, due_on, position)
values ('00000000-0000-4000-d000-0000000000d0', 'payable', 'Tarjeta', 3000, 'USD', '2026-11-05', 1);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';

select lives_ok(
  $$ select public.save_debts('[
       {"id": "00000000-0000-4000-d000-0000000000d1", "direction": "payable",
        "description": "Cuota de la tienda", "amount_cents": 2000, "currency": "USD", "due_on": "2026-11-04"},
       {"id": "00000000-0000-4000-d000-0000000000d2", "direction": "payable",
        "description": "Cuota de la tienda", "amount_cents": 2000, "currency": "USD", "due_on": "2026-11-18"},
       {"id": "00000000-0000-4000-d000-0000000000d3", "direction": "receivable",
        "description": "Un amigo", "amount_cents": 500000, "currency": "VES"}
     ]') $$,
  'un miembro agrega deudas de una vez, como las cuotas de una compra'
);

select results_eq(
  $$ select description, due_on, position, created_by from public.debts
     where created_by is not null order by position $$,
  $$ values
       ('Cuota de la tienda', '2026-11-04'::date, 2::smallint, '00000000-0000-4000-8000-00000000000a'::uuid),
       ('Cuota de la tienda', '2026-11-18'::date, 3::smallint, '00000000-0000-4000-8000-00000000000a'::uuid),
       ('Un amigo', null::date, 4::smallint, '00000000-0000-4000-8000-00000000000a'::uuid) $$,
  'cada una con su fecha, después de las que ya había, y con quien la agregó'
);

select lives_ok(
  $$ select public.save_debts('[
       {"id": "00000000-0000-4000-d000-0000000000d1", "direction": "payable",
        "description": "Cuota de la tienda", "amount_cents": 2500, "currency": "USD", "due_on": "2026-11-06"}
     ]') $$,
  'guardar otra vez la misma la corrige'
);

select results_eq(
  $$ select count(*)::int, max(amount_cents), max(due_on) from public.debts
     where id = '00000000-0000-4000-d000-0000000000d1' $$,
  $$ values (1, 2500::bigint, '2026-11-06'::date) $$,
  'corregir no duplica'
);

select lives_ok(
  $$ select public.set_debt_paid('00000000-0000-4000-d000-0000000000d0', true) $$,
  'una importada también se marca pagada: la recarga la reemplaza con la del Excel'
);

select results_eq(
  $$ select is_paid, paid_on = (now() at time zone 'America/Caracas')::date
     from public.debts where id = '00000000-0000-4000-d000-0000000000d0' $$,
  $$ values (true, true) $$,
  'R13: se marca pagada hoy, en Caracas'
);

select results_eq(
  $$ select direction, currency, total_cents from public.debt_totals
     order by direction, currency $$,
  $$ values
       ('payable', 'USD', 4500::bigint),
       ('receivable', 'VES', 500000::bigint) $$,
  'R17: una pagada ya no suma en lo pendiente'
);

select lives_ok(
  $$ select public.set_debt_paid('00000000-0000-4000-d000-0000000000d0', false) $$,
  'si se marcó por error, se desmarca'
);

select is(
  (select paid_on from public.debts where id = '00000000-0000-4000-d000-0000000000d0'),
  null,
  'desmarcada, vuelve a deberse'
);

select lives_ok(
  $$ select public.set_debt_paid('00000000-0000-4000-d000-0000000000d0', true, '2026-10-03') $$,
  'deshacer el desmarcado la vuelve a marcar pagada'
);

select is(
  (select paid_on from public.debts where id = '00000000-0000-4000-d000-0000000000d0'),
  '2026-10-03'::date,
  'con el día en que se pagó, no con el de hoy'
);

select throws_ok(
  $$ select public.save_debts('[
       {"id": "00000000-0000-4000-d000-0000000000d4", "direction": "payable",
        "description": "  ", "amount_cents": 100, "currency": "USD"}
     ]') $$,
  '23514', null,
  'una deuda sin concepto no se guarda'
);

select throws_ok(
  $$ select public.save_debts('[
       {"id": "00000000-0000-4000-d000-0000000000d4", "direction": "payable",
        "description": "Gratis", "amount_cents": 0, "currency": "USD"}
     ]') $$,
  '23514', null,
  'una deuda sin monto no se guarda'
);

-- Cómo estaba antes de borrarla: deshacer la tiene que dejar igual.
create temporary table kept_debt on commit drop as
  select id, direction, description, amount_cents, currency, due_on, position, created_at, paid_on, created_by from public.debts where id = '00000000-0000-4000-d000-0000000000d2';
create temporary table snapshots (value jsonb) on commit drop;

select lives_ok(
  $$ insert into snapshots select public.delete_debt('00000000-0000-4000-d000-0000000000d2') $$,
  'un miembro borra una deuda'
);

select is_empty(
  $$ select 1 from public.debts where id = '00000000-0000-4000-d000-0000000000d2' $$,
  'borrada, ya no está'
);

select lives_ok(
  $$ select public.restore_debt((select value from snapshots)) $$,
  'deshacer la devuelve'
);

select results_eq(
  $$ select id, direction, description, amount_cents, currency, due_on, position, created_at, paid_on, created_by from public.debts where id = '00000000-0000-4000-d000-0000000000d2' $$,
  $$ select * from kept_debt $$,
  'igual: con su sitio en la lista, si está pagada y quién la agregó'
);

select lives_ok(
  $$ select public.restore_debt((select value from snapshots)) $$,
  'deshacer dos veces no es un error'
);

select is(
  (select count(*)::int from public.debts where id = '00000000-0000-4000-d000-0000000000d2'),
  1,
  'y no la duplica'
);

set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000c", "role": "authenticated"}';

select throws_ok(
  $$ select public.set_debt_paid('00000000-0000-4000-d000-0000000000d1', true) $$,
  '42501', 'Solo los miembros del hogar pueden marcar deudas',
  'una cuenta ajena no marca nada'
);

select throws_ok(
  $$ select public.restore_debt((select value from snapshots)) $$,
  '42501', 'Solo los miembros del hogar pueden deshacer',
  'una cuenta ajena no restaura'
);

reset role;

select * from finish();
rollback;
