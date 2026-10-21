import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { AmountInput } from "@/components/amount-field";
import { EnvelopeChip } from "@/components/envelope-chip";
import { Money } from "@/components/money";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { Envelope } from "@/features/envelopes/queries";
import { budgetOrder } from "@/features/operations/envelope-order";
import { usableEnvelopes } from "@/features/operations/usable";
import { formatMoney } from "@/lib/money";
import { monthName } from "@/lib/months";
import { showToast } from "@/lib/toast";
import { useOnline } from "@/lib/use-online";
import { cn } from "@/lib/utils";
import { writeErrorMessage } from "@/lib/write-error";

import {
  fundingNames,
  monthRows,
  planFormSchema,
  planTotals,
  toggleFunding,
  usedActions,
  type PlanFormValues,
} from "./plan-form-schema";
import { undoSavedMonth, useSaveMonth, type SaveMonthArgs } from "./save";

interface PlanFormProps {
  month: string;
  initial: PlanFormValues;
  // El mes como estaba al abrir: «Deshacer» lo deja así otra vez. Sin él, el mes es
  // nuevo, y deshacer lo borra.
  previous?: SaveMonthArgs;
  envelopes: Envelope[];
  onSaved: () => void;
}

// «Planear» (M10): los ingresos esperados del mes y el plan de cada sobre, como la hoja
// PRESUPUESTO del Excel, con el cuadre a la vista (R12 a). El $ de cada sobre, que es lo
// que cambia cada mes, a la vista; la fuente y la acción, plegadas, porque casi nunca
// cambian.
export function PlanForm({ month, initial, previous, envelopes, onSaved }: PlanFormProps) {
  const online = useOnline();
  const save = useSaveMonth();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: initial,
  });
  const incomes = useFieldArray({ control, name: "incomes", keyName: "key" });
  const lines = useFieldArray({ control, name: "lines", keyName: "key" });
  const values = useWatch({ control }) as PlanFormValues;
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [adding, setAdding] = useState("");

  const envelopeById = new Map(envelopes.map((envelope) => [envelope.id, envelope]));
  const planned = new Set(values.lines.map((line) => line.envelopeId));
  const missing = budgetOrder(usableEnvelopes(envelopes)).filter(
    (envelope) => !planned.has(envelope.id),
  );
  // Los nombres de los ingresos del mes, una vez cada uno: los botones de la fuente.
  const names = [...new Set(values.incomes.map((income) => income.name.trim()).filter(Boolean))];
  // Con su emoji, como se escriben en la fuente del Excel («💰 Bono»).
  const labelOf = (name: string) => {
    const emoji = values.incomes.find((income) => income.name.trim() === name)?.emoji;
    return emoji ? `${emoji} ${name}` : name;
  };
  const actions = usedActions(values.lines);
  const { expectedUsdCents, plannedUsdCents, pendingUsdCents } = planTotals(values);

  const toggleOpen = (envelopeId: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(envelopeId)) next.delete(envelopeId);
      else next.add(envelopeId);
      return next;
    });

  const addEnvelope = (envelopeId: string) => {
    if (!envelopeId) return;
    lines.append(
      { envelopeId, usd: "", fundingNote: "", actionNote: "", added: true },
      { focusName: `lines.${values.lines.length}.usd` },
    );
    setOpen((current) => new Set(current).add(envelopeId));
    setAdding("");
  };

  const submit = handleSubmit(async (submitted) => {
    const rows = monthRows(submitted);
    try {
      await save.mutateAsync({ month, ...rows });
      showToast({
        message: previous ? "Plan guardado" : `${capitalized(monthName(month))} preparado`,
        detail:
          pendingUsdCents === 0
            ? "El plan reparte todo lo esperado"
            : `${pendingUsdCents > 0 ? "Falta por planear" : "Planeado de más"}: ${formatMoney(
                Math.abs(pendingUsdCents),
                "USD",
              )}`,
        action: { label: "Deshacer", run: undoSavedMonth(month, previous) },
      });
      onSaved();
    } catch {
      // `save.error` lo dice debajo del botón.
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-6">
      <section aria-labelledby="plan-incomes-title" className="flex flex-col gap-3">
        <h2 id="plan-incomes-title" className="text-heading">
          Ingresos esperados
        </h2>
        {incomes.fields.map((field, index) => {
          const error = errors.incomes?.[index];
          const income = values.incomes[index];
          return (
            <div key={field.key} className="flex flex-col gap-2 rounded-lg bg-surface-raised p-3">
              <div className="flex items-center gap-2">
                {income?.emoji && <span aria-hidden="true">{income.emoji}</span>}
                <Input
                  aria-label={`Ingreso ${index + 1}`}
                  autoComplete="off"
                  placeholder="De dónde viene"
                  className="min-w-0 flex-1"
                  aria-invalid={error?.name ? true : undefined}
                  {...register(`incomes.${index}.name`)}
                />
                {income?.received ? (
                  // Ya tiene su cobro: se cambia, pero no se quita (R19).
                  <StatusBadge done>Cobrado</StatusBadge>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Quitar ${income?.name || `el ingreso ${index + 1}`}`}
                    onClick={() => incomes.remove(index)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                )}
              </div>
              <AmountInput
                aria-label={`Dólares que se esperan de ${income?.name || `el ingreso ${index + 1}`}`}
                currency="USD"
                invalid={Boolean(error?.usd)}
                {...register(`incomes.${index}.usd`)}
              />
              {(error?.name ?? error?.usd) && (
                <p className="text-body text-destructive">
                  {error?.name?.message ?? error?.usd?.message}
                </p>
              )}
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            incomes.append(
              { id: crypto.randomUUID(), name: "", emoji: null, usd: "", received: false },
              { focusName: `incomes.${values.incomes.length}.name` },
            )
          }
        >
          Agregar ingreso
        </Button>
        {errors.incomes?.root?.message && (
          <p className="text-body text-destructive">{errors.incomes.root.message}</p>
        )}
      </section>

      <section aria-labelledby="plan-lines-title" className="flex flex-col gap-3">
        <h2 id="plan-lines-title" className="text-heading">
          El plan
        </h2>
        <ul className="flex flex-col divide-y divide-hairline overflow-hidden rounded-lg bg-surface-raised">
          {lines.fields.map((field, index) => {
            const line = values.lines[index];
            const envelopeId = line?.envelopeId ?? field.envelopeId;
            const envelope = envelopeById.get(envelopeId);
            const error = errors.lines?.[index];
            const expanded = open.has(envelopeId);
            const notes = [line?.fundingNote.trim(), line?.actionNote.trim()].filter(Boolean);
            const chosen = fundingNames(line?.fundingNote ?? "", names);
            return (
              <li key={field.key} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex items-center gap-3">
                  <label htmlFor={`line-${index}`} className="min-w-0 flex-1">
                    <EnvelopeChip
                      name={envelope?.name ?? "Sobre"}
                      emoji={envelope?.emoji}
                      isThirdParty={envelope?.isThirdParty}
                      className={cn("text-body", !envelope?.isThirdParty && "text-ink")}
                    />
                  </label>
                  <span className="w-36 shrink-0">
                    <AmountInput
                      id={`line-${index}`}
                      currency="USD"
                      invalid={Boolean(error?.usd)}
                      {...register(`lines.${index}.usd`)}
                    />
                  </span>
                  {line?.added && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="-mr-2"
                      aria-label={`Quitar ${envelope?.name ?? "el sobre"} del plan`}
                      onClick={() => lines.remove(index)}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  )}
                </div>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`line-${index}-notes`}
                  onClick={() => toggleOpen(envelopeId)}
                  className="-my-1 flex min-h-tap items-center justify-between gap-2 text-left text-caption text-ink-muted"
                >
                  <span className="min-w-0 truncate">
                    {notes.length > 0 ? notes.join(" · ") : "Sin fuente ni acción"}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn("size-4 shrink-0 transition-transform", expanded && "rotate-180")}
                  />
                </button>
                {expanded && (
                  <div id={`line-${index}-notes`} className="flex flex-col gap-4 pb-1">
                    <fieldset className="flex flex-col gap-2">
                      <legend className="pb-2 text-body font-medium">Fuente de fondos</legend>
                      {names.length > 0 && (
                        // Lo que lee la propuesta de Cobrar (M9): qué ingresos llenan el sobre.
                        <div className="flex flex-wrap gap-2">
                          {names.map((name) => (
                            <Chip
                              key={name}
                              pressed={chosen.includes(name)}
                              onClick={() =>
                                setValue(
                                  `lines.${index}.fundingNote`,
                                  toggleFunding(line?.fundingNote ?? "", name, labelOf(name)),
                                )
                              }
                            >
                              {name}
                            </Chip>
                          ))}
                        </div>
                      )}
                      <Input
                        aria-label={`Fuente de fondos de ${envelope?.name ?? "el sobre"}`}
                        autoComplete="off"
                        aria-invalid={error?.fundingNote ? true : undefined}
                        {...register(`lines.${index}.fundingNote`)}
                      />
                    </fieldset>
                    <fieldset className="flex flex-col gap-2">
                      <legend className="pb-2 text-body font-medium">Acción</legend>
                      {actions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {actions.map((action) => (
                            <Chip
                              key={action}
                              pressed={line?.actionNote.trim() === action}
                              onClick={() =>
                                setValue(
                                  `lines.${index}.actionNote`,
                                  line?.actionNote.trim() === action ? "" : action,
                                )
                              }
                            >
                              {action}
                            </Chip>
                          ))}
                        </div>
                      )}
                      <Input
                        aria-label={`Acción de ${envelope?.name ?? "el sobre"}`}
                        autoComplete="off"
                        placeholder="Qué hacer con ese dinero"
                        aria-invalid={error?.actionNote ? true : undefined}
                        {...register(`lines.${index}.actionNote`)}
                      />
                    </fieldset>
                  </div>
                )}
                {(error?.usd ?? error?.fundingNote ?? error?.actionNote) && (
                  <p className="text-body text-destructive">
                    {error?.usd?.message ??
                      error?.fundingNote?.message ??
                      error?.actionNote?.message}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        {missing.length > 0 && (
          // Un sobre que no estaba: entra en $0 y con su fuente abierta, para escribirla.
          <NativeSelect
            aria-label="Agregar un sobre al plan"
            value={adding}
            onChange={(event) => addEnvelope(event.target.value)}
          >
            <option value="">Agregar un sobre al plan</option>
            {missing.map((envelope) => (
              <option key={envelope.id} value={envelope.id}>
                {envelope.emoji && !envelope.isThirdParty
                  ? `${envelope.emoji} ${envelope.name}`
                  : envelope.name}
              </option>
            ))}
          </NativeSelect>
        )}
      </section>

      {/* El cuadre y «Guardar», pegados abajo, como en Registrar. */}
      <div className="sticky bottom-0 -mx-4 mt-auto flex flex-col gap-2 border-t border-hairline bg-surface px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)_+_0.75rem)]">
        <dl className="grid grid-cols-3 gap-2 text-caption text-ink-muted">
          <div className="flex flex-col">
            <dt>Se espera</dt>
            <dd>
              <Money cents={expectedUsdCents} currency="USD" className="text-body text-ink" />
            </dd>
          </div>
          <div className="flex flex-col">
            <dt>Planeado</dt>
            <dd>
              <Money cents={plannedUsdCents} currency="USD" className="text-body text-ink" />
            </dd>
          </div>
          <div className="flex flex-col">
            <dt>
              {pendingUsdCents > 0
                ? "Falta por planear"
                : pendingUsdCents < 0
                  ? "Planeado de más"
                  : "Cuadra"}
            </dt>
            <dd>
              {/* Es un aviso: se puede guardar descuadrado (R12). */}
              <Money
                cents={Math.abs(pendingUsdCents)}
                currency="USD"
                className={cn("text-body", pendingUsdCents === 0 ? "text-ink" : "text-danger")}
              />
            </dd>
          </div>
        </dl>
        {save.error && (
          <p role="alert" className="text-body text-destructive">
            No se guardó. {writeErrorMessage(save.error)}
          </p>
        )}
        {!online && (
          <p className="text-caption text-ink-muted">
            Sin conexión no se puede guardar: hazlo cuando haya red.
          </p>
        )}
        <Button type="submit" disabled={!online || isSubmitting}>
          {isSubmitting
            ? "Guardando…"
            : previous
              ? "Guardar el plan"
              : `Guardar ${monthName(month)}`}
        </Button>
      </div>
    </form>
  );
}

const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Un botón que se elige y se suelta, como los sobres de Registrar.
function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "min-h-tap rounded-md border px-3 text-body",
        pressed ? "border-brand bg-brand-soft text-ink" : "border-line-strong bg-surface-raised",
      )}
    >
      {children}
    </button>
  );
}
