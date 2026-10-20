import type { ExpectedIncome } from "./queries";

// Los totales de los ingresos del mes, con las cuentas del Excel: lo cobrado suma lo
// esperado de los ✅, y lo que falta, lo de los ⏳.
export function incomeTotals(incomes: ExpectedIncome[]) {
  const sum = (list: ExpectedIncome[]) =>
    list.reduce((total, income) => total + income.expectedUsdCents, 0);
  return {
    expectedUsdCents: sum(incomes),
    receivedUsdCents: sum(incomes.filter((income) => income.receipt)),
    pendingUsdCents: sum(incomes.filter((income) => !income.receipt)),
  };
}

const thousands = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 0 });

// La tasa de un cobro (R8): los Bs que llegaron por cada dólar, con dos decimales como
// en el Excel. Solo se pinta; nunca se usa para calcular un importe. Se redondea en
// centésimas con enteros, sin pasar por un decimal.
export function formatRate(vesCents: number, usdCents: number): string {
  const hundredths = Math.round((vesCents * 100) / usdCents);
  const whole = thousands.format(Math.floor(hundredths / 100));
  return `${whole},${String(hundredths % 100).padStart(2, "0")}`;
}
