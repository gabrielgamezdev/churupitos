import { Link } from "@tanstack/react-router";

import { Button, buttonVariants } from "@/components/ui/button";
import { showToast } from "@/lib/toast";
import { useOnline } from "@/lib/use-online";
import { cn } from "@/lib/utils";
import { writeErrorMessage } from "@/lib/write-error";

import type { Debt } from "./queries";
import { undoDebtPaid, undoDeletedDebt, useDeleteDebt, useSetDebtPaid } from "./write";

// Lo que se hace con una deuda desde su fila: marcarla pagada (o desmarcarla), corregirla
// y borrarla, que no pregunta: el aviso de abajo lo deshace (M7). Pagar es un gasto aparte
// (R17): una pagada ofrece registrarlo, con el monto y el concepto ya escritos. Sin red,
// todo se apaga.
export function DebtActions({ debt }: { debt: Debt }) {
  const online = useOnline();
  const setPaid = useSetDebtPaid();
  const remove = useDeleteDebt();
  const paid = debt.paidOn !== null;
  const error = setPaid.error ?? remove.error;

  const deleteIt = () =>
    remove.mutate(debt.id, {
      // Sin lo borrado, otro la borró antes: no hay nada que deshacer.
      onSuccess: (snapshot) =>
        showToast(
          snapshot
            ? {
                message: "Deuda borrada",
                detail: debt.description,
                action: { label: "Deshacer", run: undoDeletedDebt(snapshot) },
              }
            : { message: "Ya estaba borrada" },
        ),
    });

  return (
    <div className="flex flex-col gap-2 rounded-md bg-surface-sunken p-3">
      {error && (
        <p role="alert" className="text-body text-destructive">
          {remove.error ? "No se borró." : "No se guardó."} {writeErrorMessage(error)}
        </p>
      )}
      <Button
        variant={paid ? "outline" : "default"}
        disabled={!online || setPaid.isPending}
        onClick={() =>
          setPaid.mutate(
            { id: debt.id, paid: !paid },
            {
              onSuccess: () =>
                showToast({
                  message: paid ? "Vuelve a estar pendiente" : "Marcada como pagada",
                  detail: debt.description,
                  action: { label: "Deshacer", run: undoDebtPaid(debt) },
                }),
            },
          )
        }
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
        <Button variant="outline" disabled={!online || remove.isPending} onClick={deleteIt}>
          {remove.isPending ? "Borrando…" : "Borrar"}
        </Button>
      </div>
    </div>
  );
}
