import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

// Las etiquetas del design system (Bs, $, «Otro», Descubierto…), adaptadas de shadcn.
// Cada una dice algo con su palabra: el color solo acompaña.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-sm px-2 py-0.5 text-label whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        plain: "bg-surface-sunken text-ink-muted",
        ves: "bg-ves-soft text-ves",
        usd: "bg-usd-soft text-usd",
        // «Otro» se distingue también por el borde, no solo por el color (R11).
        thirdParty: "border border-dashed border-third-party bg-third-party-soft text-third-party",
        // ✅ y ⏳ del Excel: lo cobrado o entregado, y lo pendiente (`StatusBadge`).
        done: "bg-brand-soft text-brand",
        pending: "bg-surface-sunken text-ink-muted",
        overdrawn: "bg-overdrawn-soft text-overdrawn",
      },
    },
    defaultVariants: {
      variant: "plain",
    },
  },
);

function Badge({
  className,
  variant = "plain",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
