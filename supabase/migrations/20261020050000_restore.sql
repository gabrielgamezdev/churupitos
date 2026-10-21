-- M7: borrar no pregunta, se deshace. Para que lo borrado vuelva igual (con su autor,
-- cuándo se registró y su sitio en el día, R14), borrar devuelve lo que borró, y
-- restaurar lo vuelve a poner tal cual. Igual que el resto de lo que escribe la app
-- (ADR 0008): funciones que comprueban quién llama y la forma de lo que escriben.

-- ---------------------------------------------------------------------------
-- Operaciones
-- ---------------------------------------------------------------------------

drop function public.delete_operation(uuid);

-- Borra una operación registrada en la app y devuelve la operación con sus asientos,
-- para deshacerlo. Si ya no estaba, no es un error: devuelve null.
create function public.delete_operation(op_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_author uuid;
  snapshot jsonb;
begin
  if not public.is_household_member() then
    raise exception 'Solo los miembros del hogar pueden borrar'
      using errcode = 'insufficient_privilege';
  end if;

  select o.created_by into existing_author
  from public.operations o
  where o.id = op_id
  for update;

  if not found then
    return null;
  end if;
  if existing_author is null then
    raise exception 'Lo importado del Excel no se borra hasta el corte'
      using errcode = 'insufficient_privilege';
  end if;

  select jsonb_build_object(
    'operation', to_jsonb(o),
    'entries', (
      select jsonb_agg(to_jsonb(e) order by e.position)
      from public.entries e
      where e.operation_id = o.id
    )
  ) into snapshot
  from public.operations o
  where o.id = op_id;

  delete from public.operations o where o.id = op_id;
  return snapshot;
end;
$$;

-- Vuelve a poner una operación que devolvió `delete_operation`. Solo un gasto o un
-- ingreso de la app, como los que se pueden borrar; y su forma se comprueba otra vez
-- (R5), porque lo que llega lo manda el teléfono. Si ya está, no hace nada: deshacer
-- dos veces no la duplica.
create function public.restore_operation(snapshot jsonb)
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
  if op.kind not in ('expense', 'income') or op.income_id is not null then
    raise exception 'Solo se restauran los gastos y los ingresos registrados en la app'
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

revoke execute on function public.delete_operation(uuid), public.restore_operation(jsonb)
  from public, anon;
grant execute on function public.delete_operation(uuid), public.restore_operation(jsonb)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Deudas
-- ---------------------------------------------------------------------------

drop function public.delete_debt(uuid);

-- Borra una deuda y la devuelve, para deshacerlo. Si ya no estaba, devuelve null.
create function public.delete_debt(debt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot jsonb;
begin
  if not public.is_household_member() then
    raise exception 'Solo los miembros del hogar pueden borrar deudas'
      using errcode = 'insufficient_privilege';
  end if;

  delete from public.debts d where d.id = debt_id returning to_jsonb(d) into snapshot;
  return snapshot;
end;
$$;

-- Vuelve a poner una deuda que devolvió `delete_debt`, con su sitio en la lista, si está
-- pagada y quién la agregó. Una importada vuelve sin autor, como era. Si ya está, nada.
create function public.restore_debt(snapshot jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  debt public.debts;
begin
  if not public.is_household_member() then
    raise exception 'Solo los miembros del hogar pueden deshacer'
      using errcode = 'insufficient_privilege';
  end if;

  debt := jsonb_populate_record(null::public.debts, snapshot);
  if debt.id is null then
    raise exception 'No hay nada que deshacer' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.debts d where d.id = debt.id) then
    return;
  end if;

  insert into public.debts (
    id, direction, description, amount_cents, currency, due_on, position, created_at,
    paid_on, created_by
  )
  values (
    debt.id, debt.direction, debt.description, debt.amount_cents, debt.currency,
    debt.due_on, debt.position, debt.created_at, debt.paid_on, debt.created_by
  );
end;
$$;

revoke execute on function public.delete_debt(uuid), public.restore_debt(jsonb)
  from public, anon;
grant execute on function public.delete_debt(uuid), public.restore_debt(jsonb)
  to authenticated;
