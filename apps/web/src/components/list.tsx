import { cn } from "cn";
import { Slot } from "radix-ui";

// Las listas del design system: un bloque `surface-raised` con filas separadas por
// una línea fina. Casi todo en M2 es una lista; solo las tarjetas de moneda no.
export function List({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn(
        "flex flex-col divide-y divide-hairline overflow-hidden rounded-lg bg-surface-raised",
        className,
      )}
      {...props}
    />
  );
}

interface ListRowProps extends React.ComponentProps<"div"> {
  // Con `asChild`, la fila es su hijo (un enlace, un botón) y toda ella se toca.
  asChild?: boolean;
}

// Una fila: lo principal a la izquierda y la cifra a la derecha, de al menos `tap`
// de alto para el pulgar.
export function ListRow({ asChild = false, className, ...props }: ListRowProps) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <li>
      <Comp
        className={cn(
          "flex min-h-tap items-center justify-between gap-3 px-4 py-3",
          asChild && "active:bg-surface-sunken",
          className,
        )}
        {...props}
      />
    </li>
  );
}
