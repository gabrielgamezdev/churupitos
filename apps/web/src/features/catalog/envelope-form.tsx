import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccountBalances } from "@/features/balances/use-account-balances";
import { envelopeCellsQuery, type Envelope } from "@/features/envelopes/queries";
import { formatMoney } from "@/lib/money";
import { showToast } from "@/lib/toast";
import { useOnline } from "@/lib/use-online";
import { writeErrorMessage } from "@/lib/write-error";

import { envelopeUseQuery } from "./queries";
import { RetireActions } from "./retire-actions";
import {
  undoDeletedEnvelope,
  undoSavedEnvelope,
  useDeleteEnvelope,
  useSaveEnvelope,
  type EnvelopeArgs,
} from "./save";

const envelopeFormSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre del sobre.").max(40, "Hasta 40 letras."),
  // Un emoji compuesto (una familia, un oficio) son varios caracteres unidos.
  emoji: z
    .string()
    .trim()
    .refine((value) => [...value].length <= 16, "Un solo emoji."),
});

type EnvelopeFormValues = z.input<typeof envelopeFormSchema>;

interface EnvelopeFormProps {
  // El sobre como está; sin él, uno nuevo.
  envelope?: Envelope;
  onDone: () => void;
}

// Crear un sobre o cambiarle el nombre y el emoji (M11). Debajo, si ya existe, qué hacer
// cuando deja de usarse.
export function EnvelopeForm({ envelope, onDone }: EnvelopeFormProps) {
  const online = useOnline();
  const save = useSaveEnvelope();
  // Una vez al abrir: guardar dos veces lo mismo no duplica (ADR 0008).
  const [id] = useState(() => envelope?.id ?? crypto.randomUUID());
  const previous = envelope && argsOf(envelope);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EnvelopeFormValues>({
    resolver: zodResolver(envelopeFormSchema),
    defaultValues: { name: envelope?.name ?? "", emoji: envelope?.emoji ?? "" },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync({
        id,
        name: values.name.trim(),
        emoji: values.emoji.trim() || null,
        archived: envelope?.archived ?? false,
      });
      showToast({
        message: envelope ? "Sobre guardado" : "Sobre creado",
        action: { label: "Deshacer", run: undoSavedEnvelope(id, previous) },
      });
      onDone();
    } catch {
      // `save.error` lo dice debajo del botón.
    }
  });

  return (
    <div className="flex flex-1 flex-col gap-8">
      <form id="envelope-form" onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field label="Nombre" htmlFor="name" error={errors.name?.message}>
          <Input
            id="name"
            autoComplete="off"
            autoFocus={!envelope}
            aria-invalid={errors.name ? true : undefined}
            {...register("name")}
          />
        </Field>
        {/* «Otro» va sin emoji: se distingue por su borde (R11). */}
        {!envelope?.isThirdParty && (
          <Field label="Emoji" htmlFor="emoji" error={errors.emoji?.message}>
            <Input
              id="emoji"
              autoComplete="off"
              placeholder="🙂"
              className="w-24 text-center"
              aria-invalid={errors.emoji ? true : undefined}
              {...register("emoji")}
            />
          </Field>
        )}
      </form>

      {envelope?.isThirdParty ? (
        <p className="text-body text-ink-muted">
          «Otro» no se archiva ni se borra: es el dinero de otros que pasa por las cuentas.
        </p>
      ) : (
        envelope && <EnvelopeRetire envelope={envelope} onDone={onDone} />
      )}

      {/* Pegado abajo, como en los demás formularios. */}
      <div className="sticky bottom-0 -mx-4 mt-auto flex flex-col gap-2 border-t border-hairline bg-surface px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)_+_0.75rem)]">
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
        <Button type="submit" form="envelope-form" disabled={!online || isSubmitting}>
          {isSubmitting ? "Guardando…" : envelope ? "Guardar" : "Crear el sobre"}
        </Button>
      </div>
    </div>
  );
}

const argsOf = (envelope: Envelope): EnvelopeArgs => ({
  id: envelope.id,
  name: envelope.name,
  emoji: envelope.emoji,
  archived: envelope.archived,
});

// Archivar, reactivar o borrar el sobre como está guardado, no como se está escribiendo.
function EnvelopeRetire({ envelope, onDone }: { envelope: Envelope; onDone: () => void }) {
  const use = useQuery(envelopeUseQuery(envelope.id));
  const cells = useQuery(envelopeCellsQuery(envelope.id));
  const accounts = useAccountBalances();
  const save = useSaveEnvelope();
  const remove = useDeleteEnvelope();
  if (!use.data || !cells.data || !accounts.data) return null;

  const current = argsOf(envelope);
  const accountName = (id: string) =>
    accounts.data.find((account) => account.accountId === id)?.name ?? "otra cuenta";
  const withMoney = cells.data.filter((cell) => cell.balanceCents !== 0);
  const blockedBy =
    withMoney.length > 0
      ? `Tiene ${withMoney
          .map(
            (cell) =>
              `${formatMoney(cell.balanceCents, cell.currency)} en ${accountName(cell.accountId)}`,
          )
          .join(", ")}: muévelo a otro sobre antes de archivarlo.`
      : use.data.plannedAhead
        ? "Tiene plan este mes o en uno siguiente: déjalo en $0 en Planear antes de archivarlo."
        : null;

  const archive = async (archived: boolean) => {
    try {
      await save.mutateAsync({ ...current, archived });
      showToast({
        message: archived ? "Sobre archivado" : "Sobre reactivado",
        detail: archived ? "Sus movimientos se siguen viendo" : undefined,
        action: { label: "Deshacer", run: undoSavedEnvelope(envelope.id, current) },
      });
      onDone();
    } catch {
      // `save.error` lo dice debajo.
    }
  };
  const deleteIt = async () => {
    try {
      await remove.mutateAsync(envelope.id);
      showToast({
        message: "Sobre borrado",
        action: { label: "Deshacer", run: undoDeletedEnvelope(current) },
      });
      onDone();
    } catch {
      // `remove.error` lo dice debajo.
    }
  };

  return (
    <RetireActions
      noun="el sobre"
      archived={envelope.archived}
      deletable={!use.data.hasEntries && !use.data.inPlan}
      blockedBy={blockedBy}
      pending={save.isPending || remove.isPending}
      error={save.error ?? remove.error}
      onArchive={() => void archive(true)}
      onReactivate={() => void archive(false)}
      onDelete={() => void deleteIt()}
    />
  );
}
