-- Crear, cambiar, archivar y borrar sobres y cuentas desde la app (M11, R20): borrar solo lo
-- que no tiene nada, archivar solo en cero en todas sus celdas, «Otro» intocable (R11) y
-- nada nuevo en lo archivado. Cuentas, sobres e importes inventados.
begin;
create extension if not exists pgtap with schema extensions;

select plan(32);

-- La base local puede tener una carga real y, en la nube, lo registrado de verdad en la
-- app: se vacía todo, y el rollback del final lo deja como estaba.
select public.reset_imported_data(include_app_data => true);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'miembro.a@ejemplo.test'),
  ('00000000-0000-4000-8000-00000000000c', 'ajeno@ejemplo.test');
insert into public.household_members (user_id, display_name) values
  ('00000000-0000-4000-8000-00000000000a', 'Miembro A')
on conflict (user_id) do nothing;

-- Del catálogo: dos cuentas, cuatro sobres y «Otro».
insert into public.accounts (id, name, currency, position) values
  ('00000000-0000-4000-a000-0000000000a1', 'Banco A', 'VES', 1),
  ('00000000-0000-4000-a000-0000000000a2', 'Billetera B', 'USD', 2);
insert into public.envelopes (id, name, emoji, is_third_party, position) values
  ('00000000-0000-4000-b000-0000000000b1', 'Ahorro', '🏦', false, 1),
  ('00000000-0000-4000-b000-0000000000b2', 'Comida', '🍔', false, 2),
  ('00000000-0000-4000-b000-0000000000b3', 'Viejo', null, false, 3),
  ('00000000-0000-4000-b000-0000000000b4', 'Planeado', null, false, 4),
  ('00000000-0000-4000-b000-0000000000b5', 'Antiguo', null, false, 5),
  ('00000000-0000-4000-b000-0000000000b9', 'Otro', null, true, 9);

-- En enero, Ahorro recibió 100 en el Banco A, y Viejo y Antiguo recibieron y gastaron:
-- están en cero, con historia. En la Billetera B, Comida tiene +20 y Ahorro −20: la cuenta suma
-- cero, pero sus celdas no.
insert into public.operations (id, kind, occurred_on) values
  ('00000000-0000-4000-c000-0000000000c1', 'income', '2026-01-05'),
  ('00000000-0000-4000-c000-0000000000c2', 'income', '2026-01-06'),
  ('00000000-0000-4000-c000-0000000000c3', 'expense', '2026-01-07'),
  ('00000000-0000-4000-c000-0000000000c4', 'envelope_transfer', '2026-01-08'),
  ('00000000-0000-4000-c000-0000000000c5', 'income', '2026-01-09'),
  ('00000000-0000-4000-c000-0000000000c6', 'expense', '2026-01-10');
insert into public.entries (operation_id, account_id, envelope_id, amount_cents) values
  ('00000000-0000-4000-c000-0000000000c1', '00000000-0000-4000-a000-0000000000a1',
   '00000000-0000-4000-b000-0000000000b1', 10000),
  ('00000000-0000-4000-c000-0000000000c2', '00000000-0000-4000-a000-0000000000a1',
   '00000000-0000-4000-b000-0000000000b3', 5000),
  ('00000000-0000-4000-c000-0000000000c3', '00000000-0000-4000-a000-0000000000a1',
   '00000000-0000-4000-b000-0000000000b3', -5000),
  ('00000000-0000-4000-c000-0000000000c4', '00000000-0000-4000-a000-0000000000a2',
   '00000000-0000-4000-b000-0000000000b2', 2000),
  ('00000000-0000-4000-c000-0000000000c4', '00000000-0000-4000-a000-0000000000a2',
   '00000000-0000-4000-b000-0000000000b1', -2000),
  ('00000000-0000-4000-c000-0000000000c5', '00000000-0000-4000-a000-0000000000a1',
   '00000000-0000-4000-b000-0000000000b5', 300),
  ('00000000-0000-4000-c000-0000000000c6', '00000000-0000-4000-a000-0000000000a1',
   '00000000-0000-4000-b000-0000000000b5', -300);

-- «Planeado» tiene $10 en el plan de este mes, y nada más.
insert into public.budget_lines (month_start, envelope_id, planned_usd_cents) values
  (date_trunc('month', now() at time zone 'America/Caracas')::date,
   '00000000-0000-4000-b000-0000000000b4', 1000);

-- ---------------------------------------------------------------------------
-- Quién puede
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000c", "role": "authenticated"}';

select throws_ok(
  $$ select public.save_envelope('00000000-0000-4000-b000-0000000000d1', 'Nuevo', null, false) $$,
  '42501', 'Solo los miembros del hogar pueden cambiar los sobres',
  'alguien de fuera del hogar no crea sobres'
);

set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';

-- ---------------------------------------------------------------------------
-- Sobres
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ select public.save_envelope('00000000-0000-4000-b000-0000000000d1', ' Viajes ', '✈️', false) $$,
  'un miembro crea un sobre'
);

select results_eq(
  $$ select name, emoji, position::int, created_by, archived_at is null
     from public.envelopes where id = '00000000-0000-4000-b000-0000000000d1' $$,
  $$ values ('Viajes'::text, '✈️'::text, 10, '00000000-0000-4000-8000-00000000000a'::uuid, true) $$,
  'va al final, sin espacios de más y con quien lo creó'
);

select throws_ok(
  $$ select public.save_envelope('00000000-0000-4000-b000-0000000000d2', 'comida', null, false) $$,
  '23514', 'Ya hay un sobre con ese nombre',
  'dos sobres no se llaman igual, ni con otras mayúsculas'
);

select throws_ok(
  $$ select public.save_envelope('00000000-0000-4000-b000-0000000000d2', '  ', null, false) $$,
  '23514', 'Un sobre necesita un nombre',
  'un sobre tiene nombre'
);

select lives_ok(
  $$ select public.save_envelope('00000000-0000-4000-b000-0000000000b2', 'Comida', '🍔', false) $$,
  'guardar un sobre del catálogo como estaba'
);

select lives_ok(
  $$ select public.save_envelope('00000000-0000-4000-b000-0000000000b1', 'Ahorros', '💰', false) $$,
  'cambiarle el nombre y el emoji a otro'
);

select results_eq(
  $$ select name, emoji, updated_by from public.envelopes
     where id in ('00000000-0000-4000-b000-0000000000b1', '00000000-0000-4000-b000-0000000000b2')
     order by position $$,
  $$ values ('Ahorros'::text, '💰'::text, '00000000-0000-4000-8000-00000000000a'::uuid),
            ('Comida', '🍔', null) $$,
  'solo lo que cambió queda escrito desde la app'
);

select throws_ok(
  $$ select public.save_envelope('00000000-0000-4000-b000-0000000000b1', 'Ahorros', '💰', true) $$,
  '23514', 'Un sobre con dinero no se archiva: antes se mueve a otro sobre',
  'R20: un sobre con dinero no se archiva'
);

select throws_ok(
  $$ select public.save_envelope('00000000-0000-4000-b000-0000000000b4', 'Planeado', null, true) $$,
  '23514', 'Ese sobre tiene plan este mes o en uno siguiente: antes se deja en $0',
  'R20: ni uno con plan este mes'
);

select throws_ok(
  $$ select public.save_envelope('00000000-0000-4000-b000-0000000000b9', 'Otro', null, true) $$,
  '23514', '«Otro» no se archiva: es el dinero de otros que pasa por las cuentas',
  'R11: «Otro» no se archiva'
);

select lives_ok(
  $$ select public.save_envelope('00000000-0000-4000-b000-0000000000b3', 'Viejo', null, true) $$,
  'un sobre con historia y en cero se archiva'
);

select ok(
  (select archived_at is not null from public.envelopes
   where id = '00000000-0000-4000-b000-0000000000b3'),
  'queda archivado'
);

reset role;
select throws_ok(
  $$ insert into public.entries (operation_id, account_id, envelope_id, amount_cents) values
       ('00000000-0000-4000-c000-0000000000c2', '00000000-0000-4000-a000-0000000000a1',
        '00000000-0000-4000-b000-0000000000b3', 100) $$,
  '23514', 'Ese sobre está archivado: se reactiva antes de usarlo',
  'un sobre archivado no recibe movimientos nuevos'
);
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';

select lives_ok(
  $$ select public.save_envelope('00000000-0000-4000-b000-0000000000b3', 'Viejo', null, false) $$,
  'y se reactiva'
);

select throws_ok(
  $$ select public.delete_envelope('00000000-0000-4000-b000-0000000000b3') $$,
  '23514', 'Un sobre con movimientos no se borra: se archiva',
  'R20: un sobre con historia no se borra'
);

select throws_ok(
  $$ select public.delete_envelope('00000000-0000-4000-b000-0000000000b4') $$,
  '23514', 'Ese sobre sale en el plan de algún mes: se quita del plan, o se archiva',
  'ni uno que sale en el plan'
);

select throws_ok(
  $$ select public.delete_envelope('00000000-0000-4000-b000-0000000000b9') $$,
  '23514', '«Otro» no se borra: es el dinero de otros que pasa por las cuentas',
  'R11: «Otro» no se borra'
);

select lives_ok(
  $$ select public.delete_envelope('00000000-0000-4000-b000-0000000000d1') $$,
  'uno sin nada, creado sin querer, se borra'
);

select lives_ok(
  $$ select public.delete_envelope('00000000-0000-4000-b000-0000000000d1') $$,
  'borrarlo dos veces no es un error'
);

-- ---------------------------------------------------------------------------
-- Cuentas
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ select public.save_account('00000000-0000-4000-a000-0000000000d1', 'Banco C', 'USD', false) $$,
  'un miembro crea una cuenta'
);

select results_eq(
  $$ select name, currency, position::int, created_by from public.accounts
     where id = '00000000-0000-4000-a000-0000000000d1' $$,
  $$ values ('Banco C'::text, 'USD'::text, 3, '00000000-0000-4000-8000-00000000000a'::uuid) $$,
  'va al final, en su moneda y con quien la creó'
);

select throws_ok(
  $$ select public.save_account('00000000-0000-4000-a000-0000000000d1', 'Banco C', 'VES', false) $$,
  '23514', 'La moneda de una cuenta no se cambia: cada movimiento está en la suya',
  'R3: la moneda de una cuenta no cambia'
);

select throws_ok(
  $$ select public.save_account('00000000-0000-4000-a000-0000000000d2', 'banco a', 'VES', false) $$,
  '23514', 'Ya hay una cuenta con ese nombre',
  'dos cuentas no se llaman igual'
);

select throws_ok(
  $$ select public.save_account('00000000-0000-4000-a000-0000000000a2', 'Billetera B', 'USD', true) $$,
  '23514', 'Una cuenta con dinero no se archiva: antes se mueve a otra',
  'R20: una cuenta que suma cero pero tiene celdas con dinero no se archiva'
);

select throws_ok(
  $$ select public.delete_account('00000000-0000-4000-a000-0000000000a1') $$,
  '23514', 'Una cuenta con movimientos no se borra: se archiva',
  'R20: una cuenta con historia no se borra'
);

select lives_ok(
  $$ select public.save_account('00000000-0000-4000-a000-0000000000d1', 'Banco C', 'USD', true) $$,
  'una cuenta sin nada se archiva'
);

select lives_ok(
  $$ select public.delete_account('00000000-0000-4000-a000-0000000000d1') $$,
  'y se borra'
);

reset role;

-- ---------------------------------------------------------------------------
-- La recarga archiva lo que el Excel ya no usa
-- ---------------------------------------------------------------------------

-- Desde febrero: Viejo y Antiguo están en cero y sin usar; Comida tiene dinero, Planeado tiene plan y
-- «Otro» nunca. La Billetera B tiene celdas con dinero; el Banco A, Ahorro con 100.
select results_eq(
  $$ select envelope_count, account_count from public.archive_unused('2026-02-01') $$,
  $$ values (2, 0) $$,
  'archiva solo lo que está en cero y no se usó ni se planeó desde el mes en curso'
);

select ok(
  (select archived_at is not null and updated_by is null from public.envelopes
   where id = '00000000-0000-4000-b000-0000000000b5'),
  'y no cuenta lo que archiva como escrito desde la app'
);

select throws_ok(
  $$ select public.reset_imported_data() $$,
  'P0001', null,
  'el candado: con un sobre cambiado en la app, la recarga se niega'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';
select throws_ok(
  $$ select public.archive_unused('2026-02-01') $$,
  '42501', null,
  'desde la app no se archiva en bloque'
);
reset role;

select * from finish();
rollback;
