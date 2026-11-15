-- M15: lo que delata a cada cuenta en la captura de un pago (sus últimos dígitos o una
-- palabra), para elegirla al leer una. Vive en la base y no en el código, que es público, y
-- se ajusta desde Ajustes cuando una captura elige mal.
alter table public.accounts
  add column capture_hints text[] not null default '{}';

-- `save_account` guarda también esas pistas: sin espacios de más, sin vacías y sin
-- repetidas. Sin ellas (null) las deja como estaban, para que la versión de la app que aún
-- no las conoce siga guardando lo demás sin borrarlas.
drop function public.save_account(uuid, text, text, boolean);

create function public.save_account(
  target_id uuid,
  new_name text,
  new_currency text,
  is_archived boolean,
  new_capture_hints text[] default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  author uuid := (select auth.uid());
  clean_name text := btrim(coalesce(new_name, ''));
  clean_hints text[];
  current_account public.accounts;
  existed boolean;
begin
  if not public.is_household_member() then
    raise exception 'Solo los miembros del hogar pueden cambiar las cuentas'
      using errcode = 'insufficient_privilege';
  end if;
  if clean_name = '' then
    raise exception 'Una cuenta necesita un nombre' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.accounts a where lower(a.name) = lower(clean_name) and a.id <> target_id
  ) then
    raise exception 'Ya hay una cuenta con ese nombre' using errcode = 'check_violation';
  end if;

  select * into current_account from public.accounts a where a.id = target_id for update;
  existed := found;

  if existed and new_currency is distinct from current_account.currency then
    raise exception 'La moneda de una cuenta no se cambia: cada movimiento está en la suya'
      using errcode = 'check_violation';
  end if;
  if not existed and new_currency is distinct from 'VES' and new_currency is distinct from 'USD' then
    raise exception 'Una cuenta es en bolívares o en dólares' using errcode = 'check_violation';
  end if;

  if is_archived and (not existed or current_account.archived_at is null) and exists (
    select 1 from public.entries e
    where e.account_id = target_id
    group by e.envelope_id
    having sum(e.amount_cents) <> 0
  ) then
    raise exception 'Una cuenta con dinero no se archiva: antes se mueve a otra'
      using errcode = 'check_violation';
  end if;

  if new_capture_hints is null then
    clean_hints := coalesce(current_account.capture_hints, '{}');
  else
    -- En el orden en que se escribieron; de dos iguales sin contar mayúsculas, la primera.
    select coalesce(array_agg(hint order by first_at), '{}') into clean_hints
    from (
      select distinct on (lower(btrim(h.hint))) btrim(h.hint) as hint, h.at as first_at
      from unnest(new_capture_hints) with ordinality as h(hint, at)
      where btrim(coalesce(h.hint, '')) <> ''
      order by lower(btrim(h.hint)), h.at
    ) kept;
  end if;

  if not existed then
    insert into public.accounts (
      id, name, currency, position, created_by, updated_by, archived_at, capture_hints
    )
    values (
      target_id,
      clean_name,
      new_currency,
      (select coalesce(max(a.position), 0) + 1 from public.accounts a),
      author,
      author,
      case when is_archived then now() end,
      clean_hints
    );
  else
    update public.accounts a
    set name = clean_name,
        archived_at = case when is_archived then coalesce(a.archived_at, now()) end,
        capture_hints = clean_hints,
        updated_by = author
    where a.id = target_id
      and (a.name, a.archived_at is not null, a.capture_hints)
        is distinct from (clean_name, is_archived, clean_hints);
  end if;
end;
$$;

revoke execute on function public.save_account(uuid, text, text, boolean, text[]) from public, anon;
grant execute on function public.save_account(uuid, text, text, boolean, text[]) to authenticated;
