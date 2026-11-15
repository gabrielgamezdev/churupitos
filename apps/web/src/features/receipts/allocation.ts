import type { BudgetLine, ExpectedIncome } from "@/features/budget/queries";
import { foldText } from "@/lib/text";

// El reparto de un cobro (M9): en dólares, como la «Distribución» del Excel (R9).

export type AllocationLine = { envelopeId: string; usdCents: number };

type Income = Pick<ExpectedIncome, "id" | "name" | "expectedUsdCents">;
type FundedLine = Pick<BudgetLine, "envelopeId" | "plannedUsdCents" | "fundingNote">;

// Cuánto pone un ingreso en un sobre del plan.
export type FundingShare = { incomeId: string; envelopeId: string; usdCents: number };

// Los ingresos que nombra la fuente de un sobre, como la lee la propuesta: sin mayúsculas ni
// tildes, en cualquier parte del texto.
export function fundingIncomes<T extends Pick<Income, "name">>(fundingNote: string, incomes: T[]) {
  const note = foldText(fundingNote);
  return incomes.filter((income) => {
    const name = foldText(income.name.trim());
    return name !== "" && note.includes(name);
  });
}

// Cuánto pone cada ingreso en cada sobre (R22), deducido del plan, sin guardarlo: un sobre al
// que solo le falta fijar una fuente se lleva de ella lo que le falta; un ingreso al que solo
// le falta fijar un sobre le da lo que le queda; y así, hasta fijarlas todas. Si no se puede
// (dos ingresos llenan los mismos dos sobres) o no cuadra (el plan no suma lo esperado de
// cada ingreso, o sale algo negativo), `null`: Cobrar propone sin ella.
export function fundingShares(incomes: Income[], plan: FundedLine[]): FundingShare[] | null {
  const shares: { incomeId: string; envelopeId: string; usdCents: number | null }[] = [];
  for (const line of plan) {
    if (line.plannedUsdCents <= 0) continue;
    for (const income of fundingIncomes(line.fundingNote, incomes)) {
      shares.push({ incomeId: income.id, envelopeId: line.envelopeId, usdCents: null });
    }
  }
  const planned = new Map(plan.map((line) => [line.envelopeId, line.plannedUsdCents]));
  const expected = new Map(incomes.map((income) => [income.id, income.expectedUsdCents]));
  const settled = (key: "envelopeId" | "incomeId", id: string) =>
    shares
      .filter((share) => share[key] === id)
      .reduce((sum, share) => sum + (share.usdCents ?? 0), 0);
  const settle = (key: "envelopeId" | "incomeId", totals: Map<string, number>) => {
    let progress = false;
    for (const [id, total] of totals) {
      const open = shares.filter((share) => share[key] === id && share.usdCents === null);
      if (open.length !== 1) continue;
      open[0]!.usdCents = total - settled(key, id);
      progress = true;
    }
    return progress;
  };
  while (settle("envelopeId", planned) || settle("incomeId", expected)) {
    // Cada vuelta fija al menos una: termina.
  }
  if (shares.some((share) => share.usdCents === null || share.usdCents < 0)) return null;
  const adds = (key: "envelopeId" | "incomeId", totals: Map<string, number>) =>
    [...totals].every(
      ([id, total]) => !shares.some((share) => share[key] === id) || settled(key, id) === total,
    );
  if (!adds("envelopeId", planned) || !adds("incomeId", expected)) return null;
  return shares as FundingShare[];
}

// Lo que pone un ingreso en cada sobre: lo que la propuesta de Cobrar necesita.
export function sharesOf(shares: FundingShare[] | null, incomeId: string) {
  if (!shares) return undefined;
  return new Map(
    shares
      .filter((share) => share.incomeId === incomeId)
      .map((share) => [share.envelopeId, share.usdCents]),
  );
}

// El reparto que se propone al cobrar: los sobres del plan cuya fuente de fondos nombra
// el ingreso, cada uno con lo que le falta de lo planeado y sin pasar de lo que se cobra.
// Con la parte de cada fuente (`shares`, R22), cada sobre recibe la suya, sin pasar de lo que
// le falta: así un sobre con dos fuentes no se lleva también lo que pondrá la otra.
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
  // Lo que pone este ingreso en cada sobre, si se pudo deducir del plan (R22).
  shares?: ReadonlyMap<string, number>,
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
  if (shares) {
    for (const line of plan.filter((l) => shares.has(l.envelopeId)).sort(byPosition)) {
      const lack = Math.max(line.plannedUsdCents - line.allocatedUsdCents, 0);
      const amount = Math.min(shares.get(line.envelopeId) ?? 0, lack, left);
      if (amount <= 0) continue;
      lines.push({ envelopeId: line.envelopeId, usdCents: amount });
      left -= amount;
    }
    return lines;
  }
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
