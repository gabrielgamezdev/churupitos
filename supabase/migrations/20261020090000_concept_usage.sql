-- M7: al escribir el concepto en Registrar, la app propone los de antes con su sobre.
-- Esto los cuenta: cuántas veces se usó cada concepto en cada celda (cuenta × sobre) y
-- en cada tipo, desde un día, con la última vez. Como `envelope_usage`, solo los gastos e
-- ingresos sueltos, sin comisiones, y con los permisos de quien pregunta.
create function public.concept_usage(since date)
returns table (
  description text,
  kind text,
  account_id uuid,
  envelope_id uuid,
  uses bigint,
  last_on date
)
language sql
stable
set search_path = ''
as $$
  select o.description, o.kind, e.account_id, e.envelope_id,
    count(distinct o.id), max(o.occurred_on)
  from public.operations o
  join public.entries e on e.operation_id = o.id
  where o.occurred_on >= since
    and o.kind in ('expense', 'income')
    and o.income_id is null
    and not e.is_fee
    and trim(o.description) <> ''
  group by o.description, o.kind, e.account_id, e.envelope_id;
$$;

revoke execute on function public.concept_usage(date) from public, anon;
grant execute on function public.concept_usage(date) to authenticated;
