import { cn } from "cn";
import { RefreshCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { describeUpdatedAt } from "@/lib/updated-at";

// Los estados de cada pantalla (docs/DESIGN_SYSTEM.md, «Estados»). Cargando es el
// esqueleto de lo que va a venir: cada pantalla lo dibuja con `Skeleton`.

// Vacío: qué falta, en una frase. «Sin movimientos en septiembre».
export function EmptyState({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p className={cn("px-4 py-6 text-center text-body text-ink-muted", className)} {...props} />
  );
}

interface ErrorStateProps {
  // Qué pasó, sin disculpas: «No se pudieron cargar los saldos.»
  message: string;
  onRetry: () => void;
  className?: string;
}

// Error: qué pasó y qué hacer.
export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center gap-3 px-4 py-6 text-center", className)}
    >
      <p className="text-body">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw aria-hidden="true" />
        Reintentar
      </Button>
    </div>
  );
}

interface OfflineBannerProps {
  // Cuándo se guardó lo que se está viendo.
  updatedAt: Date;
  className?: string;
}

// Sin conexión: se ve lo último guardado, y el aviso dice de cuándo es.
export function OfflineBanner({ updatedAt, className }: OfflineBannerProps) {
  return (
    <p
      role="status"
      className={cn(
        "inline-flex items-center gap-2 self-center rounded-full bg-surface-sunken px-4 py-2 text-caption text-ink-muted",
        className,
      )}
    >
      <WifiOff aria-hidden="true" className="size-5 shrink-0" />
      Sin conexión · datos {describeUpdatedAt(updatedAt)}
    </p>
  );
}
