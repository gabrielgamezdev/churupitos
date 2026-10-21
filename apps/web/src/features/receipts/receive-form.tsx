import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { AmountInput } from "@/components/amount-field";
import { Field } from "@/components/field";
import { Money } from "@/components/money";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { accountCellsQuery } from "@/features/accounts/queries";
import { useAccountBalances } from "@/features/balances/use-account-balances";
import type { BudgetLine } from "@/features/budget/queries";
import { envelopesQuery } from "@/features/envelopes/queries";
import { AccountSelect } from "@/features/operations/account-select";
import { DayField } from "@/features/operations/day-field";
import { budgetOrder } from "@/features/operations/envelope-order";
import { EnvelopeSelect } from "@/features/operations/envelope-select";
import { rememberAccount, rememberedAccount } from "@/features/operations/last-account";
import { projectCells } from "@/features/operations/operation-draft";
import { FEE_DESCRIPTION } from "@/features/operations/operation-form-schema";
import { Remaining } from "@/features/operations/remaining";
import { amountInputText, parseAmountInput } from "@/lib/amount-input";
import { formatMoney, formatRate } from "@/lib/money";
import { monthLabel, today } from "@/lib/months";
import { showToast } from "@/lib/toast";
import { useOnline } from "@/lib/use-online";
import { cn } from "@/lib/utils";
import { writeErrorMessage } from "@/lib/write-error";

import {
  linesInBs,
  receiptEntries,
  receiveFormSchema,
  receivePending,
  recognizedUsd,
  type ReceiveFormValues,
} from "./receive-form-schema";
import { undoSavedReceipt, useSaveReceipt, type SaveReceiptArgs } from "./save";

export type IncomeToReceive = {
  id: string;
  month: string;
  name: string;
  emoji: string | null;
  expectedUsdCents: number;
};

interface ReceiveFormProps {
  // Lo pone quien abre el formulario, una sola vez: guardar dos veces no duplica (ADR 0008).
  operationId: string;
  income: IncomeToReceive;
  // El plan del mes del ingreso: cuánto le falta a cada sobre.
  plan: BudgetLine[];
  initial: ReceiveFormValues;
  // Al corregir, el cobro como estaba: «Deshacer» lo deja así otra vez.
  previous?: SaveReceiptArgs;
  // Al cobrar, quién lo hace: sin cuenta elegida, abre con la última que usó.
  rememberFor?: string;
  onSaved: () => void;
}

// Cobrar (M9): un ingreso esperado del presupuesto llega a una cuenta y se reparte entre
// los sobres en dólares, como la «Distribución» del Excel. La tasa sale de lo que llegó y
// de los dólares que se reconocen (R8); los Bs de cada línea, de sus dólares a esa tasa,
// y la última se queda con el redondeo (R9).
export function ReceiveForm({
  operationId,
  income,
  plan,
  initial,
  previous,
  rememberFor,
  onSaved,
}: ReceiveFormProps) {
  const online = useOnline();
  const accounts = useAccountBalances();
  const envelopes = useQuery(envelopesQuery);
  const save = useSaveReceipt();
  const accountById = useMemo(
    () => new Map((accounts.data ?? []).map((row) => [row.accountId, row])),
    [accounts.data],
  );
  const currencyOf = (accountId: string) => accountById.get(accountId)?.currency;
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ReceiveFormValues>({
    resolver: zodResolver(receiveFormSchema(currencyOf)),
    defaultValues: initial,
  });
  const lines = useFieldArray({ control, name: "lines" });
  const values = useWatch({ control }) as ReceiveFormValues;

  const remembered = useRef(false);
  useEffect(() => {
    if (remembered.current || !rememberFor || !accounts.data) return;
    remembered.current = true;
    if (getValues("accountId")) return;
    const accountId = rememberedAccount(
      rememberFor,
      accounts.data.map((row) => row.accountId),
    );
    if (accountId) setValue("accountId", accountId);
  }, [accounts.data, getValues, rememberFor, setValue]);

  const account = accountById.get(values.accountId);
  const currency = account?.currency;
  const cells = useQuery({
    ...accountCellsQuery(values.accountId),
    enabled: values.accountId !== "",
  });
  const cellByEnvelope = new Map(cells.data?.map((cell) => [cell.envelopeId, cell.balanceCents]));
  const envelopeById = new Map(envelopes.data?.map((envelope) => [envelope.id, envelope]));
  const planByEnvelope = new Map(plan.map((line) => [line.envelopeId, line]));
  const envelopeOptions = budgetOrder(envelopes.data ?? []);

  const usd = recognizedUsd(values, currency);
  const pending = receivePending(values, currency);
  const bs = currency === "VES" ? linesInBs(values) : [];
  const receivedCents = parseAmountInput(values.received);
  const rate =
    currency === "VES" && receivedCents !== null && usd !== null && usd > 0
      ? formatRate(receivedCents, usd)
      : null;
  const entries = receiptEntries(values, currency) ?? [];
  const previousEntries = (previous?.entries ?? []).filter(
    (entry) => entry.account_id === values.accountId,
  );
  const changes = cells.data ? projectCells(entries, cells.data, previousEntries) : [];

  // Lo que falta en esa línea, sumado a lo que ya tenía.
  const restHere = (index: number) => {
    if (pending === null || pending <= 0) return;
    const current = parseAmountInput(getValues(`lines.${index}.usd`)) ?? 0;
    setValue(`lines.${index}.usd`, amountInputText(current + pending), {
      shouldValidate: Boolean(errors.lines),
    });
  };

  const submit = handleSubmit(async (submitted) => {
    const savedEntries = receiptEntries(submitted, currencyOf(submitted.accountId));
    if (!savedEntries) return;
    try {
      await save.mutateAsync({
        id: operationId,
        incomeId: income.id,
        day: submitted.day,
        description: submitted.description.trim() || income.name,
        entries: savedEntries,
      });
      if (rememberFor) rememberAccount(rememberFor, submitted.accountId);
      showToast({
        message: previous ? "Corrección guardada" : "Cobro guardado",
        detail: `${income.name} queda cobrado${rate ? ` · tasa Bs ${rate}` : ""}`,
        action: { label: "Deshacer", run: undoSavedReceipt(operationId, previous) },
      });
      onSaved();
    } catch {
      // `save.error` lo dice debajo del botón.
    }
  });

  const toggleFee = () => {
    if (getValues("hasFee")) {
      setValue("hasFee", false);
      return;
    }
    if (!getValues("fee.envelopeId")) setValue("fee.envelopeId", getValues("lines.0.envelopeId"));
    setValue("hasFee", true);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-5">
      <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-raised p-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-heading">
            {income.emoji && <span aria-hidden="true">{income.emoji} </span>}
            {income.name}
          </p>
          <p className="text-caption text-ink-muted">{monthLabel(income.month)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Money cents={income.expectedUsdCents} currency="USD" className="text-amount" />
          <StatusBadge done={false}>Esperado</StatusBadge>
        </div>
      </div>

      <Field label="Cuenta donde llegó" htmlFor="account" error={errors.accountId?.message}>
        <AccountSelect
          id="account"
          accounts={accounts.data ?? []}
          invalid={Boolean(errors.accountId)}
          {...register("accountId")}
        />
      </Field>

      <Field label="Llegó" htmlFor="received" error={errors.received?.message}>
        <AmountInput
          id="received"
          size="hero"
          currency={currency}
          invalid={Boolean(errors.received)}
          // Lo primero es la cifra que llegó: el teclado ya abierto.
          autoFocus={!previous}
          {...register("received")}
        />
      </Field>

      {currency === "VES" && (
        <Field label="Dólares que se reconocen" htmlFor="usd" error={errors.usd?.message}>
          <AmountInput id="usd" currency="USD" invalid={Boolean(errors.usd)} {...register("usd")} />
        </Field>
      )}
      {rate && (
        // La tasa sale de los dos montos y no se guarda (R8).
        <p className="-mt-3 text-caption text-ink-muted">Tasa: Bs {rate} por dólar</p>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="pb-2 text-heading">Reparto en dólares</legend>
        {lines.fields.map((field, index) => {
          const error = errors.lines?.[index];
          const envelopeId = values.lines[index]?.envelopeId ?? "";
          const planned = planByEnvelope.get(envelopeId);
          // Lo que le faltaba antes de este cobro: lo planeado menos lo que ya recibió.
          const lacked = planned
            ? Math.max(planned.plannedUsdCents - planned.allocatedUsdCents, 0)
            : null;
          return (
            <div key={field.id} className="flex flex-col gap-2 rounded-lg bg-surface-raised p-3">
              <div className="flex items-center gap-1">
                <span className="min-w-0 flex-1">
                  <EnvelopeSelect
                    aria-label={`Sobre ${index + 1}`}
                    envelopes={envelopeOptions}
                    account={account}
                    cellByEnvelope={cellByEnvelope}
                    invalid={Boolean(error?.envelopeId)}
                    {...register(`lines.${index}.envelopeId`)}
                  />
                </span>
                {lines.fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Quitar el sobre ${index + 1}`}
                    onClick={() => lines.remove(index)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1">
                  <AmountInput
                    aria-label={`Dólares para el sobre ${index + 1}`}
                    currency="USD"
                    invalid={Boolean(error?.usd)}
                    {...register(`lines.${index}.usd`)}
                  />
                </span>
                {pending !== null && pending > 0 && (
                  <Button type="button" variant="outline" onClick={() => restHere(index)}>
                    Resto aquí
                  </Button>
                )}
              </div>
              <p className="flex flex-wrap justify-between gap-x-3 text-caption text-ink-muted">
                <span>
                  {planned
                    ? lacked === 0
                      ? "Del plan: ya estaba entregado"
                      : `Del plan: le faltaban ${formatMoney(lacked ?? 0, "USD")}`
                    : envelopeId
                      ? "No está en el plan del mes"
                      : ""}
                </span>
                {currency === "VES" && (bs[index] ?? 0) > 0 && (
                  <span className="tabular-nums">{formatMoney(bs[index] ?? 0, "VES")}</span>
                )}
              </p>
              {(error?.envelopeId ?? error?.usd) && (
                <p className="text-body text-destructive">
                  {error?.envelopeId?.message ?? error?.usd?.message}
                </p>
              )}
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          onClick={() => lines.append({ envelopeId: "", usd: "" })}
        >
          Agregar otro sobre
        </Button>
        {pending !== null && (
          <p className="flex justify-between gap-3 px-1 text-body">
            <span>
              {pending > 0
                ? "Falta por repartir"
                : pending < 0
                  ? "Repartido de más"
                  : "Todo repartido"}
            </span>
            {pending !== 0 && (
              <Money
                cents={Math.abs(pending)}
                currency="USD"
                className={cn("text-amount", pending < 0 && "text-destructive")}
              />
            )}
          </p>
        )}
        {errors.lines?.root?.message && (
          <p className="px-1 text-body text-destructive">{errors.lines.root.message}</p>
        )}
      </fieldset>

      {account && <Remaining changes={changes} envelopeById={envelopeById} account={account} />}

      <DayField
        value={values.day}
        today={today()}
        onChange={(day) => setValue("day", day, { shouldValidate: Boolean(errors.day) })}
        dateInput={register("day")}
        error={errors.day?.message}
      />

      <Field label="Concepto" htmlFor="description">
        <Input
          id="description"
          autoComplete="off"
          placeholder={income.name}
          {...register("description")}
        />
      </Field>

      {values.hasFee ? (
        <fieldset className="flex flex-col gap-4 rounded-lg bg-surface-raised p-4">
          <legend className="sr-only">Comisión</legend>
          <div className="flex items-center justify-between gap-3">
            <span className="text-heading">Comisión</span>
            <Button type="button" variant="ghost" onClick={toggleFee}>
              Quitar
            </Button>
          </div>
          <Field
            label="Monto de la comisión"
            htmlFor="fee-amount"
            error={errors.fee?.amount?.message}
          >
            <AmountInput
              id="fee-amount"
              currency={currency}
              invalid={Boolean(errors.fee?.amount)}
              {...register("fee.amount")}
            />
          </Field>
          <Field label="Sale del sobre" htmlFor="fee-envelope">
            <EnvelopeSelect
              id="fee-envelope"
              envelopes={envelopeOptions}
              account={account}
              cellByEnvelope={cellByEnvelope}
              invalid={false}
              {...register("fee.envelopeId")}
            />
          </Field>
          <Field label="Concepto de la comisión" htmlFor="fee-description">
            <Input
              id="fee-description"
              autoComplete="off"
              placeholder={FEE_DESCRIPTION}
              {...register("fee.description")}
            />
          </Field>
        </fieldset>
      ) : (
        <Button type="button" variant="link" className="self-start px-0" onClick={toggleFee}>
          Agregar comisión
        </Button>
      )}

      {/* Pegado abajo, y encima del teclado cuando está abierto, como en Registrar. */}
      <div className="sticky bottom-0 -mx-4 mt-auto flex flex-col gap-2 border-t border-hairline bg-surface px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)_+_0.75rem)]">
        {save.error && (
          <p role="alert" className="text-body text-destructive">
            No se guardó. {writeErrorMessage(save.error)}
          </p>
        )}
        {!online && (
          <p className="text-caption text-ink-muted">
            Sin conexión no se puede cobrar: guárdalo cuando haya red.
          </p>
        )}
        <Button type="submit" disabled={!online || isSubmitting}>
          {isSubmitting
            ? "Guardando…"
            : `${previous ? "Guardar corrección" : "Guardar cobro"}${
                currency && receivedCents ? ` · ${formatMoney(receivedCents, currency)}` : ""
              }`}
        </Button>
      </div>
    </form>
  );
}
