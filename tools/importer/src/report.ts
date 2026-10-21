// El informe en seco: qué se va a escribir y cada caso raro con la decisión que se
// tomó por defecto, para que el autor diga cuáles quiere cambiar. Lleva nombres y
// cifras reales, así que se escribe en privado/.

import type { ImportPackage } from "./build-package.ts";
import type { DraftOperation, GroupingRule } from "./draft.ts";
import type { Issue } from "./issues.ts";
import type { AppData, LoadOutcome } from "./load.ts";
import type { Currency } from "./money.ts";
import type { MonthData } from "./read-workbook.ts";

const RULES: Record<GroupingRule, string> = {
  title: "Un título y las filas que suman lo que dice",
  title_pair: "El mismo título en dos cuentas (compra de dólares, traspaso)",
  adjacent: "Dos filas seguidas que se anulan (préstamo entre sobres)",
  same_text: "El mismo concepto dos veces en el mes, con signos opuestos",
  same_amount: "El mismo importe en dos cuentas, sin otra pareja posible",
  single: "Una fila sola: gasto o ingreso",
  fee: "Una comisión sola: gasto",
  carry: "Deducido del arrastre",
};

const REASONS: Record<string, string> = {
  opening: "Saldo inicial",
  correction: "Céntimos de redondeo",
  carry_reassignment: "Cambio de sobre",
};

// Lo que se hizo con cada tipo de aviso que no tiene su propia sección.
const WARNINGS: Record<string, string> = {
  DATE_APPROXIMATE:
    "Filas sin fecha (R15): toman la de la fila anterior de su hoja y quedan marcadas como aproximadas.",
  DATE_OUTSIDE_MONTH: "Fechas de otro mes: se respetan, así que cuentan en el mes de su fecha.",
  AMOUNT_MISSING: "Filas con texto y sin importe: se tratan como títulos.",
  TITLE_WITHOUT_CHILDREN:
    "Títulos que no suman lo de sus filas: no agrupan nada; si la fila siguiente es del mismo día, le ponen su texto.",
  CARRY_UNEXPLAINED:
    "Arrastres que no cuadran con el cierre anterior: se registran tal cual, y el dinero aparece o desaparece ese día.",
  UNKNOWN_ACCOUNT_LABEL:
    "Cuentas del presupuesto que no están en el catálogo: solo afectan a la comparación final.",
  DEBT_WITHOUT_AMOUNT: "Deudas sin importe: no se importan.",
  DEBT_WITHOUT_CURRENCY: "Deudas sin moneda en el Excel.",
  DEBT_CURRENCY_GUESSED: "Deudas sin moneda: en Bs si pasan de 1.000, si no en $.",
  DUPLICATE_BUDGET_LINE: "Sobres que aparecen dos veces en el plan: vale la primera fila.",
  ALLOCATION_TOO_SMALL:
    "Cobros con una línea demasiado pequeña para pasarla a dólares: no se enlazan.",
};
const IN_OWN_SECTION = new Set([
  "ALLOCATION_DERIVED",
  "ALLOCATION_TEXT_MISMATCH",
  "RECEIPT_NOT_FOUND",
  "RECEIPT_SPLIT",
  "RECEIPT_FROM_EARLIER",
]);

export function buildReport(pkg: ImportPackage, months: MonthData[], outcome: LoadOutcome): string {
  const errors = pkg.issues.filter((issue) => issue.level === "error");
  const warnings = pkg.issues.filter((issue) => issue.level === "warning");
  const lines: string[] = [
    "# Informe del importador, en seco",
    "",
    `Generado el ${new Date().toLocaleString("es-VE")}. Privado: lleva datos reales.`,
    "",
    "## 1. Resultado",
    "",
    `- **Meses:** ${pkg.months.join(", ")}.`,
    `- **Errores:** ${errors.length === 0 ? "ninguno." : `${errors.length}. Hasta arreglarlos no se carga nada.`}`,
    ...errors.map(
      (issue) => `  - ${issue.month ?? ""} ${issue.code}: ${issue.message}${where(issue)}`,
    ),
    `- **La base:** ${describeOutcome(outcome)}`,
    `- **Contra el Excel:** ${describeOracle(outcome)}`,
    "",
    ...oracleSection(outcome),
    "## 3. Lo que se va a escribir",
    "",
    table(
      [
        "Mes",
        "Filas",
        "Operaciones",
        "Gastos",
        "Ingresos",
        "Cobros",
        "Entre sobres",
        "Traspasos",
        "Cambios",
        "Ajustes",
      ],
      pkg.months.map((month) => {
        const ops = pkg.operations.filter((operation) => operation.month === month);
        const count = (kind: string) =>
          String(ops.filter((operation) => operation.kind === kind).length);
        return [
          month,
          String(months.find((data) => data.month === month)?.ledger.length ?? 0),
          String(ops.length),
          count("expense"),
          String(
            ops.filter((operation) => operation.kind === "income" && !operation.incomeKey).length,
          ),
          String(ops.filter((operation) => operation.incomeKey).length),
          count("envelope_transfer"),
          count("account_transfer"),
          count("exchange"),
          count("adjustment"),
        ];
      }),
    ),
    "",
    "## 4. El arrastre",
    "",
    "Decisión por defecto: «Lo que tenía antes» no se importa; se compara con el cierre del mes",
    "anterior y solo lo que no coincide queda como ajuste (DOMINIO.md §5).",
    "",
    table(
      ["Mes", "Fecha", "Cuenta", "Motivo", "Cambios por sobre"],
      pkg.operations
        .filter((operation) => operation.kind === "adjustment")
        .map((operation) => [
          operation.month,
          operation.date,
          operation.entries[0]?.account ?? "",
          REASONS[operation.adjustmentReason ?? ""] ?? String(operation.adjustmentReason),
          operation.entries
            .map(
              (entry) =>
                `${entry.envelope} ${money(entry.amountCents, currencyOf(pkg, entry.account))}`,
            )
            .join(" · "),
        ]),
    ),
    "",
    ...receiptsSection(pkg, warnings),
    "## 6. Cómo se agruparon las filas",
    "",
    "Decisión por defecto: ante la duda no se agrupa, y la fila queda sola. Los saldos no",
    "cambian por cómo se agrupe: solo el tipo de cada operación.",
    "",
    table(
      ["Regla", "Operaciones"],
      Object.entries(RULES).map(([rule, label]) => [
        label,
        String(pkg.operations.filter((operation) => operation.groupedBy === rule).length),
      ]),
    ),
    "",
    "## 7. Filas raras",
    "",
  ];

  const byCode = Map.groupBy(
    warnings.filter((issue) => !IN_OWN_SECTION.has(issue.code)),
    (issue) => issue.code,
  );
  if (byCode.size === 0) lines.push("Ninguna.", "");
  for (const [code, issues] of byCode) {
    lines.push(`### ${WARNINGS[code] ?? code}`, "");
    lines.push(
      ...issues.map((issue) => `- ${issue.month ?? ""}${where(issue)}: ${issue.message}`),
      "",
    );
  }

  lines.push(
    "## 8. Las deudas",
    "",
    "Decisión por defecto: lo pendiente y las pagadas del mes en curso (D9).",
    "",
  );
  lines.push(
    table(
      ["", "Concepto", "Importe", "Vence", ""],
      pkg.debts.map((debt) => [
        debt.direction === "payable" ? "Debemos" : "Nos deben",
        debt.description,
        money(debt.amountCents, debt.currency),
        debt.dueOn ?? "",
        debt.paidOn ? "✅" : "",
      ]),
    ),
    "",
  );
  return lines.join("\n");
}

// Cada ingreso esperado con su cobro, mes a mes.
function receiptsSection(pkg: ImportPackage, warnings: Issue[]): string[] {
  const lines = [
    "## 5. Los cobros",
    "",
    "Decisión por defecto: cada ingreso esperado se enlaza con la operación que suma lo que",
    "llegó en fechas cercanas, si es la única posible. El valor en dólares de cada línea es",
    "el que dice su concepto («$60 de …»); si no lo dicen todas, se calcula en proporción (R9).",
    "",
  ];
  const notes = (operation: DraftOperation) =>
    warnings
      .filter((issue) => IN_OWN_SECTION.has(issue.code) && issue.ref === operation.refs[0])
      .map((issue) =>
        issue.code === "ALLOCATION_DERIVED"
          ? "reparto calculado"
          : issue.code === "ALLOCATION_TEXT_MISMATCH"
            ? "los «$N de…» no cuadran con sus Bs: valen los Bs"
            : issue.code === "RECEIPT_SPLIT"
              ? "partido"
              : "del libro del mes anterior",
      );
  lines.push(
    table(
      ["Mes", "Ingreso", "Esperado", "Cobro", "Notas"],
      pkg.expectedIncomes.map((income) => {
        const operation = pkg.operations.find((candidate) => candidate.incomeKey === income.key);
        const parts = operation?.entries.filter((entry) => !entry.isFee) ?? [];
        const received = parts.reduce((sum, entry) => sum + entry.amountCents, 0);
        return [
          income.month,
          income.name,
          money(income.usdCents, "USD"),
          operation
            ? `${operation.date}, ${money(received, currencyOf(pkg, parts[0]!.account))}`
            : "⏳ sin cobro",
          operation ? notes(operation).join(", ") : "",
        ];
      }),
    ),
    "",
  );
  const missing = warnings.filter((issue) => issue.code === "RECEIPT_NOT_FOUND");
  if (missing.length > 0) {
    lines.push("**Marcados ✅ en el Excel pero sin cobro encontrado:**", "");
    lines.push(...missing.map((issue) => `- ${issue.month}${where(issue)}: ${issue.message}`), "");
  }
  return lines;
}

function describeOracle(outcome: LoadOutcome): string {
  const oracle = outcome.status === "ok" ? outcome.oracle : null;
  if (!oracle) return "no se comparó.";
  return oracle.differences.length === 0
    ? `los ${oracle.checks} saldos comparados coinciden al céntimo.`
    : `**${oracle.differences.length} de ${oracle.checks} saldos no coinciden** (sección 2).`;
}

// Los saldos que no coinciden con el Excel y lo que el presupuesto calcula distinto.
function oracleSection(outcome: LoadOutcome): string[] {
  const oracle = outcome.status === "ok" ? outcome.oracle : null;
  if (!oracle) return [];
  const lines = ["## 2. Contra el Excel", ""];
  if (oracle.planningMonths.length > 0) {
    lines.push(
      `Sin comparar, porque su libro solo trae la plantilla (es la planificación de un mes que aún no empieza): ${oracle.planningMonths.join(", ")}.`,
      "",
    );
  }
  if (oracle.differences.length === 0) {
    lines.push(
      "Todos los saldos coinciden al céntimo: cada cuenta, cada sobre en cada moneda y los",
      "totales con y sin «Otro», al cierre de cada mes, leídos como los leerá la app.",
      "",
    );
  } else {
    lines.push(
      table(
        ["Mes", "Qué", "Excel", "App", "Diferencia"],
        oracle.differences.map((d) => [
          d.month,
          d.what,
          money(d.excelCents, d.currency),
          money(d.appCents, d.currency),
          money(d.appCents - d.excelCents, d.currency),
        ]),
      ),
      "",
    );
  }
  if (oracle.budgetNotes.length > 0) {
    lines.push(
      "**El presupuesto: lo que la app calcula distinto del Excel** (R12, R18). Se anota y se",
      "revisa, pero no impide nada. La app solo cuenta para el plan de un sobre lo que le",
      "llega por los cobros: lo que recibe de otro sobre (una devolución) no cuenta.",
      "",
      "",
      ...oracle.budgetNotes.map((note) => `- ${note.month}: ${note.message}`),
      "",
    );
  }
  return lines;
}

function describeOutcome(outcome: LoadOutcome): string {
  if (outcome.status === "not_run") return `no se probó: ${outcome.reason}.`;
  if (outcome.status === "rejected") {
    const operation = outcome.operation;
    return (
      `**rechazó la carga**: ${outcome.message}` +
      (operation
        ? ` (${operation.month}, «${operation.description}», filas ${operation.refs.join(", ")})`
        : "")
    );
  }
  const total = Object.values(outcome.counts).reduce((sum, count) => sum + count, 0);
  return (
    `aceptó las ${outcome.counts.operations} operaciones y sus ${outcome.counts.entries} asientos, ` +
    `con todas sus reglas comprobadas (${total} filas en total).` +
    (outcome.dryRun ? " Era en seco: no quedó nada escrito." : "") +
    (appDataLabel(outcome.appData)
      ? ` ${outcome.dryRun ? "Habría borrado" : "Borró"} ${appDataLabel(outcome.appData)}, que el Excel ya tiene.`
      : "")
  );
}

// «1 operación y 2 deudas registradas en la app», «1 mes del presupuesto registrado en la
// app»; vacío si no hay nada.
export function appDataLabel({ operations, debts, months }: AppData): string {
  const parts = [
    operations === 1 ? "1 operación" : operations > 1 ? `${operations} operaciones` : "",
    debts === 1 ? "1 deuda" : debts > 1 ? `${debts} deudas` : "",
    months === 1 ? "1 mes del presupuesto" : months > 1 ? `${months} meses del presupuesto` : "",
  ].filter(Boolean);
  if (parts.length === 0) return "";
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} y ${parts.at(-1)}` : parts[0];
  // Concuerda como en español: en masculino en cuanto entra un mes.
  const plural = operations + debts + months > 1;
  const ending = months > 0 ? (plural ? "os" : "o") : plural ? "as" : "a";
  return `${list} registrad${ending} en la app`;
}

const where = (issue: Issue) => (issue.ref ? ` ${issue.ref}` : "");

const currencyOf = (pkg: ImportPackage, account: string): Currency =>
  pkg.currencies[account] ?? "VES";

function money(cents: number, currency: Currency): string {
  const amount = (Math.abs(cents) / 100).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${cents < 0 ? "-" : ""}${currency === "VES" ? "Bs" : "$"} ${amount}`;
}

function table(headers: string[], rows: string[][]): string {
  const escape = (cell: string) => cell.replace(/\|/g, "\\|");
  return [
    `| ${headers.join(" | ")} |`,
    `|${headers.map(() => "---").join("|")}|`,
    ...rows.map((row) => `| ${row.map(escape).join(" | ")} |`),
  ].join("\n");
}
