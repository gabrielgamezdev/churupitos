import { cn } from "@/lib/utils";

// El esqueleto de lo que va a venir, en `surface-sunken`. Late solo si el teléfono
// no pide menos movimiento.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-sm bg-surface-sunken motion-safe:animate-pulse", className)}
      {...props}
    />
  );
}

export { Skeleton };
