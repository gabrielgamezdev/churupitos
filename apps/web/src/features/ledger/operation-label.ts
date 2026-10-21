import type { OperationDetail } from "./queries";

// Los tipos de operación con las palabras del Excel (DOMINIO.md, §3).
const KIND_LABELS: Record<string, string> = {
  expense: "Gasto",
  // Un ingreso suelto; el que cobra un ingreso esperado es un «Cobro».
  income: "Ingreso",
  envelope_transfer: "Entre sobres",
  account_transfer: "Entre cuentas",
  exchange: "Cambio de divisa",
  adjustment: "Ajuste",
};

// Un ajuste no tiene contraparte: su motivo es lo único que lo explica.
const REASON_LABELS: Record<string, string> = {
  opening: "saldo inicial",
  carry_reassignment: "reasignación del arrastre",
  interest: "intereses",
  correction: "corrección",
};

// Qué es la operación, con las palabras del Excel: «Gasto», «Cobro», «Ajuste · intereses».
export function operationLabel(
  operation: Pick<OperationDetail, "kind" | "adjustmentReason" | "incomeId">,
) {
  if (operation.incomeId) return "Cobro";
  const label = KIND_LABELS[operation.kind] ?? operation.kind;
  const reason = operation.adjustmentReason && REASON_LABELS[operation.adjustmentReason];
  return reason ? `${label} · ${reason}` : label;
}
