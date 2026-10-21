import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useEffect, useEffectEvent } from "react";

import { cn } from "@/lib/utils";

// Una hoja que sube desde abajo, como el `Sheet` de shadcn con `side="bottom"` pero solo
// con ese lado: es el Dialog de Radix, que encierra el foco, bloquea el fondo y se
// cierra con un toque fuera. No vaul, que está abandonado (M7).

type CloseWatcherLike = { onclose: (() => void) | null; destroy: () => void };
type WithCloseWatcher = { CloseWatcher?: new () => CloseWatcherLike };

// El atrás de Android cierra la hoja en vez de salir de la pantalla. Radix no lo escucha:
// solo Escape. `CloseWatcher` (Chrome 126+) recibe ese atrás, y en un navegador sin él el
// atrás sale de la pantalla, como antes. Los tipos del DOM de TypeScript aún no lo traen.
function useCloseWatcher(open: boolean, onClose: () => void) {
  const close = useEffectEvent(onClose);
  useEffect(() => {
    const Watcher = (window as WithCloseWatcher).CloseWatcher;
    if (!open || !Watcher) return;
    const watcher = new Watcher();
    watcher.onclose = () => close();
    return () => watcher.destroy();
  }, [open]);
}

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function Sheet({ open, onOpenChange, children }: SheetProps) {
  useCloseWatcher(open, () => onOpenChange(false));
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}

interface SheetContentProps extends Omit<
  React.ComponentProps<typeof DialogPrimitive.Content>,
  "title"
> {
  // El título va siempre, aunque sea solo para el lector de pantalla.
  title: React.ReactNode;
  // Encima del título, pequeño: qué es («Gasto · Lunes 13»).
  eyebrow?: React.ReactNode;
}

function SheetContent({ title, eyebrow, className, children, ...props }: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
      <DialogPrimitive.Content
        // Sin descripción aparte: lo que se lee es el contenido entero.
        aria-describedby={undefined}
        // Ningún campo se enfoca solo: abriría el teclado sin que se pidiera.
        onOpenAutoFocus={(event) => event.preventDefault()}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-lg bg-surface-raised pb-[env(safe-area-inset-bottom,0px)] outline-none",
          "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom motion-reduce:animate-none",
          className,
        )}
        {...props}
      >
        <div
          aria-hidden="true"
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-hairline"
        />
        <div className="flex shrink-0 items-start justify-between gap-2 px-4 pt-2">
          <div className="flex min-w-0 flex-col gap-0.5 pt-2">
            {eyebrow && <p className="text-label text-ink-muted">{eyebrow}</p>}
            <DialogPrimitive.Title className="text-title break-words">
              {title}
            </DialogPrimitive.Title>
          </div>
          <DialogPrimitive.Close
            aria-label="Cerrar"
            className="-mr-2 grid size-tap shrink-0 place-items-center rounded-md text-ink-muted hover:bg-surface-sunken"
          >
            <XIcon aria-hidden="true" className="size-5" />
          </DialogPrimitive.Close>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto overscroll-contain px-4 pt-3 pb-4">
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export { Sheet, SheetContent };
