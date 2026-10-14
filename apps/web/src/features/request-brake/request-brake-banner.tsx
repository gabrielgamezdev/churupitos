import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { requestBrake } from "@/lib/supabase";

// Si el freno salta, la app deja de consultar hasta recargar (ver
// src/lib/request-brake.ts). Se avisa arriba, porque sin el aviso parecería que
// la app se colgó sin razón.
export function RequestBrakeBanner() {
  const tripped = useSyncExternalStore(requestBrake.subscribe, requestBrake.isTripped);
  if (!tripped) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-50 mx-auto flex max-w-sm flex-col gap-2 rounded-lg border border-destructive/40 bg-card p-3 shadow-lg"
    >
      <p className="text-sm font-medium">La app hizo demasiadas consultas seguidas y se frenó.</p>
      <p className="text-sm text-muted-foreground">
        Es un error de la app, y así no gasta tus datos móviles. Recarga para seguir; si vuelve a
        pasar, hay que revisarlo.
      </p>
      <Button size="sm" className="self-end" onClick={() => window.location.reload()}>
        Recargar
      </Button>
    </div>
  );
}
