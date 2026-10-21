import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { AmountInput } from "@/components/amount-field";
import { EnvelopeChip } from "@/components/envelope-chip";
import { Field } from "@/components/field";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Segmented } from "@/components/ui/segmented";
import { accountCellsQuery } from "@/features/accounts/queries";
import { useAccountBalances } from "@/features/balances/use-account-balances";
import {
  conceptUsageQuery,
  envelopesQuery,
  envelopeUsageQuery,
  type EnvelopeUsage,
} from "@/features/envelopes/queries";
import { amountInputText, parseAmountInput } from "@/lib/amount-input";
import { CURRENCY_NAMES, formatMoney, type Currency } from "@/lib/money";
import { addDays, today } from "@/lib/months";
import { showToast } from "@/lib/toast";
import { useOnline } from "@/lib/use-online";
import { cn } from "@/lib/utils";
import { writeErrorMessage } from "@/lib/write-error";

import { conceptSuggestions, type ConceptSuggestion } from "./concept-suggestions";
import { DayField } from "./day-field";
import { budgetOrder, envelopeOrder } from "./envelope-order";
import { EnvelopePicker } from "./envelope-picker";
import { EnvelopeSelect } from "./envelope-select";
import { rememberAccount, rememberedAccount } from "./last-account";
import { draftEntries, projectCells, type EntryInput, type OperationKind } from "./operation-draft";
import {
  FEE_DESCRIPTION,
  formDraft,
  operationFormSchema,
  splitPending,
  type OperationFormValues,
} from "./operation-form-schema";
import { undoSavedOperation, useSaveOperation, type SaveOperationArgs } from "./save";
import type { Carry } from "./move-form-schema";
import { Remaining } from "./remaining";
import { savedDetail } from "./saved-detail";

// Cuántos días atrás se mira para ordenar los sobres por uso: unos dos meses.
const USAGE_DAYS = 60;
// Y para proponer conceptos: medio año, para que salgan también los de cada tanto.
const CONCEPT_DAYS = 180;

const KINDS: { value: OperationKind | "move"; label: string }[] = [
  { value: "expense", label: "Gasto" },
  { value: "income", label: "Ingreso" },
];

// Al registrar, la tercera opción: lo que se mueve sin gastarse (M8).
const MOVE = { value: "move" as const, label: "Mover" };

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
  // Al registrar, pasar a Mover con lo ya escrito.
  onMove?: (carry: Carry) => void;
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
  onMove,
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
  const envelopeOptions = budgetOrder(envelopes.data ?? []);
  // Cuánto se usa cada sobre, fijado al abrir: que no salten mientras se elige (M7).
  const [since] = useState(() => addDays(today(), -USAGE_DAYS));
  const usage = useQuery(envelopeUsageQuery(since));
  const [frozenUsage, setFrozenUsage] = useState<EnvelopeUsage[] | null>(null);
  if (frozenUsage === null && usage.data) setFrozenUsage(usage.data);
  const order = envelopeOrder(envelopes.data ?? [], frozenUsage ?? [], values.accountId);
  // Los conceptos de antes, para proponerlos al escribir con su sobre (M7).
  const [conceptsSince] = useState(() => addDays(today(), -CONCEPT_DAYS));
  const concepts = useQuery(conceptUsageQuery(conceptsSince));
  // El concepto que se eligió de las sugerencias: mientras no se cambie, no se proponen más.
  const [pickedConcept, setPickedConcept] = useState<string | null>(null);
  const suggestions =
    values.description === pickedConcept
      ? []
      : conceptSuggestions(
          concepts.data ?? [],
          values.description,
          values.kind,
          values.accountId,
        ).filter((suggestion) => envelopeById.has(suggestion.envelopeId));
  // Al aparecer, a la vista: con el teclado abierto quedarían debajo de «Guardar».
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const hasSuggestions = suggestions.length > 0;
  useEffect(() => {
    if (hasSuggestions) suggestionsRef.current?.scrollIntoView({ block: "nearest" });
  }, [hasSuggestions]);
  const pickConcept = (suggestion: ConceptSuggestion) => {
    setValue("description", suggestion.description);
    setPickedConcept(suggestion.description);
    // Con un solo sobre, el del concepto: se ve en la sugerencia y en los botones.
    if (getValues("lines").length === 1) {
      setValue("lines.0.envelopeId", suggestion.envelopeId, {
        shouldValidate: Boolean(errors.lines?.[0]?.envelopeId),
      });
    }
  };

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
  const total = parseAmountInput(values.total) ?? 0;
  const pending = splitPending(values);
  const addLine = () => lines.append({ envelopeId: "", amount: "" });
  // Lo que falta, en el sobre de esa línea, sumado a lo que ya tenía.
  const restHere = (index: number) => {
    if (pending === null || pending <= 0) return;
    const current = parseAmountInput(getValues(`lines.${index}.amount`)) ?? 0;
    setValue(`lines.${index}.amount`, amountInputText(current + pending), {
      shouldValidate: Boolean(errors.lines),
    });
  };
  const saveLabel = previous
    ? "Guardar corrección"
    : values.kind === "expense"
      ? "Guardar gasto"
      : "Guardar ingreso";
  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-5">
      <Segmented
        label="Tipo"
        options={onMove ? [...KINDS, MOVE] : KINDS}
        value={values.kind}
        onChange={(kind) =>
          kind === "move"
            ? onMove?.({
                amount: getValues("total"),
                accountId: getValues("accountId"),
                day: getValues("day"),
                description: getValues("description"),
              })
            : setValue("kind", kind)
        }
      />

      <Field label="Monto" htmlFor="amount" error={errors.total?.message}>
        <AmountInput
          id="amount"
          size="hero"
          currency={account?.currency}
          invalid={Boolean(errors.total)}
          // Al registrar, lo primero es la cifra: el teclado ya abierto.
          autoFocus={!previous && !initial.total}
          {...register("total")}
        />
      </Field>

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
        // Un gasto repartido: cada sobre con su parte, y cuánto falta por repartir.
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
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <AmountInput
                      aria-label={`Monto del sobre ${index + 1}`}
                      currency={account?.currency}
                      invalid={Boolean(error?.amount)}
                      {...register(`lines.${index}.amount`)}
                    />
                  </span>
                  {pending !== null && pending > 0 && (
                    <Button type="button" variant="outline" onClick={() => restHere(index)}>
                      Resto aquí
                    </Button>
                  )}
                </div>
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
          {account && pending !== null && (
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
                  currency={account.currency}
                  className={cn("text-amount", pending < 0 && "text-destructive")}
                />
              )}
            </p>
          )}
          {errors.lines?.root?.message && (
            <p className="px-1 text-body text-destructive">{errors.lines.root.message}</p>
          )}
        </fieldset>
      ) : (
        <div className="flex flex-col gap-1">
          <EnvelopePicker
            top={order.top}
            rest={order.rest}
            value={values.lines[0]?.envelopeId ?? ""}
            onChange={(envelopeId) =>
              setValue("lines.0.envelopeId", envelopeId, {
                shouldValidate: Boolean(lineError?.envelopeId),
              })
            }
            cellByEnvelope={cellByEnvelope}
            currency={account?.currency}
            error={lineError?.envelopeId?.message}
          />
          <Button type="button" variant="link" className="self-start px-0" onClick={addLine}>
            Repartir entre varios sobres
          </Button>
        </div>
      )}

      {account && <Remaining changes={changes} envelopeById={envelopeById} account={account} />}

      <div className="flex flex-col gap-2">
        <Field label="Concepto" htmlFor="description">
          <Input
            id="description"
            autoComplete="off"
            aria-controls={suggestions.length > 0 ? "concept-suggestions" : undefined}
            {...register("description")}
          />
        </Field>
        {suggestions.length > 0 && (
          <ul
            ref={suggestionsRef}
            id="concept-suggestions"
            aria-label="Conceptos de antes"
            // El margen es lo que ocupa «Guardar», pegado abajo.
            className="flex scroll-mb-24 flex-col divide-y divide-hairline overflow-hidden rounded-lg bg-surface-raised"
          >
            {suggestions.map((suggestion) => {
              const envelope = envelopeById.get(suggestion.envelopeId);
              return (
                <li key={suggestion.description}>
                  <button
                    type="button"
                    onClick={() => pickConcept(suggestion)}
                    className="flex min-h-tap w-full items-center justify-between gap-3 px-4 py-2 text-left active:bg-surface-sunken"
                  >
                    <span className="min-w-0 truncate text-body">{suggestion.description}</span>
                    {envelope && (
                      <EnvelopeChip
                        name={envelope.name}
                        emoji={envelope.emoji}
                        isThirdParty={envelope.isThirdParty}
                        className="shrink-0 text-caption"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

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
