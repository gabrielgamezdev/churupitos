import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { EnvelopeChip } from "@/components/envelope-chip";
import { ListRow } from "@/components/list";
import { Money } from "@/components/money";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

import type { PlanRow as PlanRowData } from "./budget-view";

// Un sobre en el plan del mes, como una fila de «Distribución de los ingresos» del
// Excel: lo planeado en dólares, lo que le llegó en bolívares (R10) y ✅/⏳ (R18);
// debajo, la fuente de fondos y la acción tal cual se escribieron, y una barra de cuánto
// le llegó de lo planeado (M7). Lleva a la pantalla del sobre, donde está su restante.
export function PlanRow({ line, envelope }: PlanRowData) {
  const notes = [line.fundingNote, line.actionNote]
    .map((note) => note.trim())
    .filter((note) => note && note !== "-")
    .join(" · ");
  const partial = !line.isDelivered && line.allocatedUsdCents > 0;
  return (
    // La barra va debajo de la fila entera: la fila pasa a ser una columna.
    <ListRow asChild className="flex-col items-stretch gap-2">
      <Link to="/envelopes/$envelopeId" params={{ envelopeId: envelope.id }}>
        <span className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 flex-col gap-0.5">
            <EnvelopeChip
              name={envelope.name}
              emoji={envelope.emoji}
              isThirdParty={envelope.isThirdParty}
              className={cn("text-body", !envelope.isThirdParty && "text-ink")}
            />
            {notes && <span className="text-caption text-ink-muted">{notes}</span>}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <span className="flex flex-col items-end gap-0.5">
              <Money cents={line.plannedUsdCents} currency="USD" className="text-amount" />
              {line.allocatedVesCents > 0 && (
                <Money
                  cents={line.allocatedVesCents}
                  currency="VES"
                  className="text-amount-small text-ink-muted"
                />
              )}
              <StatusBadge done={line.isDelivered}>
                {line.isDelivered ? (
                  "Entregado"
                ) : partial ? (
                  <>
                    Le llegaron <Money cents={line.allocatedUsdCents} currency="USD" />
                  </>
                ) : (
                  "Pendiente"
                )}
              </StatusBadge>
            </span>
            <ChevronRight aria-hidden="true" className="size-5 text-ink-muted" />
          </span>
        </span>
        {line.plannedUsdCents > 0 && (
          <ProgressBar
            label="Le llegó"
            // Entregado (R18) es lleno, aunque lo que llegó se cuente distinto.
            value={line.isDelivered ? line.plannedUsdCents : line.allocatedUsdCents}
            max={line.plannedUsdCents}
            valueText={`${formatMoney(line.allocatedUsdCents, "USD")} de ${formatMoney(line.plannedUsdCents, "USD")}`}
            // Bajo las cifras, sin pasar de la flecha: la fila sigue leyéndose de izquierda
            // a derecha.
            className="mr-6"
          />
        )}
      </Link>
    </ListRow>
  );
}

// Mientras carga: el esqueleto de una fila.
export function PlanRowSkeleton() {
  return (
    <ListRow aria-hidden="true">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-1/4" />
    </ListRow>
  );
}
