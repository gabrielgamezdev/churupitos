// El importador desde la terminal. Lee los Excels y el catálogo de `privado/`, así
// que lo que imprime lleva nombres y cifras reales: es para la PC del autor, nunca
// para la CI.
//
//   node src/cli.ts read     lee todos los meses y resume lo que encontró

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { CatalogError, loadCatalog } from "./catalog.ts";
import type { Issue } from "./issues.ts";
import { readWorkbook } from "./read-workbook.ts";
import type { MonthData } from "./read-workbook.ts";

const ROOT = resolve(import.meta.dirname, "../../..");
const EXCELS_DIR = join(ROOT, "privado/excels");
const CATALOG_FILE = join(ROOT, "privado/import/catalogo.yml");

function readAllMonths(): MonthData[] {
  const catalog = loadCatalog(CATALOG_FILE);
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

function read() {
  const months = readAllMonths();
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

const [command] = process.argv.slice(2);
try {
  if (command === "read") process.exitCode = read() ? 0 : 1;
  else {
    console.error("uso: node src/cli.ts read");
    process.exitCode = 2;
  }
} catch (error) {
  if (!(error instanceof CatalogError)) throw error;
  console.error(error.message);
  process.exitCode = 1;
}
