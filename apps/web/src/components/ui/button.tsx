import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

// Adaptado de shadcn al design system: todo lo que se toca mide al menos `tap`, y el
// foco es el anillo común de styles.css.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent bg-clip-padding text-body font-medium whitespace-nowrap transition-colors select-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "bg-brand text-on-brand hover:bg-brand/90",
        outline:
          "border-line-strong bg-surface-raised text-ink hover:bg-surface-sunken aria-expanded:bg-surface-sunken",
        ghost: "text-ink hover:bg-surface-sunken aria-expanded:bg-surface-sunken",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        default: "h-tap px-4",
        icon: "size-tap",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
