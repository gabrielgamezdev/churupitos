import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { EnvelopeChip } from "@/components/envelope-chip";
import { List, ListRow } from "@/components/list";
import { Money } from "@/components/money";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState, ErrorState, OfflineBanner } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EnvelopeSplit } from "@/features/accounts/envelope-split";
import {
  SAMPLE_ACCOUNT_BY_ID,
  SAMPLE_CHECKS,
  SAMPLE_DEBTS,
  SAMPLE_DEBT_TOTALS,
  SAMPLE_ENVELOPE_BY_ID,
  SAMPLE_ENVELOPES,
  SAMPLE_ENVELOPE_ROWS,
  SAMPLE_INCOMES,
  SAMPLE_LEDGER,
  SAMPLE_OPERATIONS,
  SAMPLE_PLAN,
  SAMPLE_TODAY,
} from "@/features/gallery/samples";
import { AccountRow } from "@/features/balances/account-row";
import { CurrencyCard } from "@/features/balances/currency-card";
import { BudgetCheckList } from "@/features/budget/budget-check-list";
import { BudgetTotals } from "@/features/budget/budget-totals";
import { IncomeRow } from "@/features/budget/income-row";
import { PlanRow } from "@/features/budget/plan-row";
import { DebtGroupList, DebtRow, DebtTotals } from "@/features/debts/debt-row";
import { summarizePayable } from "@/features/debts/debt-view";
import { EnvelopeRow } from "@/features/envelopes/envelope-row";
import { LedgerList } from "@/features/ledger/ledger-list";
import { MonthPicker } from "@/features/ledger/month-picker";
import { OperationEntries } from "@/features/ledger/operation-detail";

export const Route = createFileRoute("/_authenticated/gallery")({
  component: GalleryPage,
});

// `data-theme` fija el tema de la galería (styles.css); sin él, lo elige el teléfono.
type ThemeChoice = "light" | "dark" | undefined;

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: undefined, label: "Teléfono" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

const COLOR_GROUPS: { title: string; tokens: [token: string, use: string][] }[] = [
  {
    title: "Superficies y líneas",
    tokens: [
      ["surface", "El fondo de cada pantalla"],
      ["surface-raised", "Tarjetas, listas y hojas"],
      ["surface-sunken", "Campos, fila tocada y esqueleto de carga"],
      ["hairline", "Separadores, solo decorativos"],
      ["line-strong", "Bordes de controles"],
    ],
  },
  {
    title: "Texto",
    tokens: [
      ["ink", "Texto principal y saldos"],
      ["ink-muted", "Fechas, sobres, restantes y notas"],
    ],
  },
  {
    title: "Marca y monedas",
    tokens: [
      ["brand", "Acciones, enlaces, foco y los bolívares"],
      ["on-brand", "Texto sobre un relleno verde"],
      ["brand-soft", "Fondo de la etiqueta «Bs»"],
      ["usd", "Los dólares"],
      ["usd-soft", "Fondo de la etiqueta «$»"],
      ["coin", "El dorado del icono, nunca texto"],
    ],
  },
  {
    title: "Importes y estados",
    tokens: [
      ["money-in", "Lo que entra, con su «+»"],
      ["money-out", "Lo que sale, con su «−»"],
      ["overdrawn", "Un saldo por debajo de cero"],
      ["overdrawn-soft", "Fondo de la etiqueta «Descubierto»"],
    ],
  },
  {
    title: "«Otro»",
    tokens: [
      ["third-party", "El dinero que no es del hogar"],
      ["third-party-soft", "Fondo de la etiqueta de «Otro»"],
    ],
  },
];

const TYPE_STYLES: [className: string, name: string, sample: string][] = [
  ["text-display-amount", "display-amount · 32/38 · 650", "Saldo grande"],
  ["text-title", "title · 20/26 · 600", "Banco A"],
  ["text-heading", "heading · 16/22 · 600", "Sobres de esta cuenta"],
  ["text-body", "body · 15/22 · 400", "Mercado de la semana"],
  ["text-amount", "amount · 15/22 · 600", "Importe de una fila"],
  ["text-amount-small", "amount-small · 13/18 · 500", "Restante de un movimiento"],
  ["text-caption", "caption · 13/18 · 400", "Notas y datos secundarios"],
  ["text-label", "label · 12/16 · 600", "Etiquetas y días"],
];

// La vista del design system dentro de la app, con los componentes de verdad y datos
// inventados. docs/DESIGN_SYSTEM.md manda; cada componente de M2 se suma aquí al
// construirse.
function GalleryPage() {
  const [theme, setTheme] = useState<ThemeChoice>(undefined);
  const [month, setMonth] = useState("2026-10");
  const offlineSince = new Date();
  offlineSince.setHours(8, 15, 0, 0);

  return (
    <div data-theme={theme} className="min-h-dvh bg-surface text-ink">
      <main className="mx-auto flex max-w-md flex-col gap-10 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[calc(var(--tab-bar-height)_+_env(safe-area-inset-bottom,0px)_+_1.5rem)]">
        <div className="flex flex-col gap-4">
          <ScreenHeader title="Galería" back={{ to: "/settings" }} backLabel="Volver a Ajustes" />
          <p className="text-body text-ink-muted">
            Los colores, los tipos y los componentes de la app, con datos inventados.
          </p>
          <div
            role="group"
            aria-label="Tema de la galería"
            className="grid grid-cols-3 overflow-hidden rounded-md border border-line-strong"
          >
            {THEMES.map((option) => (
              <button
                key={option.label}
                type="button"
                aria-pressed={theme === option.value}
                onClick={() => setTheme(option.value)}
                className="h-tap text-body font-medium text-ink aria-pressed:bg-brand aria-pressed:text-on-brand"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Section title="Colores">
          {COLOR_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <h3 className="text-heading">{group.title}</h3>
              <List>
                {group.tokens.map(([token, use]) => (
                  <ListRow key={token} className="justify-start">
                    <span
                      aria-hidden="true"
                      className="size-8 shrink-0 rounded-sm border border-hairline"
                      style={{ background: `var(--${token})` }}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-body font-medium">{token}</span>
                      <span className="text-caption text-ink-muted">{use}</span>
                    </span>
                  </ListRow>
                ))}
              </List>
            </div>
          ))}
        </Section>

        <Section title="Tipografía">
          <List>
            {TYPE_STYLES.map(([className, name, sample]) => (
              <ListRow key={name} className="flex-col items-start gap-1">
                <span className={className}>{sample}</span>
                <span className="text-caption text-ink-muted">{name}</span>
              </ListRow>
            ))}
          </List>
        </Section>

        <Section title="Importes" description="El signo manda; el color acompaña.">
          <List>
            <ListRow>
              <span className="text-body">Movimiento que entra</span>
              <Money cents={40000} currency="VES" kind="movement" className="text-amount" />
            </ListRow>
            <ListRow>
              <span className="text-body">Movimiento que sale</span>
              <Money cents={-32000} currency="VES" kind="movement" className="text-amount" />
            </ListRow>
            <ListRow>
              <span className="text-body">Entra, en dólares</span>
              <Money cents={2000} currency="USD" kind="movement" className="text-amount" />
            </ListRow>
            <ListRow>
              <span className="text-body">Saldo</span>
              <Money cents={1250000} currency="VES" className="text-amount" />
            </ListRow>
            <ListRow>
              <span className="text-body">Saldo en dólares</span>
              <Money cents={34000} currency="USD" className="text-amount" />
            </ListRow>
            <ListRow>
              <span className="flex items-center gap-2">
                <span className="text-body">Saldo</span>
                <Badge variant="overdrawn">Descubierto</Badge>
              </span>
              <Money cents={-5000} currency="VES" className="text-amount" />
            </ListRow>
          </List>
        </Section>

        <Section title="Etiquetas">
          <div className="flex flex-wrap gap-2">
            <Badge variant="ves">Bs</Badge>
            <Badge variant="usd">$</Badge>
            <Badge variant="thirdParty">Otro</Badge>
            <Badge variant="overdrawn">Descubierto</Badge>
            <Badge>Comisión</Badge>
            <Badge>≈ fecha</Badge>
          </div>
        </Section>

        <Section title="Sobres" description="«Otro» va sin emoji y en su color.">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-body">
            <EnvelopeChip emoji="🏦" name="Ahorro" />
            <EnvelopeChip emoji="🍱" name="Comida" />
            <EnvelopeChip emoji="🚌" name="Transporte" />
            <EnvelopeChip name="Otro" isThirdParty />
          </div>
        </Section>

        <Section
          title="Tarjetas de moneda"
          description="En grande, lo del hogar; debajo, el total con «Otro» si lo hay."
        >
          <CurrencyCard
            currency="VES"
            ownCents={1250000}
            totalCents={1520000}
            thirdPartyCents={270000}
            accountCount={6}
          />
          <CurrencyCard
            currency="USD"
            ownCents={34000}
            totalCents={34000}
            thirdPartyCents={0}
            accountCount={5}
          />
        </Section>

        <Section
          title="Cuentas"
          description="Con su parte de «Otro» si la tienen. Una cuenta en cero sigue en la lista, apagada."
        >
          <List>
            <AccountRow name="Banco A" currency="VES" balanceCents={620000} thirdPartyCents={0} />
            <AccountRow
              name="Banco C"
              currency="VES"
              balanceCents={900000}
              thirdPartyCents={270000}
            />
            <AccountRow name="Tarjeta B" currency="VES" balanceCents={0} thirdPartyCents={0} />
            <AccountRow
              name="Billetera D"
              currency="USD"
              balanceCents={-1500}
              thirdPartyCents={0}
            />
          </List>
        </Section>

        <Section
          title="Lista de sobres"
          description="Lo que tiene cada sobre en cada moneda, sin sumarlas."
        >
          <List>
            <EnvelopeRow envelope={SAMPLE_ENVELOPES[0]!} balances={{ VES: 400000, USD: 2000 }} />
            <EnvelopeRow envelope={SAMPLE_ENVELOPES[2]!} balances={{ VES: -5000 }} />
            <EnvelopeRow envelope={SAMPLE_ENVELOPES[3]!} balances={{ USD: 10000 }} />
          </List>
        </Section>

        <Section
          title="Sobres de una cuenta"
          description="Cuánto hay hoy de cada sobre en ella. Suman el saldo de la cuenta."
        >
          <EnvelopeSplit currency="VES" rows={SAMPLE_ENVELOPE_ROWS} />
        </Section>

        <Section
          title="Selector de mes"
          description="Con lo que había al empezar y al cerrar, en cada moneda."
        >
          <MonthPicker
            month={month}
            isCurrent={month === "2026-10"}
            bounds={[
              { currency: "VES", openingCents: 300000, closingCents: 620000 },
              { currency: "USD", openingCents: 2000, closingCents: 1000 },
            ]}
            onChange={setMonth}
          />
        </Section>

        <Section
          title="Libro"
          description="Lo más nuevo arriba. Al tocar un movimiento se despliega su operación entera."
        >
          <LedgerList
            entries={SAMPLE_LEDGER}
            today={SAMPLE_TODAY}
            renderContext={(entry) => {
              const envelope = SAMPLE_ENVELOPE_BY_ID[entry.envelopeId];
              return envelope ? (
                <EnvelopeChip
                  name={envelope.name}
                  emoji={envelope.emoji}
                  isThirdParty={envelope.isThirdParty}
                  className="text-caption"
                />
              ) : null;
            }}
            renderDetail={(entry) => {
              const operation = SAMPLE_OPERATIONS[entry.operationId];
              return operation ? (
                <OperationEntries
                  operation={operation}
                  accountById={SAMPLE_ACCOUNT_BY_ID}
                  envelopeById={SAMPLE_ENVELOPE_BY_ID}
                />
              ) : null;
            }}
          />
        </Section>

        <Section
          title="Ingresos del mes"
          description="Los totales, como las filas «Total» del Excel. Al tocar un ingreso cobrado se despliega su reparto."
        >
          <BudgetTotals
            items={[
              { label: "Se espera", cents: 17000 },
              { label: "Cobrado", cents: 15000 },
              { label: "Falta", cents: 2000 },
            ]}
          />
          <List>
            {SAMPLE_INCOMES.map((income) => {
              const operation = income.receipt && SAMPLE_OPERATIONS[income.receipt.operationId];
              return (
                <IncomeRow
                  key={income.id}
                  income={income}
                  accountName={
                    income.receipt
                      ? SAMPLE_ACCOUNT_BY_ID[
                          income.receipt.accountId as keyof typeof SAMPLE_ACCOUNT_BY_ID
                        ]?.name
                      : undefined
                  }
                  detail={
                    operation && (
                      <OperationEntries
                        operation={operation}
                        accountById={SAMPLE_ACCOUNT_BY_ID}
                        envelopeById={SAMPLE_ENVELOPE_BY_ID}
                      />
                    )
                  }
                />
              );
            })}
          </List>
        </Section>

        <Section
          title="El plan"
          description="Lo planeado en $, lo que le llegó en Bs y ✅/⏳. Cada sobre lleva a su pantalla."
        >
          <List>
            {SAMPLE_PLAN.map((row) => (
              <PlanRow key={row.line.id} {...row} />
            ))}
          </List>
        </Section>

        <Section title="El cuadre" description="Un mes que cuadra y otro que no: avisa, no impide.">
          {SAMPLE_CHECKS.map((checks) => (
            <BudgetCheckList key={checks.month} checks={checks} />
          ))}
        </Section>

        <Section
          title="Deudas"
          description="Lo pendiente por moneda y lo que deben por mes de vencimiento. Una vencida lo dice; una pagada va con ✅."
        >
          <DebtTotals totals={SAMPLE_DEBT_TOTALS} />
          {summarizePayable(SAMPLE_DEBTS).groups.map((group) => (
            <DebtGroupList key={group.month ?? "sin-fecha"} group={group} today={SAMPLE_TODAY} />
          ))}
          <List>
            {summarizePayable(SAMPLE_DEBTS).paid.map((debt) => (
              <DebtRow key={debt.id} debt={debt} today={SAMPLE_TODAY} />
            ))}
          </List>
        </Section>

        <Section title="Estados">
          <h3 className="text-heading">Cargando</h3>
          <List aria-hidden="true">
            <ListRow>
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
            </ListRow>
            <ListRow>
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-4 w-1/4" />
            </ListRow>
          </List>
          <h3 className="text-heading">Vacío</h3>
          <div className="rounded-lg bg-surface-raised">
            <EmptyState>Sin movimientos en septiembre</EmptyState>
          </div>
          <h3 className="text-heading">Error</h3>
          <div className="rounded-lg bg-surface-raised">
            <ErrorState message="No se pudieron cargar los saldos." onRetry={() => {}} />
          </div>
          <h3 className="text-heading">Sin conexión</h3>
          <OfflineBanner updatedAt={offlineSince} />
          <h3 className="text-heading">Sin actualizar</h3>
          <OfflineBanner updatedAt={offlineSince} reason="failed" />
        </Section>

        <Section title="Botones">
          <div className="flex flex-wrap gap-2">
            <Button>Actualizar</Button>
            <Button variant="outline">Reintentar</Button>
            <Button variant="ghost">Luego</Button>
          </div>
        </Section>

        <p className="text-caption text-ink-muted">
          Los componentes de cada pantalla se suman aquí al construirlos.
        </p>
      </main>
    </div>
  );
}

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function Section({ title, description, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-title">{title}</h2>
        {description && <p className="text-body text-ink-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}
