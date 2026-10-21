import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { AmountInput } from "@/components/amount-field";
import { EnvelopeChip } from "@/components/envelope-chip";
import { Field } from "@/components/field";
import { List, ListRow } from "@/components/list";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Segmented } from "@/components/ui/segmented";
import { accountCellsQuery } from "@/features/accounts/queries";
import { useAccountBalances, type AccountBalance } from "@/features/balances/use-account-balances";
import { envelopesQuery, type Envelope } from "@/features/envelopes/queries";
import { parseAmountInput } from "@/lib/amount-input";
import { CURRENCY_NAMES, formatMoney, type Currency } from "@/lib/money";
import { today } from "@/lib/months";
import { showToast } from "@/lib/toast";
import { useOnline } from "@/lib/use-online";
import { writeErrorMessage } from "@/lib/write-error";

import { DayField } from "./day-field";
import { rememberAccount, rememberedAccount } from "./last-account";
import { draftEntries, projectCells, type EntryInput, type OperationKind } from "./operation-draft";
import {
  FEE_DESCRIPTION,
  formDraft,
  operationFormSchema,
  type OperationFormValues,
} from "./operation-form-schema";
import { undoSavedOperation, useSaveOperation, type SaveOperationArgs } from "./save";
import { savedDetail } from "./saved-detail";

const KINDS: { value: OperationKind; label: string }[] = [
  { value: "expense", label: "Gasto" },
  { value: "income", label: "Ingreso" },
];

const CURRENCIES: Currency[] = ["VES", "USD"];

interface OperationFormProps {
  // Lo pone quien abre el formulario, una sola vez: guardar dos veces lo mismo corrige
  // en vez de duplicar (ADR 0008).
  operationId: string;
  initial: OperationFormValues;
  // Al corregir, la operación como estaba: sus asientos no cuentan en lo de antes, y
  // «Deshacer» la deja así otra vez.
  previous?: SaveOperationArgs;
  // Solo las cuentas de una moneda: al registrar el pago de una deuda, la suya.
  onlyCurrency?: Currency;
  // Al registrar, quién lo hace: sin cuenta elegida, abre con la última que usó (M7).
  rememberFor?: string;
  onSaved: () => void;
}

// Registrar un gasto o un ingreso: monto, cuenta, sobre, concepto, fecha y, si la
// hubo, la comisión (R16). Antes de guardar enseña cómo queda cada sobre; un
// descubierto se avisa y se guarda igual (R6).
export function OperationForm({
  operationId,
  initial,
  previous,
  onlyCurrency,
  rememberFor,
  onSaved,
}: OperationFormProps) {
  const online = useOnline();
  const accounts = useAccountBalances();
  const envelopes = useQuery(envelopesQuery);
  const save = useSaveOperation();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<OperationFormValues>({
    resolver: zodResolver(operationFormSchema),
    defaultValues: initial,
  });

  const remembered = useRef(false);
  useEffect(() => {
    if (remembered.current || !rememberFor || !accounts.data) return;
    remembered.current = true;
    if (getValues("accountId")) return;
    const usable = accounts.data.filter((row) => !onlyCurrency || row.currency === onlyCurrency);
    const accountId = rememberedAccount(
      rememberFor,
      usable.map((row) => row.accountId),
    );
    if (accountId) setValue("accountId", accountId);
  }, [accounts.data, getValues, onlyCurrency, rememberFor, setValue]);

  const lines = useFieldArray({ control, name: "lines" });
  const values = useWatch({ control }) as OperationFormValues;
  const account = accounts.data?.find((row) => row.accountId === values.accountId);
  const cells = useQuery({
    ...accountCellsQuery(values.accountId),
    enabled: values.accountId !== "",
  });
  const cellByEnvelope = new Map(cells.data?.map((cell) => [cell.envelopeId, cell.balanceCents]));
  // Los asientos de antes en la cuenta elegida: los de otra cuenta no tocan estos sobres.
  const previousEntries = (accountId: string): EntryInput[] =>
    (previous?.entries ?? []).filter((entry) => entry.account_id === accountId);
  const changes = cells.data
    ? projectCells(draftEntries(formDraft(values)), cells.data, previousEntries(values.accountId))
    : [];
  const envelopeById = new Map(envelopes.data?.map((envelope) => [envelope.id, envelope]));
  // En el orden del presupuesto, y «Otro» al final (R11).
  const envelopeOptions = [...(envelopes.data ?? [])].sort(
    (a, b) => Number(a.isThirdParty) - Number(b.isThirdParty) || a.position - b.position,
  );

  const submit = handleSubmit(async (submitted) => {
    const entries = draftEntries(formDraft(submitted));
    try {
      await save.mutateAsync({
        id: operationId,
        kind: submitted.kind,
        day: submitted.day,
        description: submitted.description.trim(),
        entries,
      });
      if (rememberFor) rememberAccount(rememberFor, submitted.accountId);
      // Cómo quedó, con los saldos de antes de guardar: los de después aún no llegaron.
      const savedAccount = accounts.data?.find((row) => row.accountId === submitted.accountId);
      const detail =
        cells.data && savedAccount
          ? savedDetail(
              entries,
              projectCells(entries, cells.data, previousEntries(submitted.accountId)),
              (id) => envelopeById.get(id),
              savedAccount.currency,
            )
          : undefined;
      showToast({
        message: previous
          ? "Corrección guardada"
          : submitted.kind === "expense"
            ? "Gasto guardado"
            : "Ingreso guardado",
        detail,
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
    // La comisión sale, si no se cambia, del mismo sobre que el gasto.
    if (!getValues("fee.envelopeId")) setValue("fee.envelopeId", getValues("lines.0.envelopeId"));
    setValue("hasFee", true);
  };

  const lineError = errors.lines?.[0];
  const split = lines.fields.length > 1;
  const total = values.lines.reduce((sum, line) => sum + (parseAmountInput(line.amount) ?? 0), 0);
  const addLine = () => lines.append({ envelopeId: "", amount: "" });
  const saveLabel = previous
    ? "Guardar corrección"
    : values.kind === "expense"
      ? "Guardar gasto"
      : "Guardar ingreso";
  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-5">
      <Segmented
        label="Tipo"
        options={KINDS}
        value={values.kind}
        onChange={(kind) => setValue("kind", kind)}
      />

      {!split && (
        <Field label="Monto" htmlFor="amount" error={lineError?.amount?.message}>
          <AmountInput
            id="amount"
            size="hero"
            currency={account?.currency}
            invalid={Boolean(lineError?.amount)}
            // Al registrar, lo primero es la cifra: el teclado ya abierto.
            autoFocus={!previous && !initial.lines[0]?.amount}
            {...register("lines.0.amount")}
          />
        </Field>
      )}

      <Field label="Cuenta" htmlFor="account" error={errors.accountId?.message}>
        <NativeSelect
          id="account"
          aria-invalid={errors.accountId ? true : undefined}
          {...register("accountId")}
        >
          <option value="">Elige la cuenta</option>
          {CURRENCIES.filter((currency) => !onlyCurrency || currency === onlyCurrency).map(
            (currency) => (
              <optgroup key={currency} label={CURRENCY_NAMES[currency]}>
                {(accounts.data ?? [])
                  .filter((row) => row.currency === currency)
                  .map((row) => (
                    <option key={row.accountId} value={row.accountId}>
                      {row.name}
                    </option>
                  ))}
              </optgroup>
            ),
          )}
        </NativeSelect>
      </Field>

      {split ? (
        // Un gasto repartido: cada sobre con su parte, y el total debajo.
        <fieldset className="flex flex-col gap-3">
          <legend className="pb-2 text-body font-medium">Sobres</legend>
          {lines.fields.map((field, index) => {
            const error = errors.lines?.[index];
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Quitar el sobre ${index + 1}`}
                    onClick={() => lines.remove(index)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
                <AmountInput
                  aria-label={`Monto del sobre ${index + 1}`}
                  currency={account?.currency}
                  invalid={Boolean(error?.amount)}
                  {...register(`lines.${index}.amount`)}
                />
                {(error?.envelopeId ?? error?.amount) && (
                  <p className="text-body text-destructive">
                    {error?.envelopeId?.message ?? error?.amount?.message}
                  </p>
                )}
              </div>
            );
          })}
          <Button type="button" variant="outline" onClick={addLine}>
            Agregar otro sobre
          </Button>
          {account && (
            <p className="flex justify-between px-1 text-body">
              <span>Total</span>
              <Money cents={total} currency={account.currency} className="text-amount" />
            </p>
          )}
        </fieldset>
      ) : (
        <div className="flex flex-col gap-1">
          <Field label="Sobre" htmlFor="envelope" error={lineError?.envelopeId?.message}>
            <EnvelopeSelect
              id="envelope"
              envelopes={envelopeOptions}
              account={account}
              cellByEnvelope={cellByEnvelope}
              invalid={Boolean(lineError?.envelopeId)}
              {...register("lines.0.envelopeId")}
            />
          </Field>
          <Button type="button" variant="link" className="self-start px-0" onClick={addLine}>
            Repartir entre varios sobres
          </Button>
        </div>
      )}

      <Field label="Concepto" htmlFor="description">
        <Input id="description" autoComplete="off" {...register("description")} />
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
              currency={account?.currency}
              invalid={Boolean(errors.fee?.amount)}
              {...register("fee.amount")}
            />
          </Field>
          <Field
            label="Sale del sobre"
            htmlFor="fee-envelope"
            error={errors.fee?.envelopeId?.message}
          >
            <EnvelopeSelect
              id="fee-envelope"
              envelopes={envelopeOptions}
              account={account}
              cellByEnvelope={cellByEnvelope}
              invalid={Boolean(errors.fee?.envelopeId)}
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

      {account && changes.length > 0 && (
        <section aria-labelledby="changes-title" className="flex flex-col gap-2">
          <h2 id="changes-title" className="text-heading">
            Cómo queda en {account.name}
          </h2>
          <List>
            {changes.map((change) => {
              const envelope = envelopeById.get(change.envelopeId);
              return (
                <ListRow key={change.envelopeId}>
                  <span className="flex min-w-0 flex-col items-start gap-1">
                    {envelope && (
                      <EnvelopeChip
                        name={envelope.name}
                        emoji={envelope.emoji}
                        isThirdParty={envelope.isThirdParty}
                        className="text-body"
                      />
                    )}
                    {change.afterCents < 0 && <Badge variant="overdrawn">Descubierto</Badge>}
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="text-caption text-ink-muted">
                      Ahora <Money cents={change.beforeCents} currency={account.currency} />
                    </span>
                    <Money
                      cents={change.afterCents}
                      currency={account.currency}
                      className="text-amount"
                    />
                  </span>
                </ListRow>
              );
            })}
          </List>
          {changes.some((change) => change.afterCents < 0) && (
            <p className="px-1 text-caption text-ink-muted">
              Se puede guardar igual: el descubierto se cubre después.
            </p>
          )}
        </section>
      )}

      {/* Pegado abajo mientras se baja por el formulario, y encima del teclado cuando
          está abierto (`interactive-widget` en index.html): siempre se alcanza. */}
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
            : `${saveLabel}${account && total > 0 ? ` · ${formatMoney(total, account.currency)}` : ""}`}
        </Button>
      </div>
    </form>
  );
}

// Los sobres en el orden del presupuesto, cada uno con lo que tiene en la cuenta elegida.
function EnvelopeSelect({
  envelopes,
  account,
  cellByEnvelope,
  invalid,
  ...props
}: React.ComponentProps<"select"> & {
  envelopes: Envelope[];
  account: AccountBalance | undefined;
  cellByEnvelope: Map<string, number>;
  invalid: boolean;
}) {
  return (
    <NativeSelect aria-invalid={invalid ? true : undefined} {...props}>
      <option value="">Elige el sobre</option>
      {envelopes.map((envelope) => {
        const cents = cellByEnvelope.get(envelope.id);
        const name =
          envelope.emoji && !envelope.isThirdParty
            ? `${envelope.emoji} ${envelope.name}`
            : envelope.name;
        return (
          <option key={envelope.id} value={envelope.id}>
            {account && cents !== undefined
              ? `${name} · ${formatMoney(cents, account.currency)}`
              : name}
          </option>
        );
      })}
    </NativeSelect>
  );
}
