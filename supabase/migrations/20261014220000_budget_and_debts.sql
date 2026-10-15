-- El presupuesto del mes y las deudas: lo que en el Excel es la hoja PRESUPUESTO.
-- Las reglas que se citan (R8, R9…) son las de docs/DOMINIO.md.
--
-- Solo se guarda lo que alguien decide: cuánto se espera cobrar, cuánto se le da a
-- cada sobre y el valor en dólares de cada línea del reparto. La tasa, los Bs que
-- recibe cada sobre y los ✅/⏳ se calculan de los cobros.

-- ---------------------------------------------------------------------------
-- Ingresos esperados y cobros
-- ---------------------------------------------------------------------------

-- Una línea por pago esperado: si una fuente llega en dos pagos, son dos líneas.
create table public.expected_incomes (
  id uuid primary key default gen_random_uuid(),
  month_start date not null check (extract(day from month_start) = 1),
  -- La fuente: Quincena, Bono, Tarjeta de alimentación…
  name text not null check (length(trim(name)) between 1 and 40),
  expected_usd_cents bigint not null check (expected_usd_cents > 0),
  -- El orden de la línea en el Excel.
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index expected_incomes_month_start_idx on public.expected_incomes (month_start);

-- Un cobro es una operación de ingreso enlazada a su línea esperada. Cada línea
-- cobra una sola vez: un segundo pago es otra línea.
alter table public.operations
  add column income_id uuid references public.expected_incomes (id),
  add constraint operations_income_only_on_income_check
    check (income_id is null or kind = 'income');

create unique index operations_single_receipt_per_income
  on public.operations (income_id)
  where income_id is not null;

-- R9: el reparto se decide en dólares. Cada línea de un cobro en bolívares guarda
-- su valor en dólares, porque recalcularlo dividiendo por la tasa arrastra el
-- céntimo. En una cuenta en dólares no hace falta: el importe ya lo es.
alter table public.entries
  add column usd_value_cents bigint check (usd_value_cents > 0);

-- La forma de un cobro, aparte de la de su tipo (que ya comprueba
-- assert_operation_shape).
create function public.assert_receipt_shape(target uuid)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  op_kind text;
  op_income_id uuid;
  problem text;
begin
  select kind, income_id into op_kind, op_income_id from public.operations where id = target;
  if not found then
    return;
  end if;

  if exists (
    select 1
    from public.entries e
    join public.accounts a on a.id = e.account_id
    where e.operation_id = target
      and e.usd_value_cents is not null
      and (op_kind <> 'income' or e.is_fee or a.currency <> 'VES')
  ) then
    problem := 'Solo las líneas del reparto de un ingreso en bolívares llevan su valor en dólares';
  elsif op_income_id is not null and exists (
    select 1
    from public.entries e
    join public.accounts a on a.id = e.account_id
    where e.operation_id = target
      and not e.is_fee
      and a.currency = 'VES'
      and e.usd_value_cents is null
  ) then
    problem := 'En un cobro en bolívares, cada línea del reparto lleva su valor en dólares';
  end if;

  if problem is not null then
    raise exception '%', problem
      using errcode = 'check_violation', detail = format('operación %s', target);
  end if;
end;
$$;

revoke execute on function public.assert_receipt_shape(uuid) from public, anon;
grant execute on function public.assert_receipt_shape(uuid) to authenticated;

create function public.check_receipt_shape()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'operations' then
    perform public.assert_receipt_shape(new.id);
  else
    if tg_op <> 'INSERT' then
      perform public.assert_receipt_shape(old.operation_id);
    end if;
    if tg_op <> 'DELETE' then
      perform public.assert_receipt_shape(new.operation_id);
    end if;
  end if;
  return null;
end;
$$;

-- Diferidos por lo mismo que los de la forma: un cobro se escribe en varias sentencias.
create constraint trigger operations_check_receipt
  after insert or update of kind, income_id on public.operations
  deferrable initially deferred
  for each row execute function public.check_receipt_shape();

create constraint trigger entries_check_receipt
  after insert or update or delete on public.entries
  deferrable initially deferred
  for each row execute function public.check_receipt_shape();

-- ---------------------------------------------------------------------------
-- El plan del mes
-- ---------------------------------------------------------------------------

create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  month_start date not null check (extract(day from month_start) = 1),
  envelope_id uuid not null references public.envelopes (id),
  planned_usd_cents bigint not null check (planned_usd_cents >= 0),
  -- De qué ingresos sale («Fuente de fondos») y qué hacer con el dinero
  -- («Acción»). Texto libre, como en el Excel: no se calcula nada con ellos.
  funding_note text not null default '',
  action_note text not null default '',
  created_at timestamptz not null default now(),
  unique (month_start, envelope_id)
);

-- ---------------------------------------------------------------------------
-- Deudas y deudores (R17): una lista aparte del libro
-- ---------------------------------------------------------------------------

-- El importe es el de la cuota o la deuda tal cual se apunta, no un saldo que se
-- vaya restando: al pagarla, se quita de la lista.
create table public.debts (
  id uuid primary key default gen_random_uuid(),
  -- `payable`: lo que el hogar debe. `receivable`: lo que le deben.
  direction text not null check (direction in ('payable', 'receivable')),
  description text not null check (length(trim(description)) between 1 and 120),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null check (currency in ('VES', 'USD')),
  due_on date,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Lo que se calcula
-- ---------------------------------------------------------------------------

-- Cada línea esperada con su cobro, si llegó: la fecha, la cuenta, el importe en la
-- moneda de la cuenta y su valor en dólares. R8: la tasa es el cociente de los dos,
-- y no se guarda ni se redondea aquí.
create view public.expected_income_summary
with (security_invoker = true)
as
select
  i.id as expected_income_id,
  i.month_start,
  i.position,
  i.name,
  i.expected_usd_cents,
  r.operation_id,
  r.occurred_on as received_on,
  r.account_id,
  r.currency,
  r.amount_cents as received_cents,
  r.usd_value_cents as received_usd_cents,
  r.operation_id is not null as is_received
from public.expected_incomes i
left join (
  select
    o.id as operation_id,
    o.income_id,
    o.occurred_on,
    e.account_id,
    a.currency,
    sum(e.amount_cents)::bigint as amount_cents,
    sum(case when a.currency = 'USD' then e.amount_cents else e.usd_value_cents end)::bigint
      as usd_value_cents
  from public.operations o
  join public.entries e on e.operation_id = o.id and not e.is_fee
  join public.accounts a on a.id = e.account_id
  where o.income_id is not null
  group by o.id, o.income_id, o.occurred_on, e.account_id, a.currency
) r on r.income_id = i.id;

-- Lo que el reparto de los cobros del mes le dio a cada sobre: en dólares, y en
-- bolívares lo que cayó en cuentas en bolívares. El mes es el del ingreso esperado,
-- no la fecha del cobro.
create view public.envelope_allocations
with (security_invoker = true)
as
select
  i.month_start,
  e.envelope_id,
  sum(case when a.currency = 'USD' then e.amount_cents else e.usd_value_cents end)::bigint
    as allocated_usd_cents,
  coalesce(sum(e.amount_cents) filter (where a.currency = 'VES'), 0)::bigint
    as allocated_ves_cents
from public.entries e
join public.operations o on o.id = e.operation_id
join public.expected_incomes i on i.id = o.income_id
join public.accounts a on a.id = e.account_id
where not e.is_fee
group by i.month_start, e.envelope_id;

-- El plan de cada sobre frente a lo que ya recibió. R10: los Bs del sobre son los de
-- su reparto. Está entregado (✅) cuando el reparto cubre lo planeado.
create view public.budget_summary
with (security_invoker = true)
as
select
  b.id as budget_line_id,
  b.month_start,
  b.envelope_id,
  b.planned_usd_cents,
  coalesce(al.allocated_usd_cents, 0) as allocated_usd_cents,
  coalesce(al.allocated_ves_cents, 0) as allocated_ves_cents,
  coalesce(al.allocated_usd_cents, 0) >= b.planned_usd_cents as is_delivered,
  b.funding_note,
  b.action_note
from public.budget_lines b
left join public.envelope_allocations al
  on al.month_start = b.month_start and al.envelope_id = b.envelope_id;

-- R12 (a) y (b), las comprobaciones del presupuesto que no se cumplen solas. Son
-- avisos: si una pareja no coincide, el mes está descuadrado, pero no se impide.
-- (c) y (d) se cumplen por construcción (R2).
create view public.budget_checks
with (security_invoker = true)
as
with months as (
  select month_start from public.expected_incomes
  union
  select month_start from public.budget_lines
)
select
  m.month_start,
  coalesce((
    select sum(i.expected_usd_cents) from public.expected_incomes i
    where i.month_start = m.month_start
  ), 0)::bigint as expected_usd_cents,
  coalesce((
    select sum(b.planned_usd_cents) from public.budget_lines b
    where b.month_start = m.month_start
  ), 0)::bigint as planned_usd_cents,
  coalesce((
    select sum(s.received_cents) from public.expected_income_summary s
    where s.month_start = m.month_start and s.currency = 'VES'
  ), 0)::bigint as received_ves_cents,
  coalesce((
    select sum(s.allocated_ves_cents) from public.budget_summary s
    where s.month_start = m.month_start
  ), 0)::bigint as allocated_ves_cents
from months m;

create view public.debt_totals
with (security_invoker = true)
as
select direction, currency, sum(amount_cents)::bigint as total_cents
from public.debts
group by direction, currency;

-- ---------------------------------------------------------------------------
-- Permisos (regla 5 de AGENTS.md), igual que el libro: en M1 la app solo lee
-- ---------------------------------------------------------------------------

alter table public.expected_incomes enable row level security;
alter table public.budget_lines enable row level security;
alter table public.debts enable row level security;

revoke all on public.expected_incomes, public.budget_lines, public.debts,
  public.expected_income_summary, public.envelope_allocations, public.budget_summary,
  public.budget_checks, public.debt_totals
  from anon, authenticated;
grant select on public.expected_incomes, public.budget_lines, public.debts,
  public.expected_income_summary, public.envelope_allocations, public.budget_summary,
  public.budget_checks, public.debt_totals
  to authenticated;

create policy "household members can read expected incomes"
  on public.expected_incomes for select to authenticated
  using ((select public.is_household_member()));

create policy "household members can read budget lines"
  on public.budget_lines for select to authenticated
  using ((select public.is_household_member()));

create policy "household members can read debts"
  on public.debts for select to authenticated
  using ((select public.is_household_member()));
