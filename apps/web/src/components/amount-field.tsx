import { Input } from "@/components/ui/input";
import type { Currency } from "@/lib/money";
import { cn } from "@/lib/utils";

const SYMBOLS: Record<Currency, string> = { VES: "Bs", USD: "$" };

// Un monto, con el símbolo de su moneda delante y el teclado numérico con coma. Lo
// tecleado se lee en céntimos con `parseAmountInput`.
export function AmountInput({
  currency,
  invalid,
  className,
  ...props
}: React.ComponentProps<"input"> & { currency: Currency | undefined; invalid: boolean }) {
  return (
    <span className="relative flex">
      {currency && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted"
        >
          {SYMBOLS[currency]}
        </span>
      )}
      <Input
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        aria-invalid={invalid ? true : undefined}
        className={cn("tabular-nums", currency && "pl-10", className)}
        {...props}
      />
    </span>
  );
}
