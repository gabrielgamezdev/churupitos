-- El libro de cada sobre (M3): sus asientos de todas las cuentas, con lo que le quedó
-- al sobre en cada moneda después de cada uno. Es `account_ledger` mirado desde el
-- sobre. Las reglas que se citan (R2, R14) son las de docs/DOMINIO.md.
--
-- El restante se suma al leer (R2) y por moneda, porque un sobre puede tener dinero
-- en bolívares y en dólares y nunca se mezclan. El orden es el del libro (R14): la
-- fecha y, dentro del día, la posición. Entre cuentas distintas del mismo día la
-- posición no dice cuál fue antes, así que el restante de en medio de ese día es uno
-- de los posibles; el del final del día es siempre el mismo. Se puede filtrar por
-- sobre o por fecha sin romper el corrido: Postgres suma el libro entero del sobre
-- antes de aplicar el filtro.
create view public.envelope_ledger
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
  )::bigint as running_balance_cents
from public.entries e
join public.operations o on o.id = e.operation_id
join public.accounts a on a.id = e.account_id;

-- Como `account_ledger`: lee con los permisos de quien pregunta, y el RLS de las
-- tablas decide lo que ve (regla 5 de AGENTS.md).
revoke all on public.envelope_ledger from anon, authenticated;
grant select on public.envelope_ledger to authenticated;
