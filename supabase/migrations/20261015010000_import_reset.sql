-- La recarga desde los Excels (M1). Hasta el corte, la base se vacía y se vuelve a
-- llenar entera con el importador, y esta función es lo único que la vacía.
--
-- El candado del corte: se niega si hay operaciones registradas desde la app, porque
-- esas no están en ningún Excel y recargar las borraría. Lo importado no tiene autor
-- y lo registrado en la app sí. Recargar igualmente hay que pedirlo expresamente.

create function public.reset_imported_data(include_app_data boolean default false)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not include_app_data and exists (
    select 1 from public.operations where created_by is not null
  ) then
    raise exception 'Hay operaciones registradas desde la app: recargar desde los Excels las borraría'
      using errcode = 'P0001',
            hint = 'Si de verdad hay que recargar, se pide expresamente con include_app_data.';
  end if;

  -- De hijos a padres, por las claves foráneas.
  delete from public.entries;
  delete from public.operations;
  delete from public.expected_incomes;
  delete from public.budget_lines;
  delete from public.debts;
  delete from public.envelopes;
  delete from public.accounts;
end;
$$;

-- Solo la usa el importador, con el rol de la base: la app no puede vaciar nada.
revoke execute on function public.reset_imported_data(boolean) from public, anon, authenticated;
