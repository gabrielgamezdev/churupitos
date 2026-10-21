import { List, ListRow } from "@/components/list";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
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
  // Al tocar una fila: su operación entera se abre en una hoja (`OperationSheet`).
  onOpen: (entry: LedgerEntry) => void;
  // Los nombres de los del hogar, por usuario: cada fila de la app dice quién la registró.
  memberNames?: Record<string, string>;
}

// El libro del mes, como la hoja de la cuenta en el Excel pero con lo más nuevo
// arriba: por días, cada movimiento con su importe y el restante que dejó, cada uno en
// su moneda.
export function LedgerList({
  entries,
  today,
  renderContext,
  onOpen,
  memberNames = {},
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
                context={renderContext(entry)}
                author={entry.createdBy ? memberNames[entry.createdBy] : undefined}
                onOpen={() => onOpen(entry)}
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
  // Quién la registró en la app («por Ana»: hay sobres con nombre de persona).
  author?: string;
  onOpen: () => void;
}

function LedgerRow({ entry, context, author, onOpen }: LedgerRowProps) {
  return (
    <ListRow asChild>
      <button type="button" aria-haspopup="dialog" onClick={onOpen} className="w-full text-left">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-body">{entry.description || "Sin concepto"}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {context}
            {entry.isFee && <Badge>Comisión</Badge>}
            {entry.dateApproximate && <Badge>≈ fecha</Badge>}
            {author && <span className="text-caption text-ink-muted">por {author}</span>}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
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
      </button>
    </ListRow>
  );
}
