import { ChevronLeft, ChevronRight } from "lucide-react";

import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Currency } from "@/lib/money";
import { addMonths, monthLabel } from "@/lib/months";

// Lo que había al empezar el mes (el cierre del anterior, R7) y al cerrarlo, en una
// moneda. Sin definir mientras carga.
export type MonthBounds = {
  currency: Currency;
  openingCents: number | undefined;
  closingCents: number | undefined;
};

interface MonthPickerProps {
  month: string;
  // El mes en curso: su cierre es el saldo de hoy y, en un libro, no hay siguiente.
  isCurrent: boolean;
  // Hasta dónde se puede ir. El presupuesto llega al mes siguiente si ya se planificó,
  // y no va más atrás del primero que tiene.
  hasPrevious?: boolean;
  hasNext?: boolean;
  // Una línea por moneda: una cuenta tiene una; un sobre, las que use; el presupuesto,
  // ninguna.
  bounds?: MonthBounds[];
  onChange: (month: string) => void;
}

// El mes del libro, con lo que había al empezar y al cerrar, o hoy si es el mes en curso.
export function MonthPicker({
  month,
  isCurrent,
  hasPrevious = true,
  hasNext = !isCurrent,
  bounds = [],
  onChange,
}: MonthPickerProps) {
  const previous = addMonths(month, -1);
  const next = addMonths(month, 1);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 rounded-md bg-surface-raised">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Mes anterior: ${monthLabel(previous)}`}
          disabled={!hasPrevious}
          onClick={() => onChange(previous)}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <h2 id="month-title" aria-live="polite" className="text-heading">
          {monthLabel(month)}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Mes siguiente: ${monthLabel(next)}`}
          disabled={!hasNext}
          onClick={() => onChange(next)}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
      {bounds.map(({ currency, openingCents, closingCents }) => (
        <p
          key={currency}
          className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-1 text-caption text-ink-muted"
        >
          <span>
            Al empezar: <Amount cents={openingCents} currency={currency} />
          </span>
          <span>
            {isCurrent ? "Hoy" : "Al cerrar"}: <Amount cents={closingCents} currency={currency} />
          </span>
        </p>
      ))}
    </div>
  );
}

function Amount({ cents, currency }: { cents: number | undefined; currency: Currency }) {
  if (cents === undefined)
    return <Skeleton aria-label="Cargando" className="inline-block h-3 w-20 align-middle" />;
  return <Money cents={cents} currency={currency} />;
}
