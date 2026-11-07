-- M13: pagar una deuda en un solo paso. `pay_debt` registra el gasto y deja la deuda pagada,
-- enlazada a él, en una transacción. La deuda conserva su monto: casi siempre se debe en
-- dólares y se paga en bolívares, y lo pagado sale del gasto. Marcarla pagada sin gasto
-- sigue existiendo, para lo pagado por otro medio o perdonado (R17). Las reglas que se
-- citan (R8, R17) son las de docs/DOMINIO.md.

-- El gasto con el que se pagó. Si no lo hay, se marcó a mano.
alter table public.debts
  add column paid_operation_id uuid references public.operations (id) on delete set null;

create unique index debts_single_payment_per_operation
  on public.debts (paid_operation_id)
  where paid_operation_id is not null;

-- Lo que se pagó de cada deuda, en la moneda de la cuenta, sin las comisiones. Se calcula
-- del gasto, como todo saldo; la tasa sale de esto y del monto de la deuda, y no se guarda
-- (R8).
create view public.debt_payments
with (security_invoker = true)
as
select
  d.id as debt_id,
  a.currency,
  (-sum(e.amount_cents))::bigint as paid_cents
from public.debts d
join public.entries e on e.operation_id = d.paid_operation_id and not e.is_fee
join public.accounts a on a.id = e.account_id
group by d.id, a.currency;

revoke all on public.debt_payments from anon, authenticated;
grant select on public.debt_payments to authenticated;

-- ---------------------------------------------------------------------------
-- El gasto manda
-- ---------------------------------------------------------------------------

-- Corregir la fecha del gasto cambia el día del pago, y borrarlo devuelve la deuda a
-- pendiente, venga de la función que venga.
create function public.sync_debt_payment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.debts d set paid_on = null where d.paid_operation_id = old.id;
    return old;
  end if;
  update public.debts d
  set paid_on = new.occurred_on
  where d.paid_operation_id = new.id and d.paid_on is distinct from new.occurred_on;
  return new;
end;
$$;

create trigger operations_debt_payment_deleted
  before delete on public.operations
  for each row execute function public.sync_debt_payment();

create trigger operations_debt_payment_moved
  after update of occurred_on on public.operations
  for each row execute function public.sync_debt_payment();

-- ---------------------------------------------------------------------------
-- Escribir
-- ---------------------------------------------------------------------------

-- Paga una deuda: registra el gasto y la deja pagada el día del gasto. Guardar otra vez
-- con el mismo gasto lo corrige: un reintento no falla.
create function public.pay_debt(
  target_debt uuid,
  op_id uuid,
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
  current_debt public.debts;
begin
  if not public.is_household_member() then
    raise exception 'Solo los miembros del hogar pueden pagar deudas'
      using errcode = 'insufficient_privilege';
  end if;

  select * into current_debt from public.debts d where d.id = target_debt for update;
  if not found then
    raise exception 'Esa deuda ya no existe' using errcode = 'check_violation';
  end if;
  if current_debt.direction <> 'payable' then
    raise exception 'Solo se paga lo que se debe' using errcode = 'check_violation';
  end if;
  if current_debt.paid_on is not null
    and current_debt.paid_operation_id is distinct from op_id then
    raise exception 'Esa deuda ya está pagada' using errcode = 'check_violation';
  end if;

  perform public.save_operation(op_id, 'expense', op_date, op_description, op_entries);

  update public.debts d
  set paid_on = op_date, paid_operation_id = op_id
  where d.id = target_debt;
  return op_id;
end;
$$;

revoke execute on function public.pay_debt(uuid, uuid, date, text, jsonb) from public, anon;
grant execute on function public.pay_debt(uuid, uuid, date, text, jsonb) to authenticated;

-- Desmarcar una deuda pagada con un gasto la dejaría pendiente con el gasto hecho: lo que
-- se deshace es el gasto, que el disparador la devuelve a pendiente.
create or replace function public.set_debt_paid(debt_id uuid, paid boolean, paid_day date default null)
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
  if not paid and exists (
    select 1 from public.debts d where d.id = debt_id and d.paid_operation_id is not null
  ) then
    raise exception 'Esa deuda se pagó con un gasto: se borra el gasto para deshacerlo'
      using errcode = 'check_violation';
  end if;

  update public.debts d
  set paid_on = case
    when not paid then null
    else coalesce(paid_day, d.paid_on, (now() at time zone 'America/Caracas')::date)
  end
  where d.id = debt_id;
end;
$$;

-- Borrar el gasto devuelve también qué deuda pagaba, para que deshacerlo la deje como
-- estaba.
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
    ),
    'paid_debt_id', (select d.id from public.debts d where d.paid_operation_id = o.id)
  ) into snapshot
  from public.operations o
  where o.id = op_id;

  delete from public.operations o where o.id = op_id;
  return snapshot;
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

  -- La deuda que pagaba vuelve a estar pagada con él, si nadie la pagó entre tanto.
  update public.debts d
  set paid_on = op.occurred_on, paid_operation_id = op.id
  where d.id = (snapshot ->> 'paid_debt_id')::uuid and d.paid_on is null;
end;
$$;

-- Una deuda borrada vuelve con su pago, si el gasto sigue ahí.
create or replace function public.restore_debt(snapshot jsonb)
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
    paid_on, created_by, paid_operation_id
  )
  values (
    debt.id, debt.direction, debt.description, debt.amount_cents, debt.currency,
    debt.due_on, debt.position, debt.created_at, debt.paid_on, debt.created_by,
    (select o.id from public.operations o where o.id = debt.paid_operation_id)
  );
end;
$$;
