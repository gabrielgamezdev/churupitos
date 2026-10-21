-- La recarga desde los Excels y su candado: lo registrado en la app no se borra sin
-- pedirlo. Datos inventados.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

-- La base puede tener una carga real y, en la nube, lo registrado de verdad en la app:
-- se vacía todo para empezar sin nada, y el rollback del final lo deja como estaba.
select public.reset_imported_data(include_app_data => true);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'miembro.a@ejemplo.test');
insert into public.household_members (user_id, display_name) values
  ('00000000-0000-4000-8000-00000000000a', 'Miembro A');

-- Las comprobaciones de forma quedan diferidas y esta prueba nunca confirma: aquí
-- solo importa el candado, así que las operaciones pueden ir sin asientos.
insert into public.accounts (name, currency) values ('Banco A', 'VES');
insert into public.operations (kind, occurred_on, description, created_by) values
  ('expense', '2026-01-05', 'Importada', null);

select lives_ok(
  'select public.reset_imported_data()',
  'sin nada registrado desde la app, la recarga vacía la base'
);
select is(
  (select count(*) from public.accounts) + (select count(*) from public.operations),
  0::bigint,
  'no queda nada de lo importado'
);

insert into public.operations (kind, occurred_on, description, created_by) values
  ('expense', '2026-01-05', 'Registrada en la app', '00000000-0000-4000-8000-00000000000a');

select throws_ok(
  'select public.reset_imported_data()',
  'P0001',
  'Hay datos escritos desde la app (movimientos, deudas, presupuesto, sobres o cuentas): recargar desde los Excels los borraría',
  'el candado: con operaciones de la app, la recarga se niega'
);
select lives_ok(
  'select public.reset_imported_data(include_app_data => true)',
  'pidiéndolo expresamente, sí se recarga'
);

insert into public.debts (direction, description, amount_cents, currency, created_by) values
  ('payable', 'Agregada en la app', 1000, 'USD', '00000000-0000-4000-8000-00000000000a');

select throws_ok(
  'select public.reset_imported_data()',
  'P0001',
  null,
  'el candado: con deudas agregadas en la app, la recarga también se niega'
);
select lives_ok(
  'select public.reset_imported_data(include_app_data => true)',
  'pidiéndolo expresamente, también se recarga'
);

-- Un ingreso esperado importado que se cambió en la app (M10): también es de la app.
insert into public.expected_incomes (month_start, name, expected_usd_cents, updated_by) values
  ('2026-10-01', 'Bono', 10000, '00000000-0000-4000-8000-00000000000a');

select throws_ok(
  'select public.reset_imported_data()',
  'P0001',
  null,
  'el candado: con el presupuesto cambiado en la app, la recarga también se niega'
);
select lives_ok(
  'select public.reset_imported_data(include_app_data => true)',
  'pidiéndolo expresamente, también se recarga'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';
select throws_ok(
  'select public.reset_imported_data()',
  '42501',
  null,
  'desde la app no se puede vaciar la base'
);
reset role;

select * from finish();
rollback;
