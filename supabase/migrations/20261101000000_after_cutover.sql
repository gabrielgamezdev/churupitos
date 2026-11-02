-- M12: después del corte. Desde el 2026-11-01 la base es la fuente y no hay Excel detrás:
-- la recarga se niega siempre, lo importado se corrige como lo demás y los meses pasados se
-- cierran solos (R21). Todo depende de la marca del corte, que solo lleva la nube: la base
-- local sigue como antes del corte, para desarrollar y recargar. Las reglas que se citan
-- (R13, R14, R21) son las de docs/DOMINIO.md.

-- ---------------------------------------------------------------------------
-- La marca del corte
-- ---------------------------------------------------------------------------

-- Una sola fila, con el día del corte. Se pone una vez, a mano (ops/mark-cutover.mjs).
create table public.cutover (
  singleton boolean primary key default true check (singleton),
  cut_on date not null check (extract(day from cut_on) = 1),
  created_at timestamptz not null default now()
);

alter table public.cutover enable row level security;
create policy "household members can read the cutover"
  on public.cutover for select to authenticated
  using ((select public.is_household_member()));
revoke all on public.cutover from anon, authenticated;
grant select on public.cutover to authenticated;

create function public.after_cutover()
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from public.cutover);
$$;

revoke execute on function public.after_cutover() from public, anon;
grant execute on function public.after_cutover() to authenticated;

-- Quién cambió un movimiento por última vez desde la app: también uno importado, que no
-- tiene autor. Lo cuenta el candado de la recarga.
alter table public.operations
  add column updated_by uuid references public.household_members (user_id);

-- ---------------------------------------------------------------------------
-- Meses cerrados (R21)
-- ---------------------------------------------------------------------------

-- Un mes abierto a propósito para corregirlo, hasta el fin de ese día.
create table public.month_openings (
  month_start date primary key check (extract(day from month_start) = 1),
  opened_by uuid not null references public.household_members (user_id),
  open_until timestamptz not null
);

alter table public.month_openings enable row level security;
create policy "household members can read month openings"
  on public.month_openings for select to authenticated
  using ((select public.is_household_member()));
revoke all on public.month_openings from anon, authenticated;
grant select on public.month_openings to authenticated;

-- R21: desde el corte, un mes se cierra solo el día 5 del siguiente, en hora de Caracas
-- (R13), salvo que esté abierto a propósito.
create function public.month_is_closed(target_day date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.after_cutover()
    and (now() at time zone 'America/Caracas')::date
      >= (date_trunc('month', target_day) + interval '1 month 4 days')::date
    and not exists (
      select 1 from public.month_openings m
      where m.month_start = date_trunc('month', target_day)::date and m.open_until > now()
    );
$$;

revoke execute on function public.month_is_closed(date) from public, anon;
grant execute on function public.month_is_closed(date) to authenticated;

create function public.assert_month_open(target_day date)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  names text[] := array['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
    'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
begin
  if target_day is not null and public.month_is_closed(target_day) then
    raise exception '% de % está cerrado: se abre para cambiarlo',
      names[extract(month from target_day)::int], extract(year from target_day)
      using errcode = 'check_violation',
            detail = format('mes %s', date_trunc('month', target_day)::date);
  end if;
end;
$$;

revoke execute on function public.assert_month_open(date) from public, anon;
grant execute on function public.assert_month_open(date) to authenticated;

-- Lo cumplen todas las escrituras, vengan de la función que vengan: disparadores sobre los
-- movimientos (su fecha de antes y la nueva, y el mes del ingreso que cobran) y sobre el
-- presupuesto de cada mes.
create function public.check_operation_month()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op <> 'INSERT' then
    perform public.assert_month_open(old.occurred_on);
    perform public.assert_month_open(
      (select i.month_start from public.expected_incomes i where i.id = old.income_id)
    );
  end if;
  if tg_op <> 'DELETE' then
    perform public.assert_month_open(new.occurred_on);
    perform public.assert_month_open(
      (select i.month_start from public.expected_incomes i where i.id = new.income_id)
    );
    return new;
  end if;
  return old;
end;
$$;

create trigger operations_month_open
  before insert or update or delete on public.operations
  for each row execute function public.check_operation_month();

create function public.check_budget_month()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op <> 'INSERT' then
    perform public.assert_month_open(old.month_start);
  end if;
  if tg_op <> 'DELETE' then
    perform public.assert_month_open(new.month_start);
    return new;
  end if;
  return old;
end;
$$;

create trigger expected_incomes_month_open
  before insert or update or delete on public.expected_incomes
  for each row execute function public.check_budget_month();

create trigger budget_lines_month_open
  before insert or update or delete on public.budget_lines
  for each row execute function public.check_budget_month();

-- Abre un mes a propósito hasta el fin de hoy, en Caracas. Devuelve hasta cuándo.
create function public.open_month(target_month date)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  until timestamptz :=
    (date_trunc('day', now() at time zone 'America/Caracas') + interval '1 day')
      at time zone 'America/Caracas';
begin
  if not public.is_household_member() then
    raise exception 'Solo los miembros del hogar pueden abrir un mes'
      using errcode = 'insufficient_privilege';
  end if;
  if target_month is null or extract(day from target_month) <> 1 then
    raise exception 'Un mes se nombra por su día 1' using errcode = 'check_violation';
  end if;

  insert into public.month_openings (month_start, opened_by, open_until)
  values (target_month, (select auth.uid()), until)
  on conflict (month_start) do update
  set opened_by = excluded.opened_by, open_until = excluded.open_until;
  return until;
end;
$$;

-- Lo vuelve a cerrar antes del fin del día. Cerrar uno que no estaba abierto no es un error.
create function public.close_month(target_month date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_household_member() then
    raise exception 'Solo los miembros del hogar pueden cerrar un mes'
      using errcode = 'insufficient_privilege';
  end if;
  delete from public.month_openings m where m.month_start = target_month;
end;
$$;

revoke execute on function public.open_month(date), public.close_month(date) from public, anon;
grant execute on function public.open_month(date), public.close_month(date) to authenticated;

-- ---------------------------------------------------------------------------
-- Lo importado se corrige como lo demás, desde el corte
-- ---------------------------------------------------------------------------

-- Antes del corte, lo importado vive en el Excel y la siguiente recarga lo devolvería como
-- estaba: no se corrige. Desde el corte, sí, y queda quién lo cambió. Los ajustes del
-- arrastre no: la app no registra ajustes.
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
  existing_kind text;
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

  select o.created_by, o.kind into existing_author, existing_kind
  from public.operations o
  where o.id = op_id
  for update;

  if found then
    if existing_author is null and not public.after_cutover() then
      raise exception 'Lo importado del Excel no se corrige hasta el corte'
        using errcode = 'insufficient_privilege';
    end if;
    if existing_kind = 'adjustment' then
      raise exception 'Los ajustes del arrastre no se corrigen'
        using errcode = 'check_violation';
    end if;
    -- Corregir no la mueve dentro del día (R14): sus asientos conservan sus posiciones.
    select array_agg(e.position order by e.position) into old_positions
    from public.entries e
    where e.operation_id = op_id;
    delete from public.entries e where e.operation_id = op_id;
    update public.operations o
    set kind = op_kind,
        occurred_on = op_date,
        description = coalesce(op_description, ''),
        updated_by = (select auth.uid())
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

-- Borra una operación y devuelve lo que borró, para deshacerlo. Desde el corte, también
-- una importada; los ajustes del arrastre, nunca.
create or replace function public.delete_operation(op_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_author uuid;
  existing_kind text;
  snapshot jsonb;
begin
  if not public.is_household_member() then
    raise exception 'Solo los miembros del hogar pueden borrar'
      using errcode = 'insufficient_privilege';
  end if;

  select o.created_by, o.kind into existing_author, existing_kind
  from public.operations o
  where o.id = op_id
  for update;

  if not found then
    return null;
  end if;
  if existing_author is null and not public.after_cutover() then
    raise exception 'Lo importado del Excel no se borra hasta el corte'
      using errcode = 'insufficient_privilege';
  end if;
  if existing_kind = 'adjustment' then
    raise exception 'Los ajustes del arrastre no se borran' using errcode = 'check_violation';
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

-- Vuelve a poner lo que devolvió `delete_operation`, tal cual: con su autor (o sin él, si
-- era importado), su fecha aproximada y su sitio en el día (R14).
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
  if op.created_by is null and not public.after_cutover() then
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
    id, kind, occurred_on, date_approximate, description, income_id, created_by, created_at,
    updated_by
  )
  values (
    op.id, op.kind, op.occurred_on, op.date_approximate, op.description, op.income_id,
    op.created_by, op.created_at, op.updated_by
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

-- Guarda un cobro (M9). Desde el corte, corrige también uno importado.
create or replace function public.save_receipt(
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
    if existing_author is null and not public.after_cutover() then
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
    set occurred_on = op_date,
        description = coalesce(op_description, ''),
        updated_by = (select auth.uid())
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

-- ---------------------------------------------------------------------------
-- La recarga, nunca después del corte
-- ---------------------------------------------------------------------------

create or replace function public.reset_imported_data(include_app_data boolean default false)
returns void
language plpgsql
set search_path = ''
as $$
begin
  -- Desde el corte, lo registrado en la app no está en ningún Excel: recargar lo borraría
  -- todo, y no se puede ni pidiéndolo.
  if public.after_cutover() then
    raise exception 'La base es la fuente desde el corte (%): ya no se recarga desde los Excels',
      (select c.cut_on from public.cutover c)
      using errcode = 'P0001';
  end if;
  if not include_app_data and (
    exists (select 1 from public.operations where created_by is not null or updated_by is not null)
    or exists (select 1 from public.debts where created_by is not null)
    or exists (
      select 1 from public.expected_incomes
      where created_by is not null or updated_by is not null
    )
    or exists (
      select 1 from public.budget_lines
      where created_by is not null or updated_by is not null
    )
    or exists (
      select 1 from public.envelopes where created_by is not null or updated_by is not null
    )
    or exists (
      select 1 from public.accounts where created_by is not null or updated_by is not null
    )
  ) then
    raise exception 'Hay datos escritos desde la app (movimientos, deudas, presupuesto, sobres o cuentas): recargar desde los Excels los borraría'
      using errcode = 'P0001',
            hint = 'Si de verdad hay que recargar, se pide expresamente con include_app_data.';
  end if;

  -- Las operaciones primero: sus asientos se van con ellas en cascada, y así la
  -- comprobación de forma (R5) nunca ve una operación sin asientos, ni siquiera con
  -- las restricciones inmediatas. Lo demás, de hijos a padres.
  delete from public.operations;
  delete from public.expected_incomes;
  delete from public.budget_lines;
  delete from public.debts;
  delete from public.envelopes;
  delete from public.accounts;
end;
$$;
