import { cn } from "cn";

import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CURRENCY_NAMES, formatMoney, type Currency } from "@/lib/money";

interface CurrencyCardProps {
  currency: Currency;
  // Lo del hogar, sin «Otro» (R11): la cifra grande.
  ownCents: number;
  totalCents: number;
  thirdPartyCents: number;
  accountCount: number;
  className?: string;
}

// Una moneda en el inicio. Cada moneda va por su lado (R1): nunca se suman.
export function CurrencyCard({
  currency,
  ownCents,
  totalCents,
  thirdPartyCents,
  accountCount,
  className,
}: CurrencyCardProps) {
  const details = [
    thirdPartyCents !== 0 && `Con «Otro»: ${formatMoney(totalCents, currency)}`,
    accountCount === 1 ? "1 cuenta" : `${accountCount} cuentas`,
  ].filter(Boolean);

  return (
    <article
      aria-label={CURRENCY_NAMES[currency]}
      className={cn("flex flex-col gap-2 rounded-lg bg-surface-raised p-4 shadow-card", className)}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-heading">{CURRENCY_NAMES[currency]}</h2>
        <Badge variant={currency === "VES" ? "ves" : "usd"}>
          {currency === "VES" ? "Bs" : "$"}
        </Badge>
      </div>
      <Money cents={ownCents} currency={currency} className="text-display-amount" />
      <p className="text-caption text-ink-muted">{details.join(" · ")}</p>
    </article>
  );
}

// Mientras carga: el esqueleto de una tarjeta.
export function CurrencyCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-3 rounded-lg bg-surface-raised p-4 shadow-card"
    >
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-40" />
    </div>
  );
}
