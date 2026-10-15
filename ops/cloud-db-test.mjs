// Las pruebas de la base (supabase/tests/database), contra la base de la nube.
//
// La configuración de la nube no es la de local: allí hay opciones del proyecto que
// crean funciones y permisos propios. Por eso, después de cada `db:push`, se pasan
// también allí. `supabase test db --linked` no sirve: con su usuario temporal no
// encuentra las funciones de pgTAP (docs/TRAMPAS.md).
//
// Cada archivo de pruebas empieza con `begin` y acaba con `rollback`: no deja nada.
// La contraseña sale de privado/.env y no se imprime.

import { readdirSync, readFileSync } from "node:fs";
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

const testsDir = join(root, "supabase/tests/database");
let passed = 0;
let failed = 0;
try {
  for (const file of readdirSync(testsDir).filter((name) => name.endsWith(".sql")).sort()) {
    const text = readFileSync(join(testsDir, file), "utf8");
    // pgTAP se instala en `extensions`, dentro de la transacción de cada archivo.
    const results = await sql.unsafe(`set search_path to public, extensions;\n${text}`);
    const lines = results
      .flat()
      .flatMap((row) => Object.values(row ?? {}))
      .filter((value) => typeof value === "string" && /^(ok|not ok|#)/.test(value));
    const bad = lines.filter((line) => line.startsWith("not ok"));
    passed += lines.filter((line) => line.startsWith("ok")).length;
    failed += bad.length;
    console.log(`${file}: ${lines.length - bad.length - lines.filter((l) => l.startsWith("#")).length} bien, ${bad.length} mal`);
    for (const line of lines.filter((line) => !line.startsWith("ok"))) console.log(`  ${line}`);
  }
} finally {
  await sql.end();
}
console.log(failed === 0 ? `\nTodas bien en la nube (${passed}).` : `\n${failed} pruebas fallan en la nube.`);
process.exitCode = failed === 0 ? 0 : 1;
