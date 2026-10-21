import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { EnvelopeChip } from "@/components/envelope-chip";
import { List, ListRow } from "@/components/list";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { overdrawnCellsQuery, type OverdrawnCell } from "@/features/accounts/queries";
import { useAccountBalances, type AccountBalance } from "@/features/balances/use-account-balances";
import { dueLabel } from "@/features/debts/debt-view";
import { debtsQuery, type Debt } from "@/features/debts/queries";
import { envelopesQuery, type Envelope } from "@/features/envelopes/queries";
import { CoverLink } from "@/features/operations/cover-link";
import { today } from "@/lib/months";
import { cn } from "@/lib/utils";

import { attention } from "./attention";

// Cuántos de cada cosa se ven; el resto, en su pantalla.
const MAX_ROWS = 5;

// «Para revisar» en Inicio (M7). Es un bloque más, no un aviso: mientras carga o si no
// carga, no se ve, y sin nada que revisar, tampoco.
export function AttentionBlock() {
  const cells = useQuery(overdrawnCellsQuery);
  const debts = useQuery(debtsQuery);
  const accounts = useAccountBalances();
  const envelopes = useQuery(envelopesQuery);
  const accountById = useMemo(
    () => Object.fromEntries((accounts.data ?? []).map((row) => [row.accountId, row])),
    [accounts.data],
  );
  const envelopeById = useMemo(
    () => Object.fromEntries((envelopes.data ?? []).map((envelope) => [envelope.id, envelope])),
    [envelopes.data],
  );

  if (!cells.data || !debts.data || !accounts.data || !envelopes.data) return null;
  const todayDay = today();
  const { overdrafts, dueSoon } = attention(cells.data, debts.data, todayDay);
  return (
    <AttentionList
      overdrafts={overdrafts}
      dueSoon={dueSoon}
      today={todayDay}
      accountById={accountById}
      envelopeById={envelopeById}
    />
  );
}

interface AttentionListProps {
  overdrafts: OverdrawnCell[];
  dueSoon: Debt[];
  today: string;
  accountById: Record<string, Pick<AccountBalance, "name">>;
  envelopeById: Record<string, Envelope>;
}

// Lo que pide atención, sin tono de alarma: cada sobre en descubierto con su cuenta, que
// lleva al sobre, y cada cuota que vence pronto o venció, que lleva a Deudas.
export function AttentionList({
  overdrafts,
  dueSoon,
  today,
  accountById,
  envelopeById,
}: AttentionListProps) {
  if (overdrafts.length === 0 && dueSoon.length === 0) return null;
  return (
    <section aria-labelledby="attention-title" className="flex flex-col gap-3">
      <h2 id="attention-title" className="text-heading">
        Para revisar
      </h2>
      <List>
        {overdrafts.slice(0, MAX_ROWS).map((cell) => {
          const envelope = envelopeById[cell.envelopeId];
          return (
            <ListRow key={`${cell.accountId}-${cell.envelopeId}`} className="gap-2 py-0 pr-3">
              <Link
                to="/envelopes/$envelopeId"
                params={{ envelopeId: cell.envelopeId }}
                className="flex min-h-tap min-w-0 flex-1 items-center justify-between gap-3 py-3"
              >
                <span className="flex min-w-0 flex-col items-start gap-0.5">
                  {envelope && (
                    <EnvelopeChip
                      name={envelope.name}
                      emoji={envelope.emoji}
                      isThirdParty={envelope.isThirdParty}
                      className={cn("text-body", !envelope.isThirdParty && "text-ink")}
                    />
                  )}
                  <span className="text-caption text-ink-muted">
                    en {accountById[cell.accountId]?.name ?? "otra cuenta"}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <Money
                    cents={cell.balanceCents}
                    currency={cell.currency}
                    className="text-amount"
                  />
                  <Badge variant="overdrawn">Descubierto</Badge>
                </span>
              </Link>
              <CoverLink
                accountId={cell.accountId}
                envelopeId={cell.envelopeId}
                shortfallCents={-cell.balanceCents}
                label={`Cubrir ${envelope?.name ?? "el sobre"} en ${accountById[cell.accountId]?.name ?? "su cuenta"}`}
              />
            </ListRow>
          );
        })}
        {overdrafts.length > MAX_ROWS && (
          <MoreRow to="/envelopes">
            Y {overdrafts.length - MAX_ROWS} sobres más en descubierto
          </MoreRow>
        )}
        {dueSoon.slice(0, MAX_ROWS).map((debt) => {
          const due = debt.dueOn ? dueLabel(debt.dueOn, today) : null;
          return (
            <ListRow key={debt.id} asChild>
              <Link to="/debts">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-body">{debt.description}</span>
                  {due && (
                    <span
                      className={cn("text-caption", due.overdue ? "text-danger" : "text-ink-muted")}
                    >
                      Por pagar · {due.text}
                    </span>
                  )}
                </span>
                <Money cents={debt.amountCents} currency={debt.currency} className="text-amount" />
              </Link>
            </ListRow>
          );
        })}
        {dueSoon.length > MAX_ROWS && (
          <MoreRow to="/debts">Y {dueSoon.length - MAX_ROWS} cuotas más que vencen pronto</MoreRow>
        )}
      </List>
    </section>
  );
}

function MoreRow({ to, children }: { to: "/envelopes" | "/debts"; children: React.ReactNode }) {
  return (
    <ListRow asChild>
      <Link to={to} className="text-body text-brand">
        {children}
      </Link>
    </ListRow>
  );
}
