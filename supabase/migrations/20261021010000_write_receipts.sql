-- M9: la app cobra un ingreso esperado y lo reparte. Un cobro es un ingreso enlazado a su
-- línea esperada, con el valor en dólares de cada línea del reparto si llega en bolívares
-- (R8, R9). Lo guarda `save_receipt`, que comprueba la forma de un ingreso (R5) y la de un
-- cobro (`assert_receipt_shape`), y que esa línea no tenga ya otro cobro. Restaurar un cobro
-- borrado lo devuelve con su enlace y sus valores en dólares.

-- Guarda un cobro: lo crea, o lo corrige entero si ya existe. `op_entries` es la lista de
-- líneas del reparto: `account_id`, `envelope_id`, `amount_cents` (positivo), y opcionales
-- `usd_value_cents` (obligatorio en bolívares), `is_fee` (R16) y `description`.
create function public.save_receipt(
  op_id uuid,
  op_income_id uuid,
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
  existing_income uuid;
  old_positions bigint[];
begin
  if not public.is_household_member() then
    raise exception 'Solo los miembros del hogar pueden cobrar'
      using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.expected_incomes i where i.id = op_income_id) then
    raise exception 'Ese ingreso esperado no existe' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.operations o where o.income_id = op_income_id and o.id <> op_id
  ) then
    raise exception 'Ese ingreso ya está cobrado' using errcode = 'check_violation';
  end if;
  if jsonb_typeof(op_entries) is distinct from 'array' or jsonb_array_length(op_entries) = 0 then
    raise exception 'Un cobro necesita al menos una línea de reparto'
      using errcode = 'check_violation';
  end if;

  select o.created_by, o.income_id into existing_author, existing_income
  from public.operations o
  where o.id = op_id
  for update;

  if found then
    -- Lo importado viene del Excel: la siguiente recarga lo devolvería como estaba.
    if existing_author is null then
      raise exception 'Lo importado del Excel no se corrige hasta el corte'
        using errcode = 'insufficient_privilege';
    end if;
    if existing_income is distinct from op_income_id then
      raise exception 'Ese movimiento no es el cobro de ese ingreso'
        using errcode = 'check_violation';
    end if;
    -- Corregir no lo mueve dentro del día (R14): sus líneas conservan sus posiciones.
    select array_agg(e.position order by e.position) into old_positions
    from public.entries e
    where e.operation_id = op_id;
    delete from public.entries e where e.operation_id = op_id;
    update public.operations o
    set occurred_on = op_date, description = coalesce(op_description, '')
    where o.id = op_id;
  else
    insert into public.operations (id, kind, occurred_on, description, income_id, created_by)
    values (
      op_id, 'income', op_date, coalesce(op_description, ''), op_income_id, (select auth.uid())
    );
  end if;

  insert into public.entries (
    operation_id, account_id, envelope_id, amount_cents, is_fee, description,
    usd_value_cents, position
  )
  select
    op_id,
    (line ->> 'account_id')::uuid,
    (line ->> 'envelope_id')::uuid,
    (line ->> 'amount_cents')::bigint,
    coalesce((line ->> 'is_fee')::boolean, false),
    coalesce(line ->> 'description', ''),
    (line ->> 'usd_value_cents')::bigint,
    coalesce(old_positions[n], nextval(pg_get_serial_sequence('public.entries', 'position')))
  from jsonb_array_elements(op_entries) with ordinality as l (line, n)
  order by n;

  -- La forma ahora y no solo al confirmar: el error llega con la llamada.
  perform public.assert_operation_shape(op_id);
  perform public.assert_receipt_shape(op_id);
  return op_id;
end;
$$;

revoke execute on function public.save_receipt(uuid, uuid, date, text, jsonb) from public, anon;
grant execute on function public.save_receipt(uuid, uuid, date, text, jsonb) to authenticated;

-- Restaurar acepta ahora los cobros: vuelven con su enlace y el valor en dólares de cada
-- línea, y si esa línea ya tiene otro cobro, no se restaura.
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
  -- Lo mismo que se puede registrar: todo menos los ajustes.
  if op.kind not in ('expense', 'income', 'envelope_transfer', 'account_transfer', 'exchange') then
    raise exception 'Solo se restauran los movimientos registrados en la app'
      using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.operations o where o.id = op.id) then
    return;
  end if;
  if op.income_id is not null
    and exists (select 1 from public.operations o where o.income_id = op.income_id) then
    raise exception 'Ese ingreso ya está cobrado' using errcode = 'check_violation';
  end if;

  insert into public.operations (
    id, kind, occurred_on, date_approximate, description, income_id, created_by, created_at
  )
  values (
    op.id, op.kind, op.occurred_on, op.date_approximate, op.description, op.income_id,
    op.created_by, op.created_at
  );

  -- Con su posición de antes: es la que la ponía en su sitio del día (R14).
  insert into public.entries (
    id, operation_id, account_id, envelope_id, amount_cents, is_fee, description,
    usd_value_cents, position
  )
  select e.id, op.id, e.account_id, e.envelope_id, e.amount_cents, e.is_fee, e.description,
    e.usd_value_cents, e.position
  from jsonb_populate_recordset(null::public.entries, snapshot -> 'entries') e;

  perform public.assert_operation_shape(op.id);
  perform public.assert_receipt_shape(op.id);
end;
$$;
