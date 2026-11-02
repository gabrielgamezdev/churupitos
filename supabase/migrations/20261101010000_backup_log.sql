-- M12: cuándo se copió la base por última vez (ADR 0009). Lo escribe la orden de copia
-- (ops/backup.mjs), con el rol de la base, y lo lee Inicio, que pide una copia cuando pasa
-- un mes sin ninguna.
create table public.backup_log (
  taken_at timestamptz primary key,
  -- Cuántas filas copió de cada tabla: con eso se comprueba al restaurarla.
  row_counts jsonb not null
);

alter table public.backup_log enable row level security;
create policy "household members can read the backup log"
  on public.backup_log for select to authenticated
  using ((select public.is_household_member()));
revoke all on public.backup_log from anon, authenticated;
grant select on public.backup_log to authenticated;
