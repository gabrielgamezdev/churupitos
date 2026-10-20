import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
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
import { CURRENCY_NAMES, formatMoney, type Currency } from "@/lib/money";
import { useOnline } from "@/lib/use-online";

import { parseAmountInput } from "./amount-input";
import { draftEntries, projectCells, type EntryInput, type OperationKind } from "./operation-draft";
import {
  FEE_DESCRIPTION,
  formDraft,
  operationFormSchema,
  type OperationFormValues,
} from "./operation-form-schema";
import { useSaveOperation, writeErrorMessage } from "./save";

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
  // Al corregir, los asientos que la operación ya tenía: no cuentan en lo de antes.
  previousEntries?: EntryInput[];
  onSaved: () => void;
}

// Registrar un gasto o un ingreso: monto, cuenta, sobre, concepto, fecha y, si la
// hubo, la comisión (R16). Antes de guardar enseña cómo queda cada sobre; un
// descubierto se avisa y se guarda igual (R6).
export function OperationForm({
  operationId,
  initial,
  previousEntries = [],
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

  const lines = useFieldArray({ control, name: "lines" });
  const values = useWatch({ control }) as OperationFormValues;
  const account = accounts.data?.find((row) => row.accountId === values.accountId);
  const cells = useQuery({
    ...accountCellsQuery(values.accountId),
    enabled: values.accountId !== "",
  });
  const cellByEnvelope = new Map(cells.data?.map((cell) => [cell.envelopeId, cell.balanceCents]));
  const previous = previousEntries.filter((entry) => entry.account_id === values.accountId);
  const changes = cells.data
    ? projectCells(draftEntries(formDraft(values)), cells.data, previous)
    : [];
  const envelopeById = new Map(envelopes.data?.map((envelope) => [envelope.id, envelope]));
  // En el orden del presupuesto, y «Otro» al final (R11).
  const envelopeOptions = [...(envelopes.data ?? [])].sort(
    (a, b) => Number(a.isThirdParty) - Number(b.isThirdParty) || a.position - b.position,
  );

  const submit = handleSubmit(async (submitted) => {
    try {
      await save.mutateAsync({
        id: operationId,
        kind: submitted.kind,
        day: submitted.day,
        description: submitted.description.trim(),
        entries: draftEntries(formDraft(submitted)),
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
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
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
            currency={account?.currency}
            invalid={Boolean(lineError?.amount)}
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

      <Field label="Fecha" htmlFor="day" error={errors.day?.message}>
        <Input id="day" type="date" {...register("day")} />
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
        <Button type="button" variant="outline" onClick={toggleFee}>
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

      <div className="flex flex-col gap-2">
        {save.error && (
          <p role="alert" className="text-body text-destructive">
            No se guardó. {writeErrorMessage(save.error)}
          </p>
        )}
        <Button type="submit" disabled={!online || isSubmitting}>
          {isSubmitting ? "Guardando…" : "Guardar"}
        </Button>
        {!online && (
          <p className="text-caption text-ink-muted">
            Sin conexión no se puede registrar: guárdalo cuando haya red.
          </p>
        )}
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
