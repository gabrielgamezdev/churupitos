import { formatMoney, type Currency } from "@/lib/money";
import { cn } from "@/lib/utils";

export type MoneyKind = "movement" | "balance";
type Tone = "in" | "out" | "overdrawn" | "neutral";

// Lo neutro no pone color: hereda el del texto que lo rodea (una cuenta en cero va
// en `ink-muted`; la parte de «Otro», en `third-party`). Lo que sale tampoco (M7):
// va con su «−» y en el color del texto, para que el rojo quede para los errores y el
// ámbar del descubierto destaque.
const TONE_CLASSES: Record<Tone, string> = {
  in: "text-money-in",
  out: "",
  overdrawn: "text-overdrawn",
  neutral: "",
};

interface MoneyProps extends Omit<React.ComponentProps<"span">, "children"> {
  cents: number;
  currency: Currency;
  // Un movimiento lleva signo, y lo que entra, además, su verde. Un saldo va sin
  // color, salvo por debajo de cero: un descubierto (R6), que no es un error.
  kind?: MoneyKind;
}

export function Money({ cents, currency, kind = "balance", className, ...props }: MoneyProps) {
  const tone = toneOf(cents, kind);
  return (
    <span
      data-tone={tone}
      className={cn("whitespace-nowrap tabular-nums", TONE_CLASSES[tone], className)}
      {...props}
    >
      {formatMoney(cents, currency, { signed: kind === "movement" })}
    </span>
  );
}

function toneOf(cents: number, kind: MoneyKind): Tone {
  if (kind === "balance") return cents < 0 ? "overdrawn" : "neutral";
  if (cents > 0) return "in";
  return cents < 0 ? "out" : "neutral";
}
