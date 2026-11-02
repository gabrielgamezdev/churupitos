// Pone en la base de la nube la marca del corte (M12): desde ese día la base es la fuente,
// la recarga desde los Excels se niega siempre, lo importado se corrige como lo demás y
// los meses pasados se cierran solos (R21). Se hace una sola vez; repetirla no cambia la
// fecha que ya está. La base local no la lleva.
//
// Uso: npm run db:cutover -- 2026-11-01
// La contraseña sale de privado/.env y no se imprime.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const day = process.argv[2];
if (!/^\d{4}-\d{2}-01$/.test(day ?? "")) {
  console.error("Uso: npm run db:cutover -- AAAA-MM-01 (el primer día del mes del corte)");
  process.exit(2);
}

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

try {
  await sql`insert into public.cutover (cut_on) values (${day}) on conflict do nothing`;
  const [{ cut_on: cutOn }] = await sql`select cut_on::text from public.cutover`;
  console.log(
    cutOn === day
      ? `La nube tiene la marca del corte: ${cutOn}.`
      : `La nube ya tenía la marca del corte, con otra fecha: ${cutOn}. No se cambió.`,
  );
} finally {
  await sql.end();
}
