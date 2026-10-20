import { queryOptions } from "@tanstack/react-query";

import { firstDay, lastDay } from "@/lib/months";
import { supabase } from "@/lib/supabase";

// Las consultas de la pantalla de una cuenta (los sobres están en features/envelopes). Todo saldo y todo restante lo suma la
// base (R2); aquí solo se lee y se le da forma.

export type Cell = { envelopeId: string; balanceCents: number };

// Cuánto hay hoy de cada sobre en la cuenta: sus celdas.
export function accountCellsQuery(accountId: string) {
  return queryOptions({
    queryKey: ["cell-balances", accountId],
    queryFn: async (): Promise<Cell[]> => {
      const { data, error } = await supabase.rpc("cell_balances").eq("account_id", accountId);
      if (error) throw error;
      return data.map((row) => ({ envelopeId: row.envelope_id, balanceCents: row.balance_cents }));
    },
  });
}

// El saldo de cada cuenta al cierre de un día, por id de cuenta: con él se abre y se
// cierra un mes (R7). Un objeto y no un Map: la caché se guarda en el teléfono como
// JSON, y un Map volvería vacío.
export function balancesAtQuery(day: string) {
  return queryOptions({
    queryKey: ["account-balances", day],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase.rpc("account_balances", { as_of: day });
      if (error) throw error;
      return Object.fromEntries(data.map((row) => [row.account_id, row.balance_cents]));
    },
  });
}

export type LedgerEntry = {
  entryId: string;
  operationId: string;
  day: string;
  dateApproximate: boolean;
  kind: string;
  envelopeId: string;
  amountCents: number;
  isFee: boolean;
  description: string;
  // Lo que quedó en la cuenta después de este asiento (R14).
  runningBalanceCents: number;
};

// Las columnas de una vista llegan como opcionales en los tipos generados, aunque
// nunca vengan vacías: si alguna faltara, mejor un error que un cero inventado.
function required<T>(value: T | null, column: string): T {
  if (value === null) throw new Error(`El libro llegó sin ${column}`);
  return value;
}

// El libro de un mes de la cuenta, con lo más nuevo arriba.
export function ledgerQuery(accountId: string, month: string) {
  return queryOptions({
    queryKey: ["account-ledger", accountId, month],
    queryFn: async (): Promise<LedgerEntry[]> => {
      const { data, error } = await supabase
        .from("account_ledger")
        .select(
          "entry_id, operation_id, occurred_on, date_approximate, kind, envelope_id, amount_cents, is_fee, description, operation_description, running_balance_cents",
        )
        .eq("account_id", accountId)
        .gte("occurred_on", firstDay(month))
        .lte("occurred_on", lastDay(month))
        .order("occurred_on", { ascending: false })
        .order("position", { ascending: false })
        .order("entry_id", { ascending: false });
      if (error) throw error;
      return data.map((row) => ({
        entryId: required(row.entry_id, "entry_id"),
        operationId: required(row.operation_id, "operation_id"),
        day: required(row.occurred_on, "occurred_on"),
        dateApproximate: row.date_approximate ?? false,
        kind: required(row.kind, "kind"),
        envelopeId: required(row.envelope_id, "envelope_id"),
        amountCents: required(row.amount_cents, "amount_cents"),
        isFee: row.is_fee ?? false,
        // El concepto de la fila; si no tiene, el de la operación.
        description: row.description || row.operation_description || "",
        runningBalanceCents: required(row.running_balance_cents, "running_balance_cents"),
      }));
    },
  });
}

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
