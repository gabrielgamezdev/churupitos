// Restaura una copia de privado/respaldos/ (ops/backup.mjs) y comprueba que cuadra con su
// manifiesto: las filas de cada tabla y el saldo de cada cuenta (ADR 0009).
//
// Por defecto, en la base local: así se comprueba cada cierto tiempo que las copias
// sirven. La base local se queda con los datos de la copia, pero sin la marca del corte ni
// los meses abiertos, y con sus usuarios de prueba: se sigue desarrollando y recargando.
// Para volver a los datos inventados: npm run db:reset y npm run import:load.
//
// En una emergencia, en la nube, pidiéndolo dos veces: --cloud --replace. Reemplaza todo
// lo que haya allí por lo de la copia.
//
// Uso: npm run backup:restore -- privado/respaldos/2026-11-01_1530 [--cloud --replace]

import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import postgres from "postgres";

const root = join(import.meta.dirname, "..");
const args = process.argv.slice(2);
const dir = args.find((arg) => !arg.startsWith("--"));
const cloud = args.includes("--cloud");
if (!dir || !existsSync(join(resolve(dir), "manifest.json"))) {
  console.error(
    "Uso: npm run backup:restore -- privado/respaldos/AAAA-MM-DD_HHMM [--cloud --replace]",
  );
  process.exit(2);
}
if (cloud && !args.includes("--replace")) {
  console.error(
    "Restaurar en la nube reemplaza todo lo que hay allí: hay que pedirlo con --cloud --replace.",
  );
  process.exit(2);
}
const read = (name) => {
  const file = join(resolve(dir), `${name}.json`);
  return existsSync(file) ? readFileSync(file, "utf8") : null;
};
const manifest = JSON.parse(read("manifest"));

let sql;
if (cloud) {
  const pooler = new URL(readFileSync(join(root, "supabase/.temp/pooler-url"), "utf8").trim());
  process.loadEnvFile(join(root, "privado/.env"));
  sql = postgres({
    host: pooler.hostname,
    port: Number(pooler.port || 5432),
    user: decodeURIComponent(pooler.username),
    password: process.env.CLOUD_DATABASE_PASSWORD,
    database: pooler.pathname.slice(1) || "postgres",
    ssl: "require",
    max: 1,
    onnotice: () => {},
  });
} else {
  sql = postgres("postgresql://postgres:postgres@127.0.0.1:54322/postgres", {
    max: 1,
    onnotice: () => {},
  });
}

// En este orden, de padres a hijos. La marca del corte va la última: con ella puesta, los
// meses pasados se cierran (R21) y no admitirían su propia historia. Los miembros no se
// borran: se añaden los de la copia que falten.
const ORDER = [
  "accounts",
  "envelopes",
  "expected_incomes",
  "budget_lines",
  "debts",
  "operations",
  "entries",
  "backup_log",
  "month_openings",
  "cutover",
];
// Lo que solo tiene sentido en la nube: en local, la base sigue como antes del corte.
const CLOUD_ONLY = new Set(["cutover", "month_openings"]);
// Lo archivado no admite asientos nuevos: se archiva después de poner los asientos.
const ARCHIVABLE = new Set(["accounts", "envelopes"]);

class Mismatch extends Error {}

try {
  await sql.begin(async (tx) => {
    const tables = (
      await tx`
        select table_name from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'`
    ).map((row) => row.table_name);
    const unknown = tables.filter(
      (table) => table !== "household_members" && !ORDER.includes(table),
    );
    if (unknown.length > 0) {
      throw new Error(`La restauración no sabe en qué orden poner: ${unknown.join(", ")}`);
    }
    const restored = ORDER.filter(
      (table) => tables.includes(table) && (cloud || !CLOUD_ONLY.has(table)),
    );

    // Todo fuera de una vez (TRUNCATE no pasa por los disparadores de los meses cerrados).
    await tx.unsafe(
      `truncate ${ORDER.filter((t) => tables.includes(t))
        .map((t) => `public.${t}`)
        .join(", ")} cascade`,
    );

    const users = read("auth.users") ?? "[]";
    await tx`insert into auth.users (id, email)
             select id, email from json_populate_recordset(null::auth.users, ${users}::text::json)
             on conflict (id) do nothing`;
    const members = read("household_members") ?? "[]";
    await tx`insert into public.household_members
             select * from json_populate_recordset(null::public.household_members, ${members}::text::json)
             on conflict (user_id) do nothing`;

    const columnsOf = async (table) =>
      (
        await tx`
          select column_name from information_schema.columns
          where table_schema = 'public' and table_name = ${table} and is_generated = 'NEVER'
          order by ordinal_position`
      ).map((row) => `"${row.column_name}"`);

    for (const table of restored) {
      const rows = read(table);
      if (rows === null) continue;
      const columns = await columnsOf(table);
      const values = ARCHIVABLE.has(table)
        ? columns.map((column) => (column === '"archived_at"' ? "null" : column))
        : columns;
      await tx.unsafe(
        `insert into public.${table} (${columns.join(", ")})
         select ${values.join(", ")} from json_populate_recordset(null::public.${table}, $1::text::json)`,
        [rows],
      );
    }
    for (const table of ARCHIVABLE) {
      await tx.unsafe(
        `update public.${table} t set archived_at = j.archived_at
         from json_populate_recordset(null::public.${table}, $1::text::json) j
         where j.id = t.id and j.archived_at is not null`,
        [read(table) ?? "[]"],
      );
    }
    // Lo que se registre después sigue desde la última posición (R14).
    await tx`select setval(pg_get_serial_sequence('public.entries', 'position'),
               (select coalesce(max(position), 0) + 1 from public.entries), false)`;
    // La forma de cada operación (R5), ya.
    await tx`set constraints all immediate`;

    // ¿Cuadra con lo que se copió?
    const problems = [];
    for (const table of restored) {
      const [{ count }] = await tx`select count(*)::int as count from ${tx("public." + table)}`;
      const expected = manifest.rowCounts[table] ?? 0;
      if (count !== expected) problems.push(`${table}: ${count} filas, la copia tenía ${expected}`);
    }
    const balances = await tx`
      select a.id::text as account_id, coalesce(sum(e.amount_cents), 0)::text as balance_cents
      from public.accounts a left join public.entries e on e.account_id = a.id
      group by a.id`;
    const different = balances.filter(
      (b) => manifest.accountBalances[b.account_id] !== b.balance_cents,
    );
    if (different.length > 0) problems.push(`${different.length} cuentas con otro saldo`);
    if (problems.length > 0) {
      console.error(`La copia no cuadra, y no se restauró:\n  ${problems.join("\n  ")}`);
      throw new Mismatch();
    }
    const rows = restored.reduce((sum, table) => sum + (manifest.rowCounts[table] ?? 0), 0);
    console.log(
      `Copia ${basename(resolve(dir))} restaurada en ${cloud ? "la nube" : "la base local"}: ` +
        `${restored.length} tablas, ${rows} filas, y los saldos de las ${balances.length} cuentas iguales.`,
    );
  });
} catch (error) {
  if (!(error instanceof Mismatch)) {
    console.error(`No se restauró: ${error.message}`);
  }
  process.exitCode = 1;
} finally {
  await sql.end();
}
