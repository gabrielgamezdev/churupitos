-- M11: la app crea, cambia, archiva y borra sobres y cuentas. Borrar es solo para lo que
-- no tiene nada; lo que tiene historia se archiva, y solo en cero (R20). Lo archivado no
-- recibe movimientos nuevos. Las reglas que se citan (R3, R11, R20) son las de
-- docs/DOMINIO.md.

-- Quién lo creó en la app y quién lo cambió por última vez; lo del catálogo del importador
-- que nadie tocó no tiene ninguno de los dos. Y desde cuándo está archivado.
alter table public.envelopes
  add column created_by uuid references public.household_members (user_id),
  add column updated_by uuid references public.household_members (user_id),
  add column archived_at timestamptz;
alter table public.accounts
  add column created_by uuid references public.household_members (user_id),
  add column updated_by uuid references public.household_members (user_id),
  add column archived_at timestamptz;

-- El saldo de cada cuenta dice también si está archivada: las listas la esconden.
drop function public.account_balances(date);

create function public.account_balances(as_of date default null)
returns table (
  account_id uuid,
  name text,
  currency text,
  "position" smallint,
  balance_cents bigint,
  third_party_cents bigint,
  archived boolean
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
    coalesce(sum(c.balance_cents) filter (where v.is_third_party), 0)::bigint,
    a.archived_at is not null
  from public.accounts a
  left join public.cell_balances(as_of) c on c.account_id = a.id
  left join public.envelopes v on v.id = c.envelope_id
  group by a.id;
$$;

revoke execute on function public.account_balances(date) from public, anon;
grant execute on function public.account_balances(date) to authenticated;

-- ---------------------------------------------------------------------------
-- Lo archivado no recibe movimientos nuevos
-- ---------------------------------------------------------------------------

create function public.check_entry_not_archived()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.accounts a where a.id = new.account_id and a.archived_at is not null
  ) then
    raise exception 'Esa cuenta está archivada: se reactiva antes de usarla'
      using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.envelopes v where v.id = new.envelope_id and v.archived_at is not null
  ) then
    raise exception 'Ese sobre está archivado: se reactiva antes de usarlo'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger entries_not_archived
  before insert or update of account_id, envelope_id on public.entries
  for each row execute function public.check_entry_not_archived();

-- ---------------------------------------------------------------------------
-- Escribir
-- ---------------------------------------------------------------------------

-- Crea un sobre, o lo cambia: su nombre, su emoji y si está archivado. Uno nuevo va al
-- final del presupuesto («Otro» va siempre detrás). Lo que no cambió no se toca, ni
-- siquiera quién lo escribió. R20: se archiva solo en cero en todas sus celdas y sin plan
-- este mes ni en los siguientes; «Otro» no se archiva (R11).
create function public.save_envelope(
  target_id uuid,
  new_name text,
  new_emoji text,
  is_archived boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  author uuid := (select auth.uid());
  clean_name text := btrim(coalesce(new_name, ''));
  clean_emoji text := nullif(btrim(coalesce(new_emoji, '')), '');
  this_month date := date_trunc('month', now() at time zone 'America/Caracas')::date;
  current_envelope public.envelopes;
  existed boolean;
begin
  if not public.is_household_member() then
    raise exception 'Solo los miembros del hogar pueden cambiar los sobres'
      using errcode = 'insufficient_privilege';
  end if;
  if clean_name = '' then
    raise exception 'Un sobre necesita un nombre' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.envelopes v where lower(v.name) = lower(clean_name) and v.id <> target_id
  ) then
    raise exception 'Ya hay un sobre con ese nombre' using errcode = 'check_violation';
  end if;

  select * into current_envelope from public.envelopes v where v.id = target_id for update;
  existed := found;

  if is_archived and (not existed or current_envelope.archived_at is null) then
    if existed and current_envelope.is_third_party then
      raise exception '«Otro» no se archiva: es el dinero de otros que pasa por las cuentas'
        using errcode = 'check_violation';
    end if;
    if exists (
      select 1 from public.entries e
      where e.envelope_id = target_id
      group by e.account_id
      having sum(e.amount_cents) <> 0
    ) then
      raise exception 'Un sobre con dinero no se archiva: antes se mueve a otro sobre'
        using errcode = 'check_violation';
    end if;
    if exists (
      select 1 from public.budget_lines b
      where b.envelope_id = target_id and b.month_start >= this_month and b.planned_usd_cents > 0
    ) then
      raise exception 'Ese sobre tiene plan este mes o en uno siguiente: antes se deja en $0'
        using errcode = 'check_violation';
    end if;
  end if;

  if not existed then
    insert into public.envelopes (id, name, emoji, position, created_by, updated_by, archived_at)
    values (
      target_id,
      clean_name,
      clean_emoji,
      (select coalesce(max(v.position), 0) + 1 from public.envelopes v),
      author,
      author,
      case when is_archived then now() end
    );
  else
    update public.envelopes v
    set name = clean_name,
        emoji = clean_emoji,
        archived_at = case when is_archived then coalesce(v.archived_at, now()) end,
        updated_by = author
    where v.id = target_id
      and (v.name, v.emoji, v.archived_at is not null)
        is distinct from (clean_name, clean_emoji, is_archived);
  end if;
end;
$$;

-- Borra un sobre que no tiene nada: ni movimientos ni plan en ningún mes (R20). Lo que
-- tiene historia se archiva. Borrar dos veces lo mismo no es un error.
create function public.delete_envelope(target_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_envelope public.envelopes;
begin
  if not public.is_household_member() then
    raise exception 'Solo los miembros del hogar pueden borrar sobres'
      using errcode = 'insufficient_privilege';
  end if;

  select * into current_envelope from public.envelopes v where v.id = target_id for update;
  if not found then
    return;
  end if;
  if current_envelope.is_third_party then
    raise exception '«Otro» no se borra: es el dinero de otros que pasa por las cuentas'
      using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.entries e where e.envelope_id = target_id) then
    raise exception 'Un sobre con movimientos no se borra: se archiva'
      using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.budget_lines b where b.envelope_id = target_id) then
    raise exception 'Ese sobre sale en el plan de algún mes: se quita del plan, o se archiva'
      using errcode = 'check_violation';
  end if;

  delete from public.envelopes v where v.id = target_id;
end;
$$;

-- Crea una cuenta, o la cambia: su nombre y si está archivada. La moneda se elige al
-- crearla y no cambia (R3). Una nueva va al final. R20: se archiva solo en cero en todas
-- sus celdas, no solo en el total: +100 en un sobre y −100 en otro también es dinero.
create function public.save_account(
  target_id uuid,
  new_name text,
  new_currency text,
  is_archived boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  author uuid := (select auth.uid());
  clean_name text := btrim(coalesce(new_name, ''));
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

  if not existed then
    insert into public.accounts (id, name, currency, position, created_by, updated_by, archived_at)
    values (
      target_id,
      clean_name,
      new_currency,
      (select coalesce(max(a.position), 0) + 1 from public.accounts a),
      author,
      author,
      case when is_archived then now() end
    );
  else
    update public.accounts a
    set name = clean_name,
        archived_at = case when is_archived then coalesce(a.archived_at, now()) end,
        updated_by = author
    where a.id = target_id
      and (a.name, a.archived_at is not null) is distinct from (clean_name, is_archived);
  end if;
end;
$$;

-- Borra una cuenta que no tiene movimientos (R20). Borrar dos veces no es un error.
create function public.delete_account(target_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_household_member() then
    raise exception 'Solo los miembros del hogar pueden borrar cuentas'
      using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.entries e where e.account_id = target_id) then
    raise exception 'Una cuenta con movimientos no se borra: se archiva'
      using errcode = 'check_violation';
  end if;

  delete from public.accounts a where a.id = target_id;
end;
$$;

revoke execute on function
  public.save_envelope(uuid, text, text, boolean), public.delete_envelope(uuid),
  public.save_account(uuid, text, text, boolean), public.delete_account(uuid)
  from public, anon;
grant execute on function
  public.save_envelope(uuid, text, text, boolean), public.delete_envelope(uuid),
  public.save_account(uuid, text, text, boolean), public.delete_account(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Hasta el corte: lo que el Excel ya no usa, archivado al recargar
-- ---------------------------------------------------------------------------

-- Archiva los sobres y las cuentas en cero que no tienen movimientos ni plan desde `since`,
-- el mes en curso del Excel: así la recarga no devuelve a las listas lo que dejó de
-- usarse. «Otro» nunca. Devuelve cuántos archivó. Solo la usa el importador.
create function public.archive_unused(since date)
returns table (envelope_count integer, account_count integer)
language plpgsql
set search_path = ''
as $$
declare
  archived_envelopes integer;
  archived_accounts integer;
begin
  update public.envelopes v
  set archived_at = now()
  where v.archived_at is null
    and not v.is_third_party
    and not exists (
      select 1 from public.entries e
      join public.operations o on o.id = e.operation_id
      where e.envelope_id = v.id and o.occurred_on >= since
    )
    and not exists (
      select 1 from public.budget_lines b where b.envelope_id = v.id and b.month_start >= since
    )
    and not exists (
      select 1 from public.entries e
      where e.envelope_id = v.id
      group by e.account_id
      having sum(e.amount_cents) <> 0
    );
  get diagnostics archived_envelopes = row_count;

  update public.accounts a
  set archived_at = now()
  where a.archived_at is null
    and not exists (
      select 1 from public.entries e
      join public.operations o on o.id = e.operation_id
      where e.account_id = a.id and o.occurred_on >= since
    )
    and not exists (
      select 1 from public.entries e
      where e.account_id = a.id
      group by e.envelope_id
      having sum(e.amount_cents) <> 0
    );
  get diagnostics archived_accounts = row_count;

  return query select archived_envelopes, archived_accounts;
end;
$$;

revoke execute on function public.archive_unused(date) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- El candado del corte, también con los sobres y las cuentas de la app
-- ---------------------------------------------------------------------------

create or replace function public.reset_imported_data(include_app_data boolean default false)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not include_app_data and (
    exists (select 1 from public.operations where created_by is not null)
    or exists (select 1 from public.debts where created_by is not null)
    or exists (
      select 1 from public.expected_incomes
      where created_by is not null or updated_by is not null
    )
    or exists (
      select 1 from public.budget_lines
      where created_by is not null or updated_by is not null
    )
    or exists (
      select 1 from public.envelopes where created_by is not null or updated_by is not null
    )
    or exists (
      select 1 from public.accounts where created_by is not null or updated_by is not null
    )
  ) then
    raise exception 'Hay datos escritos desde la app (movimientos, deudas, presupuesto, sobres o cuentas): recargar desde los Excels los borraría'
      using errcode = 'P0001',
            hint = 'Si de verdad hay que recargar, se pide expresamente con include_app_data.';
  end if;

  -- Las operaciones primero: sus asientos se van con ellas en cascada, y así la
  -- comprobación de forma (R5) nunca ve una operación sin asientos, ni siquiera con
  -- las restricciones inmediatas. Lo demás, de hijos a padres.
  delete from public.operations;
  delete from public.expected_incomes;
  delete from public.budget_lines;
  delete from public.debts;
  delete from public.envelopes;
  delete from public.accounts;
end;
$$;
