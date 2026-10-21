import { z } from "zod";

import { amountInputText, parseAmountInput } from "@/lib/amount-input";
import type { Currency } from "@/lib/money";

import type { Debt, DebtDirection } from "./queries";

// El formulario de una deuda. Como en Registrar, el monto es texto hasta leerlo, y solo
// se comprueba que haya algo que mandar: lo demás lo impone la base.

export type Every = "14d" | "month";

export const MAX_INSTALLMENTS = 24;

export const debtFormSchema = z
  .object({
    direction: z.enum(["payable", "receivable"]),
    description: z.string().trim().min(1, "Escribe el concepto.").max(120),
    amount: z.string().refine((value) => parseAmountInput(value) !== null, "Escribe el monto."),
    currency: z.enum(["VES", "USD"]),
    dueOn: z.string(),
    inInstallments: z.boolean(),
    count: z.string(),
    every: z.enum(["14d", "month"]),
  })
  .superRefine((values, context) => {
    if (!values.inInstallments) return;
    const count = Number(values.count);
    if (!Number.isInteger(count) || count < 2 || count > MAX_INSTALLMENTS) {
      context.addIssue({
        code: "custom",
        path: ["count"],
        message: `Entre 2 y ${MAX_INSTALLMENTS} cuotas.`,
      });
    }
    if (!values.dueOn) {
      context.addIssue({
        code: "custom",
        path: ["dueOn"],
        message: "La primera cuota necesita su fecha.",
      });
    }
  });

export type DebtFormValues = z.infer<typeof debtFormSchema>;

export function emptyDebtForm(direction: DebtDirection = "payable"): DebtFormValues {
  return {
    direction,
    description: "",
    amount: "",
    currency: "USD",
    dueOn: "",
    inInstallments: false,
    count: "3",
    every: "14d",
  };
}

// Una deuda guardada, como la vuelve a enseñar el formulario para corregirla.
export function debtFormValues(debt: Debt): DebtFormValues {
  return {
    ...emptyDebtForm(debt.direction),
    description: debt.description,
    amount: amountInputText(debt.amountCents),
    currency: debt.currency,
    dueOn: debt.dueOn ?? "",
  };
}

// Las fechas de las cuotas: la primera y las siguientes cada 14 días o cada mes. Un mes
// sin ese día se queda en su último («31 de enero» → «28 de febrero»).
export function installmentDates(first: string, count: number, every: Every): string[] {
  const [year, month, day] = first.split("-").map(Number) as [number, number, number];
  return Array.from({ length: count }, (_, i) => {
    if (every === "14d") {
      return new Date(Date.UTC(year, month - 1, day + 14 * i)).toISOString().slice(0, 10);
    }
    const lastDay = new Date(Date.UTC(year, month - 1 + i + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month - 1 + i, Math.min(day, lastDay)))
      .toISOString()
      .slice(0, 10);
  });
}

// Una fila como la recibe `save_debts`.
export type DebtInput = {
  id: string;
  direction: DebtDirection;
  description: string;
  amount_cents: number;
  currency: Currency;
  due_on: string | null;
};

// Lo que se guarda: una deuda, o una por cuota con su fecha. `ids` son los que se
// pusieron al abrir el formulario, para que guardar dos veces no duplique (ADR 0008).
export function debtRows(values: DebtFormValues, ids: string[]): DebtInput[] {
  const amountCents = parseAmountInput(values.amount) ?? 0;
  const dates =
    values.inInstallments && values.dueOn
      ? installmentDates(values.dueOn, Number(values.count), values.every)
      : [values.dueOn || null];
  return dates.map((dueOn, i) => ({
    id: ids[i]!,
    direction: values.direction,
    description: values.description.trim(),
    amount_cents: amountCents,
    currency: values.currency,
    due_on: dueOn,
  }));
}
