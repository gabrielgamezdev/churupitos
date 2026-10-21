import { ChevronRight } from "lucide-react";

import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CURRENCY_NAMES, type Currency } from "@/lib/money";
import { cn } from "@/lib/utils";

import { currencyDetails } from "./currency-summary";

interface CurrencyCardProps {
  currency: Currency;
  // Lo del hogar, sin «Otro» (R11): la cifra grande.
  ownCents: number;
  totalCents: number;
  thirdPartyCents: number;
  accountCount: number;
  // Si lleva a otra pantalla: la flecha lo dice.
  tappable?: boolean;
  className?: string;
}

// Una moneda en el inicio. Cada moneda va por su lado (R1): nunca se suman.
export function CurrencyCard({
  currency,
  ownCents,
  totalCents,
  thirdPartyCents,
  accountCount,
  tappable = false,
  className,
}: CurrencyCardProps) {
  return (
    <article
      aria-label={CURRENCY_NAMES[currency]}
      className={cn(
        "flex flex-col gap-2 rounded-lg border-l-4 bg-surface-raised p-4 shadow-card",
        // La moneda se reconoce por su color en el borde y la etiqueta, nunca en la cifra.
        currency === "VES" ? "border-ves" : "border-usd",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-heading">{CURRENCY_NAMES[currency]}</h2>
        <span className="flex items-center gap-1">
          <Badge variant={currency === "VES" ? "ves" : "usd"}>
            {currency === "VES" ? "Bs" : "$"}
          </Badge>
          {tappable && <ChevronRight aria-hidden="true" className="size-5 text-ink-muted" />}
        </span>
      </div>
      <Money cents={ownCents} currency={currency} className="text-display-amount" />
      <p className="text-caption text-ink-muted">
        {currencyDetails(currency, totalCents, thirdPartyCents, accountCount)}
      </p>
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
