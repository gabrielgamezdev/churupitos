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
  // Quién lo registró en la app; lo importado no tiene autor.
  createdBy: string | null;
};

const LEDGER_COLUMNS =
  "entry_id, operation_id, occurred_on, date_approximate, kind, account_id, envelope_id, currency, amount_cents, is_fee, description, operation_description, running_balance_cents, created_by";

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
  created_by: string | null;
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
    createdBy: row.created_by,
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
  day: string;
  description: string;
  // El ingreso esperado que cobra, si es un cobro del presupuesto.
  incomeId: string | null;
  // Quién la registró en la app; lo importado del Excel no tiene autor.
  fromApp: boolean;
  authorName: string | null;
  // Cuándo se registró en la app, con hora; lo importado no lo tiene.
  registeredAt: string | null;
  entries: {
    id: string;
    accountId: string;
    envelopeId: string;
    amountCents: number;
    isFee: boolean;
    description: string;
    // En una línea del reparto de un cobro en bolívares, su valor en dólares (R9).
    usdValueCents: number | null;
  }[];
};

// Una operación entera, con todos sus asientos: lo que se abre al tocar una fila.
export function operationQuery(operationId: string) {
  return queryOptions({
    queryKey: ["operation", operationId],
    queryFn: async (): Promise<OperationDetail> => {
      const { data, error } = await supabase
        .from("operations")
        .select(
          "kind, adjustment_reason, occurred_on, description, income_id, created_by, created_at, author:household_members(display_name), entries(id, account_id, envelope_id, amount_cents, is_fee, description, usd_value_cents, position)",
        )
        .eq("id", operationId)
        .order("position", { referencedTable: "entries" })
        .single();
      if (error) throw error;
      return {
        kind: data.kind,
        adjustmentReason: data.adjustment_reason,
        day: data.occurred_on,
        description: data.description,
        incomeId: data.income_id,
        fromApp: data.created_by !== null,
        authorName: data.author?.display_name ?? null,
        registeredAt: data.created_by !== null ? data.created_at : null,
        entries: data.entries.map((entry) => ({
          id: entry.id,
          accountId: entry.account_id,
          envelopeId: entry.envelope_id,
          amountCents: entry.amount_cents,
          isFee: entry.is_fee,
          description: entry.description,
          usdValueCents: entry.usd_value_cents,
        })),
      };
    },
  });
}

// Una operación en una lista (Inicio, Movimientos): sin restantes, con quién la registró.
export type OperationItem = {
  id: string;
  kind: string;
  day: string;
  description: string;
  // Quién la registró en la app; lo importado del Excel no tiene autor.
  createdBy: string | null;
  authorName: string | null;
  // Su sitio en el día (R14): la posición de su primer asiento.
  position: number;
  entries: {
    accountId: string;
    envelopeId: string;
    amountCents: number;
    isFee: boolean;
    description: string;
  }[];
};

const OPERATION_ITEM_COLUMNS =
  "id, kind, occurred_on, description, created_by, author:household_members(display_name), entries(account_id, envelope_id, amount_cents, is_fee, description, position)";

type OperationItemRow = {
  id: string;
  kind: string;
  occurred_on: string;
  description: string;
  created_by: string | null;
  author: { display_name: string } | null;
  entries: {
    account_id: string;
    envelope_id: string;
    amount_cents: number;
    is_fee: boolean;
    description: string;
    position: number;
  }[];
};

function toOperationItem(row: OperationItemRow): OperationItem {
  return {
    id: row.id,
    kind: row.kind,
    day: row.occurred_on,
    description: row.description,
    createdBy: row.created_by,
    authorName: row.author?.display_name ?? null,
    position: Math.min(...row.entries.map((entry) => entry.position)),
    entries: row.entries.map((entry) => ({
      accountId: entry.account_id,
      envelopeId: entry.envelope_id,
      amountCents: entry.amount_cents,
      isFee: entry.is_fee,
      description: entry.description,
    })),
  };
}

// Cuántas enseña Inicio: las de los últimos días, para corregir lo que se acaba de apuntar.
export const RECENT_OPERATIONS_LIMIT = 5;

// Lo último que registraron en la app, por cuándo se registró y no por su fecha: lo que
// se acaba de apuntar sale arriba aunque sea de ayer. Lo importado del Excel no entra.
export const recentOperationsQuery = queryOptions({
  queryKey: ["recent-operations"],
  queryFn: async (): Promise<OperationItem[]> => {
    const { data, error } = await supabase
      .from("operations")
      .select(OPERATION_ITEM_COLUMNS)
      .not("created_by", "is", null)
      .order("created_at", { ascending: false })
      .order("position", { referencedTable: "entries" })
      .limit(RECENT_OPERATIONS_LIMIT);
    if (error) throw error;
    return data.map(toOperationItem);
  },
});

// Todas las operaciones de un mes, de todas las cuentas (Movimientos, M7): lo más nuevo
// arriba y, dentro del día, en el orden del libro (R14).
export function monthOperationsQuery(month: string) {
  return queryOptions({
    queryKey: ["month-operations", month],
    queryFn: async (): Promise<OperationItem[]> => {
      const { data, error } = await supabase
        .from("operations")
        .select(OPERATION_ITEM_COLUMNS)
        .gte("occurred_on", firstDay(month))
        .lte("occurred_on", lastDay(month))
        .order("position", { referencedTable: "entries" });
      if (error) throw error;
      return data
        .map(toOperationItem)
        .sort((a, b) => b.day.localeCompare(a.day) || b.position - a.position);
    },
  });
}
