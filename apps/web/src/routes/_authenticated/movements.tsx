import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { List, ListRow } from "@/components/list";
import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState, MissingData, StaleDataBanner } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountBalances } from "@/features/balances/use-account-balances";
import { envelopesQuery } from "@/features/envelopes/queries";
import { householdMembersQuery } from "@/features/household/members";
import { groupByDay } from "@/features/ledger/group-by-day";
import { MonthPicker } from "@/features/ledger/month-picker";
import { OperationRow } from "@/features/ledger/operation-row";
import { OperationSheet } from "@/features/ledger/operation-sheet";
import { monthOperationsQuery } from "@/features/ledger/queries";
import {
  activeFilters,
  filterOperations,
  FROM_EXCEL,
  type MovementFilters,
} from "@/features/movements/filter-operations";
import { budgetOrder } from "@/features/operations/envelope-order";
import { CURRENCY_NAMES, type Currency } from "@/lib/money";
import { dayLabel, isMonth, monthName, monthOf, today } from "@/lib/months";

type MovementsSearch = MovementFilters & { month?: string };

const text = (value: unknown) => (typeof value === "string" && value ? value : undefined);

export const Route = createFileRoute("/_authenticated/movements")({
  // Funciones simples, no un esquema: lo de aquí va al bundle principal (TRAMPAS).
  validateSearch: (search: Record<string, unknown>): MovementsSearch => ({
    month: isMonth(search.month) ? search.month : undefined,
    currency: search.currency === "VES" || search.currency === "USD" ? search.currency : undefined,
    account: text(search.account),
    envelope: text(search.envelope),
    who: text(search.who),
    q: text(search.q),
  }),
  component: MovementsPage,
});

const CURRENCY_OPTIONS: { value: Currency | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "VES", label: "Bs" },
  { value: "USD", label: "$" },
];

// Movimientos (M7): todo lo del mes, de todas las cuentas, con búsqueda por concepto y
// filtros por moneda, cuenta, sobre y quién lo registró. El mes y los filtros van en la
// dirección: abrir un movimiento, corregirlo y volver los deja como estaban.
function MovementsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const todayDay = today();
  const currentMonth = monthOf(todayDay);
  const month = search.month ?? currentMonth;
  const filters: MovementFilters = search;

  const operations = useQuery(monthOperationsQuery(month));
  const accounts = useAccountBalances();
  const envelopes = useQuery(envelopesQuery);
  const members = useQuery(householdMembersQuery);
  const [openOperation, setOpenOperation] = useState<string | null>(null);

  const accountById = useMemo(
    () => Object.fromEntries((accounts.data ?? []).map((row) => [row.accountId, row])),
    [accounts.data],
  );
  const envelopeById = useMemo(
    () => Object.fromEntries((envelopes.data ?? []).map((envelope) => [envelope.id, envelope])),
    [envelopes.data],
  );

  // Cada cambio reemplaza la entrada del historial: el atrás sale de la pantalla, no
  // deshace filtros uno a uno.
  const update = (patch: Partial<MovementsSearch>) =>
    void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true });
  const changeMonth = (next: string) => update({ month: next === currentMonth ? undefined : next });
  const filterCount = activeFilters(filters);

  const queries = [operations, accounts, envelopes];
  let content: React.ReactNode;
  if (!operations.data || !accounts.data || !envelopes.data) {
    content = (
      <MissingData
        queries={queries}
        errorMessage="No se pudieron cargar los movimientos."
        skeleton={
          <List aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <ListRow key={index}>
                <Skeleton className="h-10 w-full" />
              </ListRow>
            ))}
          </List>
        }
      />
    );
  } else {
    const shown = filterOperations(
      operations.data,
      filters,
      (accountId) => accountById[accountId]?.currency,
    );
    content =
      shown.length === 0 ? (
        <EmptyState className="rounded-lg bg-surface-raised">
          {operations.data.length === 0
            ? `Sin movimientos en ${monthName(month)}`
            : `Nada con esa búsqueda en ${monthName(month)}`}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="px-1 text-caption text-ink-muted">
            {shown.length === 1 ? "1 movimiento" : `${shown.length} movimientos`}
          </p>
          {groupByDay(shown).map(({ day, entries }) => (
            <section key={day} aria-label={dayLabel(day, todayDay)} className="flex flex-col gap-1">
              <h3 className="px-1 text-label text-ink-muted">{dayLabel(day, todayDay)}</h3>
              <List>
                {entries.map((operation) => (
                  <OperationRow
                    key={operation.id}
                    operation={operation}
                    today={todayDay}
                    showDay={false}
                    accountById={accountById}
                    envelopeById={envelopeById}
                    onOpen={() => setOpenOperation(operation.id)}
                  />
                ))}
              </List>
            </section>
          ))}
        </div>
      );
  }

  return (
    <Screen>
      <ScreenHeader title="Movimientos" back={{ to: "/" }} backLabel="Volver a Inicio" />
      <StaleDataBanner queries={queries} />
      <MonthPicker month={month} isCurrent={month === currentMonth} onChange={changeMonth} />

      <div className="flex flex-col gap-2">
        <Input
          type="search"
          aria-label="Buscar por concepto"
          placeholder="Buscar por concepto"
          autoComplete="off"
          value={filters.q ?? ""}
          onChange={(event) => update({ q: event.target.value || undefined })}
        />
        <Collapsible defaultOpen={filterCount > 0} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="-ml-2 px-2">
                <SlidersHorizontal aria-hidden="true" />
                {filterCount > 0 ? `Filtros (${filterCount})` : "Filtros"}
              </Button>
            </CollapsibleTrigger>
            {filterCount > 0 && (
              <Button
                variant="link"
                className="px-0"
                onClick={() =>
                  update({
                    currency: undefined,
                    account: undefined,
                    envelope: undefined,
                    who: undefined,
                  })
                }
              >
                Quitar filtros
              </Button>
            )}
          </div>
          <CollapsibleContent className="flex flex-col gap-3">
            <Segmented
              label="Moneda"
              options={CURRENCY_OPTIONS}
              value={filters.currency ?? "all"}
              onChange={(currency) =>
                update({
                  currency: currency === "all" ? undefined : currency,
                  // Una cuenta de la otra moneda no tendría nada.
                  account:
                    currency !== "all" &&
                    filters.account &&
                    accountById[filters.account]?.currency !== currency
                      ? undefined
                      : filters.account,
                })
              }
            />
            <NativeSelect
              aria-label="Cuenta"
              value={filters.account ?? ""}
              onChange={(event) => update({ account: event.target.value || undefined })}
            >
              <option value="">Todas las cuentas</option>
              {(["VES", "USD"] as const)
                .filter((currency) => !filters.currency || currency === filters.currency)
                .map((currency) => (
                  <optgroup key={currency} label={CURRENCY_NAMES[currency]}>
                    {(accounts.data ?? [])
                      .filter((row) => row.currency === currency)
                      .map((row) => (
                        <option key={row.accountId} value={row.accountId}>
                          {row.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
            </NativeSelect>
            <NativeSelect
              aria-label="Sobre"
              value={filters.envelope ?? ""}
              onChange={(event) => update({ envelope: event.target.value || undefined })}
            >
              <option value="">Todos los sobres</option>
              {budgetOrder(envelopes.data ?? []).map((envelope) => (
                <option key={envelope.id} value={envelope.id}>
                  {envelope.emoji && !envelope.isThirdParty
                    ? `${envelope.emoji} ${envelope.name}`
                    : envelope.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label="Quién lo registró"
              value={filters.who ?? ""}
              onChange={(event) => update({ who: event.target.value || undefined })}
            >
              <option value="">Lo registró cualquiera</option>
              {Object.entries(members.data ?? {}).map(([userId, name]) => (
                <option key={userId} value={userId}>
                  Lo registró {name}
                </option>
              ))}
              <option value={FROM_EXCEL}>Vino del Excel</option>
            </NativeSelect>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {content}
      <OperationSheet operationId={openOperation} onClose={() => setOpenOperation(null)} />
    </Screen>
  );
}
