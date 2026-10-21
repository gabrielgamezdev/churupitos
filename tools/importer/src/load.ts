// La carga en la base. Hasta el corte, la base se vacía y se recarga entera desde los
// Excels, en una sola transacción: o entra todo, o no entra nada. En seco se hace
// lo mismo y al final se deshace, después de que la base haya comprobado cada
// operación con sus reglas (R5 y las de los cobros): así se prueba sin duplicar en
// el importador ninguna regla de la base.

import { randomUUID } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import type { ImportPackage } from "./build-package.ts";
import type { Catalog } from "./catalog.ts";
import type { DraftOperation } from "./draft.ts";
import type { OracleResult } from "./oracle.ts";

// Cada tabla con sus filas, en el orden en que se escriben (padres antes que hijos).
export type Rows = {
  accounts: Record<string, unknown>[];
  envelopes: Record<string, unknown>[];
  expected_incomes: Record<string, unknown>[];
  operations: Record<string, unknown>[];
  entries: Record<string, unknown>[];
  budget_lines: Record<string, unknown>[];
  debts: Record<string, unknown>[];
};

export type Plan = { rows: Rows; operationById: Map<string, DraftOperation> };

// Lo registrado en la app que la recarga borró (o habría borrado, en seco).
export type AppData = { operations: number; debts: number; months: number; catalog: number };

export type LoadOutcome =
  | { status: "not_run"; reason: string }
  | {
      status: "ok";
      dryRun: boolean;
      counts: Record<keyof Rows, number>;
      appData: AppData;
      oracle: OracleResult | null;
    }
  | { status: "rejected"; message: string; operation: DraftOperation | null };

// Los identificadores se generan aquí y no en la base, para escribir cada tabla de
// una vez sin tener que leer lo que devuelve.
export function planRows(pkg: ImportPackage, catalog: Catalog): Plan {
  const accountIds = new Map(catalog.accounts.map((account) => [account.name, randomUUID()]));
  const envelopeIds = new Map(catalog.envelopes.map((envelope) => [envelope.name, randomUUID()]));
  const incomeIds = new Map(pkg.expectedIncomes.map((income) => [income.key, randomUUID()]));
  const incomeEmoji = new Map(catalog.incomes.map((income) => [income.name, income.emoji]));
  const operationById = new Map<string, DraftOperation>();

  const operations = pkg.operations.map((operation) => {
    const id = randomUUID();
    operationById.set(id, operation);
    return { id, operation };
  });

  return {
    operationById,
    rows: {
      accounts: catalog.accounts.map((account) => ({
        id: accountIds.get(account.name),
        name: account.name,
        currency: account.currency,
        position: account.position,
      })),
      envelopes: catalog.envelopes.map((envelope) => ({
        id: envelopeIds.get(envelope.name),
        name: envelope.name,
        is_third_party: envelope.thirdParty,
        emoji: envelope.emoji,
        position: envelope.position,
      })),
      expected_incomes: pkg.expectedIncomes.map((income) => ({
        id: incomeIds.get(income.key),
        month_start: `${income.month}-01`,
        name: income.name,
        emoji: incomeEmoji.get(income.name) ?? null,
        expected_usd_cents: income.usdCents,
        position: income.position,
      })),
      operations: operations.map(({ id, operation }) => ({
        id,
        kind: operation.kind,
        occurred_on: operation.date,
        date_approximate: operation.dateApproximate,
        description: operation.description,
        adjustment_reason: operation.adjustmentReason,
        income_id: operation.incomeKey ? incomeIds.get(operation.incomeKey) : null,
      })),
      entries: operations.flatMap(({ id, operation }) =>
        operation.entries.map((entry) => ({
          operation_id: id,
          account_id: accountIds.get(entry.account),
          envelope_id: envelopeIds.get(entry.envelope),
          amount_cents: entry.amountCents,
          is_fee: entry.isFee,
          description: entry.description,
          position: entry.position,
          usd_value_cents: entry.usdValueCents,
        })),
      ),
      budget_lines: pkg.budgetLines.map((line) => ({
        month_start: `${line.month}-01`,
        envelope_id: envelopeIds.get(line.envelope),
        planned_usd_cents: line.plannedUsdCents,
        funding_note: line.fundingNote,
        action_note: line.actionNote,
      })),
      debts: pkg.debts.map((debt) => ({
        direction: debt.direction,
        description: debt.description,
        amount_cents: debt.amountCents,
        currency: debt.currency,
        due_on: debt.dueOn,
        paid_on: debt.paidOn,
        position: debt.position,
      })),
    },
  };
}

// Por debajo del tope de parámetros de Postgres (65.535) con cualquier tabla.
const CHUNK = 1000;

class Rollback extends Error {}

// `inspect` corre dentro de la misma transacción, con todo ya escrito y comprobado:
// es donde se compara con el Excel, también en seco. Con `requireClean`, un solo saldo
// que no coincida deshace la carga entera: así se escribe en la nube.
//
// Lo registrado en la app solo se borra con `discardAppData`: hasta el corte se
// registra en paralelo, y el Excel ya lo tiene. En seco no hace falta pedirlo, porque
// no queda nada escrito.
export async function writeRows(
  sql: Sql,
  plan: Plan,
  dryRun: boolean,
  inspect?: (tx: TransactionSql) => Promise<OracleResult>,
  requireClean = false,
  discardAppData = false,
): Promise<LoadOutcome> {
  const tables = Object.keys(plan.rows) as (keyof Rows)[];
  let oracle: OracleResult | null = null;
  let written = !dryRun;
  let appData: AppData = { operations: 0, debts: 0, months: 0, catalog: 0 };
  try {
    await sql.begin(async (tx) => {
      const [registered] = await tx<AppData[]>`
        select
          (select count(*)::int from public.operations where created_by is not null) as operations,
          (select count(*)::int from public.debts where created_by is not null) as debts,
          (select count(distinct month_start)::int from (
            select month_start from public.expected_incomes
            where created_by is not null or updated_by is not null
            union all
            select month_start from public.budget_lines
            where created_by is not null or updated_by is not null
          ) budget) as months,
          (select count(*)::int from (
            select id from public.envelopes where created_by is not null or updated_by is not null
            union all
            select id from public.accounts where created_by is not null or updated_by is not null
          ) catalog) as catalog`;
      appData = registered ?? appData;
      // La base se vacía con su propia función, que lleva el candado del corte.
      await tx`select public.reset_imported_data(include_app_data => ${dryRun || discardAppData})`;
      for (const table of tables) {
        const rows = plan.rows[table];
        for (let i = 0; i < rows.length; i += CHUNK) {
          await tx`insert into ${tx(table)} ${tx(rows.slice(i, i + CHUNK) as Record<string, string>[])}`;
        }
      }
      // Las posiciones importadas son las filas del Excel. Lo que se registre después en
      // la app sigue desde la última, para quedar detrás de lo importado del mismo día
      // (R14).
      await tx`select setval(pg_get_serial_sequence('public.entries', 'position'),
        (select coalesce(max(position), 0) + 1 from public.entries), false)`;
      // Las comprobaciones de forma son diferidas: esto las hace correr ya, y no al
      // confirmar, para que también corran en seco.
      await tx`set constraints all immediate`;
      if (inspect) oracle = await inspect(tx);
      if (requireClean && (oracle?.differences.length ?? 0) > 0) written = false;
      if (!written) throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) return rejected(error, plan);
  }
  const counts = Object.fromEntries(tables.map((table) => [table, plan.rows[table].length]));
  return {
    status: "ok",
    dryRun: !written,
    counts: counts as Record<keyof Rows, number>,
    oracle,
    appData,
  };
}

// La base dice qué operación rechazó en el detalle del error (las funciones de forma
// lo ponen así): se traduce a la operación del Excel para que se pueda buscar.
function rejected(error: unknown, plan: Plan): LoadOutcome {
  const { message = String(error), detail = "" } = error as { message?: string; detail?: string };
  const id = /operación ([0-9a-f-]{36})/.exec(detail)?.[1];
  return {
    status: "rejected",
    message,
    operation: id ? (plan.operationById.get(id) ?? null) : null,
  };
}
