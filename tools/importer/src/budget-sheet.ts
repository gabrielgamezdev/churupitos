// La hoja PRESUPUESTO. Sus bloques se buscan por el título, porque bajan una fila
// cada vez que el Bono llega en un pago más, y los dos primeros meses tienen otra
// forma. Se leen las columnas por su cabecera; las que no se conocen, se ignoran.
//
// De aquí salen los ingresos esperados y el plan de cada sobre (R12, R18), la lista
// de deudas (D9) y, para comparar al final, lo que el Excel calculó: los restantes
// de cada sobre y de cada cuenta, y los totales con y sin «Otro».

import type { Catalog } from "./catalog.ts";
import type { Issues } from "./issues.ts";
import { currencyFromText, parseAmountText, toCents } from "./money.ts";
import type { Currency } from "./money.ts";
import { cellAt, cellRef, dateAt, findCell, headerColumns, textAt } from "./sheet.ts";
import type { Position, Sheet } from "./sheet.ts";
import { normalizeLabel } from "./text.ts";

export type ExpectedIncomeRow = {
  row: number;
  sourceText: string;
  source: string | null;
  usdCents: number | null;
  // Lo que el Excel dice que se cobró, en Bs, y cuándo: se compara con el cobro.
  localCents: number | null;
  date: string | null;
  // ✅ o ⏳; null si la celda está vacía.
  checked: boolean | null;
};

export type BudgetLineRow = {
  row: number;
  envelopeText: string;
  envelope: string | null;
  plannedUsdCents: number | null;
  // Lo que el Excel calculó o se tecleó: solo para comparar (R10).
  localCents: number | null;
  remainingVesCents: number | null;
  remainingUsdCents: number | null;
  fundingNote: string;
  actionNote: string;
  checked: boolean | null;
};

export type AccountBalanceRow = {
  row: number;
  label: string;
  account: string | null;
  balanceCents: number;
};

export type Totals = {
  vesCents: number | null;
  vesWithThirdPartyCents: number | null;
  usdCents: number | null;
  usdWithThirdPartyCents: number | null;
};

export type DebtRow = {
  row: number;
  direction: "payable" | "receivable";
  description: string;
  amountCents: number | null;
  currency: Currency | null;
  // Lo escrito, cuando el importe venía como texto («20 USDT»).
  amountText: string | null;
  dueOn: string | null;
};

export type BudgetSheet = {
  incomes: ExpectedIncomeRow[];
  lines: BudgetLineRow[];
  accountBalances: AccountBalanceRow[];
  totals: Totals;
  debts: DebtRow[];
};

type Columns = Partial<Record<string, number>>;

const isStatus = (_label: string, raw: string) => raw.includes("👁");

export function readBudgetSheet(sheet: Sheet, catalog: Catalog, issues: Issues): BudgetSheet {
  const incomesBlock = block(sheet, "ingresos esperados", {
    source: (label) => label === "fuente",
    usd: (_label, raw) => raw === "$",
    local: (label) => label === "bs",
    date: (label) => label === "fecha",
    status: isStatus,
  });
  const linesBlock = block(sheet, "distribucion de los ingresos", {
    envelope: (label) => label === "categoria",
    usd: (_label, raw) => raw === "$",
    local: (label) => label === "bs",
    remainingVes: (label) => label === "restante bs",
    remainingUsd: (label) => label === "restante $",
    funding: (label) => label === "fuente de fondos",
    action: (label) => label === "accion",
    status: isStatus,
  });
  if (!incomesBlock || !linesBlock) {
    issues.error(
      "NO_BUDGET_BLOCKS",
      "La hoja del presupuesto no tiene sus bloques de ingresos y de reparto",
    );
    return { incomes: [], lines: [], accountBalances: [], totals: emptyTotals(), debts: [] };
  }

  const incomes = rowsOf(sheet, incomesBlock, "source").map((row): ExpectedIncomeRow => {
    const sourceText = textAt(sheet, row, incomesBlock.columns.source!);
    const source = catalog.incomeByAlias.get(sourceText) ?? null;
    if (!source) {
      issues.error(
        "UNKNOWN_INCOME",
        `El ingreso «${sourceText}» no está en el catálogo`,
        cellRef(sheet, row, incomesBlock.columns.source!),
      );
    }
    return {
      row,
      sourceText,
      source,
      usdCents: centsAt(sheet, row, incomesBlock.columns.usd),
      localCents: centsAt(sheet, row, incomesBlock.columns.local),
      date:
        incomesBlock.columns.date === undefined
          ? null
          : dateAt(sheet, row, incomesBlock.columns.date).date,
      checked: checkedAt(sheet, row, incomesBlock.columns.status),
    };
  });

  const lines = rowsOf(sheet, linesBlock, "envelope").map((row): BudgetLineRow => {
    const envelopeText = textAt(sheet, row, linesBlock.columns.envelope!);
    const envelope = catalog.envelopeByAlias.get(envelopeText) ?? null;
    if (!envelope) {
      issues.error(
        "UNKNOWN_ENVELOPE",
        `El sobre «${envelopeText}» no está en el catálogo`,
        cellRef(sheet, row, linesBlock.columns.envelope!),
      );
    }
    const note = (col: number | undefined) => (col === undefined ? "" : textAt(sheet, row, col));
    return {
      row,
      envelopeText,
      envelope,
      plannedUsdCents: centsAt(sheet, row, linesBlock.columns.usd),
      localCents: centsAt(sheet, row, linesBlock.columns.local),
      remainingVesCents: centsAt(sheet, row, linesBlock.columns.remainingVes),
      remainingUsdCents: centsAt(sheet, row, linesBlock.columns.remainingUsd),
      fundingNote: note(linesBlock.columns.funding),
      actionNote: note(linesBlock.columns.action),
      checked: checkedAt(sheet, row, linesBlock.columns.status),
    };
  });

  const { accountBalances, totals } = readAccountBalances(sheet, catalog, issues);
  return { incomes, lines, accountBalances, totals, debts: readDebts(sheet, issues) };
}

// El bloque «💹 Restante en las cuentas»: el saldo de cada cuenta según el Excel y
// los totales, con y sin «Otro».
function readAccountBalances(sheet: Sheet, catalog: Catalog, issues: Issues) {
  const totals = emptyTotals();
  const accountBalances: AccountBalanceRow[] = [];
  const found = block(sheet, "restante en las cuentas", {
    name: (label) => label === "nombre",
    balance: (label) => label === "restante",
  });
  if (!found) return { accountBalances, totals };

  // Sin columna clave: aquí las filas de totales también se leen.
  for (const row of rowsOf(sheet, found)) {
    const label = textAt(sheet, row, found.columns.name!);
    const balanceCents = centsAt(sheet, row, found.columns.balance);
    if (balanceCents === null) continue;
    const total = normalizeLabel(label);
    if (total.startsWith("total")) {
      const withThirdParty = total.includes("con otro");
      if (total.includes("bs"))
        totals[withThirdParty ? "vesWithThirdPartyCents" : "vesCents"] = balanceCents;
      else if (total.includes("$"))
        totals[withThirdParty ? "usdWithThirdPartyCents" : "usdCents"] = balanceCents;
      continue;
    }
    // La etiqueta es el nombre de la hoja. Una que no se reconoce solo afecta a la
    // comparación final, así que es un aviso.
    const account = catalog.accountBySheet.get(label) ?? null;
    if (!account) {
      issues.warning(
        "UNKNOWN_ACCOUNT_LABEL",
        `La cuenta «${label}» del presupuesto no está en el catálogo`,
        cellRef(sheet, row, found.columns.name!),
      );
    }
    accountBalances.push({ row, label, account, balanceCents });
  }
  return { accountBalances, totals };
}

// «📉 Deudas» (lo que se debe) y «🔫 Deudores» (lo que nos deben). Los importes
// pueden venir como número, con la moneda en el formato de la celda, o como texto.
function readDebts(sheet: Sheet, issues: Issues): DebtRow[] {
  const debts: DebtRow[] = [];
  const sections = [
    {
      direction: "payable" as const,
      found: block(sheet, "deudas", {
        dueOn: (label) => label === "fecha limite",
        description: (label) => label === "concepto",
        amount: (label) => label === "cantidad",
      }),
    },
    {
      direction: "receivable" as const,
      found: block(sheet, "deudores", {
        description: (label) => label === "deudor",
        amount: (label) => label === "cantidad",
      }),
    },
  ];

  for (const { direction, found } of sections) {
    if (!found || found.columns.description === undefined || found.columns.amount === undefined)
      continue;
    // Hasta su fila «Total», que no es una deuda más.
    for (const row of rowsOf(sheet, found, "description")) {
      const description = textAt(sheet, row, found.columns.description);
      const amountCell = cellAt(sheet, row, found.columns.amount);
      const ref = cellRef(sheet, row, found.columns.amount);
      let amountCents: number | null = null;
      let currency: Currency | null = null;
      let amountText: string | null = null;
      if (amountCell?.t === "n") {
        amountCents = toCents(amountCell.v as number);
        currency = currencyFromText(amountCell.z as string | undefined);
      } else if (amountCell) {
        amountText = String(amountCell.v);
        const parsed = parseAmountText(amountText);
        amountCents = parsed?.cents ?? null;
        currency = parsed?.currency ?? null;
      }
      if (amountCents === null) issues.warning("DEBT_WITHOUT_AMOUNT", "Una deuda sin importe", ref);
      else if (!currency) issues.warning("DEBT_WITHOUT_CURRENCY", "Una deuda sin moneda", ref);
      debts.push({
        row,
        direction,
        description,
        amountCents,
        currency,
        amountText,
        dueOn:
          found.columns.dueOn === undefined ? null : dateAt(sheet, row, found.columns.dueOn).date,
      });
    }
  }
  return debts;
}

// Un bloque: su título, la fila de cabecera de debajo y sus columnas, que se buscan
// solo a la derecha del título, porque al lado puede haber otro bloque.
function block(
  sheet: Sheet,
  title: string,
  fields: Record<string, (label: string, raw: string) => boolean>,
): { title: Position; header: number; columns: Columns } | null {
  const found = findCell(sheet, (label) => label === title);
  if (!found) return null;
  const header = found.row + 1;
  const width = Object.keys(fields).length + 2;
  return {
    title: found,
    header,
    columns: headerColumns(sheet, header, fields, { fromCol: found.col, toCol: found.col + width }),
  };
}

// Las filas de un bloque, de la cabecera hacia abajo, hasta la primera vacía en
// sus columnas o hasta su fila de totales (si se dice qué columna la marca).
function rowsOf(sheet: Sheet, found: { header: number; columns: Columns }, key?: string): number[] {
  const columns = Object.values(found.columns).filter((col) => col !== undefined);
  const rows: number[] = [];
  for (let row = found.header + 1; row <= sheet.lastRow; row++) {
    if (columns.every((col) => !cellAt(sheet, row, col))) break;
    const keyCol = key === undefined ? undefined : found.columns[key];
    if (keyCol !== undefined) {
      const label = normalizeLabel(textAt(sheet, row, keyCol));
      if (label.startsWith("total")) break;
      if (!label) continue;
    }
    rows.push(row);
  }
  return rows;
}

function centsAt(sheet: Sheet, row: number, col: number | undefined): number | null {
  if (col === undefined) return null;
  const cell = cellAt(sheet, row, col);
  return cell?.t === "n" ? toCents(cell.v as number) : null;
}

function checkedAt(sheet: Sheet, row: number, col: number | undefined): boolean | null {
  const text = col === undefined ? "" : textAt(sheet, row, col);
  if (text.includes("✅")) return true;
  if (text.includes("⏳")) return false;
  return null;
}

function emptyTotals(): Totals {
  return {
    vesCents: null,
    vesWithThirdPartyCents: null,
    usdCents: null,
    usdWithThirdPartyCents: null,
  };
}
