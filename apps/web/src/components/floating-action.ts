import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// El botón que flota sobre la barra de secciones («Registrar», «Agregar»), a la derecha
// de la columna de la app, también en una pantalla ancha. Quien lo usa deja su hueco al
// final de la pantalla (`h-tap`) para que no tape la última fila.
export const floatingActionClass = cn(
  buttonVariants(),
  "fixed right-[max(1rem,calc(50vw-13rem))] bottom-[calc(var(--tab-bar-height)_+_env(safe-area-inset-bottom,0px)_+_1rem)] z-20 rounded-full pr-5 shadow-card",
);
