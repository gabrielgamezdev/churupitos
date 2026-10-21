import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { AmountInput } from "@/components/amount-field";
import { Field } from "@/components/field";
import { List, ListRow } from "@/components/list";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { parseAmountInput } from "@/features/operations/amount-input";
import type { Currency } from "@/lib/money";
import { dayMonthLabel } from "@/lib/months";
import { showToast } from "@/lib/toast";
import { useOnline } from "@/lib/use-online";
import { writeErrorMessage } from "@/lib/write-error";

import {
  debtFormSchema,
  debtRows,
  installmentDates,
  MAX_INSTALLMENTS,
  type DebtFormValues,
  type DebtInput,
  type Every,
} from "./debt-form-schema";
import type { DebtDirection } from "./queries";
import { undoSavedDebts, useSaveDebts } from "./write";

const DIRECTIONS: { value: DebtDirection; label: string }[] = [
  { value: "payable", label: "Lo que deben" },
  { value: "receivable", label: "Lo que les deben" },
];

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: "USD", label: "Dólares" },
  { value: "VES", label: "Bolívares" },
];

const EVERY: { value: Every; label: string }[] = [
  { value: "14d", label: "Cada 14 días" },
  { value: "month", label: "Cada mes" },
];

interface DebtFormProps {
  // Los identificadores, puestos al abrir: guardar dos veces no duplica (ADR 0008). Al
  // agregar, uno por cada cuota posible; al corregir, el de la deuda.
  ids: string[];
  initial: DebtFormValues;
  // Al corregir no hay cuotas: se corrige cada una por su lado.
  allowInstallments: boolean;
  // Al corregir, la deuda como estaba: lo que «Deshacer» vuelve a guardar.
  previous?: DebtInput;
  onSaved: () => void;
}

// Agregar o corregir una deuda: lo que deben o lo que les deben, concepto, monto con su
// moneda y fecha límite. Al agregar, puede ir en cuotas: una deuda por cuota, cada una
// con su fecha, como las compras a cuotas del Excel.
export function DebtForm({ ids, initial, allowInstallments, previous, onSaved }: DebtFormProps) {
  const online = useOnline();
  const save = useSaveDebts();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DebtFormValues>({ resolver: zodResolver(debtFormSchema), defaultValues: initial });
  const values = useWatch({ control }) as DebtFormValues;

  const count = Number(values.count);
  const preview =
    values.inInstallments && values.dueOn && Number.isInteger(count) && count >= 2
      ? installmentDates(values.dueOn, Math.min(count, MAX_INSTALLMENTS), values.every)
      : [];
  const amountCents = parseAmountInput(values.amount);

  const submit = handleSubmit(async (submitted) => {
    const rows = debtRows(submitted, ids);
    try {
      await save.mutateAsync(rows);
      showToast({
        message: previous
          ? "Deuda corregida"
          : rows.length > 1
            ? `${rows.length} cuotas agregadas`
            : "Deuda agregada",
        detail: rows[0]?.description,
        action: { label: "Deshacer", run: undoSavedDebts(rows, previous) },
      });
      onSaved();
    } catch {
      // `save.error` lo dice debajo del botón.
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Segmented
        label="Quién debe"
        options={DIRECTIONS}
        value={values.direction}
        onChange={(direction) => setValue("direction", direction)}
      />

      <Field label="Concepto" htmlFor="description" error={errors.description?.message}>
        <Input
          id="description"
          autoComplete="off"
          placeholder={
            values.direction === "payable" ? "Por ejemplo, cuota de la tienda" : "Quién les debe"
          }
          aria-invalid={errors.description ? true : undefined}
          {...register("description")}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <Segmented
          label="Moneda"
          options={CURRENCIES}
          value={values.currency}
          onChange={(currency) => setValue("currency", currency)}
        />
        <Field
          label={values.inInstallments ? "Monto de cada cuota" : "Monto"}
          htmlFor="amount"
          error={errors.amount?.message}
        >
          <AmountInput
            id="amount"
            currency={values.currency}
            invalid={Boolean(errors.amount)}
            {...register("amount")}
          />
        </Field>
      </div>

      <Field
        label={values.inInstallments ? "Fecha de la primera cuota" : "Fecha límite (si la tiene)"}
        htmlFor="due-on"
        error={errors.dueOn?.message}
      >
        <Input id="due-on" type="date" {...register("dueOn")} />
      </Field>

      {allowInstallments &&
        (values.inInstallments ? (
          <fieldset className="flex flex-col gap-4 rounded-lg bg-surface-raised p-4">
            <legend className="sr-only">Cuotas</legend>
            <div className="flex items-center justify-between gap-3">
              <span className="text-heading">En cuotas</span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setValue("inInstallments", false)}
              >
                Quitar
              </Button>
            </div>
            <Field label="Cuántas cuotas" htmlFor="count" error={errors.count?.message}>
              <Input
                id="count"
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={errors.count ? true : undefined}
                {...register("count")}
              />
            </Field>
            <Segmented
              label="Cada cuánto"
              options={EVERY}
              value={values.every}
              onChange={(every) => setValue("every", every)}
            />
            {preview.length > 0 && (
              <List aria-label="Las cuotas">
                {preview.map((day, i) => (
                  <ListRow key={day}>
                    <span className="text-body">
                      {i + 1}. {dayMonthLabel(day)}
                    </span>
                    {amountCents !== null && (
                      <Money
                        cents={amountCents}
                        currency={values.currency}
                        className="text-amount"
                      />
                    )}
                  </ListRow>
                ))}
              </List>
            )}
          </fieldset>
        ) : (
          <Button type="button" variant="outline" onClick={() => setValue("inInstallments", true)}>
            Agregar en cuotas
          </Button>
        ))}

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
            Sin conexión no se puede guardar: hazlo cuando haya red.
          </p>
        )}
      </div>
    </form>
  );
}
