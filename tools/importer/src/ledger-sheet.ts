// Una hoja de cuenta: `Fecha | Fuente | Concepto | Monto | Restante`, una fila por
// asiento. Aquí solo se limpian las filas; agruparlas en operaciones es el paso
// siguiente.

import type { Catalog } from "./catalog.ts";
import type { Issues } from "./issues.ts";
import { currencyFromText, parseAmountText, toCents } from "./money.ts";
import type { Currency } from "./money.ts";
import {
  cellAt,
  cellRef,
  dateAt,
  findCell,
  headerColumns,
  numberAt,
  rawCellAt,
  textAt,
} from "./sheet.ts";
import type { Sheet } from "./sheet.ts";
import { normalizeLabel } from "./text.ts";

export type LedgerRow = {
  sheet: string;
  account: string;
  // La fila en el Excel: es el orden dentro del día (R14).
  row: number;
  date: string;
  // R15: la fila no tenía fecha, o no se entendía, y se tomó la de la anterior.
  dateApproximate: boolean;
  // Lo que había escrito en la fecha cuando no era una fecha («???»).
  dateText: string | null;
  // La columna «Fuente», que es el sobre, tal cual y ya traducida por el catálogo.
  envelopeText: string;
  envelope: string | null;
  description: string;
  // Cero en las filas que hacen de título (R4).
  amountCents: number;
  amountFormula: string | null;
  // El «Restante» del Excel. No se usa para calcular nada: es contra lo que se
  // comparan los saldos de la app (paso 7).
  balanceCents: number | null;
  // «Lo que tenía antes»: el arrastre del mes anterior (R7).
  isCarry: boolean;
};

const HEADER_SEARCH_ROWS = 15;

export function readLedgerSheet(
  sheet: Sheet,
  account: { name: string; currency: Currency },
  catalog: Catalog,
  month: string,
  issues: Issues,
): LedgerRow[] {
  const header = findCell(sheet, (label) => label === "fecha", { toRow: HEADER_SEARCH_ROWS });
  const columns = header
    ? headerColumns(sheet, header.row, {
        date: (label) => label === "fecha",
        envelope: (label) => label === "fuente",
        description: (label) => label === "concepto",
        amount: (label) => label === "monto",
        balance: (label) => label === "restante",
      })
    : {};
  const {
    date: dateCol,
    envelope: envelopeCol,
    description: descriptionCol,
    amount: amountCol,
  } = columns;
  if (
    !header ||
    dateCol === undefined ||
    envelopeCol === undefined ||
    descriptionCol === undefined ||
    amountCol === undefined
  ) {
    issues.error(
      "NO_HEADER",
      `La hoja «${sheet.name}» no tiene la cabecera Fecha | Fuente | Concepto | Monto`,
    );
    return [];
  }

  const rows: LedgerRow[] = [];
  let lastDate: string | null = null;
  const formats = { match: 0, mismatch: 0 };

  for (let row = header.row + 1; row <= sheet.lastRow; row++) {
    const ref = cellRef(sheet, row, amountCol);
    const envelopeText = textAt(sheet, row, envelopeCol);
    const description = textAt(sheet, row, descriptionCol);
    const amountCell = cellAt(sheet, row, amountCol);
    const rawAmount = rawCellAt(sheet, row, amountCol);

    if (rawAmount?.f && rawAmount.v === undefined) {
      issues.error("FORMULA_WITHOUT_VALUE", "Un importe es una fórmula sin valor guardado", ref);
      continue;
    }
    // Una fila con solo la fecha o solo el restante es un esbozo: no dice nada.
    if (!envelopeText && !description && !amountCell) continue;

    let amountCents = 0;
    if (amountCell?.t === "n") {
      amountCents = toCents(amountCell.v as number);
      const currency = currencyFromText(amountCell.z as string | undefined);
      if (currency) formats[currency === account.currency ? "match" : "mismatch"] += 1;
    } else if (amountCell) {
      const parsed = parseAmountText(String(amountCell.v));
      if (!parsed) {
        issues.error(
          "AMOUNT_NOT_NUMBER",
          `El importe «${String(amountCell.v)}» no es un número`,
          ref,
        );
        continue;
      }
      amountCents = parsed.cents;
    } else {
      issues.warning(
        "AMOUNT_MISSING",
        "Una fila con texto pero sin importe entra como título",
        ref,
      );
    }

    let envelope: string | null = null;
    if (envelopeText) {
      envelope = catalog.envelopeByAlias.get(envelopeText) ?? null;
      if (!envelope) {
        issues.error("UNKNOWN_ENVELOPE", `El sobre «${envelopeText}» no está en el catálogo`, ref);
      }
    } else if (amountCents !== 0) {
      issues.error("MISSING_ENVELOPE", "Un importe sin sobre", ref);
    }

    const written = dateAt(sheet, row, dateCol);
    let date = written.date;
    let dateApproximate = false;
    if (!date) {
      // R15: la de la fila anterior de la hoja, sin salirse del mes del libro.
      date = lastDate && lastDate.startsWith(month) ? lastDate : `${month}-01`;
      dateApproximate = true;
      issues.warning(
        "DATE_APPROXIMATE",
        written.text ? `La fecha «${written.text}» no se entiende` : "Una fila sin fecha",
        ref,
      );
    } else {
      lastDate = date;
    }

    const isCarry = normalizeLabel(description).startsWith("lo que ten");
    if (!dateApproximate && !date.startsWith(month) && !isCarry) {
      issues.warning("DATE_OUTSIDE_MONTH", `La fecha ${date} no es de este mes`, ref);
    }

    const balance = columns.balance === undefined ? null : numberAt(sheet, row, columns.balance);

    rows.push({
      sheet: sheet.name,
      account: account.name,
      row,
      date,
      dateApproximate,
      dateText: written.text,
      envelopeText,
      envelope,
      description,
      amountCents,
      amountFormula: (amountCell?.f as string | undefined) ?? null,
      balanceCents: balance === null ? null : toCents(balance),
      isCarry,
    });
  }

  // El formato de los importes dice su moneda. Si la mayoría dice la otra, lo más
  // probable es que el catálogo le haya puesto a la cuenta la moneda equivocada.
  if (formats.mismatch > formats.match) {
    issues.error(
      "CURRENCY_MISMATCH",
      `Los importes de «${sheet.name}» tienen formato de otra moneda que ${account.currency}`,
    );
  }
  return rows;
}
