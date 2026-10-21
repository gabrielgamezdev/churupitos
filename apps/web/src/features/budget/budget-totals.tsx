import { Money } from "@/components/money";
import { ProgressBar } from "@/components/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/money";

interface BudgetTotalsProps {
  // Sin definir mientras carga.
  items: { label: string; cents: number | undefined }[];
  // Debajo, una barra de cuánto va de la referencia: lo cobrado de lo esperado.
  progress?: { label: string; cents: number; of: number };
}

// Las filas «Total» de un bloque del presupuesto, en dólares y una al lado de la otra.
export function BudgetTotals({ items, progress }: BudgetTotalsProps) {
  return (
    <dl className="grid grid-cols-3 gap-3 rounded-lg bg-surface-raised px-4 py-3">
      {items.map(({ label, cents }) => (
        <div key={label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-caption text-ink-muted">{label}</dt>
          <dd className="text-amount">
            {cents === undefined ? (
              <Skeleton aria-label="Cargando" className="h-4 w-16" />
            ) : (
              <Money cents={cents} currency="USD" />
            )}
          </dd>
        </div>
      ))}
      {progress && (
        <ProgressBar
          label={progress.label}
          value={progress.cents}
          max={progress.of}
          valueText={`${formatMoney(progress.cents, "USD")} de ${formatMoney(progress.of, "USD")}`}
          className="col-span-3"
        />
      )}
    </dl>
  );
}
