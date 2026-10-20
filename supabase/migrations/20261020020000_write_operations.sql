-- M6: la app empieza a escribir (ADR 0008). Lo hace solo con estas dos funciones, que
-- escriben una operación entera de una vez y comprueban lo mismo que se comprueba al
-- importar: la app sigue sin permiso para escribir directo en ninguna tabla. Las
-- reglas que se citan (R5, R6, R16) son las de docs/DOMINIO.md.

-- Guarda un gasto o un ingreso registrado en la app: lo crea, o lo reemplaza entero si
-- ya existe. El identificador lo pone la app al abrir el formulario, así que guardar
-- dos veces lo mismo (dos toques, un reintento sin red) deja una sola operación.
--
-- `op_entries` es una lista de asientos: `account_id`, `envelope_id`, `amount_cents`
-- con su signo, y opcionales `is_fee` (R16) y `description`. Que un sobre quede en
-- negativo no es un error (R6).
create function public.save_operation(
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
  if op_kind not in ('expense', 'income') then
    raise exception 'La app todavía solo registra gastos e ingresos'
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

-- Borra una operación registrada en la app, con sus asientos.
create function public.delete_operation(op_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_author uuid;
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
    -- Ya no estaba: borrar dos veces lo mismo no es un error.
    return;
  end if;
  if existing_author is null then
    raise exception 'Lo importado del Excel no se borra hasta el corte'
      using errcode = 'insufficient_privilege';
  end if;

  delete from public.operations o where o.id = op_id;
end;
$$;

revoke execute on function public.save_operation(uuid, text, date, text, jsonb),
  public.delete_operation(uuid)
  from public, anon;
grant execute on function public.save_operation(uuid, text, date, text, jsonb),
  public.delete_operation(uuid)
  to authenticated;
