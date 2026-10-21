import { z } from "zod";

import type { BudgetLine, ExpectedIncome } from "@/features/budget/queries";
import { amountInputText, parseAmountInput } from "@/lib/amount-input";
import { foldText } from "@/lib/text";

// «Planear» (M10): el presupuesto de un mes entero, como se edita la hoja del Excel. Los
// montos son texto, como se teclean.

// Lo que cabe en la fuente o en la acción de un sobre: lo mismo que acepta la base.
const NOTE_MAX = 120;

// Lo planeado para un sobre: vacío es $0, que es como se quita un sobre del plan.
export function plannedCents(text: string): number | null {
  return text.trim() === "" ? 0 : parseAmountInput(text);
}

export const planFormSchema = z
  .object({
    incomes: z.array(
      z.object({
        id: z.string(),
        name: z.string().trim().min(1, "Escribe de dónde viene.").max(40, "Hasta 40 letras."),
        emoji: z.string().nullable(),
        usd: z
          .string()
          .refine((value) => parseAmountInput(value) !== null, "Escribe cuánto se espera."),
        // Ya tiene su cobro: se puede cambiar, no quitar (R19).
        received: z.boolean(),
      }),
    ),
    lines: z.array(
      z.object({
        envelopeId: z.string(),
        usd: z
          .string()
          .refine((value) => plannedCents(value) !== null, "Ese monto no se entiende."),
        fundingNote: z.string().max(NOTE_MAX, `Hasta ${NOTE_MAX} letras.`),
        actionNote: z.string().max(NOTE_MAX, `Hasta ${NOTE_MAX} letras.`),
        // Agregado ahora, sin guardar: se puede quitar. Lo guardado se deja en $0.
        added: z.boolean(),
      }),
    ),
  })
  .refine((values) => values.incomes.length > 0 || values.lines.length > 0, {
    message: "Un mes necesita al menos un ingreso o un sobre.",
    path: ["incomes"],
  });

export type PlanFormValues = z.input<typeof planFormSchema>;

// Lo que se espera y lo que se planea, en dólares: el cuadre `R12` (a), que es un aviso.
// Lo que no se entiende cuenta como cero mientras se escribe.
export function planTotals(values: Pick<PlanFormValues, "incomes" | "lines">) {
  const expectedUsdCents = values.incomes.reduce(
    (sum, income) => sum + (parseAmountInput(income.usd) ?? 0),
    0,
  );
  const plannedUsdCents = values.lines.reduce(
    (sum, line) => sum + (plannedCents(line.usd) ?? 0),
    0,
  );
  return { expectedUsdCents, plannedUsdCents, pendingUsdCents: expectedUsdCents - plannedUsdCents };
}

const position = (order: string[]) => (envelopeId: string) => {
  const index = order.indexOf(envelopeId);
  return index === -1 ? order.length : index;
};

// Un mes como está, para cambiarlo. Los ingresos llegan ya en su orden; los sobres van en
// el del presupuesto.
export function planFromMonth(
  incomes: ExpectedIncome[],
  lines: BudgetLine[],
  envelopeOrder: string[],
): PlanFormValues {
  const at = position(envelopeOrder);
  return {
    incomes: incomes.map((income) => ({
      id: income.id,
      name: income.name,
      emoji: income.emoji,
      usd: amountInputText(income.expectedUsdCents),
      received: income.receipt !== null,
    })),
    lines: [...lines]
      .sort((a, b) => at(a.envelopeId) - at(b.envelopeId))
      .map((line) => ({
        envelopeId: line.envelopeId,
        usd: line.plannedUsdCents > 0 ? amountInputText(line.plannedUsdCents) : "",
        fundingNote: line.fundingNote,
        actionNote: line.actionNote,
        added: false,
      })),
  };
}

// El mes siguiente, copiado del último (R19): los mismos ingresos, con identificadores
// nuevos y sin cobrar, y el mismo plan.
export function planFromPrevious(
  incomes: ExpectedIncome[],
  lines: BudgetLine[],
  envelopeOrder: string[],
  newId: () => string,
): PlanFormValues {
  const copy = planFromMonth(incomes, lines, envelopeOrder);
  return {
    incomes: copy.incomes.map((income) => ({ ...income, id: newId(), received: false })),
    lines: copy.lines,
  };
}

// Lo que guarda `save_month`: los ingresos en su orden y el plan, en céntimos.
export type MonthRows = {
  incomes: { id: string; name: string; emoji: string | null; expected_usd_cents: number }[];
  lines: {
    envelope_id: string;
    planned_usd_cents: number;
    funding_note: string;
    action_note: string;
  }[];
};

export function monthRows(values: PlanFormValues): MonthRows {
  return {
    incomes: values.incomes.map((income) => ({
      id: income.id,
      name: income.name.trim(),
      emoji: income.emoji,
      expected_usd_cents: parseAmountInput(income.usd) ?? 0,
    })),
    lines: values.lines.map((line) => ({
      envelope_id: line.envelopeId,
      planned_usd_cents: plannedCents(line.usd) ?? 0,
      funding_note: line.fundingNote.trim(),
      action_note: line.actionNote.trim(),
    })),
  };
}

// Los ingresos que nombra la fuente de un sobre, como los lee la propuesta de Cobrar (M9):
// sin mayúsculas ni tildes, en cualquier parte del texto.
export function fundingNames(note: string, names: string[]): string[] {
  const folded = foldText(note);
  return names.filter((name) => name.trim() && folded.includes(foldText(name.trim())));
}

// Tocar un ingreso en la fuente: si estaba, sale; si no, entra al final, con su emoji
// (`label`), como se escribe en el Excel. El resto del texto se respeta: hay fuentes con
// abreviaturas que no son el nombre de ningún ingreso, y se perderían.
export function toggleFunding(note: string, name: string, label = name): string {
  const range = findFolded(note, name.trim());
  if (!range) {
    const text = note.trim();
    return text ? `${text}, ${label}` : label;
  }
  // Fuera el nombre, y con él lo que quede suelto: su emoji, un separador de más.
  const rest = note.slice(0, range[0]) + note.slice(range[1]);
  return rest
    .split(/\s*,\s*|\s+\+\s+|\s+y\s+/)
    .map((part) => part.trim())
    .filter((part) => /[\p{L}\p{N}]/u.test(part))
    .join(", ");
}

// Dónde está `name` dentro de `note`, sin mayúsculas ni tildes: el trozo del texto tal cual
// está escrito. Se pliega letra a letra para no perder la cuenta de dónde cae cada una.
function findFolded(note: string, name: string): [number, number] | null {
  const target = foldText(name);
  if (!target) return null;
  let folded = "";
  // Para cada letra plegada, dónde empieza la suya en el texto original.
  const origin: number[] = [];
  let offset = 0;
  for (const char of note) {
    const piece = foldText(char);
    for (let i = 0; i < piece.length; i++) origin.push(offset);
    folded += piece;
    offset += char.length;
  }
  origin.push(offset);
  const at = folded.indexOf(target);
  if (at === -1) return null;
  return [origin[at]!, origin[at + target.length]!];
}

// Las acciones ya escritas en el plan, de la más usada a la menos: se eligen con un toque.
export function usedActions(lines: Pick<PlanFormValues["lines"][number], "actionNote">[]) {
  const uses = new Map<string, number>();
  for (const line of lines) {
    const action = line.actionNote.trim();
    if (action) uses.set(action, (uses.get(action) ?? 0) + 1);
  }
  return [...uses.entries()].sort((a, b) => b[1] - a[1]).map(([action]) => action);
}
