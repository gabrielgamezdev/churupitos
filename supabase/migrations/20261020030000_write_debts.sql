-- M6: la app escribe también las deudas, con funciones como las de los movimientos
-- (ADR 0008). Las reglas que se citan (R13, R17, D9) son las de docs/DOMINIO.md.

-- El día en que se pagó, en vez de solo si está pagada: una pagada se ve durante el mes
-- en que se pagó (D9). `is_paid` sigue existiendo, calculada, para lo que ya la lee.
alter table public.debts add column paid_on date;
update public.debts set paid_on = coalesce(due_on, current_date) where is_paid;

drop view public.debt_totals;
alter table public.debts drop column is_paid;
alter table public.debts
  add column is_paid boolean generated always as (paid_on is not null) stored;

-- Quién la agregó en la app; lo importado del Excel no tiene autor. Lo cuenta el candado
-- del corte, igual que los movimientos.
alter table public.debts
  add column created_by uuid references public.household_members (user_id);

create view public.debt_totals
with (security_invoker = true)
as
select direction, currency, sum(amount_cents)::bigint as total_cents
from public.debts
where not is_paid
group by direction, currency;

revoke all on public.debt_totals from anon, authenticated;
grant select on public.debt_totals to authenticated;

-- ---------------------------------------------------------------------------
-- Escribir
-- ---------------------------------------------------------------------------

-- Agrega o corrige deudas, una o varias a la vez (las cuotas de una compra). Cada una
-- con su identificador, que pone la app: guardar otra vez lo mismo la corrige. Corregir
-- no toca si está pagada ni quién la agregó. A diferencia de los movimientos, lo
-- importado también se corrige: la recarga reemplaza la lista entera con la del Excel,
-- que se lleva en paralelo.
--
-- `debt_rows`: `id`, `direction`, `description`, `amount_cents`, `currency` y, si la
-- tiene, `due_on`.
create function public.save_debts(debt_rows jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_position smallint;
begin
  if not public.is_household_member() then
    raise exception 'Solo los miembros del hogar pueden agregar deudas'
      using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(debt_rows) is distinct from 'array' or jsonb_array_length(debt_rows) = 0 then
    raise exception 'No hay ninguna deuda que guardar'
      using errcode = 'check_violation';
  end if;

  select coalesce(max(d.position), 0) into next_position from public.debts d;

  insert into public.debts
    (id, direction, description, amount_cents, currency, due_on, position, created_by)
  select
    (row_data ->> 'id')::uuid,
    row_data ->> 'direction',
    btrim(row_data ->> 'description'),
    (row_data ->> 'amount_cents')::bigint,
    row_data ->> 'currency',
    (row_data ->> 'due_on')::date,
    next_position + n,
    (select auth.uid())
  from jsonb_array_elements(debt_rows) with ordinality as r (row_data, n)
  on conflict (id) do update
  set direction = excluded.direction,
      description = excluded.description,
      amount_cents = excluded.amount_cents,
      currency = excluded.currency,
      due_on = excluded.due_on;
end;
$$;

-- Marca una deuda pagada hoy, en Caracas (R13), o la desmarca. Pagar la cuota es un
-- gasto aparte (R17): esto solo dice que ya no se debe.
create function public.set_debt_paid(debt_id uuid, paid boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_household_member() then
    raise exception 'Solo los miembros del hogar pueden marcar deudas'
      using errcode = 'insufficient_privilege';
  end if;

  update public.debts d
  set paid_on = case
    when not paid then null
    else coalesce(d.paid_on, (now() at time zone 'America/Caracas')::date)
  end
  where d.id = debt_id;
end;
$$;

-- Borra una deuda. Borrar dos veces lo mismo no es un error.
create function public.delete_debt(debt_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_household_member() then
    raise exception 'Solo los miembros del hogar pueden borrar deudas'
      using errcode = 'insufficient_privilege';
  end if;

  delete from public.debts d where d.id = debt_id;
end;
$$;

revoke execute on function public.save_debts(jsonb), public.set_debt_paid(uuid, boolean),
  public.delete_debt(uuid)
  from public, anon;
grant execute on function public.save_debts(jsonb), public.set_debt_paid(uuid, boolean),
  public.delete_debt(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- El candado del corte, también con las deudas agregadas en la app
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
  ) then
    raise exception 'Hay operaciones o deudas registradas desde la app: recargar desde los Excels las borraría'
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
