// Copia la base de la nube entera, tabla por tabla, en privado/respaldos/ (fuera de git),
// y anota en la base cuándo se hizo (ADR 0009). Desde el corte la base es la fuente: esta
// copia es lo único que la recupera si algo la rompe.
//
// Cada tabla va en su propio JSON, escrito por la base misma: las fechas y los importes
// salen como ella los guarda, sin pasar por la zona horaria ni por los decimales de la PC.
// Con el manifiesto van las filas de cada tabla y el saldo de cada cuenta, para comprobar
// la copia al restaurarla (ops/restore.mjs).
//
// Uso: npm run backup
// La contraseña sale de privado/.env y no se imprime.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const root = join(import.meta.dirname, "..");
const pooler = new URL(readFileSync(join(root, "supabase/.temp/pooler-url"), "utf8").trim());
process.loadEnvFile(join(root, "privado/.env"));
if (!process.env.CLOUD_DATABASE_PASSWORD) {
  console.error("Falta CLOUD_DATABASE_PASSWORD en privado/.env");
  process.exit(2);
}

const sql = postgres({
  host: pooler.hostname,
  port: Number(pooler.port || 5432),
  user: decodeURIComponent(pooler.username),
  password: process.env.CLOUD_DATABASE_PASSWORD,
  database: pooler.pathname.slice(1) || "postgres",
  ssl: "require",
  max: 1,
  onnotice: () => {},
});

// «2026-11-01_1530», en hora de Caracas: se ordena solo y se lee de un vistazo.
const stamp = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Caracas",
  dateStyle: "short",
  timeStyle: "short",
})
  .format(new Date())
  .replace(" ", "_")
  .replace(":", "");
const dir = join(root, "privado/respaldos", stamp);

try {
  // Una sola foto de la base: si alguien registra mientras se copia, no entra a medias.
  const manifest = await sql.begin("isolation level repeatable read read only", async (tx) => {
    const tables = (
      await tx`
        select table_name from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'
        order by table_name`
    ).map((row) => row.table_name);
    mkdirSync(dir, { recursive: true });
    const rowCounts = {};
    for (const table of tables) {
      const [{ rows, count }] = await tx`
        select coalesce(json_agg(t), '[]')::text as rows, count(*)::int as count
        from ${tx("public." + table)} t`;
      writeFileSync(join(dir, `${table}.json`), rows);
      rowCounts[table] = count;
    }
    // Los dos usuarios, para que sus filas de miembro tengan a quién apuntar al restaurar.
    const [{ users }] = await tx`
      select coalesce(json_agg(json_build_object('id', u.id, 'email', u.email)), '[]')::text as users
      from auth.users u
      where u.id in (select user_id from public.household_members)`;
    writeFileSync(join(dir, "auth.users.json"), users);
    const balances = await tx`
      select a.id::text as account_id, coalesce(sum(e.amount_cents), 0)::text as balance_cents
      from public.accounts a left join public.entries e on e.account_id = a.id
      group by a.id order by a.id`;
    const [{ version }] = await tx`
      select max(version) as version from supabase_migrations.schema_migrations`;
    return {
      takenAt: new Date().toISOString(),
      migration: version,
      rowCounts,
      accountBalances: Object.fromEntries(balances.map((b) => [b.account_id, b.balance_cents])),
    };
  });
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));

  // La fecha de la copia, para que Inicio sepa cuándo pedir la siguiente. Si la base aún
  // no tiene dónde anotarla, la copia vale igual.
  const [{ exists }] = await sql`select to_regclass('public.backup_log') is not null as exists`;
  if (exists) {
    await sql`insert into public.backup_log (taken_at, row_counts)
              values (${manifest.takenAt}, ${sql.json(manifest.rowCounts)})`;
  }
  const rows = Object.values(manifest.rowCounts).reduce((sum, count) => sum + count, 0);
  console.log(
    `Copia hecha: ${Object.keys(manifest.rowCounts).length} tablas y ${rows} filas, en privado/respaldos/${stamp}.`,
  );
  if (!exists) console.log("La base todavía no anota las copias: falta subir su migración.");
} finally {
  await sql.end();
}
