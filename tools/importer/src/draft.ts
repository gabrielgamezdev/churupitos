// Las operaciones que el importador va a escribir, antes de tocar la base. Sus tipos
// y motivos son los de la tabla `operations` (DOMINIO.md §3).

import type { LedgerRow } from "./ledger-sheet.ts";
import { normalizeLabel } from "./text.ts";

export type OperationKind =
  "expense" | "income" | "envelope_transfer" | "account_transfer" | "exchange" | "adjustment";

export type AdjustmentReason = "opening" | "carry_reassignment" | "interest" | "correction";

export type DraftEntry = {
  account: string;
  envelope: string;
  amountCents: number;
  isFee: boolean;
  description: string;
  // La fila del Excel (R14); 0 en lo que el importador deduce, que va primero.
  position: number;
  // R9: el valor en dólares de una línea del reparto de un cobro en bolívares.
  usdValueCents: number | null;
};

export type DraftOperation = {
  // El libro mensual del que sale.
  month: string;
  kind: OperationKind;
  date: string;
  dateApproximate: boolean;
  description: string;
  adjustmentReason: AdjustmentReason | null;
  // El ingreso esperado que cobra (`AAAA-MM#n`), si es un cobro.
  incomeKey: string | null;
  entries: DraftEntry[];
  // Las filas del Excel que la forman, títulos incluidos: `AAAA-MM:HOJA:fila`.
  refs: string[];
};

export const rowRef = (month: string, row: LedgerRow) => `${month}:${row.sheet}:${row.row}`;

export function entryOf(row: LedgerRow, isFee = false): DraftEntry {
  return {
    account: row.account,
    // Una fila con importe y sin sobre ya es un error del lector: no llega aquí.
    envelope: row.envelope ?? "",
    amountCents: row.amountCents,
    isFee,
    description: row.description,
    position: row.row,
    usdValueCents: null,
  };
}

export function daysBetween(a: string, b: string): number {
  return Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;
}

// R16: una comisión es una salida cuyo concepto lo dice, con las erratas que se
// han visto («Comsión», «móviil»), o un cargo del banco que no dice «comisión»
// pero acaba como acaban siempre: «Mantenimiento de cuenta», «Envío de SMS». Por
// el final, para no confundir «Mantenimiento de la moto» con un cargo del banco.
const FEE_WORD = /\bcom[si]{1,2}i?o?n(es)?\b|^com banca/;
const BANK_CHARGE =
  /(mantenimiento( de cuenta)?|estado de cuenta|banca movil|(envio de|uso( del?)? canal) sms)$/;

export function isFeeRow(row: LedgerRow): boolean {
  if (row.amountCents >= 0) return false;
  const text = normalizeLabel(row.description);
  return FEE_WORD.test(text) || BANK_CHARGE.test(text);
}
