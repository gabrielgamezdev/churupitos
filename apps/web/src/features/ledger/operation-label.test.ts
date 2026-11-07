import { expect, it } from "vitest";

import { operationLabel } from "./operation-label";

const base = { adjustmentReason: null, incomeId: null };

it("un gasto que solo tiene comisiones se llama Comisión (R16)", () => {
  const fee = { isFee: true };
  expect(operationLabel({ ...base, kind: "expense", entries: [fee, fee] })).toBe("Comisión");
  expect(operationLabel({ ...base, kind: "expense", entries: [fee, { isFee: false }] })).toBe(
    "Gasto",
  );
  expect(operationLabel({ ...base, kind: "expense" })).toBe("Gasto");
});
