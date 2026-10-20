import { EnvelopeChip } from "@/components/envelope-chip";
import { ListRow } from "@/components/list";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Currency } from "@/lib/money";
import { cn } from "@/lib/utils";

import type { EnvelopeSummary } from "./envelope-summary";

const CURRENCIES: Currency[] = ["VES", "USD"];

// Un sobre en la lista de sobres: su emoji y su nombre, y lo que tiene en cada moneda,
// una debajo de la otra y nunca sumadas (R1). Un sobre por debajo de cero en alguna
// moneda está en descubierto (R6), que no es un error.
export function EnvelopeRow({ envelope, balances }: EnvelopeSummary) {
  const overdrawn = CURRENCIES.some((currency) => (balances[currency] ?? 0) < 0);
  return (
    <ListRow>
      <span className="flex min-w-0 items-center gap-2">
        <EnvelopeChip
          name={envelope.name}
          emoji={envelope.emoji}
          isThirdParty={envelope.isThirdParty}
          className={cn("text-body", !envelope.isThirdParty && "text-ink")}
        />
        {overdrawn && <Badge variant="overdrawn">Descubierto</Badge>}
      </span>
      <span className="flex shrink-0 flex-col items-end">
        {CURRENCIES.map((currency) => {
          const cents = balances[currency];
          if (cents === undefined) return null;
          return (
            <Money
              key={currency}
              cents={cents}
              currency={currency}
              className={cn(
                "text-amount",
                envelope.isThirdParty && cents > 0 && "text-third-party",
              )}
            />
          );
        })}
      </span>
    </ListRow>
  );
}

// Mientras carga: el esqueleto de una fila.
export function EnvelopeRowSkeleton() {
  return (
    <ListRow aria-hidden="true">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-1/4" />
    </ListRow>
  );
}
