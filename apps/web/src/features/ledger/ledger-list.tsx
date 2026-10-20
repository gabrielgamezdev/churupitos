import { ChevronDown } from "lucide-react";

import { List } from "@/components/list";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { dayLabel } from "@/lib/months";

import { groupByDay } from "./group-by-day";
import type { LedgerEntry } from "./queries";

interface LedgerListProps {
  // Lo más nuevo arriba, como llega de la base.
  entries: LedgerEntry[];
  today: string;
  // La línea de debajo del concepto: el sobre, en el libro de una cuenta; la cuenta,
  // en el de un sobre.
  renderContext: (entry: LedgerEntry) => React.ReactNode;
  // Lo que se despliega al tocar una fila: su operación entera. Solo se monta
  // abierta, así que la consulta del detalle no sale hasta que se toca.
  renderDetail: (entry: LedgerEntry) => React.ReactNode;
}

// El libro del mes, como la hoja de la cuenta en el Excel pero con lo más nuevo
// arriba: por días, cada movimiento con su importe y el restante que dejó, cada uno en
// su moneda.
export function LedgerList({ entries, today, renderContext, renderDetail }: LedgerListProps) {
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
                context={renderContext(entry)}
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
  context: React.ReactNode;
  detail: React.ReactNode;
}

function LedgerRow({ entry, context, detail }: LedgerRowProps) {
  return (
    <Collapsible asChild>
      <li>
        <CollapsibleTrigger className="group flex min-h-tap w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-surface-sunken">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-body">{entry.description || "Sin concepto"}</span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {context}
              {entry.isFee && <Badge>Comisión</Badge>}
              {entry.dateApproximate && <Badge>≈ fecha</Badge>}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <span className="flex flex-col items-end gap-0.5">
              <Money
                cents={entry.amountCents}
                currency={entry.currency}
                kind="movement"
                className="text-amount"
              />
              <span className="text-amount-small text-ink-muted">
                Restante <Money cents={entry.runningBalanceCents} currency={entry.currency} />
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
