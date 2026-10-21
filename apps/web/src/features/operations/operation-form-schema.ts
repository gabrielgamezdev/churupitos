import { z } from "zod";

import { amountInputText, parseAmountInput } from "@/lib/amount-input";

import type { OperationDraft, OperationKind } from "./operation-draft";

// El formulario de Registrar. Los montos son texto, como se teclean; pasan a céntimos
// al leerlos. Solo comprueba que haya algo que mandar: las reglas las impone la base.
//
// `total` es el monto grande de arriba (M7). Con un solo sobre, es lo que va a él; al
// repartir, cada sobre lleva su parte y entre todas tienen que sumar el total.
const amount = (message: string) =>
  z.string().refine((value) => parseAmountInput(value) !== null, message);

export const operationFormSchema = z
  .object({
    kind: z.enum(["expense", "income"]),
    accountId: z.string().min(1, "Elige la cuenta."),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha."),
    description: z.string(),
    total: amount("Escribe un monto mayor que cero."),
    lines: z
      .array(z.object({ envelopeId: z.string().min(1, "Elige el sobre."), amount: z.string() }))
      .min(1),
    hasFee: z.boolean(),
    fee: z.object({ envelopeId: z.string(), amount: z.string(), description: z.string() }),
  })
  .superRefine((values, context) => {
    if (values.lines.length > 1) {
      values.lines.forEach((line, index) => {
        if (parseAmountInput(line.amount) === null) {
          context.addIssue({
            code: "custom",
            path: ["lines", index, "amount"],
            message: "Escribe cuánto va a este sobre.",
          });
        }
      });
      const pending = splitPending(values);
      if (pending !== null && pending !== 0) {
        context.addIssue({
          code: "custom",
          path: ["lines"],
          message: pending > 0 ? "Falta repartir parte del monto." : "Lo repartido pasa del monto.",
        });
      }
    }
    if (!values.hasFee) return;
    if (parseAmountInput(values.fee.amount) === null) {
      context.addIssue({
        code: "custom",
        path: ["fee", "amount"],
        message: "Escribe el monto de la comisión.",
      });
    }
    if (!values.fee.envelopeId) {
      context.addIssue({ code: "custom", path: ["fee", "envelopeId"], message: "Elige el sobre." });
    }
  });

export type OperationFormValues = z.infer<typeof operationFormSchema>;

// Al repartir, cuánto del total falta por poner en algún sobre: negativo si se pasó. Sin
// un total que leer, null.
export function splitPending(values: Pick<OperationFormValues, "total" | "lines">) {
  const total = parseAmountInput(values.total);
  if (total === null) return null;
  return values.lines.reduce((rest, line) => rest - (parseAmountInput(line.amount) ?? 0), total);
}

export const FEE_DESCRIPTION = "Comisión";

// Un formulario vacío, con lo que ya viene elegido o escrito: la cuenta o el sobre desde
// los que se abrió, o el pago de una deuda.
export function emptyOperationForm(
  day: string,
  accountId = "",
  envelopeId = "",
  prefill: { kind?: OperationKind; amountCents?: number; description?: string } = {},
): OperationFormValues {
  return {
    kind: prefill.kind ?? "expense",
    accountId,
    day,
    description: prefill.description ?? "",
    total: prefill.amountCents === undefined ? "" : amountInputText(prefill.amountCents),
    lines: [{ envelopeId, amount: "" }],
    hasFee: false,
    fee: { envelopeId: "", amount: "", description: FEE_DESCRIPTION },
  };
}

// Lo que se puede leer de un formulario, aunque no esté completo: para enseñar cómo
// queda cada sobre mientras se escribe. Las líneas sin sobre o sin monto no cuentan.
export function formDraft(values: OperationFormValues): OperationDraft {
  // Con un solo sobre, va a él todo el total.
  const single = values.lines.length === 1;
  const lines = values.lines.flatMap((line) => {
    const cents = parseAmountInput(single ? values.total : line.amount);
    return line.envelopeId && cents !== null
      ? [{ envelopeId: line.envelopeId, amountCents: cents }]
      : [];
  });
  const feeCents = values.hasFee ? parseAmountInput(values.fee.amount) : null;
  return {
    kind: values.kind,
    accountId: values.accountId,
    lines,
    fee:
      feeCents !== null && values.fee.envelopeId
        ? {
            envelopeId: values.fee.envelopeId,
            amountCents: feeCents,
            description: values.fee.description.trim() || FEE_DESCRIPTION,
          }
        : null,
  };
}

// Una operación guardada, como la vuelve a enseñar el formulario para corregirla: los
// montos, sin signo y escritos como se teclean («150,00»).
export function operationFormValues(operation: {
  kind: string;
  day: string;
  description: string;
  entries: {
    accountId: string;
    envelopeId: string;
    amountCents: number;
    isFee: boolean;
    description: string;
  }[];
}): OperationFormValues {
  const lines = operation.entries.filter((entry) => !entry.isFee);
  const fee = operation.entries.find((entry) => entry.isFee);
  return {
    kind: operation.kind === "income" ? "income" : "expense",
    accountId: operation.entries[0]?.accountId ?? "",
    day: operation.day,
    description: operation.description,
    total: amountInputText(lines.reduce((sum, entry) => sum + Math.abs(entry.amountCents), 0)),
    lines: lines.map((entry) => ({
      envelopeId: entry.envelopeId,
      amount: amountInputText(entry.amountCents),
    })),
    hasFee: fee !== undefined,
    fee: {
      envelopeId: fee?.envelopeId ?? "",
      amount: fee ? amountInputText(fee.amountCents) : "",
      description: fee?.description || FEE_DESCRIPTION,
    },
  };
}
