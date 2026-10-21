import { EnvelopeChip } from "@/components/envelope-chip";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import type { AccountBalance } from "@/features/balances/use-account-balances";
import type { Envelope } from "@/features/envelopes/queries";
import { cn } from "@/lib/utils";

import type { CellChange } from "./operation-draft";

interface RemainingProps {
  changes: CellChange[];
  envelopeById: Map<string, Envelope>;
  account: Pick<AccountBalance, "name" | "currency">;
  // Si el movimiento toca dos cuentas, cada línea dice de cuál es su sobre.
  showAccount?: boolean;
}

// Cómo queda cada sobre que toca el movimiento, en una línea (M7): «🍔 Comida queda en
// Bs X». Un descubierto se dice y se guarda igual (R6).
export function Remaining({ changes, envelopeById, account, showAccount = false }: RemainingProps) {
  if (changes.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 px-1">
      {changes.map((change) => {
        const envelope = envelopeById.get(change.envelopeId);
        return (
          <p
            key={change.envelopeId}
            className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-body text-ink-muted"
          >
            {envelope && (
              <EnvelopeChip
                name={envelope.name}
                emoji={envelope.emoji}
                isThirdParty={envelope.isThirdParty}
                className={cn("text-body", !envelope.isThirdParty && "text-ink")}
              />
            )}
            {showAccount && <span>en {account.name}</span>}
            queda en
            <Money cents={change.afterCents} currency={account.currency} className="text-amount" />
            {change.afterCents < 0 && <Badge variant="overdrawn">Descubierto</Badge>}
          </p>
        );
      })}
      {changes.some((change) => change.afterCents < 0) && (
        <p className="text-caption text-ink-muted">
          Se puede guardar igual: el descubierto se cubre después.
        </p>
      )}
    </div>
  );
}
