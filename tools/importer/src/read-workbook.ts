// Un libro mensual entero: sus hojas de cuenta y la del presupuesto, ya limpias.

import * as XLSX from "xlsx";
import { readBudgetSheet } from "./budget-sheet.ts";
import type { BudgetSheet } from "./budget-sheet.ts";
import type { Catalog } from "./catalog.ts";
import { Issues } from "./issues.ts";
import type { Issue } from "./issues.ts";
import { readLedgerSheet } from "./ledger-sheet.ts";
import type { LedgerRow } from "./ledger-sheet.ts";
import { toSheet } from "./sheet.ts";
import { normalizeLabel, normalizeText } from "./text.ts";

export type MonthData = {
  // `AAAA-MM`
  month: string;
  file: string;
  ledger: LedgerRow[];
  budget: BudgetSheet | null;
  issues: Issue[];
};

const MONTHS =
  "enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split(
    " ",
  );

// «Finanzas Octubre 2026.xlsx» → «2026-10».
// Un libro que aún no empieza: se prepara antes para planificar el mes, y sus hojas de
// cuenta solo traen la plantilla, un «Lo que tenía antes» a cero. Su presupuesto y sus
// deudas valen; sus saldos todavía no dicen nada.
export function isPlanningOnly(data: MonthData): boolean {
  return data.ledger.every((row) => row.isCarry && row.amountCents === 0);
}

export function monthFromFileName(file: string): string | null {
  const match = new RegExp(`(${MONTHS.join("|")})\\s*(\\d{4})`).exec(normalizeLabel(file));
  if (!match) return null;
  return `${match[2]}-${String(MONTHS.indexOf(match[1]!) + 1).padStart(2, "0")}`;
}

export function readWorkbook(data: Uint8Array, file: string, catalog: Catalog): MonthData {
  const issues = new Issues();
  const month = monthFromFileName(file);
  if (!month) {
    issues.error("UNKNOWN_MONTH", `El nombre «${file}» no dice de qué mes es`);
    return { month: "", file, ledger: [], budget: null, issues: issues.list };
  }

  // Sin `cellDates`: las fechas llegan como número de serie y se convierten sin
  // zona horaria (dates.ts).
  const workbook = XLSX.read(data, { cellFormula: true, cellNF: true, cellDates: false });
  const ledger: LedgerRow[] = [];
  let budget: BudgetSheet | null = null;

  for (const sheetName of workbook.SheetNames) {
    const sheet = toSheet(normalizeText(sheetName), workbook.Sheets[sheetName]!);
    if (sheet.name === catalog.budgetSheet) {
      budget = readBudgetSheet(sheet, catalog, issues);
      continue;
    }
    const accountName = catalog.accountBySheet.get(sheet.name);
    const account = catalog.accounts.find((candidate) => candidate.name === accountName);
    if (!account) {
      issues.error("UNKNOWN_SHEET", `La hoja «${sheet.name}» no es ninguna cuenta del catálogo`);
      continue;
    }
    ledger.push(...readLedgerSheet(sheet, account, catalog, month, issues));
  }
  if (!budget)
    issues.error("NO_BUDGET_SHEET", `El libro no tiene la hoja «${catalog.budgetSheet}»`);

  checkAliasesDoNotCoexist(ledger, budget, issues);
  return { month, file, ledger, budget, issues: issues.list };
}

// Dos textos solo pueden ser el mismo sobre si nunca aparecen en el mismo mes. Si
// conviven, son sobres distintos que el catálogo está juntando por error: así
// pasó en la versión anterior con los que se fusionaron en marzo.
function checkAliasesDoNotCoexist(ledger: LedgerRow[], budget: BudgetSheet | null, issues: Issues) {
  const seen = new Map<string, Set<string>>();
  const uses = [
    ...ledger.map((row) => [row.envelope, row.envelopeText] as const),
    ...(budget?.lines ?? []).map((line) => [line.envelope, line.envelopeText] as const),
  ];
  for (const [envelope, text] of uses) {
    if (!envelope) continue;
    seen.set(envelope, (seen.get(envelope) ?? new Set()).add(text));
  }
  for (const [envelope, texts] of seen) {
    if (texts.size > 1) {
      issues.error(
        "ALIASES_COEXIST",
        `«${[...texts].join("» y «")}» aparecen en el mismo mes y el catálogo los junta en «${envelope}»`,
      );
    }
  }
}
