import { ChevronDown } from "lucide-react";

import { ListRow } from "@/components/list";
import { Money } from "@/components/money";
import { StatusBadge } from "@/components/status-badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRate } from "@/lib/money";
import { dayMonthLabel } from "@/lib/months";

import type { ExpectedIncome } from "./queries";

interface IncomeRowProps {
  income: ExpectedIncome;
  // La cuenta donde cayó el cobro.
  accountName: string | undefined;
  // Lo que se despliega al tocar un ingreso cobrado: su cobro, con el reparto por sobre.
  // Solo se monta abierto, así que la consulta no sale hasta que se toca.
  detail: React.ReactNode;
}

// Un ingreso esperado, como una fila de «Ingresos esperados» del Excel: lo que se
// espera en dólares y ✅/⏳. Uno cobrado dice cuándo, dónde y, en bolívares, a qué tasa
// (R8, la de ese cobro).
export function IncomeRow({ income, accountName, detail }: IncomeRowProps) {
  const { receipt } = income;
  const content = (
    <>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-body">
          {income.emoji ? `${income.emoji} ${income.name}` : income.name}
        </span>
        {receipt && (
          <span className="text-caption text-ink-muted">
            El {dayMonthLabel(receipt.day)} en {accountName ?? "otra cuenta"}
          </span>
        )}
        {receipt?.currency === "VES" && (
          <span className="text-caption text-ink-muted">
            <Money cents={receipt.amountCents} currency="VES" /> · tasa{" "}
            <span className="tabular-nums">
              {formatRate(receipt.amountCents, receipt.usdCents)}
            </span>
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <span className="flex flex-col items-end gap-0.5">
          <Money cents={income.expectedUsdCents} currency="USD" className="text-amount" />
          <StatusBadge done={Boolean(receipt)}>{receipt ? "Cobrado" : "Pendiente"}</StatusBadge>
        </span>
        {receipt ? (
          <ChevronDown
            aria-hidden="true"
            className="size-4 text-ink-muted transition-transform group-data-[state=open]:rotate-180"
          />
        ) : (
          // El hueco de la flecha, para que las cifras queden en columna.
          <span aria-hidden="true" className="size-4" />
        )}
      </span>
    </>
  );

  if (!receipt) return <ListRow>{content}</ListRow>;
  return (
    <Collapsible asChild>
      <li>
        <CollapsibleTrigger className="group flex min-h-tap w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-surface-sunken">
          {content}
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-3">{detail}</CollapsibleContent>
      </li>
    </Collapsible>
  );
}

// Mientras carga: el esqueleto de una fila.
export function IncomeRowSkeleton() {
  return (
    <ListRow aria-hidden="true">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-1/4" />
    </ListRow>
  );
}
