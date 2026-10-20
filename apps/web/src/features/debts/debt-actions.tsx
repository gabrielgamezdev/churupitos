import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { writeErrorMessage } from "@/features/operations/save";
import { useOnline } from "@/lib/use-online";
import { cn } from "@/lib/utils";

import type { Debt } from "./queries";
import { useDeleteDebt, useSetDebtPaid } from "./write";

// Lo que se hace con una deuda desde su fila: marcarla pagada (o desmarcarla), corregirla
// y borrarla. Pagar es un gasto aparte (R17): una pagada ofrece registrarlo, con el monto
// y el concepto ya escritos. Sin red, todo se apaga.
export function DebtActions({ debt }: { debt: Debt }) {
  const online = useOnline();
  const [confirming, setConfirming] = useState(false);
  const setPaid = useSetDebtPaid();
  const remove = useDeleteDebt();
  const paid = debt.paidOn !== null;
  const error = setPaid.error ?? remove.error;

  if (confirming) {
    return (
      <div className="flex flex-col gap-2 rounded-md bg-surface-sunken p-3">
        <p className="text-body">¿Borrar esta deuda?</p>
        {remove.error && (
          <p role="alert" className="text-body text-destructive">
            No se borró. {writeErrorMessage(remove.error)}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!online || remove.isPending}
            onClick={() => remove.mutate(debt.id)}
          >
            {remove.isPending ? "Borrando…" : "Borrar"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md bg-surface-sunken p-3">
      {error && (
        <p role="alert" className="text-body text-destructive">
          No se guardó. {writeErrorMessage(error)}
        </p>
      )}
      <Button
        variant={paid ? "outline" : "default"}
        disabled={!online || setPaid.isPending}
        onClick={() => setPaid.mutate({ id: debt.id, paid: !paid })}
      >
        {paid ? "No está pagada" : "Marcar pagada"}
      </Button>
      {paid && (
        <Link
          to="/operations/new"
          search={{
            kind: debt.direction === "payable" ? "expense" : "income",
            amount: debt.amountCents,
            description: debt.description,
            currency: debt.currency,
          }}
          disabled={!online}
          className={cn(buttonVariants({ variant: "outline" }), !online && "opacity-50")}
        >
          {debt.direction === "payable" ? "Registrar el pago" : "Registrar el cobro"}
        </Link>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/debts/$debtId/edit"
          params={{ debtId: debt.id }}
          disabled={!online}
          className={cn(buttonVariants({ variant: "outline" }), !online && "opacity-50")}
        >
          Corregir
        </Link>
        <Button variant="outline" disabled={!online} onClick={() => setConfirming(true)}>
          Borrar
        </Button>
      </div>
    </div>
  );
}
