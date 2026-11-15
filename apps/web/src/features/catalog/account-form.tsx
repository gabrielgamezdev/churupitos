import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { accountCellsQuery } from "@/features/accounts/queries";
import type { AccountBalance } from "@/features/balances/use-account-balances";
import { envelopesQuery } from "@/features/envelopes/queries";
import { CURRENCY_NAMES, formatMoney, type Currency } from "@/lib/money";
import { showToast } from "@/lib/toast";
import { useOnline } from "@/lib/use-online";
import { writeErrorMessage } from "@/lib/write-error";

import { accountHasEntriesQuery } from "./queries";
import { RetireActions } from "./retire-actions";
import {
  undoDeletedAccount,
  undoSavedAccount,
  useDeleteAccount,
  useSaveAccount,
  type AccountArgs,
} from "./save";

const accountFormSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre de la cuenta.").max(40, "Hasta 40 letras."),
  currency: z.enum(["VES", "USD"]),
  captureHints: z.string().max(200, "Hasta 200 letras."),
});

// Lo que delata a la cuenta en una captura se escribe en una línea, separado por comas.
const hintsOf = (text: string) =>
  text
    .split(",")
    .map((hint) => hint.trim())
    .filter(Boolean);

type AccountFormValues = z.input<typeof accountFormSchema>;

const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: "VES", label: "Bolívares" },
  { value: "USD", label: "Dólares" },
];

interface AccountFormProps {
  // La cuenta como está; sin ella, una nueva.
  account?: AccountBalance;
  // Lo que la delata en sus capturas, como está guardado (M15).
  captureHints?: string[];
  onDone: () => void;
}

// Crear una cuenta o cambiarle el nombre (M11). La moneda se elige al crearla y no cambia:
// cada movimiento está en la moneda de su cuenta (R3).
export function AccountForm({ account, captureHints = [], onDone }: AccountFormProps) {
  const online = useOnline();
  const save = useSaveAccount();
  const [id] = useState(() => account?.accountId ?? crypto.randomUUID());
  const previous = account && argsOf(account, captureHints);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: account?.name ?? "",
      currency: account?.currency ?? "VES",
      captureHints: captureHints.join(", "),
    },
  });
  const currency = useWatch({ control, name: "currency" });

  const submit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync({
        id,
        name: values.name.trim(),
        currency: values.currency,
        archived: account?.archived ?? false,
        captureHints: hintsOf(values.captureHints),
      });
      showToast({
        message: account ? "Cuenta guardada" : "Cuenta creada",
        action: { label: "Deshacer", run: undoSavedAccount(id, previous) },
      });
      onDone();
    } catch {
      // `save.error` lo dice debajo del botón.
    }
  });

  return (
    <div className="flex flex-1 flex-col gap-8">
      <form id="account-form" onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field label="Nombre" htmlFor="name" error={errors.name?.message}>
          <Input
            id="name"
            autoComplete="off"
            autoFocus={!account}
            aria-invalid={errors.name ? true : undefined}
            {...register("name")}
          />
        </Field>
        {account ? (
          <p className="text-body text-ink-muted">
            En {CURRENCY_NAMES[account.currency].toLowerCase()}: la moneda de una cuenta no se
            cambia.
          </p>
        ) : (
          <Segmented
            label="Moneda"
            options={CURRENCY_OPTIONS}
            value={currency}
            onChange={(value) => setValue("currency", value)}
          />
        )}
        <div className="flex flex-col gap-2">
          <Field
            label="En sus capturas"
            htmlFor="capture-hints"
            error={errors.captureHints?.message}
          >
            <Input
              id="capture-hints"
              autoComplete="off"
              aria-describedby="capture-hints-help"
              aria-invalid={errors.captureHints ? true : undefined}
              {...register("captureHints")}
            />
          </Field>
          <p id="capture-hints-help" className="text-caption text-ink-muted">
            Lo que trae la captura de un pago desde esta cuenta y no la de otras: sus últimos
            dígitos o una palabra. Varias, separadas por comas. Así «Leer una captura» la elige
            sola.
          </p>
        </div>
      </form>

      {account && <AccountRetire account={account} captureHints={captureHints} onDone={onDone} />}

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
        <Button type="submit" form="account-form" disabled={!online || isSubmitting}>
          {isSubmitting ? "Guardando…" : account ? "Guardar" : "Crear la cuenta"}
        </Button>
      </div>
    </div>
  );
}

const argsOf = (account: AccountBalance, captureHints: string[]): AccountArgs => ({
  id: account.accountId,
  name: account.name,
  currency: account.currency,
  archived: account.archived,
  captureHints,
});

// Archivar, reactivar o borrar la cuenta como está guardada.
function AccountRetire({
  account,
  captureHints,
  onDone,
}: {
  account: AccountBalance;
  captureHints: string[];
  onDone: () => void;
}) {
  const hasEntries = useQuery(accountHasEntriesQuery(account.accountId));
  const cells = useQuery(accountCellsQuery(account.accountId));
  const envelopes = useQuery(envelopesQuery);
  const save = useSaveAccount();
  const remove = useDeleteAccount();
  if (hasEntries.data === undefined || !cells.data || !envelopes.data) return null;

  const current = argsOf(account, captureHints);
  const envelopeName = (id: string) =>
    envelopes.data.find((envelope) => envelope.id === id)?.name ?? "otro sobre";
  // En cero en cada celda, no solo en el total (R20).
  const withMoney = cells.data.filter((cell) => cell.balanceCents !== 0);
  const blockedBy =
    withMoney.length > 0
      ? `Tiene ${withMoney
          .map(
            (cell) =>
              `${formatMoney(cell.balanceCents, account.currency)} en ${envelopeName(cell.envelopeId)}`,
          )
          .join(", ")}: muévelo a otra cuenta antes de archivarla.`
      : null;

  const archive = async (archived: boolean) => {
    try {
      await save.mutateAsync({ ...current, archived });
      showToast({
        message: archived ? "Cuenta archivada" : "Cuenta reactivada",
        detail: archived ? "Sus movimientos se siguen viendo" : undefined,
        action: { label: "Deshacer", run: undoSavedAccount(account.accountId, current) },
      });
      onDone();
    } catch {
      // `save.error` lo dice debajo.
    }
  };
  const deleteIt = async () => {
    try {
      await remove.mutateAsync(account.accountId);
      showToast({
        message: "Cuenta borrada",
        action: { label: "Deshacer", run: undoDeletedAccount(current) },
      });
      onDone();
    } catch {
      // `remove.error` lo dice debajo.
    }
  };

  return (
    <RetireActions
      noun="la cuenta"
      archived={account.archived}
      deletable={!hasEntries.data}
      blockedBy={blockedBy}
      pending={save.isPending || remove.isPending}
      error={save.error ?? remove.error}
      onArchive={() => void archive(true)}
      onReactivate={() => void archive(false)}
      onDelete={() => void deleteIt()}
    />
  );
}
