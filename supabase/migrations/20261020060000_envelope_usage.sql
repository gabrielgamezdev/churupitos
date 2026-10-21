-- M7: en Registrar, los sobres salen primero los que más se usan en la cuenta elegida.
-- Esto los cuenta: cuántos gastos e ingresos sueltos tuvo cada celda (cuenta × sobre)
-- desde un día. Las comisiones, los traspasos y los cobros repartidos no cuentan: no son
-- lo que se registra a mano. Corre con los permisos de quien pregunta, como los saldos:
-- el RLS de las tablas decide lo que ve.
create function public.envelope_usage(since date)
returns table (account_id uuid, envelope_id uuid, uses bigint)
language sql
stable
set search_path = ''
as $$
  select e.account_id, e.envelope_id, count(distinct e.operation_id)
  from public.entries e
  join public.operations o on o.id = e.operation_id
  where o.occurred_on >= since
    and o.kind in ('expense', 'income')
    and o.income_id is null
    and not e.is_fee
  group by e.account_id, e.envelope_id;
$$;

revoke execute on function public.envelope_usage(date) from public, anon;
grant execute on function public.envelope_usage(date) to authenticated;
