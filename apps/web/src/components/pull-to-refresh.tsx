import { RefreshCw } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";

import { cn } from "@/lib/utils";

// Cuánto hay que estirar (en píxeles de pantalla) para recargar, y hasta dónde baja
// el indicador. El dedo recorre el doble: el tirón se frena a la mitad.
export const PULL_THRESHOLD_PX = 64;
const PULL_MAX_PX = 96;

interface PullToRefreshProps {
  onRefresh: () => Promise<unknown>;
  children: React.ReactNode;
}

// Estirar hacia abajo desde arriba del todo recarga la pantalla. Instalada, la app
// no tiene el gesto del navegador (styles.css lo apaga también en el navegador, que
// recargaría la página entera).
export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useEffectEvent(() => onRefresh());

  useEffect(() => {
    let startY: number | null = null;
    let distance = 0;
    let busy = false;

    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      startY = !busy && window.scrollY <= 0 && touch ? touch.clientY : null;
    };
    const onMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (startY === null || !touch) return;
      distance = Math.min(Math.max((touch.clientY - startY) / 2, 0), PULL_MAX_PX);
      setPull(distance);
    };
    const onEnd = () => {
      if (startY === null) return;
      const reached = distance >= PULL_THRESHOLD_PX;
      startY = null;
      distance = 0;
      setPull(0);
      if (!reached) return;
      busy = true;
      setRefreshing(true);
      void refresh().finally(() => {
        busy = false;
        setRefreshing(false);
      });
    };

    const passive = { passive: true };
    window.addEventListener("touchstart", onStart, passive);
    window.addEventListener("touchmove", onMove, passive);
    window.addEventListener("touchend", onEnd, passive);
    window.addEventListener("touchcancel", onEnd, passive);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  const offset = refreshing ? PULL_THRESHOLD_PX : pull;
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top,0px)] z-40 flex justify-center"
        style={{
          transform: `translateY(${offset - 44}px)`,
          opacity: Math.min(offset / PULL_THRESHOLD_PX, 1),
        }}
      >
        <span className="grid size-10 place-items-center rounded-full bg-surface-raised text-brand shadow-card">
          <RefreshCw
            className={cn("size-5", refreshing && "motion-safe:animate-spin")}
            style={refreshing ? undefined : { transform: `rotate(${pull * 3}deg)` }}
          />
        </span>
      </div>
      <p role="status" className="sr-only">
        {refreshing ? "Actualizando…" : ""}
      </p>
      {children}
    </>
  );
}
