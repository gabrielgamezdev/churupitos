import { Input } from "@/components/ui/input";
import { amountInputText, cashierAmount, parseAmountInput } from "@/lib/amount-input";
import type { Currency } from "@/lib/money";
import { cn } from "@/lib/utils";

const SYMBOLS: Record<Currency, string> = { VES: "Bs", USD: "$" };

// El cursor, siempre al final: las cifras entran y salen por la derecha.
function keepCaretAtEnd(input: HTMLInputElement) {
  const end = input.value.length;
  if (input.selectionStart !== end || input.selectionEnd !== end) input.setSelectionRange(end, end);
}

interface AmountInputProps extends Omit<React.ComponentProps<"input">, "size"> {
  currency: Currency | undefined;
  invalid: boolean;
  // `hero`: la cifra grande de Registrar, la protagonista de la pantalla.
  size?: "default" | "hero";
}

// Un monto, con el símbolo de su moneda delante, escrito como en un cajero (M7): con el
// teclado numérico del sistema, cada cifra entra por la derecha y la coma no se escribe
// nunca, así que da igual el teclado o el idioma del teléfono. Lo que se ve, con punto de
// miles y coma decimal, se lee en céntimos con `parseAmountInput`.
export function AmountInput({
  currency,
  invalid,
  size = "default",
  className,
  onChange,
  ...props
}: AmountInputProps) {
  const hero = size === "hero";
  return (
    <span className={cn("relative flex", hero && "items-baseline gap-2")}>
      {currency && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none",
            currency === "VES" ? "text-ves" : "text-usd",
            hero ? "text-title" : "absolute top-1/2 left-3 -translate-y-1/2",
          )}
        >
          {SYMBOLS[currency]}
        </span>
      )}
      <Input
        inputMode="numeric"
        autoComplete="off"
        placeholder="0,00"
        aria-invalid={invalid ? true : undefined}
        className={cn(
          "tabular-nums",
          hero
            ? // El foco, en el subrayado: más grueso y en `brand`, en vez del recuadro.
              "h-auto rounded-none border-0 border-b bg-transparent px-0 pb-1 text-display-amount focus-visible:border-b-2 focus-visible:border-brand focus-visible:outline-none"
            : currency && "pl-10",
          className,
        )}
        onChange={(event) => {
          event.target.value = cashierAmount(event.target.value);
          onChange?.(event);
        }}
        // Pegar un monto lo reemplaza entero, leído como cualquier monto escrito.
        onPaste={(event) => {
          const cents = parseAmountInput(event.clipboardData.getData("text"));
          if (cents === null) return;
          event.preventDefault();
          const input = event.currentTarget;
          // El `value` nativo, para que React vea el cambio y avise al formulario.
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
            input,
            amountInputText(cents),
          );
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }}
        onSelect={(event) => keepCaretAtEnd(event.currentTarget)}
        onFocus={(event) => keepCaretAtEnd(event.currentTarget)}
        {...props}
      />
    </span>
  );
}
