import type { ConceptUsage } from "@/features/envelopes/queries";
import { foldText } from "@/lib/text";

import type { OperationKind } from "./operation-draft";

// Cuántas se proponen a la vez: las que caben sin tapar el resto del formulario.
export const MAX_SUGGESTIONS = 4;

// Desde cuántas letras se propone algo: con una, saldría casi todo.
const MIN_TYPED = 2;

export type ConceptSuggestion = { description: string; envelopeId: string };

type Concept = {
  description: string;
  lastOn: string;
  uses: number;
  usesHere: number;
  startsWith: boolean;
  // Por sobre: cuántas veces en total y en la cuenta elegida.
  envelopes: Map<string, { uses: number; usesHere: number }>;
};

// Los conceptos de antes que se parecen a lo que se escribe (M7), del mismo tipo (gasto o
// ingreso), cada uno con su sobre. Primero los que empiezan así, luego los más usados en
// la cuenta elegida y en total, y a igual uso los más recientes. El sobre es el que más
// se usó con ese concepto en esa cuenta o, si nunca se usó en ella, en cualquiera. Sin
// mayúsculas ni tildes: «cafe» encuentra «Café», que se propone como se escribió la
// última vez.
export function conceptSuggestions(
  rows: ConceptUsage[],
  typed: string,
  kind: OperationKind,
  accountId: string,
): ConceptSuggestion[] {
  const query = foldText(typed.trim());
  if (query.length < MIN_TYPED) return [];

  const concepts = new Map<string, Concept>();
  for (const row of rows) {
    if (row.kind !== kind) continue;
    const key = foldText(row.description.trim());
    if (!key.includes(query)) continue;
    const here = row.accountId === accountId ? row.uses : 0;
    const concept = concepts.get(key) ?? {
      description: row.description.trim(),
      lastOn: row.lastOn,
      uses: 0,
      usesHere: 0,
      startsWith: key.startsWith(query),
      envelopes: new Map(),
    };
    concept.uses += row.uses;
    concept.usesHere += here;
    if (row.lastOn > concept.lastOn) {
      concept.lastOn = row.lastOn;
      concept.description = row.description.trim();
    }
    const envelope = concept.envelopes.get(row.envelopeId) ?? { uses: 0, usesHere: 0 };
    envelope.uses += row.uses;
    envelope.usesHere += here;
    concept.envelopes.set(row.envelopeId, envelope);
    concepts.set(key, concept);
  }

  return [...concepts.values()]
    .sort(
      (a, b) =>
        Number(b.startsWith) - Number(a.startsWith) ||
        b.usesHere - a.usesHere ||
        b.uses - a.uses ||
        b.lastOn.localeCompare(a.lastOn),
    )
    .slice(0, MAX_SUGGESTIONS)
    .map((concept) => {
      const [envelopeId] = [...concept.envelopes].sort(
        ([, a], [, b]) => b.usesHere - a.usesHere || b.uses - a.uses,
      )[0]!;
      return { description: concept.description, envelopeId };
    });
}
