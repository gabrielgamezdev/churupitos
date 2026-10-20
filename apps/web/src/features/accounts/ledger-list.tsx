import { ChevronDown } from "lucide-react";

import { EnvelopeChip } from "@/components/envelope-chip";
import { List } from "@/components/list";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Envelope } from "@/features/envelopes/queries";
import type { Currency } from "@/lib/money";
import { dayLabel } from "@/lib/months";

import { groupByDay } from "./ledger-view";
import type { LedgerEntry } from "./queries";

interface LedgerListProps {
  currency: Currency;
  // Lo más nuevo arriba, como llega de la base.
  entries: LedgerEntry[];
  envelopeById: Record<string, Envelope>;
  today: string;
  // Lo que se despliega al tocar una fila: su operación entera. Solo se monta
  // abierta, así que la consulta del detalle no sale hasta que se toca.
  renderDetail: (entry: LedgerEntry) => React.ReactNode;
}

// El libro del mes, como la hoja de la cuenta en el Excel pero con lo más nuevo
// arriba: por días, cada movimiento con su sobre, su importe y el restante que dejó.
export function LedgerList({
  currency,
  entries,
  envelopeById,
  today,
  renderDetail,
}: LedgerListProps) {
  return (
    <div className="flex flex-col gap-4">
      {groupByDay(entries).map(({ day, entries: dayEntries }) => (
        <section key={day} aria-label={dayLabel(day, today)} className="flex flex-col gap-1">
          <h3 className="px-1 text-label text-ink-muted">{dayLabel(day, today)}</h3>
          <List>
            {dayEntries.map((entry) => (
              <LedgerRow
                key={entry.entryId}
                entry={entry}
                envelope={envelopeById[entry.envelopeId]}
                currency={currency}
                detail={renderDetail(entry)}
              />
            ))}
          </List>
        </section>
      ))}
    </div>
  );
}

interface LedgerRowProps {
  entry: LedgerEntry;
  envelope: Envelope | undefined;
  currency: Currency;
  detail: React.ReactNode;
}

function LedgerRow({ entry, envelope, currency, detail }: LedgerRowProps) {
  return (
    <Collapsible asChild>
      <li>
        <CollapsibleTrigger className="group flex min-h-tap w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-surface-sunken">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-body">{entry.description || "Sin concepto"}</span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {envelope && (
                <EnvelopeChip
                  name={envelope.name}
                  emoji={envelope.emoji}
                  isThirdParty={envelope.isThirdParty}
                  className="text-caption"
                />
              )}
              {entry.isFee && <Badge>Comisión</Badge>}
              {entry.dateApproximate && <Badge>≈ fecha</Badge>}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <span className="flex flex-col items-end gap-0.5">
              <Money
                cents={entry.amountCents}
                currency={currency}
                kind="movement"
                className="text-amount"
              />
              <span className="text-amount-small text-ink-muted">
                Restante <Money cents={entry.runningBalanceCents} currency={currency} />
              </span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className="size-4 text-ink-muted transition-transform group-data-[state=open]:rotate-180"
            />
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-3">{detail}</CollapsibleContent>
      </li>
    </Collapsible>
  );
}
