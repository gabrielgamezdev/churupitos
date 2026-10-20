import { List, ListRow } from "@/components/list";
import { Money } from "@/components/money";
import { Skeleton } from "@/components/ui/skeleton";
import type { Currency } from "@/lib/money";
import { dayMonthLabel } from "@/lib/months";
import { cn } from "@/lib/utils";

import { dueLabel, type DebtGroup } from "./debt-view";
import type { Debt, DebtDirection, DebtTotal } from "./queries";

const CURRENCIES: Currency[] = ["VES", "USD"];

// Una deuda: su concepto, cuándo vence y cuánto es, en su moneda. Una pagada va con ✅ y
// en `ink-muted`; una vencida sin pagar dice desde cuándo, en `overdrawn`.
export function DebtRow({ debt, today }: { debt: Debt; today: string }) {
  const due = debt.dueOn && !debt.isPaid ? dueLabel(debt.dueOn, today) : null;
  return (
    <ListRow className={cn(debt.isPaid && "text-ink-muted")}>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-body">
          {debt.isPaid && <span aria-label="Pagada">✅ </span>}
          {debt.description}
        </span>
        {debt.dueOn && (
          <span className={cn("text-caption", due?.overdue ? "text-overdrawn" : "text-ink-muted")}>
            {dayMonthLabel(debt.dueOn)}
            {due && ` · ${due.text}`}
          </span>
        )}
      </span>
      <Money cents={debt.amountCents} currency={debt.currency} className="shrink-0 text-amount" />
    </ListRow>
  );
}

// Lo que se debe en un mes: su nombre y lo que suma en cada moneda, y sus cuotas.
export function DebtGroupList({ group, today }: { group: DebtGroup; today: string }) {
  return (
    <section aria-label={group.label} className="flex flex-col gap-1">
      <h3 className="flex justify-between gap-3 px-1 text-label text-ink-muted">
        <span>{group.label}</span>
        <Amounts amounts={group.totals} />
      </h3>
      <List>
        {group.debts.map((debt) => (
          <DebtRow key={debt.id} debt={debt} today={today} />
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
