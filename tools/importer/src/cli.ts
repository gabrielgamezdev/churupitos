// El importador desde la terminal. Lee los Excels y el catálogo de `privado/`, así
// que lo que imprime lleva nombres y cifras reales: es para la PC del autor, nunca
// para la CI.
//
//   node src/cli.ts read      lee todos los meses y resume lo que encontró
//   node src/cli.ts dry-run   lo carga en el Supabase local, lo deshace y escribe
//                             el informe en privado/import/informe.md

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import postgres from "postgres";
import { buildPackage } from "./build-package.ts";
import { CatalogError, loadCatalog } from "./catalog.ts";
import type { Catalog } from "./catalog.ts";
import type { Issue } from "./issues.ts";
import { planRows, writeRows } from "./load.ts";
import type { LoadOutcome } from "./load.ts";
import { readWorkbook } from "./read-workbook.ts";
import type { MonthData } from "./read-workbook.ts";
import { buildReport } from "./report.ts";

const ROOT = resolve(import.meta.dirname, "../../..");
const EXCELS_DIR = join(ROOT, "privado/excels");
const CATALOG_FILE = join(ROOT, "privado/import/catalogo.yml");
const REPORT_FILE = join(ROOT, "privado/import/informe.md");
// La base de `npm run db:start`, con su contraseña de desarrollo, que es pública.
const LOCAL_DATABASE = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

function readAllMonths(catalog: Catalog): MonthData[] {
  return readdirSync(EXCELS_DIR)
    .filter((file) => file.toLowerCase().endsWith(".xlsx") && !file.startsWith("~$"))
    .map((file) => readWorkbook(readFileSync(join(EXCELS_DIR, file)), file, catalog))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function printIssues(issues: Issue[]) {
  // Los avisos repetidos se cuentan; los errores se listan todos, porque hay que
  // arreglarlos uno por uno.
  const warnings = new Map<string, number>();
  for (const issue of issues) {
    if (issue.level === "error")
      console.log(`    ERROR ${issue.code}: ${issue.message}${issue.ref ? ` (${issue.ref})` : ""}`);
    else warnings.set(issue.code, (warnings.get(issue.code) ?? 0) + 1);
  }
  for (const [code, count] of warnings) console.log(`    aviso ${code} × ${count}`);
}

function read(): boolean {
  const months = readAllMonths(loadCatalog(CATALOG_FILE));
  let errors = 0;
  for (const data of months) {
    const accounts = new Set(data.ledger.map((row) => row.account)).size;
    const budget = data.budget;
    console.log(
      `${data.month}  ${data.ledger.length} filas en ${accounts} cuentas` +
        (budget
          ? `, ${budget.incomes.length} ingresos, ${budget.lines.length} sobres, ${budget.debts.length} deudas`
          : ""),
    );
    printIssues(data.issues);
    errors += data.issues.filter((issue) => issue.level === "error").length;
  }
  console.log(errors === 0 ? "\nSin errores." : `\n${errors} errores.`);
  return errors === 0;
}

async function dryRun(): Promise<boolean> {
  const catalog = loadCatalog(CATALOG_FILE);
  const months = readAllMonths(catalog);
  const pkg = buildPackage(months, catalog);
  const errors = pkg.issues.filter((issue) => issue.level === "error");

  let outcome: LoadOutcome = {
    status: "not_run",
    reason: "hay errores en los Excels o en el catálogo",
  };
  if (errors.length === 0) {
    const sql = postgres(LOCAL_DATABASE, { max: 1, onnotice: () => {} });
    try {
      outcome = await writeRows(sql, planRows(pkg, catalog), true);
    } catch (error) {
      outcome = {
        status: "not_run",
        reason: `no se pudo conectar con la base local (${String(error)})`,
      };
    } finally {
      await sql.end();
    }
  }

  writeFileSync(REPORT_FILE, buildReport(pkg, months, outcome));
  printIssues(pkg.issues);
  console.log(
    outcome.status === "ok"
      ? `\nLa base aceptó las ${outcome.counts.operations} operaciones, y no quedó nada escrito.`
      : `\nNo se cargó: ${outcome.status === "rejected" ? outcome.message : outcome.reason}.`,
  );
  console.log(`Informe: ${REPORT_FILE}`);
  return outcome.status === "ok";
}

const [command] = process.argv.slice(2);
try {
  if (command === "read") process.exitCode = read() ? 0 : 1;
  else if (command === "dry-run") process.exitCode = (await dryRun()) ? 0 : 1;
  else {
    console.error("uso: node src/cli.ts read | dry-run");
    process.exitCode = 2;
  }
} catch (error) {
  if (!(error instanceof CatalogError)) throw error;
  console.error(error.message);
  process.exitCode = 1;
}
