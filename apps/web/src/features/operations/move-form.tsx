import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { AmountInput } from "@/components/amount-field";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Segmented } from "@/components/ui/segmented";
import { accountCellsQuery } from "@/features/accounts/queries";
import { useAccountBalances } from "@/features/balances/use-account-balances";
import {
  envelopesQuery,
  envelopeUsageQuery,
  type EnvelopeUsage,
} from "@/features/envelopes/queries";
import { parseAmountInput } from "@/lib/amount-input";
import { CURRENCY_NAMES, formatMoney, formatRate, type Currency } from "@/lib/money";
import { addDays, today } from "@/lib/months";
import { showToast } from "@/lib/toast";
import { useOnline } from "@/lib/use-online";
import { writeErrorMessage } from "@/lib/write-error";

import { DayField } from "./day-field";
import { budgetOrder, envelopeOrder } from "./envelope-order";
import { EnvelopePicker } from "./envelope-picker";
import { EnvelopeSelect } from "./envelope-select";
import { rememberAccount, rememberedAccount } from "./last-account";
import { moveEntries, moveKind, type MoveKind } from "./move-draft";
import {
  defaultMoveDescription,
  formMoveKind,
  moveDraft,
  moveFormSchema,
  type Carry,
  type MoveFormValues,
} from "./move-form-schema";
import { projectCells, type EntryInput, type OperationKind } from "./operation-draft";
import { FEE_DESCRIPTION } from "./operation-form-schema";
import { Remaining } from "./remaining";
import { undoSavedOperation, useSaveOperation, type SaveOperationArgs } from "./save";

// Los mismos días que en Registrar para ordenar los sobres por uso.
const USAGE_DAYS = 60;

const TYPES: { value: OperationKind | "move"; label: string }[] = [
  { value: "expense", label: "Gasto" },
  { value: "income", label: "Ingreso" },
  { value: "move", label: "Mover" },
];

// Cómo se llama lo que va saliendo, para que se vea qué se va a guardar.
const KIND_NAMES: Record<MoveKind, { title: string; save: string; saved: string }> = {
  envelope_transfer: {
    title: "Entre sobres de la misma cuenta",
    save: "Guardar movimiento",
    saved: "Movimiento guardado",
  },
  account_transfer: {
    title: "Traspaso entre cuentas",
    save: "Guardar traspaso",
    saved: "Traspaso guardado",
  },
  exchange: { title: "Cambio de divisa", save: "Guardar cambio", saved: "Cambio guardado" },
};

const CURRENCIES: Currency[] = ["VES", "USD"];

interface MoveFormProps {
  // Lo pone quien abre el formulario, una sola vez: guardar dos veces no duplica (ADR 0008).
  operationId: string;
  initial: MoveFormValues;
  // Al corregir, la operación como estaba: «Deshacer» la deja así otra vez.
  previous?: SaveOperationArgs;
  // Al registrar, quién lo hace: sin cuenta elegida, abre con la última que usó.
  rememberFor?: string;
  // Al registrar, volver a Gasto o Ingreso con lo ya escrito.
  onKind?: (kind: OperationKind, carry: Carry) => void;
  onSaved: () => void;
}

// Mover (M8): lo que pasa de un sobre a otro, de una cuenta a otra o de una moneda a otra,
// sin gastarse. Se dice de dónde sale y adónde llega, y el tipo lo deduce la app. Antes
// de guardar enseña cómo quedan los dos sobres; un descubierto se guarda igual (R6).
export function MoveForm({
  operationId,
  initial,
  previous,
  rememberFor,
  onKind,
  onSaved,
}: MoveFormProps) {
  const online = useOnline();
  const accounts = useAccountBalances();
  const envelopes = useQuery(envelopesQuery);
  const save = useSaveOperation();
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
  } = useForm<MoveFormValues>({
    resolver: zodResolver(moveFormSchema(currencyOf)),
    defaultValues: initial,
  });
  const values = useWatch({ control }) as MoveFormValues;

  // La cuenta de destino sigue a la de origen hasta que se cambia a mano.
  const [toTouched, setToTouched] = useState(initial.toAccount !== initial.fromAccount);
  const remembered = useRef(false);
  useEffect(() => {
    if (remembered.current || !rememberFor || !accounts.data) return;
    remembered.current = true;
    if (getValues("fromAccount")) return;
    const accountId = rememberedAccount(
      rememberFor,
      accounts.data.map((row) => row.accountId),
    );
    if (!accountId) return;
    setValue("fromAccount", accountId);
    setValue("toAccount", accountId);
  }, [accounts.data, getValues, rememberFor, setValue]);

  const fromAccount = accountById.get(values.fromAccount);
  const toAccount = accountById.get(values.toAccount);
  const fromCells = useQuery({
    ...accountCellsQuery(values.fromAccount),
    enabled: values.fromAccount !== "",
  });
  const toCells = useQuery({
    ...accountCellsQuery(values.toAccount),
    enabled: values.toAccount !== "",
  });
  const cellMap = (cells: { envelopeId: string; balanceCents: number }[] | undefined) =>
    new Map(cells?.map((cell) => [cell.envelopeId, cell.balanceCents]));
  const envelopeById = new Map(envelopes.data?.map((envelope) => [envelope.id, envelope]));

  // Cuánto se usa cada sobre, fijado al abrir: que no salten mientras se elige.
  const [since] = useState(() => addDays(today(), -USAGE_DAYS));
  const usage = useQuery(envelopeUsageQuery(since));
  const [frozenUsage, setFrozenUsage] = useState<EnvelopeUsage[] | null>(null);
  if (frozenUsage === null && usage.data) setFrozenUsage(usage.data);
  const fromOrder = envelopeOrder(envelopes.data ?? [], frozenUsage ?? [], values.fromAccount);
  const toOrder = envelopeOrder(envelopes.data ?? [], frozenUsage ?? [], values.toAccount);

  const kind = formMoveKind(values, currencyOf);
  const draft = moveDraft(values, currencyOf);
  const entries = draft ? moveEntries(draft) : [];
  // Los asientos de antes en una cuenta: los de otra no tocan sus sobres.
  const previousEntries = (accountId: string): EntryInput[] =>
    (previous?.entries ?? []).filter((entry) => entry.account_id === accountId);
  const changesIn = (accountId: string, cells: typeof fromCells.data) =>
    cells
      ? projectCells(
          entries.filter((entry) => entry.account_id === accountId),
          cells,
          previousEntries(accountId),
        )
      : [];
  const twoAccounts = values.fromAccount !== values.toAccount;
  const fromChanges = changesIn(values.fromAccount, fromCells.data);
  const toChanges = twoAccounts ? changesIn(values.toAccount, toCells.data) : [];

  const carry = (): Carry => ({
    amount: getValues("amount"),
    accountId: getValues("fromAccount"),
    day: getValues("day"),
    description: getValues("description"),
  });

  const names = () => ({
    fromAccount: fromAccount?.name ?? "",
    toAccount: toAccount?.name ?? "",
    fromEnvelope: envelopeById.get(values.fromEnvelope)?.name ?? "",
    toEnvelope: envelopeById.get(values.toEnvelope)?.name ?? "",
  });

  const submit = handleSubmit(async (submitted) => {
    const saved = moveDraft(submitted, currencyOf);
    if (!saved) return;
    const savedKind = moveKind(saved.from, saved.to);
    const savedEntries = moveEntries(saved);
    try {
      await save.mutateAsync({
        id: operationId,
        kind: savedKind,
        day: submitted.day,
        description: submitted.description.trim() || defaultMoveDescription(savedKind, names()),
        entries: savedEntries,
      });
      if (rememberFor) rememberAccount(rememberFor, submitted.fromAccount);
      // Cómo quedó el sobre que recibe, con los saldos de antes de guardar.
      const arrived = (twoAccounts ? toCells.data : fromCells.data) ?? [];
      const toChange = projectCells(
        savedEntries.filter((entry) => entry.account_id === submitted.toAccount),
        arrived,
        previousEntries(submitted.toAccount),
      ).find((change) => change.envelopeId === submitted.toEnvelope);
      const toEnvelope = envelopeById.get(submitted.toEnvelope);
      showToast({
        message: previous ? "Corrección guardada" : KIND_NAMES[savedKind].saved,
        detail:
          toChange && toEnvelope && toAccount
            ? `${toEnvelope.emoji ? `${toEnvelope.emoji} ` : ""}${toEnvelope.name} queda en ${formatMoney(toChange.afterCents, toAccount.currency)}`
            : undefined,
        action: { label: "Deshacer", run: undoSavedOperation(operationId, previous) },
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
    // La comisión sale, si no se cambia, del mismo sobre de donde sale el dinero.
    if (!getValues("fee.envelopeId")) setValue("fee.envelopeId", getValues("fromEnvelope"));
    setValue("hasFee", true);
  };

  const amountCents = parseAmountInput(values.amount) ?? 0;
  const arrivedCents = parseAmountInput(values.arrived);
  const rate =
    kind === "exchange" && fromAccount && arrivedCents !== null && amountCents > 0
      ? fromAccount.currency === "USD"
        ? formatRate(arrivedCents, amountCents)
        : formatRate(amountCents, arrivedCents)
      : null;
  const envelopeOptions = budgetOrder(envelopes.data ?? []);
  const accountOptions = (props: React.ComponentProps<"select"> & { invalid: boolean }) => {
    const { invalid, ...rest } = props;
    return (
      <NativeSelect aria-invalid={invalid ? true : undefined} {...rest}>
        <option value="">Elige la cuenta</option>
        {CURRENCIES.map((currency) => (
          <optgroup key={currency} label={CURRENCY_NAMES[currency]}>
            {(accounts.data ?? [])
              .filter((row) => row.currency === currency)
              .map((row) => (
                <option key={row.accountId} value={row.accountId}>
                  {row.name}
                </option>
              ))}
          </optgroup>
        ))}
      </NativeSelect>
    );
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-5">
      {onKind && (
        <Segmented
          label="Tipo"
          options={TYPES}
          value="move"
          onChange={(type) => type !== "move" && onKind(type, carry())}
        />
      )}

      <Field label="Monto" htmlFor="amount" error={errors.amount?.message}>
        <AmountInput
          id="amount"
          size="hero"
          currency={fromAccount?.currency}
          invalid={Boolean(errors.amount)}
          // Al registrar, lo primero es la cifra: el teclado ya abierto.
          autoFocus={!previous && !initial.amount}
          {...register("amount")}
        />
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="pb-2 text-heading">Sale de</legend>
        <Field label="Cuenta" htmlFor="from-account" error={errors.fromAccount?.message}>
          {accountOptions({
            id: "from-account",
            invalid: Boolean(errors.fromAccount),
            ...register("fromAccount", {
              onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                if (!toTouched) setValue("toAccount", event.target.value);
              },
            }),
          })}
        </Field>
        <EnvelopePicker
          id="from-envelope"
          label="Sobre"
          top={fromOrder.top}
          rest={fromOrder.rest}
          value={values.fromEnvelope}
          onChange={(envelopeId) =>
            setValue("fromEnvelope", envelopeId, { shouldValidate: Boolean(errors.fromEnvelope) })
          }
          cellByEnvelope={cellMap(fromCells.data)}
          currency={fromAccount?.currency}
          error={errors.fromEnvelope?.message}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="pb-2 text-heading">Llega a</legend>
        <Field label="Cuenta" htmlFor="to-account" error={errors.toAccount?.message}>
          {accountOptions({
            id: "to-account",
            invalid: Boolean(errors.toAccount),
            ...register("toAccount", { onChange: () => setToTouched(true) }),
          })}
        </Field>
        {kind && <p className="text-caption text-ink-muted">{KIND_NAMES[kind].title}</p>}
        <EnvelopePicker
          id="to-envelope"
          label="Sobre"
          top={toOrder.top}
          rest={toOrder.rest}
          value={values.toEnvelope}
          onChange={(envelopeId) =>
            setValue("toEnvelope", envelopeId, { shouldValidate: Boolean(errors.toEnvelope) })
          }
          cellByEnvelope={cellMap(toCells.data)}
          currency={toAccount?.currency}
          error={errors.toEnvelope?.message}
        />
        {kind === "exchange" && (
          <Field label="Llega" htmlFor="arrived" error={errors.arrived?.message}>
            <AmountInput
              id="arrived"
              currency={toAccount?.currency}
              invalid={Boolean(errors.arrived)}
              {...register("arrived")}
            />
          </Field>
        )}
        {rate && (
          // La tasa sale de los dos montos y no se guarda, como la de un cobro (R8).
          <p className="text-caption text-ink-muted">Tasa: Bs {rate} por dólar</p>
        )}
      </fieldset>

      {fromAccount && (
        <Remaining
          changes={fromChanges}
          envelopeById={envelopeById}
          account={fromAccount}
          showAccount={twoAccounts}
        />
      )}
      {toAccount && twoAccounts && (
        <Remaining
          changes={toChanges}
          envelopeById={envelopeById}
          account={toAccount}
          showAccount
        />
      )}

      <Field label="Concepto" htmlFor="description">
        <Input
          id="description"
          autoComplete="off"
          // Sin concepto, se guarda uno como el del Excel: «De Comida a Ahorro».
          placeholder={
            kind && values.fromEnvelope && values.toEnvelope
              ? defaultMoveDescription(kind, names())
              : undefined
          }
          {...register("description")}
        />
      </Field>

      <DayField
        value={values.day}
        today={today()}
        onChange={(day) => setValue("day", day, { shouldValidate: Boolean(errors.day) })}
        dateInput={register("day")}
        error={errors.day?.message}
      />

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
              currency={fromAccount?.currency}
              invalid={Boolean(errors.fee?.amount)}
              {...register("fee.amount")}
            />
          </Field>
          <Field label="Sale del sobre" htmlFor="fee-envelope">
            <EnvelopeSelect
              id="fee-envelope"
              envelopes={envelopeOptions}
              account={fromAccount}
              cellByEnvelope={cellMap(fromCells.data)}
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
            Sin conexión no se puede registrar: guárdalo cuando haya red.
          </p>
        )}
        <Button type="submit" disabled={!online || isSubmitting}>
          {isSubmitting
            ? "Guardando…"
            : `${previous ? "Guardar corrección" : KIND_NAMES[kind ?? "envelope_transfer"].save}${
                fromAccount && amountCents > 0
                  ? ` · ${formatMoney(amountCents, fromAccount.currency)}`
                  : ""
              }`}
        </Button>
      </div>
    </form>
  );
}
