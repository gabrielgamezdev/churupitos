import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { ListRow } from "@/components/list";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Currency } from "@/lib/money";
import { cn } from "@/lib/utils";

interface AccountRowProps {
  name: string;
  currency: Currency;
  balanceCents: number;
  // Cuánto de ese saldo es de «Otro» (R11): así la lista cuadra con el total con «Otro».
  thirdPartyCents: number;
  // Con él, toda la fila lleva a la cuenta.
  accountId?: string;
}

// Una cuenta en la lista de su moneda, con su saldo de hoy. Una cuenta en cero sigue
// en la lista, apagada: en el Excel también está su hoja.
export function AccountRow({
  name,
  currency,
  balanceCents,
  thirdPartyCents,
  accountId,
}: AccountRowProps) {
  const content = (
    <>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-body">{name}</span>
          {balanceCents < 0 && <Badge variant="overdrawn">Descubierto</Badge>}
        </span>
        {thirdPartyCents !== 0 && (
          <span className="text-caption text-third-party">
            de los cuales <Money cents={thirdPartyCents} currency={currency} /> son «Otro»
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <Money cents={balanceCents} currency={currency} className="text-amount" />
        {accountId && <ChevronRight aria-hidden="true" className="size-5 text-ink-muted" />}
      </span>
    </>
  );

  const muted = cn(balanceCents === 0 && "text-ink-muted");
  if (!accountId) return <ListRow className={muted}>{content}</ListRow>;
  return (
    <ListRow asChild className={muted}>
      <Link to="/accounts/$accountId" params={{ accountId }}>
        {content}
      </Link>
    </ListRow>
  );
}

// Mientras carga: el esqueleto de una fila.
export function AccountRowSkeleton() {
  return (
    <ListRow aria-hidden="true">
      <Skeleton className="h-4 w-2/5" />
      <Skeleton className="h-4 w-1/4" />
    </ListRow>
  );
}
