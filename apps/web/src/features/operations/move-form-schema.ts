import { z } from "zod";

import { parseAmountInput } from "@/lib/amount-input";
import type { Currency } from "@/lib/money";

import { moveKind, type MoveDraft, type MoveKind } from "./move-draft";
import { FEE_DESCRIPTION } from "./operation-form-schema";

const amount = (message: string) =>
  z.string().refine((value) => parseAmountInput(value) !== null, message);

type CurrencyOf = (accountId: string) => Currency | undefined;

// El formulario de Mover (M8): de dónde sale y adónde llega, cada lado con su cuenta y su
// sobre. Los montos son texto, como se teclean. Solo comprueba que haya algo que mandar:
// la forma de cada tipo la impone la base (R5).
export function moveFormSchema(currencyOf: CurrencyOf) {
  return z
    .object({
      fromAccount: z.string().min(1, "Elige de qué cuenta sale."),
      fromEnvelope: z.string().min(1, "Elige de qué sobre sale."),
      toAccount: z.string().min(1, "Elige a qué cuenta llega."),
      toEnvelope: z.string().min(1, "Elige a qué sobre llega."),
      amount: amount("Escribe un monto mayor que cero."),
      // Lo que llega, solo en un cambio de divisa.
      arrived: z.string(),
      day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha."),
      description: z.string(),
      hasFee: z.boolean(),
      fee: z.object({ envelopeId: z.string(), amount: z.string(), description: z.string() }),
    })
    .superRefine((values, context) => {
      if (
        values.fromAccount &&
        values.fromAccount === values.toAccount &&
        values.fromEnvelope &&
        values.fromEnvelope === values.toEnvelope
      ) {
        context.addIssue({
          code: "custom",
          path: ["toEnvelope"],
          message: "Elige otro sobre: es el mismo de donde sale.",
        });
      }
      const from = currencyOf(values.fromAccount);
      const to = currencyOf(values.toAccount);
      if (from && to && from !== to && parseAmountInput(values.arrived) === null) {
        context.addIssue({ code: "custom", path: ["arrived"], message: "Escribe cuánto llega." });
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

export type MoveFormValues = z.infer<ReturnType<typeof moveFormSchema>>;

// Lo que se trae al pasar de Gasto o Ingreso a Mover, o al revés: lo ya escrito.
export type Carry = { amount: string; accountId: string; day: string; description: string };

// Un formulario vacío. La cuenta de destino empieza siendo la de origen: mover entre los
// sobres de una cuenta es lo más frecuente.
export function emptyMoveForm(carry: Carry): MoveFormValues {
  return {
    fromAccount: carry.accountId,
    fromEnvelope: "",
    toAccount: carry.accountId,
    toEnvelope: "",
    amount: carry.amount,
    arrived: "",
    day: carry.day,
    description: carry.description,
    hasFee: false,
    fee: { envelopeId: "", amount: "", description: FEE_DESCRIPTION },
  };
}

// Lo que se puede leer de un formulario, aunque no esté completo: para enseñar cómo
// quedan los sobres mientras se escribe. Sin las dos cuentas, los dos sobres y el monto
// (y, en un cambio, lo que llega), nada.
export function moveDraft(values: MoveFormValues, currencyOf: CurrencyOf): MoveDraft | null {
  const fromCurrency = currencyOf(values.fromAccount);
  const toCurrency = currencyOf(values.toAccount);
  const amountCents = parseAmountInput(values.amount);
  if (!fromCurrency || !toCurrency || !values.fromEnvelope || !values.toEnvelope) return null;
  if (amountCents === null) return null;
  const arrivedCents = fromCurrency === toCurrency ? amountCents : parseAmountInput(values.arrived);
  if (arrivedCents === null) return null;
  const feeCents = values.hasFee ? parseAmountInput(values.fee.amount) : null;
  return {
    from: {
      accountId: values.fromAccount,
      envelopeId: values.fromEnvelope,
      currency: fromCurrency,
    },
    to: { accountId: values.toAccount, envelopeId: values.toEnvelope, currency: toCurrency },
    amountCents,
    arrivedCents,
    fee:
      feeCents === null
        ? null
        : {
            envelopeId: values.fee.envelopeId || values.fromEnvelope,
            amountCents: feeCents,
            description: values.fee.description.trim() || FEE_DESCRIPTION,
          },
  };
}

// El tipo que va saliendo, aunque falten los sobres: de las dos cuentas.
export function formMoveKind(values: MoveFormValues, currencyOf: CurrencyOf): MoveKind | null {
  const from = currencyOf(values.fromAccount);
  const to = currencyOf(values.toAccount);
  if (!from || !to) return null;
  return moveKind(
    { accountId: values.fromAccount, envelopeId: "", currency: from },
    { accountId: values.toAccount, envelopeId: "", currency: to },
  );
}

// Un concepto cuando no se escribe ninguno, como lo apuntaría el Excel: el libro nunca
// enseña una fila «Sin concepto» por un movimiento.
export function defaultMoveDescription(
  kind: MoveKind,
  names: { fromAccount: string; toAccount: string; fromEnvelope: string; toEnvelope: string },
): string {
  if (kind === "envelope_transfer") return `De ${names.fromEnvelope} a ${names.toEnvelope}`;
  if (kind === "account_transfer") return `De ${names.fromAccount} a ${names.toAccount}`;
  return `Cambio de ${names.fromAccount} a ${names.toAccount}`;
}
