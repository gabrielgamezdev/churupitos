import { z } from "zod";

import { amountInputText, parseAmountInput } from "@/lib/amount-input";
import type { Currency } from "@/lib/money";

import type { EntryInput } from "@/features/operations/operation-draft";
import { FEE_DESCRIPTION } from "@/features/operations/operation-form-schema";

import { allocationInBs, type AllocationLine } from "./allocation";

const amount = (message: string) =>
  z.string().refine((value) => parseAmountInput(value) !== null, message);

type CurrencyOf = (accountId: string) => Currency | undefined;

// Una línea del reparto como la recibe `save_receipt`: con su valor en dólares si la
// cuenta es en bolívares (R9).
export type ReceiptEntryInput = EntryInput & { usd_value_cents: number | null };

// El formulario de Cobrar (M9): dónde llegó, cuánto, los dólares que se reconocen y el
// reparto en dólares. Los montos son texto, como se teclean.
export function receiveFormSchema(currencyOf: CurrencyOf) {
  return z
    .object({
      accountId: z.string().min(1, "Elige en qué cuenta llegó."),
      received: amount("Escribe cuánto llegó."),
      // Los dólares que se reconocen; en una cuenta en dólares, lo que llegó.
      usd: z.string(),
      day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha."),
      description: z.string(),
      lines: z
        .array(
          z.object({
            envelopeId: z.string().min(1, "Elige el sobre."),
            usd: amount("Escribe cuántos dólares van a este sobre."),
          }),
        )
        .min(1),
      hasFee: z.boolean(),
      fee: z.object({ envelopeId: z.string(), amount: z.string(), description: z.string() }),
    })
    .superRefine((values, context) => {
      const currency = currencyOf(values.accountId);
      if (currency === "VES" && parseAmountInput(values.usd) === null) {
        context.addIssue({
          code: "custom",
          path: ["usd"],
          message: "Escribe los dólares que se reconocen.",
        });
      }
      const pending = receivePending(values, currency);
      if (pending !== null && pending !== 0) {
        context.addIssue({
          code: "custom",
          path: ["lines"],
          message:
            pending > 0
              ? "Falta repartir parte de los dólares."
              : "Lo repartido pasa de los dólares.",
        });
      }
      if (values.hasFee && parseAmountInput(values.fee.amount) === null) {
        context.addIssue({
          code: "custom",
          path: ["fee", "amount"],
          message: "Escribe el monto de la comisión.",
        });
      }
    });
}

export type ReceiveFormValues = z.infer<ReturnType<typeof receiveFormSchema>>;

// Los dólares que se reparten: los que se reconocen en bolívares (con ellos sale la tasa,
// R8), o lo que llegó si la cuenta ya es en dólares.
export function recognizedUsd(
  values: Pick<ReceiveFormValues, "received" | "usd">,
  currency: Currency | undefined,
): number | null {
  if (!currency) return null;
  return parseAmountInput(currency === "VES" ? values.usd : values.received);
}

// Cuántos dólares faltan por repartir: negativo si se pasó. Sin saber cuántos son, null.
export function receivePending(
  values: Pick<ReceiveFormValues, "received" | "usd" | "lines">,
  currency: Currency | undefined,
): number | null {
  const usd = recognizedUsd(values, currency);
  if (usd === null) return null;
  return values.lines.reduce((rest, line) => rest - (parseAmountInput(line.usd) ?? 0), usd);
}

// Los bolívares que le tocan a cada línea, para enseñarlos mientras se reparte (R9).
export function linesInBs(values: ReceiveFormValues): number[] {
  const received = parseAmountInput(values.received);
  const usd = parseAmountInput(values.usd);
  if (received === null || usd === null) return values.lines.map(() => 0);
  return allocationInBs(
    values.lines.map((line) => parseAmountInput(line.usd) ?? 0),
    received,
    usd,
  );
}

// Lo que guarda la base: cada línea en la moneda de la cuenta, con sus dólares si es en
// bolívares, y la comisión aparte (R16). Sin cuadrar, nada.
export function receiptEntries(
  values: ReceiveFormValues,
  currency: Currency | undefined,
): ReceiptEntryInput[] | null {
  if (!currency || receivePending(values, currency) !== 0) return null;
  const usdLines = values.lines.map((line) => parseAmountInput(line.usd) ?? 0);
  const amounts = currency === "VES" ? linesInBs(values) : usdLines;
  const entries: ReceiptEntryInput[] = values.lines.map((line, index) => ({
    account_id: values.accountId,
    envelope_id: line.envelopeId,
    amount_cents: amounts[index] ?? 0,
    is_fee: false,
    description: "",
    usd_value_cents: currency === "VES" ? (usdLines[index] ?? 0) : null,
  }));
  const feeCents = values.hasFee ? parseAmountInput(values.fee.amount) : null;
  if (feeCents !== null) {
    entries.push({
      account_id: values.accountId,
      envelope_id: values.fee.envelopeId || values.lines[0]?.envelopeId || "",
      amount_cents: -feeCents,
      is_fee: true,
      description: values.fee.description.trim() || FEE_DESCRIPTION,
      usd_value_cents: null,
    });
  }
  return entries;
}

// Un formulario vacío: los dólares esperados ya puestos y el reparto propuesto desde el
// plan (o una línea en blanco si el plan no dice nada de este ingreso).
export function emptyReceiveForm(options: {
  accountId: string;
  day: string;
  incomeName: string;
  expectedUsdCents: number;
  proposal: AllocationLine[];
}): ReceiveFormValues {
  return {
    accountId: options.accountId,
    received: "",
    usd: amountInputText(options.expectedUsdCents),
    day: options.day,
    description: options.incomeName,
    lines:
      options.proposal.length > 0
        ? options.proposal.map((line) => ({
            envelopeId: line.envelopeId,
            usd: amountInputText(line.usdCents),
          }))
        : [{ envelopeId: "", usd: "" }],
    hasFee: false,
    fee: { envelopeId: "", amount: "", description: FEE_DESCRIPTION },
  };
}
