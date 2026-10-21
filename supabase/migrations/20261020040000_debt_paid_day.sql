-- Deshacer «No está pagada» (M7) devuelve la deuda a pagada con el día que tenía, no
-- con el de hoy: `set_debt_paid` acepta ese día. Sin él, la marca pagada hoy, en
-- Caracas (R13), como antes.

drop function public.set_debt_paid(uuid, boolean);

create function public.set_debt_paid(debt_id uuid, paid boolean, paid_day date default null)
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
    else coalesce(paid_day, d.paid_on, (now() at time zone 'America/Caracas')::date)
  end
  where d.id = debt_id;
end;
$$;

revoke execute on function public.set_debt_paid(uuid, boolean, date) from public, anon;
grant execute on function public.set_debt_paid(uuid, boolean, date) to authenticated;
