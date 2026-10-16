import { cn } from "cn";
import { RefreshCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { describeUpdatedAt } from "@/lib/updated-at";
import { useOnline } from "@/lib/use-online";

// Lo que hace falta de una consulta de TanStack Query para decidir qué estado enseñar.
interface QueryState {
  dataUpdatedAt: number;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

interface MissingDataProps {
  queries: QueryState[];
  // Qué no se pudo cargar: «No se pudieron cargar los saldos.»
  errorMessage: string;
  skeleton: React.ReactNode;
}

// Mientras falta algún dato de la pantalla: el error con su «Reintentar», el aviso de
// que sin red no hay nada guardado o, si está en camino, el esqueleto.
export function MissingData({ queries, errorMessage, skeleton }: MissingDataProps) {
  const online = useOnline();
  if (queries.some((query) => query.isError)) {
    return (
      <ErrorState
        message={errorMessage}
        onRetry={() => void Promise.all(queries.map((query) => query.refetch()))}
      />
    );
  }
  if (!online) return <EmptyState>Sin conexión, y todavía no hay datos guardados.</EmptyState>;
  return skeleton;
}

// Si lo que se ve no está al día, dice por qué y de cuándo es: tan viejo como la más
// vieja de sus consultas.
export function StaleDataBanner({ queries }: { queries: QueryState[] }) {
  const online = useOnline();
  if (online && !queries.some((query) => query.isError)) return null;
  const updatedAt = new Date(Math.min(...queries.map((query) => query.dataUpdatedAt)));
  return <OfflineBanner updatedAt={updatedAt} reason={online ? "failed" : "offline"} />;
}

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
  // Cuándo se trajo lo que se está viendo.
  updatedAt: Date;
  // Sin red, o con red pero sin respuesta de la base: en los dos casos se ve lo
  // último guardado.
  reason?: "offline" | "failed";
  className?: string;
}

// Lo que se ve no está al día: el aviso dice por qué y de cuándo es.
export function OfflineBanner({ updatedAt, reason = "offline", className }: OfflineBannerProps) {
  const Icon = reason === "offline" ? WifiOff : RefreshCw;
  return (
    <p
      role="status"
      className={cn(
        "inline-flex items-center gap-2 self-center rounded-full bg-surface-sunken px-4 py-2 text-caption text-ink-muted",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-5 shrink-0" />
      {reason === "offline" ? "Sin conexión" : "No se pudo actualizar"} · datos{" "}
      {describeUpdatedAt(updatedAt)}
    </p>
  );
}
