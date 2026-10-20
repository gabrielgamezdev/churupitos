import type { Envelope } from "@/features/envelopes/queries";

import type { BudgetChecks, BudgetLine, ExpectedIncome } from "./queries";

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

export type PlanRow = { line: BudgetLine; envelope: Envelope };

// El plan como se enseña: los sobres con algo planeado, en el orden del presupuesto; y
// aparte, los de $0, que el Excel lista igual pero no esperan nada. Los totales, como
// el Excel: lo entregado suma lo planeado de los ✅, y lo que falta, lo de los ⏳.
export function summarizePlan(lines: BudgetLine[], envelopes: Envelope[]) {
  const envelopeById = new Map(envelopes.map((envelope) => [envelope.id, envelope]));
  const rows = lines
    .flatMap((line) => {
      const envelope = envelopeById.get(line.envelopeId);
      return envelope ? [{ line, envelope }] : [];
    })
    .sort((a, b) => a.envelope.position - b.envelope.position);
  const sum = (list: PlanRow[]) => list.reduce((total, row) => total + row.line.plannedUsdCents, 0);
  return {
    planned: rows.filter((row) => row.line.plannedUsdCents > 0),
    unplanned: rows.filter((row) => row.line.plannedUsdCents === 0),
    totals: {
      plannedUsdCents: sum(rows),
      deliveredUsdCents: sum(rows.filter((row) => row.line.isDelivered)),
      pendingUsdCents: sum(rows.filter((row) => !row.line.isDelivered)),
    },
  };
}

// El cuadre del mes (R12 a y b), en lo que se aparta: lo que el plan reparte de más
// frente a lo que se espera, y los Bs repartidos de más frente a los cobrados. Cero es
// que cuadra; negativo, que falta por repartir. La (c) y la (d) se cumplen solas (R2).
export function budgetBalance(checks: BudgetChecks) {
  return {
    planOverUsdCents: checks.plannedUsdCents - checks.expectedUsdCents,
    allocatedOverVesCents: checks.allocatedVesCents - checks.receivedVesCents,
  };
}
