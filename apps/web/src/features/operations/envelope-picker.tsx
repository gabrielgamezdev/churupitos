import { useState } from "react";

import { EnvelopeChip } from "@/components/envelope-chip";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import type { Envelope } from "@/features/envelopes/queries";
import type { Currency } from "@/lib/money";
import { cn } from "@/lib/utils";

interface EnvelopePickerProps {
  // Los de arriba, los más usados en la cuenta, y los demás (`envelopeOrder`).
  top: Envelope[];
  rest: Envelope[];
  value: string;
  onChange: (envelopeId: string) => void;
  // Lo que tiene cada sobre en la cuenta elegida, para elegir con eso a la vista.
  cellByEnvelope: Map<string, number>;
  currency: Currency | undefined;
  error?: string;
}

// El sobre de Registrar en botones (M7): cada uno con su emoji y lo que tiene en la
// cuenta. Arriba, los más usados en ella; «Más sobres» enseña los demás. Ninguno viene
// elegido: un sobre equivocado sin darse cuenta cuesta más que un toque.
export function EnvelopePicker({
  top,
  rest,
  value,
  onChange,
  cellByEnvelope,
  currency,
  error,
}: EnvelopePickerProps) {
  const [showAll, setShowAll] = useState(false);
  // El elegido, siempre a la vista, aunque sea de los de «Más sobres».
  const chosenBelow = rest.find((envelope) => envelope.id === value);
  const shown = showAll ? [...top, ...rest] : chosenBelow ? [...top, chosenBelow] : top;

  return (
    <div className="flex flex-col gap-2">
      <span id="envelope-label" className="text-body font-medium">
        Sobre
      </span>
      <div role="radiogroup" aria-labelledby="envelope-label" className="grid grid-cols-2 gap-2">
        {shown.map((envelope) => {
          const checked = envelope.id === value;
          const cents = cellByEnvelope.get(envelope.id);
          return (
            <button
              key={envelope.id}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onChange(envelope.id)}
              className={cn(
                "flex min-h-tap min-w-0 flex-col items-start justify-center gap-0.5 rounded-md border px-3 py-2 text-left",
                checked ? "border-brand bg-brand-soft" : "border-line-strong bg-surface-raised",
              )}
            >
              <EnvelopeChip
                name={envelope.name}
                emoji={envelope.emoji}
                isThirdParty={envelope.isThirdParty}
                className={cn("text-body", !envelope.isThirdParty && "text-ink")}
              />
              {currency && (
                <Money
                  cents={cents ?? 0}
                  currency={currency}
                  className={cn("text-amount-small", (cents ?? 0) >= 0 && "text-ink-muted")}
                />
              )}
            </button>
          );
        })}
      </div>
      {rest.length > 0 && (
        <Button
          type="button"
          variant="link"
          className="self-start px-0"
          aria-expanded={showAll}
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "Menos sobres" : `Más sobres (${rest.length})`}
        </Button>
      )}
      {error && <p className="text-body text-destructive">{error}</p>}
    </div>
  );
}
