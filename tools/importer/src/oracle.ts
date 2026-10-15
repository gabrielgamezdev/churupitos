// El oráculo: lo que verá la app, comparado con lo que dice el Excel al cierre de
// cada mes. Se lee con la sesión de un miembro del hogar y por las mismas funciones
// de saldos que usa la app, así que la comparación prueba también los permisos.
//
// El Excel nunca se usa para calcular: solo es el testigo. Los saldos de la app
// salen de sumar asientos (R2); los del Excel, de sus columnas «Restante».

import type { TransactionSql } from "postgres";
import type { Currency } from "./money.ts";
import type { MonthData } from "./read-workbook.ts";

export type Difference = {
  month: string;
  what: string;
  currency: Currency;
  excelCents: number;
  appCents: number;
};

export type OracleResult = {
  checks: number;
  // Saldos que no coinciden: tienen que ser cero para dar M1 por hecho.
  differences: Difference[];
  // Lo que la app calcula distinto del Excel en el presupuesto: se anota y se revisa.
  budgetNotes: { month: string; message: string }[];
};

export async function compareWithExcel(
  tx: TransactionSql,
  months: MonthData[],
): Promise<OracleResult> {
  const [member] = await tx<
    { user_id: string }[]
  >`select user_id from public.household_members limit 1`;
  if (!member) throw new Error("no hay ningún miembro del hogar en la base para leer como la app");
  await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: member.user_id, role: "authenticated" })}, true)`;
  await tx`set local role authenticated`;

  const result: OracleResult = { checks: 0, differences: [], budgetNotes: [] };
  const compare = (
    month: string,
    what: string,
    currency: Currency,
    excelCents: number,
    appCents: number,
  ) => {
    result.checks += 1;
    if (excelCents !== appCents)
      result.differences.push({ month, what, currency, excelCents, appCents });
  };

  for (const data of months) {
    const asOf = lastDay(data.month);
    const accounts =
      await tx`select name, currency, balance_cents from public.account_balances(${asOf})`;
    const envelopes = await tx`
      select v.name, b.currency, b.balance_cents
      from public.envelope_balances(${asOf}) b join public.envelopes v on v.id = b.envelope_id`;
    const totals =
      await tx`select currency, total_cents, own_cents from public.currency_totals(${asOf})`;
    const appAccount = (name: string) => accounts.find((row) => row.name === name);

    // Cada cuenta, contra el último «Restante» de su hoja.
    for (const sheetRows of Map.groupBy(data.ledger, (row) => row.account).values()) {
      const last = sheetRows.findLast((row) => row.balanceCents !== null);
      const app = appAccount(last?.account ?? "");
      if (last && app)
        compare(
          data.month,
          `Cuenta ${last.account}`,
          app.currency,
          last.balanceCents!,
          Number(app.balance_cents),
        );
    }

    // Cada sobre en cada moneda, contra las columnas «Restante Bs» y «Restante $».
    for (const line of data.budget?.lines ?? []) {
      for (const [currency, excel] of [
        ["VES", line.remainingVesCents],
        ["USD", line.remainingUsdCents],
      ] as const) {
        if (!line.envelope || excel === null) continue;
        const app = envelopes.find(
          (row) => row.name === line.envelope && row.currency === currency,
        );
        compare(
          data.month,
          `Sobre ${line.envelope}`,
          currency,
          excel,
          Number(app?.balance_cents ?? 0),
        );
      }
    }

    // Los totales con y sin «Otro» (R11). Sin la línea «con Otro», que no existió
    // hasta abril, el total del Excel es el de todo.
    const excelTotals = data.budget?.totals;
    for (const currency of ["VES", "USD"] as const) {
      const app = totals.find((row) => row.currency === currency);
      if (!excelTotals || !app) continue;
      const [own, all] =
        currency === "VES"
          ? [excelTotals.vesCents, excelTotals.vesWithThirdPartyCents]
          : [excelTotals.usdCents, excelTotals.usdWithThirdPartyCents];
      if (all !== null)
        compare(data.month, "Total con Otro", currency, all, Number(app.total_cents));
      if (own !== null) {
        compare(
          data.month,
          all === null ? "Total" : "Total sin Otro",
          currency,
          own,
          Number(all === null ? app.total_cents : app.own_cents),
        );
      }
    }

    await compareBudget(tx, data, result);
  }

  await tx`reset role`;
  return result;
}

// R18 y R12: los ✅/⏳ y las comprobaciones del mes, que la app calcula y el Excel
// tecleaba. Una diferencia no impide nada: es para revisarla.
async function compareBudget(tx: TransactionSql, data: MonthData, result: OracleResult) {
  const month = `${data.month}-01`;
  const note = (message: string) => result.budgetNotes.push({ month: data.month, message });
  const incomes = await tx`
    select position, name, is_received from public.expected_income_summary
    where month_start = ${month} order by position`;
  const excelIncomes = (data.budget?.incomes ?? []).filter(
    (row) => row.source && (row.usdCents ?? 0) > 0,
  );
  excelIncomes.forEach((row, i) => {
    const app = incomes[i];
    if (app && row.checked !== null && row.checked !== app.is_received) {
      note(
        `${row.sourceText}: el Excel dice ${row.checked ? "✅" : "⏳"} y la app, ${app.is_received ? "✅" : "⏳"}`,
      );
    }
  });

  const lines = await tx`
    select v.name, s.is_delivered from public.budget_summary s join public.envelopes v on v.id = s.envelope_id
    where s.month_start = ${month}`;
  for (const line of data.budget?.lines ?? []) {
    const app = lines.find((row) => row.name === line.envelope);
    if (app && line.checked !== null && line.checked !== app.is_delivered) {
      note(
        `Plan de ${line.envelope}: el Excel dice ${line.checked ? "✅" : "⏳"} y la app, ${app.is_delivered ? "✅" : "⏳"}`,
      );
    }
  }

  const [checks] = await tx`select * from public.budget_checks where month_start = ${month}`;
  if (checks && Number(checks.expected_usd_cents) !== Number(checks.planned_usd_cents)) {
    note("El plan no reparte exactamente lo esperado en dólares (R12 a)");
  }
  if (checks && Number(checks.received_ves_cents) !== Number(checks.allocated_ves_cents)) {
    note("Los Bs repartidos entre los sobres no suman los Bs cobrados (R12 b)");
  }
}

function lastDay(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
}
