// De las filas de un mes a operaciones. Agrupar no cambia ningún saldo (una celda
// es la suma de sus asientos, vayan en la operación que vayan): decide qué tipo de
// operación es cada cosa y qué cobro paga qué ingreso. Por eso, ante la duda, no se
// agrupa: la fila queda sola, como gasto o ingreso, y el saldo sigue siendo exacto.
//
// En orden: los títulos con sus hijos (cobros, compras de USDT), los pares que van
// juntos (préstamos entre sobres, traspasos, cambios de divisa), lo que queda suelto
// y, al final, cada comisión pegada al movimiento que la causó.

import { daysBetween, entryOf, isFeeRow, rowRef } from "./draft.ts";
import type { DraftOperation, GroupingRule, OperationKind } from "./draft.ts";
import type { Issues } from "./issues.ts";
import type { LedgerRow } from "./ledger-sheet.ts";
import { parseAmountText } from "./money.ts";
import type { Currency } from "./money.ts";
import { normalizeLabel } from "./text.ts";

// Hasta dónde se busca la otra mitad de algo: los traspasos entre bancos llegan a
// tardar un par de días, y un título puede ir fechado distinto que sus hijos.
const MAX_DAYS = 2;
const MAX_CHILDREN = 30;
// Un título redondeado a mano («= Bs40000» cuando los hijos suman 40000,60) se acepta a una unidad.
const TITLE_TOLERANCE_CENTS = 100;

type Group = { title: LedgerRow | null; rows: LedgerRow[] };

export function groupMonth(
  month: string,
  ledger: LedgerRow[],
  currencyOf: (account: string) => Currency,
  issues: Issues,
  // Lo que el presupuesto dice que llegó en el mes, por moneda: si un título no
  // dice cuánto suman sus hijos («$100 del bono»), puede que sumen eso.
  receivedAmounts: Record<Currency, Set<number>> = { VES: new Set(), USD: new Set() },
): DraftOperation[] {
  const rows = ledger.filter((row) => !row.isCarry);
  const fees = new Set(rows.filter(isFeeRow));
  const used = new Set<LedgerRow>();
  const sheets = Map.groupBy(rows, (row) => row.sheet);
  // El texto de un título que no encontró a sus hijos: describe la fila siguiente.
  const borrowedTitles = new Map<LedgerRow, LedgerRow>();
  const groups: {
    kind: OperationKind;
    rule: GroupingRule;
    group: Group;
    description: string;
    extra?: Group;
  }[] = [];

  // --- Títulos: una fila de importe 0 que dice cuánto suman las siguientes (R4) ---
  const titles: Group[] = [];
  for (const sheetRows of sheets.values()) {
    sheetRows.forEach((title, i) => {
      if (title.amountCents !== 0) return;
      used.add(title);
      const currency = currencyOf(title.account);
      const after = sheetRows.slice(i + 1);
      const children =
        findChildren(title, after, fees, titleAmounts(title.description, currency)) ??
        findChildren(title, after, fees, { exact: receivedAmounts[currency], loose: [] });
      if (children) {
        children.forEach((child) => used.add(child));
        titles.push({ title, rows: children });
        return;
      }
      // Si la fila siguiente es otro título, este no describe nada.
      const next = sheetRows.slice(i + 1).find((row) => !fees.has(row));
      const describes = next !== undefined && next.amountCents !== 0 && next.date === title.date;
      if (describes) borrowedTitles.set(next, title);
      issues.warning(
        "TITLE_WITHOUT_CHILDREN",
        `«${title.description}» no suma lo de las filas siguientes${describes ? ": describe la siguiente" : ""}`,
        `${title.sheet}!${title.row}`,
      );
    });
  }

  // Un mismo título en dos hojas de signo contrario es una sola operación: la compra
  // de USDT sale de un banco y entra en la billetera.
  const merged = new Set<Group>();
  for (const out of titles.filter((group) => sign(group) < 0)) {
    const partners = titles.filter(
      (into) => sign(into) > 0 && !merged.has(into) && sameTitle(out, into),
    );
    const partner = partners.length === 1 ? partners[0]! : null;
    const kind = partner
      ? pairKind(out.rows[0]!, partner.rows[0]!, sum(out) + sum(partner), currencyOf)
      : null;
    if (!partner || !kind || kind === "envelope_transfer") continue;
    merged.add(out).add(partner);
    groups.push({
      kind,
      rule: "title_pair",
      group: out,
      extra: partner,
      description: out.title!.description,
    });
  }
  for (const group of titles.filter((candidate) => !merged.has(candidate))) {
    groups.push({
      kind: sign(group) > 0 ? "income" : "expense",
      rule: "title",
      group,
      description: group.title!.description,
    });
  }

  // --- Pares: dos filas que se anulan ---
  const free = () => rows.filter((row) => !used.has(row) && !fees.has(row));
  const pair = (a: LedgerRow, b: LedgerRow, kind: OperationKind, rule: GroupingRule) => {
    used.add(a).add(b);
    const [first, second] = a.amountCents < 0 ? [a, b] : [b, a];
    groups.push({
      kind,
      rule,
      group: { title: null, rows: [first, second] },
      description: first.description,
    });
  };

  // Seguidas en la misma hoja, mismo día y mismo concepto: «Salidas le presta a Comida».
  for (const sheetRows of sheets.values()) {
    const candidates = sheetRows.filter((row) => !used.has(row) && !fees.has(row));
    for (let i = 0; i + 1 < candidates.length; i++) {
      const [a, b] = [candidates[i]!, candidates[i + 1]!];
      if (used.has(a) || used.has(b) || a.row + 1 !== b.row) continue;
      if (a.date === b.date && a.amountCents === -b.amountCents && sameText(a, b))
        pair(a, b, "envelope_transfer", "adjacent");
    }
  }

  // El mismo concepto exactamente dos veces en el mes, cerca y con signos opuestos.
  // Si aparece tres veces, ninguna se junta: no hay forma de saber cuáles van juntas.
  const byText = Map.groupBy(
    free().filter((row) => normalizeLabel(row.description)),
    (row) => normalizeLabel(row.description),
  );
  for (const same of byText.values()) {
    if (same.length !== 2) continue;
    const [a, b] = same as [LedgerRow, LedgerRow];
    if (
      Math.sign(a.amountCents) === Math.sign(b.amountCents) ||
      daysBetween(a.date, b.date) > MAX_DAYS
    )
      continue;
    const kind = pairKind(a, b, a.amountCents + b.amountCents, currencyOf);
    if (kind) pair(a, b, kind, "same_text");
  }

  // El mismo importe en dos cuentas de la misma moneda, si cada una es la única
  // pareja posible de la otra: «Enviar dinero al Banco C» y «Dinero desde el Banco A».
  const matches = (a: LedgerRow, b: LedgerRow) =>
    a.amountCents === -b.amountCents &&
    a.account !== b.account &&
    currencyOf(a.account) === currencyOf(b.account) &&
    daysBetween(a.date, b.date) <= MAX_DAYS;
  const remaining = free();
  for (const out of remaining.filter((row) => row.amountCents < 0)) {
    const ins = remaining.filter((row) => !used.has(row) && matches(out, row));
    if (ins.length !== 1) continue;
    const outs = remaining.filter((row) => !used.has(row) && matches(ins[0]!, row));
    if (outs.length === 1 && outs[0] === out) pair(out, ins[0]!, "account_transfer", "same_amount");
  }

  // --- Lo suelto ---
  for (const row of free()) {
    used.add(row);
    groups.push({
      kind: row.amountCents < 0 ? "expense" : "income",
      rule: "single",
      group: { title: null, rows: [row] },
      description: row.description,
    });
  }

  // --- Las operaciones ---
  const operationOf = new Map<LedgerRow, DraftOperation>();
  const operations = groups.map(({ kind, rule, group, extra, description }) => {
    const members = [...group.rows, ...(extra?.rows ?? [])];
    const titleRows = [group.title, extra?.title].filter(
      (row) => row !== null && row !== undefined,
    );
    const borrowed = members
      .map((row) => borrowedTitles.get(row))
      .filter((row) => row !== undefined);
    const dated = group.title ?? members.reduce((a, b) => (b.date < a.date ? b : a));
    const operation: DraftOperation = {
      month,
      kind,
      date: dated.date,
      dateApproximate: dated.dateApproximate,
      description: borrowed[0]?.description ?? description,
      adjustmentReason: null,
      incomeKey: null,
      entries: members.map((row) => entryOf(row)),
      refs: [...titleRows, ...borrowed, ...members].map((row) => rowRef(month, row)),
      groupedBy: rule,
    };
    members.forEach((row) => operationOf.set(row, operation));
    return operation;
  });

  // --- Comisiones: con el movimiento de justo antes en la misma hoja y el mismo día ---
  for (const sheetRows of sheets.values()) {
    sheetRows.forEach((fee, i) => {
      if (!fees.has(fee)) return;
      const anchor = sheetRows
        .slice(0, i)
        .reverse()
        .find((row) => !fees.has(row) && row.amountCents !== 0);
      const operation = anchor && anchor.date === fee.date ? operationOf.get(anchor) : undefined;
      if (operation) {
        operation.entries.push(entryOf(fee, true));
        operation.refs.push(rowRef(month, fee));
        return;
      }
      // Una comisión sola es un gasto, como el mantenimiento mensual.
      operations.push({
        month,
        kind: "expense",
        date: fee.date,
        dateApproximate: fee.dateApproximate,
        description: fee.description,
        adjustmentReason: null,
        incomeKey: null,
        entries: [entryOf(fee, true)],
        refs: [rowRef(month, fee)],
        groupedBy: "fee",
      });
    });
  }

  return operations;
}

// Las filas que siguen a un título y suman una de las cifras buscadas: mismo signo,
// misma hoja, fechas cercanas. Se prefiere la primera suma exacta; si no hay, la
// primera que se acerca a una cifra escrita en la moneda de la hoja.
function findChildren(
  title: LedgerRow,
  after: LedgerRow[],
  fees: Set<LedgerRow>,
  { exact, loose }: { exact: Set<number>; loose: number[] },
) {
  const children: LedgerRow[] = [];
  let total = 0;
  let approximate: number | null = null;
  for (const row of after) {
    if (row.amountCents === 0 || children.length >= MAX_CHILDREN) break;
    if (fees.has(row)) continue;
    if (daysBetween(row.date, title.date) > MAX_DAYS) break;
    if (children.length > 0 && Math.sign(row.amountCents) !== Math.sign(children[0]!.amountCents))
      break;
    children.push(row);
    total += Math.abs(row.amountCents);
    if (exact.has(total)) return children;
    if (
      approximate === null &&
      loose.some((amount) => Math.abs(amount - total) <= TITLE_TOLERANCE_CENTS)
    ) {
      approximate = children.length;
    }
  }
  return approximate === null ? null : children.slice(0, approximate);
}

// Las cifras de un título: «Bono $1000 = Bs400000», «Comprar 10,50 USDT»,
// «= 400000». Las que llevan la marca de la otra moneda no cuentan.
export function titleAmounts(text: string, currency: Currency) {
  const exact = new Set<number>();
  const loose: number[] = [];
  const afterEquals = text.lastIndexOf("=");
  for (const match of text.matchAll(
    /(bs\.?\s*|\$\s*|usdt\s*)?(\d[\d.,]*\d|\d)(\s*(?:bs|usdt|\$))?/gi,
  )) {
    const marker = (match[1] ?? match[3] ?? "").trim().toLowerCase();
    const marked: Currency | null = marker.startsWith("bs") ? "VES" : marker ? "USD" : null;
    const cents = parseAmountText(match[2]!)?.cents;
    if (cents === undefined || (marked && marked !== currency)) continue;
    exact.add(cents);
    if (marked === currency || (afterEquals >= 0 && match.index > afterEquals)) loose.push(cents);
  }
  return { exact, loose };
}

// El tipo de dos movimientos que se compensan, o null si no tienen forma de nada.
function pairKind(
  a: LedgerRow,
  b: LedgerRow,
  total: number,
  currencyOf: (account: string) => Currency,
): OperationKind | null {
  if (currencyOf(a.account) !== currencyOf(b.account)) return "exchange";
  if (total !== 0) return null;
  return a.account === b.account ? "envelope_transfer" : "account_transfer";
}

function sameTitle(a: Group, b: Group): boolean {
  if (
    a.rows[0]!.account === b.rows[0]!.account ||
    daysBetween(a.title!.date, b.title!.date) > MAX_DAYS
  )
    return false;
  if (sameText(a.title!, b.title!)) return true;
  const numbers = (group: Group) =>
    [...group.title!.description.matchAll(/\d[\d.,]*\d|\d/g)].map(
      (m) => parseAmountText(m[0])?.cents,
    );
  const theirs = new Set(numbers(b));
  return numbers(a).some((cents) => cents !== undefined && theirs.has(cents));
}

const sameText = (a: LedgerRow, b: LedgerRow) =>
  normalizeLabel(a.description) === normalizeLabel(b.description);
const sum = (group: Group) => group.rows.reduce((total, row) => total + row.amountCents, 0);
const sign = (group: Group) => Math.sign(sum(group));
