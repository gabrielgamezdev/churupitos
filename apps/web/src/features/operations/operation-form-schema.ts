import { z } from "zod";

import { amountInputText, parseAmountInput } from "@/lib/amount-input";

import type { OperationDraft, OperationKind } from "./operation-draft";

// El formulario de Registrar. Los montos son texto, como se teclean; pasan a céntimos
// al leerlos. Solo comprueba que haya algo que mandar: las reglas las impone la base.
const amount = (message: string) =>
  z.string().refine((value) => parseAmountInput(value) !== null, message);

export const operationFormSchema = z
  .object({
    kind: z.enum(["expense", "income"]),
    accountId: z.string().min(1, "Elige la cuenta."),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha."),
    description: z.string(),
    lines: z
      .array(
        z.object({
          envelopeId: z.string().min(1, "Elige el sobre."),
          amount: amount("Escribe un monto mayor que cero."),
        }),
      )
      .min(1),
    hasFee: z.boolean(),
    fee: z.object({ envelopeId: z.string(), amount: z.string(), description: z.string() }),
  })
  .superRefine((values, context) => {
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
    lines: [
      {
        envelopeId,
        amount: prefill.amountCents === undefined ? "" : amountInputText(prefill.amountCents),
      },
    ],
    hasFee: false,
    fee: { envelopeId: "", amount: "", description: FEE_DESCRIPTION },
  };
}

// Lo que se puede leer de un formulario, aunque no esté completo: para enseñar cómo
// queda cada sobre mientras se escribe. Las líneas sin sobre o sin monto no cuentan.
export function formDraft(values: OperationFormValues): OperationDraft {
  const lines = values.lines.flatMap((line) => {
    const cents = parseAmountInput(line.amount);
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
