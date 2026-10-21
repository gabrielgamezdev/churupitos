import { EnvelopeChip } from "@/components/envelope-chip";
import { ListRow } from "@/components/list";
import { Money } from "@/components/money";
import type { AccountBalance } from "@/features/balances/use-account-balances";
import type { Envelope } from "@/features/envelopes/queries";
import { dayLabel } from "@/lib/months";

import { summarizeOperation } from "./operation-summary";
import type { OperationItem } from "./queries";

interface OperationRowProps {
  operation: OperationItem;
  today: string;
  // En una lista ya agrupada por días, el día sobra en cada fila.
  showDay?: boolean;
  accountById: Record<string, Pick<AccountBalance, "name" | "currency">>;
  envelopeById: Record<string, Envelope>;
  onOpen: () => void;
}

// Una operación: su concepto, sus sobres y su cuenta; a la derecha, cuánto, y debajo qué
// día y quién la registró («por Ana»: hay sobres con nombre de persona).
export function OperationRow({
  operation,
  today,
  showDay = true,
  accountById,
  envelopeById,
  onOpen,
}: OperationRowProps) {
  const { totals, accountIds, envelopeIds } = summarizeOperation(
    operation.entries,
    (accountId) => accountById[accountId]?.currency,
  );
  const envelope = envelopeIds.length === 1 ? envelopeById[envelopeIds[0] ?? ""] : undefined;
  const accountNames = accountIds.map((id) => accountById[id]?.name ?? "Otra cuenta").join(" · ");
  const below = [
    showDay && dayLabel(operation.day, today),
    operation.authorName && `por ${operation.authorName}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ListRow asChild>
      <button type="button" aria-haspopup="dialog" onClick={onOpen} className="w-full text-left">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-body">{operation.description || "Sin concepto"}</span>
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-caption text-ink-muted">
            {envelope ? (
              <EnvelopeChip
                name={envelope.name}
                emoji={envelope.emoji}
                isThirdParty={envelope.isThirdParty}
                className="text-caption"
              />
            ) : (
              <span>{envelopeIds.length} sobres</span>
            )}
            <span aria-hidden="true">·</span>
            <span>{accountNames}</span>
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          {totals.map(({ currency, cents, movedCents }) =>
            // Un traspaso no cambia lo que hay en total: se dice cuánto pasó, sin signo.
            cents === 0 ? (
              <Money
                key={currency}
                cents={movedCents}
                currency={currency}
                className="text-amount"
              />
            ) : (
              <Money
                key={currency}
                cents={cents}
                currency={currency}
                kind="movement"
                className="text-amount"
              />
            ),
          )}
          {below && <span className="text-caption text-ink-muted">{below}</span>}
        </span>
      </button>
    </ListRow>
  );
}
