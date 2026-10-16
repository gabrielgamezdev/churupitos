-- Lo que les falta a las pantallas de M2: el emoji de cada sobre y la parte de «Otro»
-- de cada cuenta. Las reglas que se citan (R2, R11) son las de docs/DOMINIO.md.

-- El emoji de cada sobre, como en el Excel («🏦 Ahorro»). Solo dice cómo se pinta: lo
-- que identifica al sobre sigue siendo su nombre. Un emoji compuesto (una familia,
-- un oficio) son varios caracteres unidos, de ahí el margen del largo.
alter table public.envelopes
  add column emoji text
  check (emoji is null or (char_length(emoji) between 1 and 16 and emoji = btrim(emoji)));

-- La parte de «Otro» de cada cuenta (R11), para que la lista de cuentas de una moneda
-- cuadre con su total con «Otro». Como cambia lo que devuelve, se rehace entera. Sigue
-- sumando al leer (R2).
drop function public.account_balances(date);

create function public.account_balances(as_of date default null)
returns table (
  account_id uuid,
  name text,
  currency text,
  "position" smallint,
  balance_cents bigint,
  third_party_cents bigint
)
language sql
stable
set search_path = ''
as $$
  select
    a.id,
    a.name,
    a.currency,
    a.position,
    coalesce(sum(c.balance_cents), 0)::bigint,
    coalesce(sum(c.balance_cents) filter (where v.is_third_party), 0)::bigint
  from public.accounts a
  left join public.cell_balances(as_of) c on c.account_id = a.id
  left join public.envelopes v on v.id = c.envelope_id
  group by a.id;
$$;

revoke execute on function public.account_balances(date) from public, anon;
grant execute on function public.account_balances(date) to authenticated;
