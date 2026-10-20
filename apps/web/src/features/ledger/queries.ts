import { queryOptions } from "@tanstack/react-query";

import type { Currency } from "@/lib/money";
import { firstDay, lastDay } from "@/lib/months";
import { required } from "@/lib/required";
import { supabase } from "@/lib/supabase";

// El libro de una cuenta o de un sobre, y el detalle de cada operación. Todo restante
// lo suma la base (R2, R14); aquí solo se lee y se le da forma.

export type LedgerEntry = {
  entryId: string;
  operationId: string;
  day: string;
  dateApproximate: boolean;
  kind: string;
  accountId: string;
  envelopeId: string;
  currency: Currency;
  amountCents: number;
  isFee: boolean;
  description: string;
  // Lo que quedó después de este asiento: en la cuenta, o en el sobre en esa moneda.
  runningBalanceCents: number;
};

const LEDGER_COLUMNS =
  "entry_id, operation_id, occurred_on, date_approximate, kind, account_id, envelope_id, currency, amount_cents, is_fee, description, operation_description, running_balance_cents";

type LedgerRow = {
  entry_id: string | null;
  operation_id: string | null;
  occurred_on: string | null;
  date_approximate: boolean | null;
  kind: string | null;
  account_id: string | null;
  envelope_id: string | null;
  currency: string | null;
  amount_cents: number | null;
  is_fee: boolean | null;
  description: string | null;
  operation_description: string | null;
  running_balance_cents: number | null;
};

function toLedgerEntry(row: LedgerRow): LedgerEntry {
  return {
    entryId: required(row.entry_id, "entry_id"),
    operationId: required(row.operation_id, "operation_id"),
    day: required(row.occurred_on, "occurred_on"),
    dateApproximate: row.date_approximate ?? false,
    kind: required(row.kind, "kind"),
    accountId: required(row.account_id, "account_id"),
    envelopeId: required(row.envelope_id, "envelope_id"),
    currency: required(row.currency, "currency") as Currency,
    amountCents: required(row.amount_cents, "amount_cents"),
    isFee: row.is_fee ?? false,
    // El concepto de la fila; si no tiene, el de la operación.
    description: row.description || row.operation_description || "",
    runningBalanceCents: required(row.running_balance_cents, "running_balance_cents"),
  };
}

// El libro de un mes, con lo más nuevo arriba: el de una cuenta (`account_ledger`) o
// el de un sobre (`envelope_ledger`), que tienen las mismas columnas.
function monthLedgerQuery(
  view: "account_ledger" | "envelope_ledger",
  column: "account_id" | "envelope_id",
  id: string,
  month: string,
) {
  return queryOptions({
    queryKey: [view, id, month],
    queryFn: async (): Promise<LedgerEntry[]> => {
      const { data, error } = await supabase
        .from(view)
        .select(LEDGER_COLUMNS)
        .eq(column, id)
        .gte("occurred_on", firstDay(month))
        .lte("occurred_on", lastDay(month))
        .order("occurred_on", { ascending: false })
        .order("position", { ascending: false })
        .order("entry_id", { ascending: false });
      if (error) throw error;
      return data.map(toLedgerEntry);
    },
  });
}

export const accountLedgerQuery = (accountId: string, month: string) =>
  monthLedgerQuery("account_ledger", "account_id", accountId, month);

export const envelopeLedgerQuery = (envelopeId: string, month: string) =>
  monthLedgerQuery("envelope_ledger", "envelope_id", envelopeId, month);

export type OperationDetail = {
  kind: string;
  adjustmentReason: string | null;
  entries: {
    id: string;
    accountId: string;
    envelopeId: string;
    amountCents: number;
    isFee: boolean;
    description: string;
  }[];
};

// Una operación entera, con todos sus asientos: lo que se despliega al tocar una fila.
export function operationQuery(operationId: string) {
  return queryOptions({
    queryKey: ["operation", operationId],
    queryFn: async (): Promise<OperationDetail> => {
      const { data, error } = await supabase
        .from("operations")
        .select(
          "kind, adjustment_reason, entries(id, account_id, envelope_id, amount_cents, is_fee, description, position)",
        )
        .eq("id", operationId)
        .order("position", { referencedTable: "entries" })
        .single();
      if (error) throw error;
      return {
        kind: data.kind,
        adjustmentReason: data.adjustment_reason,
        entries: data.entries.map((entry) => ({
          id: entry.id,
          accountId: entry.account_id,
          envelopeId: entry.envelope_id,
          amountCents: entry.amount_cents,
          isFee: entry.is_fee,
          description: entry.description,
        })),
      };
    },
  });
}
