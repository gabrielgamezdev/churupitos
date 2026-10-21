import { useRouterState } from "@tanstack/react-router";
import { XIcon } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { isFormScreen } from "@/components/sections";
import {
  currentToast,
  dismissToast,
  showToast,
  subscribeToToast,
  TOAST_MS,
  TOAST_WITH_ACTION_MS,
  type Toast,
} from "@/lib/toast";
import { useOnline } from "@/lib/use-online";
import { cn } from "@/lib/utils";
import { writeErrorMessage } from "@/lib/write-error";

// El aviso de abajo (M7), justo encima de la barra; en un formulario, que no la tiene,
// pegado al borde. La región se queda montada aunque no haya aviso: así el lector de
// pantalla anuncia cada uno nuevo.
export function Toaster() {
  const toast = useSyncExternalStore(subscribeToToast, currentToast);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <div
      data-slot="toaster"
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed inset-x-0 z-40 mx-auto flex max-w-md px-4",
        isFormScreen(pathname)
          ? "bottom-[calc(env(safe-area-inset-bottom,0px)_+_0.75rem)]"
          : "bottom-[calc(var(--tab-bar-height)_+_env(safe-area-inset-bottom,0px)_+_0.5rem)]",
      )}
    >
      {/* Cada aviso nuevo empieza su cuenta de cero. */}
      {toast && <ToastCard key={toast.id} toast={toast} />}
    </div>
  );
}

function ToastCard({ toast }: { toast: Toast }) {
  const online = useOnline();
  const [running, setRunning] = useState(false);
  // Tocarlo, pasar el ratón o el foco por encima detienen la cuenta, y soltarlo la sigue.
  const [held, setHeld] = useState(false);
  const remaining = useRef(toast.action ? TOAST_WITH_ACTION_MS : TOAST_MS);

  useEffect(() => {
    if (held || running) return;
    const started = Date.now();
    const timer = setTimeout(() => dismissToast(toast.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [held, running, toast.id]);

  const { action } = toast;
  const run = async () => {
    if (!action) return;
    setRunning(true);
    try {
      await action.run();
      showToast({ message: "Deshecho" });
    } catch (error) {
      // Lo guardado sigue ahí: se puede corregir o borrar a mano desde su lista.
      showToast({ message: "No se deshizo", detail: writeErrorMessage(error) });
    }
  };

  return (
    <div
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onPointerDown={() => setHeld(true)}
      onPointerUp={(event) => event.pointerType !== "mouse" && setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      className="pointer-events-auto flex w-full items-center gap-1 rounded-lg border border-hairline bg-surface-raised py-1 pr-1 pl-4 shadow-card animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none"
    >
      <div className="flex min-w-0 flex-1 flex-col py-2">
        <p className="text-body font-medium">{toast.message}</p>
        {toast.detail && <p className="text-caption text-ink-muted">{toast.detail}</p>}
      </div>
      {action && (
        <button
          type="button"
          disabled={!online || running}
          onClick={() => void run()}
          className="h-tap shrink-0 rounded-md px-3 text-body font-semibold text-brand hover:bg-surface-sunken disabled:opacity-50"
        >
          {running ? "Deshaciendo…" : action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Cerrar el aviso"
        onClick={() => dismissToast(toast.id)}
        className="grid size-tap shrink-0 place-items-center rounded-md text-ink-muted hover:bg-surface-sunken"
      >
        <XIcon aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
