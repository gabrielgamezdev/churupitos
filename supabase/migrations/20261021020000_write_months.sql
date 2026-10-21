-- M10: la app escribe el presupuesto del mes. Prepara el siguiente, copiando el último, y
-- cambia el de cualquier mes, también el que trae el Excel (decisión del autor: hasta el
-- corte, la recarga lo devuelve como en el Excel). `save_month` guarda el mes entero de una
-- vez, como se edita la hoja; `delete_month` borra un mes preparado, para deshacerlo. Las
-- reglas que se citan (R12, R19) son las de docs/DOMINIO.md.

-- Quién lo creó en la app y quién lo cambió por última vez; lo importado que nadie tocó no
-- tiene ninguno de los dos. Los cuenta el candado del corte, como el autor de los
-- movimientos y de las deudas.
alter table public.expected_incomes
  add column created_by uuid references public.household_members (user_id),
  add column updated_by uuid references public.household_members (user_id);
alter table public.budget_lines
  add column created_by uuid references public.household_members (user_id),
  add column updated_by uuid references public.household_members (user_id);

-- ---------------------------------------------------------------------------
-- Escribir
-- ---------------------------------------------------------------------------

-- Guarda el presupuesto de un mes entero: lo crea, o lo deja como dicen las listas. Lo que
-- no está en ellas se quita. Lo que no cambió no se toca, ni siquiera quién lo escribió.
--
-- `income_rows`, en orden: `id` (lo pone la app), `name`, `expected_usd_cents` y,
-- opcionales, `emoji` y `position` (si no, va al final). Un ingreso que ya existe conserva
-- su emoji y su posición: M10 no los cambia.
-- `line_rows`: `envelope_id`, `planned_usd_cents` y, opcionales, `funding_note` y
-- `action_note`. Un sobre por línea.
--
-- R19: no se saltan meses, uno nuevo es el siguiente al último que tiene presupuesto. Un
-- ingreso cobrado no se quita, ni un sobre que ya recibió de un cobro del mes: se deja en
-- $0. El plan puede no sumar lo esperado: el cuadre es un aviso (`R12`).
create function public.save_month(target_month date, income_rows jsonb, line_rows jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  author uuid := (select auth.uid());
  last_month date;
  next_position smallint;
begin
  if not public.is_household_member() then
    raise exception 'Solo los miembros del hogar pueden planear el mes'
      using errcode = 'insufficient_privilege';
  end if;
  if target_month is null or extract(day from target_month) <> 1 then
    raise exception 'Un mes se nombra por su día 1' using errcode = 'check_violation';
  end if;
  if jsonb_typeof(income_rows) is distinct from 'array'
    or jsonb_typeof(line_rows) is distinct from 'array' then
    raise exception 'Faltan los ingresos o el plan del mes' using errcode = 'check_violation';
  end if;
  if jsonb_array_length(income_rows) = 0 and jsonb_array_length(line_rows) = 0 then
    raise exception 'Un mes sin ingresos ni plan no se guarda'
      using errcode = 'check_violation';
  end if;
  if exists (select 1 from jsonb_array_elements(income_rows) r where r ->> 'id' is null) then
    raise exception 'Cada ingreso esperado lleva su identificador'
      using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from jsonb_array_elements(line_rows) r
    group by r ->> 'envelope_id'
    having count(*) > 1
  ) then
    raise exception 'Un sobre sale dos veces en el plan' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from jsonb_array_elements(line_rows) r
    where length(coalesce(r ->> 'funding_note', '')) > 120
      or length(coalesce(r ->> 'action_note', '')) > 120
  ) then
    raise exception 'La fuente o la acción de un sobre pasa de 120 letras'
      using errcode = 'check_violation';
  end if;

  -- De uno en uno: dos personas preparando a la vez el mismo mes nuevo lo duplicarían.
  perform pg_advisory_xact_lock(hashtext('public.save_month'));

  if not exists (select 1 from public.expected_incomes i where i.month_start = target_month)
    and not exists (select 1 from public.budget_lines b where b.month_start = target_month)
  then
    select max(m) into last_month from (
      select max(i.month_start) as m from public.expected_incomes i
      union all
      select max(b.month_start) from public.budget_lines b
    ) months;
    if last_month is not null and target_month <> (last_month + interval '1 month')::date then
      raise exception 'Un mes nuevo es el siguiente al último que tiene presupuesto'
        using errcode = 'check_violation', detail = format('el último es %s', last_month);
    end if;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(income_rows) r
    join public.expected_incomes i on i.id = (r ->> 'id')::uuid
    where i.month_start <> target_month
  ) then
    raise exception 'Ese ingreso esperado es de otro mes' using errcode = 'check_violation';
  end if;
  if exists (
    select 1
    from public.expected_incomes i
    join public.operations o on o.income_id = i.id
    where i.month_start = target_month
      and not exists (
        select 1 from jsonb_array_elements(income_rows) r where (r ->> 'id')::uuid = i.id
      )
  ) then
    raise exception 'Un ingreso cobrado no se quita: antes se borra su cobro'
      using errcode = 'check_violation';
  end if;
  if exists (
    select 1
    from public.budget_lines b
    join public.envelope_allocations a
      on a.month_start = b.month_start and a.envelope_id = b.envelope_id
    where b.month_start = target_month
      and not exists (
        select 1 from jsonb_array_elements(line_rows) r
        where (r ->> 'envelope_id')::uuid = b.envelope_id
      )
  ) then
    raise exception 'Ese sobre ya recibió de un cobro del mes: se deja en $0, no se quita'
      using errcode = 'check_violation';
  end if;

  -- Los ingresos.
  delete from public.expected_incomes i
  where i.month_start = target_month
    and not exists (
      select 1 from jsonb_array_elements(income_rows) r where (r ->> 'id')::uuid = i.id
    );

  -- Los nuevos, detrás de todo: de lo que ya hay y de las posiciones que trae la lista.
  select coalesce(max(p), 0) into next_position from (
    select max(i.position) as p from public.expected_incomes i where i.month_start = target_month
    union all
    select max((r ->> 'position')::smallint) from jsonb_array_elements(income_rows) r
  ) positions;

  insert into public.expected_incomes as i
    (id, month_start, name, emoji, expected_usd_cents, position, created_by, updated_by)
  select
    (r ->> 'id')::uuid,
    target_month,
    btrim(r ->> 'name'),
    nullif(btrim(coalesce(r ->> 'emoji', '')), ''),
    (r ->> 'expected_usd_cents')::bigint,
    coalesce((r ->> 'position')::smallint, next_position + n),
    author,
    author
  from jsonb_array_elements(income_rows) with ordinality as x (r, n)
  on conflict (id) do update
  set name = excluded.name,
      expected_usd_cents = excluded.expected_usd_cents,
      updated_by = excluded.updated_by
  where (i.name, i.expected_usd_cents)
    is distinct from (excluded.name, excluded.expected_usd_cents);

  -- El plan.
  delete from public.budget_lines b
  where b.month_start = target_month
    and not exists (
      select 1 from jsonb_array_elements(line_rows) r
      where (r ->> 'envelope_id')::uuid = b.envelope_id
    );

  insert into public.budget_lines as b
    (month_start, envelope_id, planned_usd_cents, funding_note, action_note, created_by,
     updated_by)
  select
    target_month,
    (r ->> 'envelope_id')::uuid,
    (r ->> 'planned_usd_cents')::bigint,
    btrim(coalesce(r ->> 'funding_note', '')),
    btrim(coalesce(r ->> 'action_note', '')),
    author,
    author
  from jsonb_array_elements(line_rows) r
  on conflict (month_start, envelope_id) do update
  set planned_usd_cents = excluded.planned_usd_cents,
      funding_note = excluded.funding_note,
      action_note = excluded.action_note,
      updated_by = excluded.updated_by
  where (b.planned_usd_cents, b.funding_note, b.action_note)
    is distinct from (excluded.planned_usd_cents, excluded.funding_note, excluded.action_note);
end;
$$;

-- Borra un mes que la app preparó, para deshacer la preparación. Solo el último con
-- presupuesto, para no dejar un hueco; ni uno que trae algo del Excel, ni uno que ya tiene
-- cobros. Borrar dos veces lo mismo no es un error.
create function public.delete_month(target_month date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_household_member() then
    raise exception 'Solo los miembros del hogar pueden borrar un mes'
      using errcode = 'insufficient_privilege';
  end if;

  perform pg_advisory_xact_lock(hashtext('public.save_month'));

  if exists (
    select 1 from public.expected_incomes i
    where i.month_start = target_month and i.created_by is null
  ) or exists (
    select 1 from public.budget_lines b
    where b.month_start = target_month and b.created_by is null
  ) then
    raise exception 'Un mes que trae el Excel no se borra'
      using errcode = 'insufficient_privilege';
  end if;
  if exists (
    select 1
    from public.expected_incomes i
    join public.operations o on o.income_id = i.id
    where i.month_start = target_month
  ) then
    raise exception 'Ese mes ya tiene cobros: antes se borran'
      using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.expected_incomes i where i.month_start > target_month)
    or exists (select 1 from public.budget_lines b where b.month_start > target_month) then
    raise exception 'Solo se borra el último mes con presupuesto'
      using errcode = 'check_violation';
  end if;

  delete from public.budget_lines b where b.month_start = target_month;
  delete from public.expected_incomes i where i.month_start = target_month;
end;
$$;

revoke execute on function public.save_month(date, jsonb, jsonb), public.delete_month(date)
  from public, anon;
grant execute on function public.save_month(date, jsonb, jsonb), public.delete_month(date)
  to authenticated;

-- ---------------------------------------------------------------------------
-- El candado del corte, también con el presupuesto escrito desde la app
-- ---------------------------------------------------------------------------

create or replace function public.reset_imported_data(include_app_data boolean default false)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not include_app_data and (
    exists (select 1 from public.operations where created_by is not null)
    or exists (select 1 from public.debts where created_by is not null)
    or exists (
      select 1 from public.expected_incomes
      where created_by is not null or updated_by is not null
    )
    or exists (
      select 1 from public.budget_lines
      where created_by is not null or updated_by is not null
    )
  ) then
    raise exception 'Hay movimientos, deudas o presupuesto escritos desde la app: recargar desde los Excels los borraría'
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
