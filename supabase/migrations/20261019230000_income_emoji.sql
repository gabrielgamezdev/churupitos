-- Lo que le falta a la pantalla del presupuesto de M4: el emoji de cada ingreso, como
-- en el Excel («💰 Bono»). Solo dice cómo se pinta, igual que el de los sobres.

alter table public.expected_incomes
  add column emoji text
  check (emoji is null or (char_length(emoji) between 1 and 16 and emoji = btrim(emoji)));

-- La misma vista, con el emoji al final: así se puede reemplazar sin tocar lo que
-- depende de ella (budget_checks) y conserva sus permisos.
create or replace view public.expected_income_summary
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
  r.operation_id is not null as is_received,
  i.emoji
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
