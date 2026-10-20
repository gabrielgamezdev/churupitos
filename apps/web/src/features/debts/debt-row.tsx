import { ChevronDown } from "lucide-react";

import { List, ListRow } from "@/components/list";
import { Money } from "@/components/money";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import type { Currency } from "@/lib/money";
import { dayMonthLabel } from "@/lib/months";
import { cn } from "@/lib/utils";

import { dueLabel, type DebtGroup } from "./debt-view";
import type { Debt, DebtDirection, DebtTotal } from "./queries";

const CURRENCIES: Currency[] = ["VES", "USD"];

interface DebtRowProps {
  debt: Debt;
  today: string;
  // Lo que se despliega al tocarla: marcarla pagada, corregirla, borrarla. Sin ello, la
  // fila solo se lee (la galería).
  actions?: React.ReactNode;
}

// Una deuda: su concepto, cuándo vence y cuánto es, en su moneda. Una pagada va con ✅ y
// en `ink-muted`; una vencida sin pagar dice desde cuándo, en `overdrawn`.
export function DebtRow({ debt, today, actions }: DebtRowProps) {
  const paid = debt.paidOn !== null;
  const due = debt.dueOn && !paid ? dueLabel(debt.dueOn, today) : null;
  const content = (
    <>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-body">
          {paid && <span aria-label="Pagada">✅ </span>}
          {debt.description}
        </span>
        {debt.dueOn && (
          <span className={cn("text-caption", due?.overdue ? "text-overdrawn" : "text-ink-muted")}>
            {dayMonthLabel(debt.dueOn)}
            {due && ` · ${due.text}`}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <Money cents={debt.amountCents} currency={debt.currency} className="text-amount" />
        {actions && (
          <ChevronDown
            aria-hidden="true"
            className="size-4 text-ink-muted transition-transform group-data-[state=open]:rotate-180"
          />
        )}
      </span>
    </>
  );

  if (!actions) return <ListRow className={cn(paid && "text-ink-muted")}>{content}</ListRow>;
  return (
    <Collapsible asChild>
      <li>
        <CollapsibleTrigger
          className={cn(
            "group flex min-h-tap w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-surface-sunken",
            paid && "text-ink-muted",
          )}
        >
          {content}
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-3">{actions}</CollapsibleContent>
      </li>
    </Collapsible>
  );
}

// Lo que se debe en un mes: su nombre y lo que suma en cada moneda, y sus cuotas.
export function DebtGroupList({
  group,
  today,
  renderActions,
}: {
  group: DebtGroup;
  today: string;
  renderActions?: (debt: Debt) => React.ReactNode;
}) {
  return (
    <section aria-label={group.label} className="flex flex-col gap-1">
      <h3 className="flex justify-between gap-3 px-1 text-label text-ink-muted">
        <span>{group.label}</span>
        <Amounts amounts={group.totals} />
      </h3>
      <List>
        {group.debts.map((debt) => (
          <DebtRow key={debt.id} debt={debt} today={today} actions={renderActions?.(debt)} />
        ))}
      </List>
    </section>
  );
}

const DIRECTIONS: { direction: DebtDirection; label: string }[] = [
  { direction: "payable", label: "Lo que deben" },
  { direction: "receivable", label: "Lo que les deben" },
];

// Lo pendiente, sin las pagadas: lo que deben y lo que les deben, cada moneda por su
// lado y nunca sumadas (R1). Sin definir mientras carga.
export function DebtTotals({ totals }: { totals: DebtTotal[] | undefined }) {
  return (
    <List aria-label="Lo pendiente">
      {DIRECTIONS.map(({ direction, label }) => {
        const amounts = Object.fromEntries(
          (totals ?? [])
            .filter((total) => total.direction === direction && total.totalCents !== 0)
            .map((total) => [total.currency, total.totalCents]),
        );
        return (
          <ListRow key={direction}>
            <span className="text-body">{label}</span>
            {totals === undefined ? (
              <Skeleton aria-label="Cargando" className="h-4 w-20" />
            ) : Object.keys(amounts).length === 0 ? (
              <span className="text-body text-ink-muted">Nada</span>
            ) : (
              <span className="flex flex-col items-end">
                {CURRENCIES.map(
                  (currency) =>
                    amounts[currency] !== undefined && (
                      <Money
                        key={currency}
                        cents={amounts[currency]}
                        currency={currency}
                        className="text-amount"
                      />
                    ),
                )}
              </span>
            )}
          </ListRow>
        );
      })}
    </List>
  );
}

function Amounts({ amounts }: { amounts: Partial<Record<Currency, number>> }) {
  return (
    <span className="flex gap-2">
      {CURRENCIES.map((currency) => {
        const cents = amounts[currency];
        return cents === undefined ? null : (
          <Money key={currency} cents={cents} currency={currency} />
        );
      })}
    </span>
  );
}
