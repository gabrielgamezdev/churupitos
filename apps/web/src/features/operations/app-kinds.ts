import type { MoveKind } from "./move-draft";
import type { OperationKind } from "./operation-draft";

export type AppKind = OperationKind | MoveKind;

const MOVE_KINDS: string[] = ["envelope_transfer", "account_transfer", "exchange"];

// Lo que se mueve sin gastarse (M8).
export function isMoveKind(kind: string): kind is MoveKind {
  return MOVE_KINDS.includes(kind);
}

// Lo que la app registra, y por tanto corrige y borra: los gastos, los ingresos sueltos
// y lo que se mueve. Los ajustes vienen solo del Excel, y los cobros, hasta M9, también.
export function isAppKind(kind: string): kind is AppKind {
  return kind === "expense" || kind === "income" || isMoveKind(kind);
}
