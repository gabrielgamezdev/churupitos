-- M8: la app registra también lo que se mueve sin gastarse: entre sobres, entre cuentas y
-- de una moneda a otra. `save_operation` y `restore_operation` aceptan esos tres tipos; la
-- forma de cada uno (R5) ya la comprueba `assert_operation_shape`, como al importar. Los
-- ajustes siguen viniendo solo del Excel, y los cobros llegan con M9.

create or replace function public.save_operation(
  op_id uuid,
  op_kind text,
  op_date date,
  op_description text,
  op_entries jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_author uuid;
  old_positions bigint[];
begin
  if not public.is_household_member() then
    raise exception 'Solo los miembros del hogar pueden registrar'
      using errcode = 'insufficient_privilege';
  end if;
  if op_kind not in ('expense', 'income', 'envelope_transfer', 'account_transfer', 'exchange') then
    raise exception 'La app no registra ajustes: los trae el Excel'
      using errcode = 'check_violation';
  end if;
  if jsonb_typeof(op_entries) is distinct from 'array' or jsonb_array_length(op_entries) = 0 then
    raise exception 'Una operación necesita al menos un asiento'
      using errcode = 'check_violation';
  end if;

  select o.created_by into existing_author
  from public.operations o
  where o.id = op_id
  for update;

  if found then
    -- Lo importado viene del Excel: la siguiente recarga lo devolvería como estaba.
    if existing_author is null then
      raise exception 'Lo importado del Excel no se corrige hasta el corte'
        using errcode = 'insufficient_privilege';
    end if;
    -- Corregir no la mueve dentro del día (R14): sus asientos conservan sus posiciones.
    select array_agg(e.position order by e.position) into old_positions
    from public.entries e
    where e.operation_id = op_id;
    delete from public.entries e where e.operation_id = op_id;
    update public.operations o
    set kind = op_kind, occurred_on = op_date, description = coalesce(op_description, '')
    where o.id = op_id;
  else
    insert into public.operations (id, kind, occurred_on, description, created_by)
    values (op_id, op_kind, op_date, coalesce(op_description, ''), (select auth.uid()));
  end if;

  insert into public.entries
    (operation_id, account_id, envelope_id, amount_cents, is_fee, description, position)
  select
    op_id,
    (line ->> 'account_id')::uuid,
    (line ->> 'envelope_id')::uuid,
    (line ->> 'amount_cents')::bigint,
    coalesce((line ->> 'is_fee')::boolean, false),
    coalesce(line ->> 'description', ''),
    coalesce(old_positions[n], nextval(pg_get_serial_sequence('public.entries', 'position')))
  from jsonb_array_elements(op_entries) with ordinality as l (line, n)
  order by n;

  -- R5 ahora y no solo al confirmar: así el error llega con la llamada, y las pruebas,
  -- que nunca confirman, lo ven.
  perform public.assert_operation_shape(op_id);
  return op_id;
end;
$$;

create or replace function public.restore_operation(snapshot jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  op public.operations;
begin
  if not public.is_household_member() then
    raise exception 'Solo los miembros del hogar pueden deshacer'
      using errcode = 'insufficient_privilege';
  end if;

  op := jsonb_populate_record(null::public.operations, snapshot -> 'operation');
  if op.id is null then
    raise exception 'No hay nada que deshacer' using errcode = 'check_violation';
  end if;
  if op.created_by is null then
    raise exception 'Lo importado del Excel no se restaura: hasta el corte vive allí'
      using errcode = 'insufficient_privilege';
  end if;
  -- Lo mismo que se puede registrar: ni ajustes ni, hasta M9, cobros.
  if op.kind not in ('expense', 'income', 'envelope_transfer', 'account_transfer', 'exchange')
    or op.income_id is not null then
    raise exception 'Solo se restauran los movimientos registrados en la app'
      using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.operations o where o.id = op.id) then
    return;
  end if;

  insert into public.operations (
    id, kind, occurred_on, date_approximate, description, created_by, created_at
  )
  values (
    op.id, op.kind, op.occurred_on, op.date_approximate, op.description, op.created_by,
    op.created_at
  );

  -- Con su posición de antes: es la que la ponía en su sitio del día (R14).
  insert into public.entries (
    id, operation_id, account_id, envelope_id, amount_cents, is_fee, description, position
  )
  select e.id, op.id, e.account_id, e.envelope_id, e.amount_cents, e.is_fee, e.description,
    e.position
  from jsonb_populate_recordset(null::public.entries, snapshot -> 'entries') e;

  perform public.assert_operation_shape(op.id);
end;
$$;
