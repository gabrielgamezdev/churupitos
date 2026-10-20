import { ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

// Un `<select>` del navegador con el aspecto de `Input`: en Android abre la lista del
// sistema, que se maneja mejor con el pulgar que una hecha a mano.
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <span className="relative flex">
      <select
        data-slot="native-select"
        className={cn(
          "h-tap w-full min-w-0 appearance-none rounded-md border border-line-strong bg-surface-raised pr-10 pl-3 text-base text-ink transition-colors disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive",
          className,
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-ink-muted"
      />
    </span>
  );
}

export { NativeSelect };
