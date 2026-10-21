-- Preparar y cambiar el presupuesto de un mes desde la app (M10): el mes entero de una vez,
-- sin saltar meses ni quitar lo cobrado (R19) y sin tocar lo que no cambió; y borrar un mes
-- preparado para deshacerlo. Cuentas, sobres e importes inventados.
begin;
create extension if not exists pgtap with schema extensions;

select plan(23);

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
  ('00000000-0000-4000-a000-0000000000a1', 'Banco A', 'VES', 1);
insert into public.envelopes (id, name, position) values
  ('00000000-0000-4000-b000-0000000000b1', 'Ahorro', 1),
  ('00000000-0000-4000-b000-0000000000b2', 'Comida', 2);

-- Octubre y noviembre, importados. El bono de octubre ya está cobrado, y le dio $20 a
-- Ahorro.
insert into public.expected_incomes (id, month_start, name, emoji, expected_usd_cents, position) values
  ('00000000-0000-4000-e000-0000000000e1', '2026-10-01', 'Bono', '💰', 10000, 3),
  ('00000000-0000-4000-e000-0000000000e2', '2026-10-01', 'Quincena', null, 5000, 4),
  ('00000000-0000-4000-e000-0000000000e3', '2026-11-01', 'Bono', '💰', 10000, 3);
insert into public.budget_lines (month_start, envelope_id, planned_usd_cents, funding_note, action_note) values
  ('2026-10-01', '00000000-0000-4000-b000-0000000000b1', 6000, 'Bono', 'Cambiar'),
  ('2026-10-01', '00000000-0000-4000-b000-0000000000b2', 4000, 'Bono', ''),
  ('2026-11-01', '00000000-0000-4000-b000-0000000000b1', 10000, 'Bono', 'Cambiar');
insert into public.operations (id, kind, occurred_on, income_id, created_by) values
  ('00000000-0000-4000-c000-0000000000c0', 'income', '2026-10-02',
   '00000000-0000-4000-e000-0000000000e1', null);
insert into public.entries (operation_id, account_id, envelope_id, amount_cents, usd_value_cents) values
  ('00000000-0000-4000-c000-0000000000c0', '00000000-0000-4000-a000-0000000000a1',
   '00000000-0000-4000-b000-0000000000b1', 800000, 2000);

-- Un ingreso y una línea del plan en JSON.
create function pg_temp.income(id text, name text, usd bigint, emoji text default null,
  pos int default null)
returns jsonb
language sql
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', id, 'name', name, 'expected_usd_cents', usd, 'emoji', emoji, 'position', pos));
$$;
create function pg_temp.line(envelope text, usd bigint, funding text default '',
  action text default '')
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'envelope_id', (select id from public.envelopes where name = envelope),
    'planned_usd_cents', usd, 'funding_note', funding, 'action_note', action);
$$;

-- ---------------------------------------------------------------------------
-- Quién puede
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000c", "role": "authenticated"}';

select throws_ok(
  $$ select public.save_month('2026-12-01',
       jsonb_build_array(pg_temp.income('00000000-0000-4000-e000-0000000000d1', 'Bono', 10000)),
       '[]') $$,
  '42501', 'Solo los miembros del hogar pueden planear el mes',
  'alguien de fuera del hogar no planea nada'
);

set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';

-- ---------------------------------------------------------------------------
-- Preparar el mes siguiente
-- ---------------------------------------------------------------------------

-- Diciembre, copiado de noviembre (el bono con su emoji y su posición) y un extra nuevo.
-- El plan reparte $100 de los $120 esperados: se guarda igual, el cuadre es un aviso.
select lives_ok(
  $$ select public.save_month('2026-12-01',
       jsonb_build_array(
         pg_temp.income('00000000-0000-4000-e000-0000000000d1', 'Bono', 10000, '💰', 3),
         pg_temp.income('00000000-0000-4000-e000-0000000000d2', ' Extra ', 2000)),
       jsonb_build_array(pg_temp.line('Ahorro', 10000, 'Bono', 'Cambiar'))) $$,
  'un miembro prepara el mes siguiente, aunque el plan no sume lo esperado (R12)'
);

select results_eq(
  $$ select name, emoji, expected_usd_cents, position::int, created_by, updated_by
     from public.expected_incomes where month_start = '2026-12-01' order by position $$,
  $$ values
       ('Bono'::text, '💰'::text, 10000::bigint, 3, '00000000-0000-4000-8000-00000000000a'::uuid,
        '00000000-0000-4000-8000-00000000000a'::uuid),
       ('Extra', null, 2000, 5, '00000000-0000-4000-8000-00000000000a',
        '00000000-0000-4000-8000-00000000000a') $$,
  'los ingresos copiados conservan emoji y posición; los nuevos van detrás, sin espacios'
);

select results_eq(
  $$ select planned_usd_cents, funding_note, action_note, created_by is not null
     from public.budget_lines where month_start = '2026-12-01' $$,
  $$ values (10000::bigint, 'Bono'::text, 'Cambiar'::text, true) $$,
  'el plan del mes nuevo, con su fuente, su acción y quién lo escribió'
);

select throws_ok(
  $$ select public.save_month('2027-02-01',
       jsonb_build_array(pg_temp.income('00000000-0000-4000-e000-0000000000d3', 'Bono', 10000)),
       '[]') $$,
  '23514', 'Un mes nuevo es el siguiente al último que tiene presupuesto',
  'no se saltan meses'
);

select throws_ok(
  $$ select public.save_month('2027-01-15',
       jsonb_build_array(pg_temp.income('00000000-0000-4000-e000-0000000000d3', 'Bono', 10000)),
       '[]') $$,
  '23514', 'Un mes se nombra por su día 1',
  'un mes es su día 1'
);

select throws_ok(
  $$ select public.save_month('2027-01-01', '[]', '[]') $$,
  '23514', 'Un mes sin ingresos ni plan no se guarda',
  'un mes vacío no se guarda'
);

select throws_ok(
  $$ select public.save_month('2027-01-01', '[]',
       jsonb_build_array(pg_temp.line('Ahorro', 100), pg_temp.line('Ahorro', 200))) $$,
  '23514', 'Un sobre sale dos veces en el plan',
  'un sobre, una línea'
);

select throws_ok(
  $$ select public.save_month('2026-12-01',
       jsonb_build_array(pg_temp.income('00000000-0000-4000-e000-0000000000e3', 'Bono', 10000)),
       '[]') $$,
  '23514', 'Ese ingreso esperado es de otro mes',
  'un ingreso no se cambia de mes'
);

-- ---------------------------------------------------------------------------
-- Cambiar un mes que trae el Excel
-- ---------------------------------------------------------------------------

-- Octubre: la quincena pasa a $60 y Comida a $30; el bono y Ahorro, igual.
select lives_ok(
  $$ select public.save_month('2026-10-01',
       jsonb_build_array(
         pg_temp.income('00000000-0000-4000-e000-0000000000e1', 'Bono', 10000, '💰', 3),
         pg_temp.income('00000000-0000-4000-e000-0000000000e2', 'Quincena', 6000)),
       jsonb_build_array(
         pg_temp.line('Ahorro', 6000, 'Bono', 'Cambiar'),
         pg_temp.line('Comida', 3000, 'Bono'))) $$,
  'el presupuesto importado también se cambia desde la app'
);

select results_eq(
  $$ select name, expected_usd_cents, position::int, created_by, updated_by
     from public.expected_incomes where month_start = '2026-10-01' order by position $$,
  $$ values
       ('Bono'::text, 10000::bigint, 3, null::uuid, null::uuid),
       ('Quincena', 6000, 4, null, '00000000-0000-4000-8000-00000000000a') $$,
  'solo lo que cambió queda escrito desde la app; lo demás sigue como lo trajo el Excel'
);

select results_eq(
  $$ select e.name, b.planned_usd_cents, b.updated_by
     from public.budget_lines b join public.envelopes e on e.id = b.envelope_id
     where b.month_start = '2026-10-01' order by e.position $$,
  $$ values
       ('Ahorro'::text, 6000::bigint, null::uuid),
       ('Comida', 3000, '00000000-0000-4000-8000-00000000000a') $$,
  'lo mismo en el plan'
);

select throws_ok(
  $$ select public.save_month('2026-10-01',
       jsonb_build_array(pg_temp.income('00000000-0000-4000-e000-0000000000e2', 'Quincena', 6000)),
       jsonb_build_array(pg_temp.line('Ahorro', 6000), pg_temp.line('Comida', 3000))) $$,
  '23514', 'Un ingreso cobrado no se quita: antes se borra su cobro',
  'un ingreso cobrado no se quita'
);

select throws_ok(
  $$ select public.save_month('2026-10-01',
       jsonb_build_array(
         pg_temp.income('00000000-0000-4000-e000-0000000000e1', 'Bono', 10000),
         pg_temp.income('00000000-0000-4000-e000-0000000000e2', 'Quincena', 6000)),
       jsonb_build_array(pg_temp.line('Comida', 3000))) $$,
  '23514', 'Ese sobre ya recibió de un cobro del mes: se deja en $0, no se quita',
  'un sobre que ya recibió de un cobro del mes no sale del plan (R18)'
);

select lives_ok(
  $$ select public.save_month('2026-10-01',
       jsonb_build_array(pg_temp.income('00000000-0000-4000-e000-0000000000e1', 'Bono', 10000)),
       jsonb_build_array(pg_temp.line('Ahorro', 6000, 'Bono', 'Cambiar'))) $$,
  'se quitan un ingreso pendiente y un sobre que no recibió nada'
);

select is(
  (select count(*) from public.expected_incomes where month_start = '2026-10-01')
    + (select count(*) from public.budget_lines where month_start = '2026-10-01'),
  2::bigint,
  'octubre queda con el bono y Ahorro'
);

-- ---------------------------------------------------------------------------
-- Borrar un mes preparado (deshacer)
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ select public.delete_month('2026-11-01') $$,
  '42501', 'Un mes que trae el Excel no se borra',
  'un mes importado no se borra'
);

select lives_ok(
  $$ select public.save_month('2027-01-01',
       jsonb_build_array(pg_temp.income('00000000-0000-4000-e000-0000000000d4', 'Bono', 10000)),
       '[]') $$,
  'enero, el siguiente a diciembre'
);

select throws_ok(
  $$ select public.delete_month('2026-12-01') $$,
  '23514', 'Solo se borra el último mes con presupuesto',
  'borrar un mes del medio dejaría un hueco'
);

reset role;
insert into public.operations (id, kind, occurred_on, income_id, created_by) values
  ('00000000-0000-4000-c000-0000000000c1', 'income', '2026-12-30',
   '00000000-0000-4000-e000-0000000000d4', '00000000-0000-4000-8000-00000000000a');
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';

select throws_ok(
  $$ select public.delete_month('2027-01-01') $$,
  '23514', 'Ese mes ya tiene cobros: antes se borran',
  'un mes con cobros no se borra'
);

reset role;
delete from public.operations where id = '00000000-0000-4000-c000-0000000000c1';
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';

select lives_ok(
  $$ select public.delete_month('2027-01-01') $$,
  'deshacer enero lo borra'
);

select lives_ok(
  $$ select public.delete_month('2027-01-01') $$,
  'borrarlo dos veces no es un error'
);

select is(
  (select count(*) from public.expected_incomes where month_start = '2027-01-01'),
  0::bigint,
  'enero ya no está'
);

reset role;

select * from finish();
rollback;
