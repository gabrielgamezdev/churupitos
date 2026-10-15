-- La recarga desde los Excels y su candado: lo registrado en la app no se borra sin
-- pedirlo. Datos inventados.
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

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
  'Hay operaciones registradas desde la app: recargar desde los Excels las borraría',
  'el candado: con operaciones de la app, la recarga se niega'
);
select lives_ok(
  'select public.reset_imported_data(include_app_data => true)',
  'pidiéndolo expresamente, sí se recarga'
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
