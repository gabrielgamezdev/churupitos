import * as React from "react";
import { cn } from "@/lib/utils";

// Adaptado de shadcn al design system: alto `tap`, borde de control y el foco común.
// El texto va a 16 px para que el navegador no amplíe la pantalla al escribir.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-tap w-full min-w-0 rounded-md border border-line-strong bg-surface-raised px-3 text-base text-ink transition-colors file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink placeholder:text-ink-muted disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
