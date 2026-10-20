import { TriangleAlert } from "lucide-react";

import { List, ListRow } from "@/components/list";
import { Money } from "@/components/money";

import { budgetBalance } from "./budget-view";
import type { BudgetChecks } from "./queries";

// El cuadre del mes (R12): las dos comprobaciones del Excel que no se cumplen solas.
// Son avisos: si no cuadra, se dice por cuánto, pero nada se impide. La de los Bs solo
// cuando ya se cobró algo, porque antes cuadra sin decir nada.
export function BudgetCheckList({ checks }: { checks: BudgetChecks }) {
  const { planOverUsdCents, allocatedOverVesCents } = budgetBalance(checks);
  const anyReceived = checks.receivedVesCents !== 0 || checks.allocatedVesCents !== 0;
  return (
    <List>
      <CheckRow ok={planOverUsdCents === 0}>
        {planOverUsdCents === 0 ? (
          "El plan reparte justo lo que se espera"
        ) : planOverUsdCents > 0 ? (
          <>
            El plan reparte <Money cents={planOverUsdCents} currency="USD" /> más de lo que se
            espera
          </>
        ) : (
          <>
            Quedan <Money cents={-planOverUsdCents} currency="USD" /> de lo que se espera sin
            repartir en el plan
          </>
        )}
      </CheckRow>
      {anyReceived && (
        <CheckRow ok={allocatedOverVesCents === 0}>
          {allocatedOverVesCents === 0 ? (
            "Los Bs repartidos suman los cobrados"
          ) : allocatedOverVesCents > 0 ? (
            <>
              Se repartieron <Money cents={allocatedOverVesCents} currency="VES" /> más de los
              cobrados
            </>
          ) : (
            <>
              Quedan <Money cents={-allocatedOverVesCents} currency="VES" /> cobrados sin repartir
            </>
          )}
        </CheckRow>
      )}
    </List>
  );
}

function CheckRow({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <ListRow className="justify-start">
      {ok ? (
        <span aria-hidden="true">✅</span>
      ) : (
        <TriangleAlert aria-hidden="true" className="size-5 shrink-0 text-overdrawn" />
      )}
      <span className="text-body">{children}</span>
    </ListRow>
  );
}
