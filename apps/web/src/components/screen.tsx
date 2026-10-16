import { useQueryClient } from "@tanstack/react-query";

import { PullToRefresh } from "@/components/pull-to-refresh";
import { cn } from "@/lib/utils";

// El marco de cada pantalla: una columna para el pulgar, que respeta las barras del
// sistema y se recarga entera al estirar hacia abajo.
export function Screen({ className, children }: { className?: string; children: React.ReactNode }) {
  const queryClient = useQueryClient();
  return (
    <PullToRefresh onRefresh={() => queryClient.refetchQueries({ type: "active" })}>
      <main
        className={cn(
          "mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          className,
        )}
      >
        {children}
      </main>
    </PullToRefresh>
  );
}
