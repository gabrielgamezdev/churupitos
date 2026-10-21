-- M7: los libros dicen quién registró cada movimiento en la app. Las dos vistas ganan
-- `created_by` al final (lo importado del Excel no tiene autor), sin cambiar nada de lo
-- que ya daban. Siguen leyendo con los permisos de quien pregunta.

create or replace view public.account_ledger
with (security_invoker = true)
as
select
  e.id as entry_id,
  e.operation_id,
  e.account_id,
  a.currency,
  o.occurred_on,
  o.date_approximate,
  e.position,
  o.kind,
  e.envelope_id,
  e.amount_cents,
  e.is_fee,
  e.description,
  o.description as operation_description,
  sum(e.amount_cents) over (
    partition by e.account_id
    order by o.occurred_on, e.position, e.id
  )::bigint as running_balance_cents,
  o.created_by
from public.entries e
join public.operations o on o.id = e.operation_id
join public.accounts a on a.id = e.account_id;

create or replace view public.envelope_ledger
with (security_invoker = true)
as
select
  e.id as entry_id,
  e.operation_id,
  e.envelope_id,
  e.account_id,
  a.currency,
  o.occurred_on,
  o.date_approximate,
  e.position,
  o.kind,
  e.amount_cents,
  e.is_fee,
  e.description,
  o.description as operation_description,
  sum(e.amount_cents) over (
    partition by e.envelope_id, a.currency
    order by o.occurred_on, e.position, e.id
  )::bigint as running_balance_cents,
  o.created_by
from public.entries e
join public.operations o on o.id = e.operation_id
join public.accounts a on a.id = e.account_id;
