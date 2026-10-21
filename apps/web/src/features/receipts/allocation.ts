import type { BudgetLine } from "@/features/budget/queries";
import { foldText } from "@/lib/text";

// El reparto de un cobro (M9): en dólares, como la «Distribución» del Excel (R9).

export type AllocationLine = { envelopeId: string; usdCents: number };

// El reparto que se propone al cobrar: los sobres del plan cuya fuente de fondos nombra
// el ingreso, cada uno con lo que le falta de lo planeado y sin pasar de lo que se cobra.
// Primero los que solo se llenan con este ingreso, y con lo que sobre, los que comparte
// con otros (la fuente nombra a varios): si no, uno grande compartido se come el cobro y
// deja sin nada a sobres que no tienen otra fuente. Se enseñan en el orden del
// presupuesto. Así fue en casi todos los cobros del Excel; lo demás se ajusta a mano.
export function proposeAllocation(
  incomeName: string,
  usdCents: number,
  plan: Pick<BudgetLine, "envelopeId" | "plannedUsdCents" | "allocatedUsdCents" | "fundingNote">[],
  envelopeOrder: string[],
  // Los demás ingresos del mes, para saber qué sobres se comparten.
  otherIncomeNames: string[] = [],
): AllocationLine[] {
  const name = foldText(incomeName.trim());
  const others = otherIncomeNames.map((other) => foldText(other.trim())).filter(Boolean);
  const position = (envelopeId: string) => {
    const index = envelopeOrder.indexOf(envelopeId);
    return index === -1 ? envelopeOrder.length : index;
  };
  const byPosition = (a: { envelopeId: string }, b: { envelopeId: string }) =>
    position(a.envelopeId) - position(b.envelopeId);
  const funded = plan
    .filter((line) => line.plannedUsdCents > 0 && name && foldText(line.fundingNote).includes(name))
    .sort(byPosition);
  const shared = (line: (typeof funded)[number]) =>
    others.some((other) => other !== name && foldText(line.fundingNote).includes(other));

  let left = usdCents;
  const lines: AllocationLine[] = [];
  for (const line of [...funded.filter((l) => !shared(l)), ...funded.filter(shared)]) {
    const amount = Math.min(Math.max(line.plannedUsdCents - line.allocatedUsdCents, 0), left);
    if (amount <= 0) continue;
    lines.push({ envelopeId: line.envelopeId, usdCents: amount });
    left -= amount;
  }
  return lines.sort(byPosition);
}

// Los bolívares de cada línea del reparto, de sus dólares a la tasa del cobro (Bs que
// llegaron ÷ $ que se reconocen), redondeados al céntimo. Si las líneas suman los dólares
// del cobro, la última se queda con la diferencia, para que los Bs sumen justo lo que
// llegó (R9). Con enteros grandes: el producto de dos importes pasa de lo que un número
// guarda sin perder céntimos.
export function allocationInBs(
  usdLines: number[],
  receivedVesCents: number,
  recognizedUsdCents: number,
): number[] {
  if (recognizedUsdCents <= 0) return usdLines.map(() => 0);
  const received = BigInt(receivedVesCents);
  const total = BigInt(recognizedUsdCents);
  const atRate = (usd: number) => Number((BigInt(usd) * received * 2n + total) / (total * 2n));
  const bs = usdLines.map(atRate);
  const usdSum = usdLines.reduce((sum, usd) => sum + usd, 0);
  if (usdLines.length > 0 && usdSum === recognizedUsdCents) {
    const others = bs.slice(0, -1).reduce((sum, cents) => sum + cents, 0);
    bs[bs.length - 1] = receivedVesCents - others;
  }
  return bs;
}
