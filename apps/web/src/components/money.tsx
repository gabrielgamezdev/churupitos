import { cn } from "cn";

import { formatMoney, type Currency } from "@/lib/money";

export type MoneyKind = "movement" | "balance";
type Tone = "in" | "out" | "overdrawn" | "neutral";

// Lo neutro no pone color: hereda el del texto que lo rodea (una cuenta en cero va
// en `ink-muted`; la parte de «Otro», en `third-party`).
const TONE_CLASSES: Record<Tone, string> = {
  in: "text-money-in",
  out: "text-money-out",
  overdrawn: "text-overdrawn",
  neutral: "",
};

interface MoneyProps extends Omit<React.ComponentProps<"span">, "children"> {
  cents: number;
  currency: Currency;
  // Un movimiento lleva signo y el color de lo que entra o sale. Un saldo va sin
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
