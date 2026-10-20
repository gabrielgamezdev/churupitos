-- M5: las cuotas pagadas del mes en curso, que el Excel marca ✅ desde octubre de 2026
-- en vez de borrarlas (D9). Se siguen viendo, pero ya no se deben (R17).

alter table public.debts
  add column is_paid boolean not null default false;

-- Lo pendiente: las pagadas no cuentan. Mismas columnas, así que se reemplaza sin
-- tocar sus permisos.
create or replace view public.debt_totals
with (security_invoker = true)
as
select direction, currency, sum(amount_cents)::bigint as total_cents
from public.debts
where not is_paid
group by direction, currency;
