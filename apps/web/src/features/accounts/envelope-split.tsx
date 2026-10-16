import { EnvelopeChip } from "@/components/envelope-chip";
import { List, ListRow } from "@/components/list";
import { Money } from "@/components/money";
import { EmptyState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import type { Currency } from "@/lib/money";
import { cn } from "@/lib/utils";

import type { EnvelopeRow } from "./ledger-view";

// Cuánto hay hoy de cada sobre en la cuenta: «cuánto tengo en dónde» del Excel, visto
// desde la cuenta. Las filas suman el saldo de la cuenta; un sobre por debajo de cero
// está en descubierto (R6), que no es un error.
export function EnvelopeSplit({ currency, rows }: { currency: Currency; rows: EnvelopeRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState className="rounded-lg bg-surface-raised">
        No hay dinero en ningún sobre de esta cuenta.
      </EmptyState>
    );
  }

  return (
    <List>
      {rows.map(({ envelope, balanceCents }) => (
        <ListRow key={envelope.id}>
          <span className="flex min-w-0 items-center gap-2">
            <EnvelopeChip
              name={envelope.name}
              emoji={envelope.emoji}
              isThirdParty={envelope.isThirdParty}
              className={cn("text-body", !envelope.isThirdParty && "text-ink")}
            />
            {balanceCents < 0 && <Badge variant="overdrawn">Descubierto</Badge>}
          </span>
          <Money
            cents={balanceCents}
            currency={currency}
            className={cn(
              "text-amount",
              envelope.isThirdParty && balanceCents > 0 && "text-third-party",
            )}
          />
        </ListRow>
      ))}
    </List>
  );
}
